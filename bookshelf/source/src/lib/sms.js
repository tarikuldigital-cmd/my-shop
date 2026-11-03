/*
 * Order SMS — same gateways as the Bachelor Home project (Muthofun/Muthobarta, BulkSMSBD, any HTTP template).
 * The gateway API key NEVER reaches the browser: messages go to the small relay in server/ (Node or PHP)
 * on your own hosting, which holds the key in its .env. Later the Laravel backend sends them itself.
 *
 *   customer places order  → POST {relay}/sms/order-placed   (public, rate-limited, Bookshelf-format only)
 *   admin status change    → POST {relay}/sms/send           (needs the admin secret, saved only in the admin's browser)
 */
import { S, save, hooks, trackCode, COURIERS, normPhone } from '../store/db'
import { storeUrl } from '../config/env'

const SECRET_LS = 'bookshelf_sms_secret'
export const getSmsSecret = () => localStorage.getItem(SECRET_LS) || ''
export const setSmsSecret = (v) => (v ? localStorage.setItem(SECRET_LS, v) : localStorage.removeItem(SECRET_LS))

export const SMS_EVENTS = {
  placed: 'অর্ডার গ্রহণ (কাস্টমার অর্ডার করলেই)',
  confirmed: 'অর্ডার কনফার্ম',
  shipped: 'কুরিয়ারে পাঠানো (ট্র্যাকিং নাম্বারসহ)',
  delivered: 'ডেলিভারি সম্পন্ন',
  cancelled: 'অর্ডার বাতিল',
}
export const SMS_VARS = ['{name}', '{invoice}', '{total}', '{link}', '{courier}', '{tracking}', '{hotline}', '{shop}']

export function trackLink(o) {
  const code = trackCode(o)
  const site = S.settings.sms.siteUrl?.trim()
  return site ? `${site.replace(/\/$/, '')}/t/${code}` : `${location.origin}${storeUrl(`/t/${code}`)}`
}

export function renderSms(template, o) {
  const first = (o.name || '').trim().split(/\s+/)[0] || 'গ্রাহক'
  return template
    .replaceAll('{name}', first)
    .replaceAll('{invoice}', o.invoice)
    .replaceAll('{total}', String(o.total))
    .replaceAll('{link}', trackLink(o))
    .replaceAll('{courier}', o.courier ? COURIERS[o.courier].t : '')
    .replaceAll('{tracking}', o.tracking || '')
    .replaceAll('{hotline}', S.settings.phone)
    .replaceAll('{shop}', S.settings.siteName)
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Bangla SMS are Unicode: 70 characters for 1 part, 67 per part after that (English: 160 / 153). */
export function smsParts(text) {
  const unicode = /[^\x00-\x7F]/.test(text)
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  const n = [...text].length
  return { chars: n, unicode, parts: n <= single ? 1 : Math.ceil(n / multi) }
}

async function deliver(entry) {
  const cfg = S.settings.sms
  if (!cfg.relayUrl) { entry.status = 'not_configured'; entry.info = 'SMS server URL is not set (Settings → SMS)'; return }
  const isPublic = entry.event === 'placed'
  const secret = getSmsSecret()
  if (!isPublic && !secret) { entry.status = 'failed'; entry.info = 'Admin SMS secret missing in this browser (Settings → SMS)'; return }
  try {
    const r = await fetch(`${cfg.relayUrl.replace(/\/$/, '')}/sms/${isPublic ? 'order-placed' : 'send'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(isPublic ? {} : { 'X-Admin-Secret': secret }) },
      body: JSON.stringify({ to: entry.to, message: entry.text, invoice: entry.invoice }),
    })
    const j = await r.json().catch(() => ({}))
    entry.status = r.ok && j.ok ? 'sent' : 'failed'
    entry.info = j.info || j.error || `HTTP ${r.status}`
  } catch (e) {
    entry.status = 'failed'
    entry.info = `Could not reach the SMS server (${e.message})`
  }
}

/** Create a log entry and try to send it. */
export async function sendSms({ to, text, event = 'custom', order }) {
  const entry = { id: `s${Date.now()}${Math.floor(Math.random() * 999)}`, at: Date.now(), to: normPhone(to), event, invoice: order?.invoice || '', text, status: 'sending', ...smsParts(text) }
  S.smsLog.unshift(entry)
  S.smsLog = S.smsLog.slice(0, 500)
  save()
  await deliver(entry)
  entry.at = Date.now()
  save()
  return entry
}

export function resendSms(entry) {
  return sendSms({ to: entry.to, text: entry.text, event: entry.event === 'placed' && getSmsSecret() ? 'resend' : entry.event, order: { invoice: entry.invoice } })
}

// Automatic SMS on order events
hooks.orderEvent = (o, event) => {
  const cfg = S.settings.sms
  if (!cfg.enabled || !cfg.events[event] || o.demo) return
  if (event === 'shipped' && !o.tracking) return
  sendSms({ to: o.phone, text: renderSms(cfg.templates[event], o), event, order: o })
}
