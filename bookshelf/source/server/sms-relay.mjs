// Bookshelf SMS relay — zero dependencies (Node 18+). Run:  node --env-file=.env sms-relay.mjs
// Keeps the SMS gateway key on the server; the website only sends { to, message }.
//
//   POST /sms/order-placed   public  — order confirmation from the customer's browser (strict checks + rate limits)
//   POST /sms/send           private — any SMS from the admin panel, header X-Admin-Secret: <ADMIN_SECRET>
//   GET  /health
import http from 'node:http'
import { sendSms, normalizeBdNumber } from './sms.js'

const PORT = Number(process.env.PORT || 4100)
const SECRET = process.env.ADMIN_SECRET || ''
const ORIGINS = (process.env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim())
const SITE = (process.env.SITE_URL || '').replace(/\/$/, '')
const MAX_LEN = 320

if (!SECRET || SECRET.length < 12) console.warn('⚠ Set ADMIN_SECRET (12+ characters) in .env — admin SMS will be refused until then.')

// in-memory rate limits (reset when the process restarts — fine for this purpose)
const hits = new Map()
function limited(key, max, windowMs) {
  const now = Date.now()
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (list.length >= max) { hits.set(key, list); return true }
  list.push(now); hits.set(key, list)
  return false
}
const sentInvoices = new Set()

function cors(req, res) {
  const o = req.headers.origin || ''
  const allow = ORIGINS.includes('*') ? '*' : ORIGINS.includes(o) ? o : ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allow)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret')
}
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
const body = (req) => new Promise((resolve) => {
  let raw = ''
  req.on('data', (c) => { raw += c; if (raw.length > 4000) req.destroy() })
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) } })
})

http.createServer(async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/health') return json(res, 200, { ok: true, provider: process.env.SMS_PROVIDER || 'muthofun' })
  if (req.method !== 'POST') return json(res, 404, { ok: false, error: 'Not found' })

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  const { to, message, invoice } = await body(req)
  const number = normalizeBdNumber(to)
  if (!/^8801[3-9]\d{8}$/.test(number)) return json(res, 400, { ok: false, error: 'Invalid Bangladeshi mobile number' })
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_LEN) return json(res, 400, { ok: false, error: `Message must be 1–${MAX_LEN} characters` })

  if (url.pathname === '/sms/send') {
    if (!SECRET || req.headers['x-admin-secret'] !== SECRET) return json(res, 403, { ok: false, error: 'Wrong admin secret' })
    if (limited(`admin`, 300, 3600e3)) return json(res, 429, { ok: false, error: 'Too many SMS this hour' })
    const r = await sendSms(number, message.trim())
    console.log(`[admin] ${number} ${r.ok ? 'sent' : 'FAILED ' + r.info}`)
    return json(res, r.ok ? 200 : 502, r)
  }

  if (url.pathname === '/sms/order-placed') {
    // Only real-looking Bookshelf order confirmations, once per invoice, so the public route can't be used for spam.
    if (!/^BS\d{6,}$/.test(String(invoice || '')) || !message.includes(invoice)) return json(res, 400, { ok: false, error: 'Not an order confirmation' })
    if (SITE && !message.includes(`${SITE}/t/${invoice}-`) && !message.includes(`/t/${invoice}-`)) return json(res, 400, { ok: false, error: 'Tracking link must point to SITE_URL' })
    if (sentInvoices.has(invoice)) return json(res, 200, { ok: true, info: 'Already sent for this order' })
    if (limited(`n:${number}`, 3, 3600e3) || limited(`ip:${ip}`, 10, 3600e3)) return json(res, 429, { ok: false, error: 'Too many SMS, try later' })
    const r = await sendSms(number, message.trim())
    if (r.ok) sentInvoices.add(invoice)
    console.log(`[order ${invoice}] ${number} ${r.ok ? 'sent' : 'FAILED ' + r.info}`)
    return json(res, r.ok ? 200 : 502, r)
  }
  json(res, 404, { ok: false, error: 'Not found' })
}).listen(PORT, () => console.log(`📨 Bookshelf SMS relay on :${PORT} (provider: ${process.env.SMS_PROVIDER || 'muthofun'})`))
