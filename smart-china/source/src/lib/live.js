/*
 * Live mode (VITE_USE_MOCK=false): the PHP + MySQL backend in /api is the source of truth.
 *  - Storefront: GET /bootstrap fills the in-memory store (products, categories, home, pages, public settings).
 *  - Admin: GET /admin/state loads everything; every save() is diffed against the last server copy and sent to
 *    POST /admin/sync as field-level patches (stock/coupon counters as +/- deltas), so two admins or a customer
 *    ordering at the same moment never overwrite each other. A 15-second poll merges changes made elsewhere.
 */
import { S, DAY, refresh, liveHooks, resetState, defaultSettings, sendToCourier, COURIERS } from '../store/db'
import { LIVE, API_BASE_URL } from '../config/env'

export const ADMIN_TOKEN_KEY = 'scg_admin_token'
export const adminToken = () => { try { return localStorage.getItem(ADMIN_TOKEN_KEY) || '' } catch { return '' } }
export const adminHeaders = () => (adminToken() ? { Authorization: `Bearer ${adminToken()}` } : {})
const BOOT_CACHE = 'scg_boot_v1'

const COLLS = { products: 'id', categories: 'slug', coupons: 'code', reviews: 'id', landings: 'id', chats: 'id', messages: 'id', incomplete: 'id', orders: 'id', smsLog: 'id' }
const SORTED_BY_TIME = new Set(['orders', 'incomplete', 'chats', 'messages', 'reviews', 'smsLog'])
const DELTA = { products: ['stock', 'sold'], coupons: ['used'], landings: ['views', 'orders'] }
const KV = ['settings', 'home', 'pages', 'fraud']
const OBJECT_KEYS = ['fraud', 'pages', 'home']

const url = (p) => `${API_BASE_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`
async function call(path, { method = 'GET', body, admin = false, signal } = {}) {
  const headers = { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(admin ? adminHeaders() : {}) }
  const r = await fetch(url(path), { method, headers, body: body ? JSON.stringify(body) : undefined, signal })
  if (r.status === 304) return null
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.message || `HTTP ${r.status}`), { status: r.status })
  return j
}
export const liveApi = call

/* ---------------- public storefront ---------------- */
function applyPublic(d) {
  S.products = d.products || []
  S.categories = d.categories || []
  S.home = d.home && !Array.isArray(d.home) ? d.home : S.home
  S.pages = d.pages && !Array.isArray(d.pages) ? d.pages : {}
  S.settings = { ...defaultSettings(), ...d.settings, tracking: { ...defaultSettings().tracking, ...d.settings?.tracking }, seo: { ...defaultSettings().seo, ...d.settings?.seo }, chat: { ...defaultSettings().chat, ...d.settings?.chat } }
  S.landings = d.landings || []
  S.reviews = d.reviews || []
}

export async function hydratePublic() {
  if (!LIVE) return
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 9000)
  try {
    const d = await call('bootstrap', { signal: ctl.signal })
    applyPublic(d)
    try { localStorage.setItem(BOOT_CACHE, JSON.stringify(d)) } catch { /* quota */ }
  } catch (e) {
    // server unreachable → show the last copy this browser saw (read-only browsing; ordering will still need the server)
    try { const c = JSON.parse(localStorage.getItem(BOOT_CACHE)); if (c) applyPublic(c) } catch { /* nothing cached */ }
    console.warn('Bootstrap failed:', e.message)
  } finally { clearTimeout(t) }
  refresh()
}

/* ---------------- admin: login, load, sync ---------------- */
let base = null          // last copy known to match the server: { docs: {coll: Map(id → {str,obj})}, kv: {key: str}, orderIds: {coll: [ids]} }
let since = 0
let timer = null, pollTimer = null, inflight = false, dirty = false
export const syncState = { status: 'idle', error: '', at: 0 }   // idle | saving | saved | error
const listeners = new Set()
export const onSyncState = (f) => { listeners.add(f); return () => listeners.delete(f) }
const setSync = (status, error = '') => { syncState.status = status; syncState.error = error; if (status === 'saved') syncState.at = Date.now(); listeners.forEach((f) => f()) }

const keyOf = (c, x) => String(x[COLLS[c]])
function snapshot() {
  const docs = {}, orderIds = {}
  for (const c of Object.keys(COLLS)) {
    const m = new Map(); const ids = []
    for (const x of S[c] || []) { const id = keyOf(c, x); m.set(id, { str: JSON.stringify(x), obj: JSON.parse(JSON.stringify(x)) }); ids.push(id) }
    docs[c] = m; orderIds[c] = ids
  }
  const kv = {}
  for (const k of KV) kv[k] = JSON.stringify(S[k] ?? null)
  return { docs, kv, orderIds }
}

export async function adminLogin(email, password) {
  const r = await call('admin/login', { method: 'POST', body: { email, password } })
  localStorage.setItem(ADMIN_TOKEN_KEY, r.token)
  await hydrateAdmin()
  return r.user
}
export async function adminLogout() {
  try { await call('admin/logout', { method: 'POST', admin: true }) } catch { /* ignore */ }
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  stopAdminSync()
  resetState()
  await hydratePublic()
}
/** true when a stored token is still valid (and the full state is loaded) */
export async function resumeAdmin() {
  if (!adminToken()) return false
  try { await call('admin/me', { admin: true }); await hydrateAdmin(); return true } catch (e) { if (e.status === 401) localStorage.removeItem(ADMIN_TOKEN_KEY); return false }
}

export async function hydrateAdmin() {
  const d = await call('admin/state', { admin: true })
  for (const c of Object.keys(COLLS)) S[c] = d.docs[c] || []
  for (const k of KV) S[k] = d.kv[k]
  for (const k of OBJECT_KEYS) if (Array.isArray(S[k])) S[k] = {}
  const ds = defaultSettings()
  S.settings = { ...ds, ...S.settings, tracking: { ...ds.tracking, ...S.settings.tracking }, seo: { ...ds.seo, ...S.settings.seo }, courier: { ...ds.courier, ...S.settings.courier }, chat: { ...ds.chat, ...S.settings.chat }, sms: { ...ds.sms, ...S.settings.sms, events: { ...ds.sms.events, ...S.settings.sms?.events }, templates: { ...ds.sms.templates, ...S.settings.sms?.templates } } }
  S.nextInvoice = Math.max(d.kv.nextInvoice || 100101, S.nextInvoice || 0)
  S.lastSeen = Date.now()
  base = snapshot()
  base.kv.settings = JSON.stringify(S.settings) // the merged defaults are not a "change" to push
  since = d.t - 3000
  liveHooks.onSave = scheduleSync
  startPoll()
  refresh()
}
export function stopAdminSync() { liveHooks.onSave = null; clearTimeout(timer); clearInterval(pollTimer); base = null }

function scheduleSync() { if (!base) return; dirty = true; clearTimeout(timer); timer = setTimeout(flush, 350); setSync('saving') }

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function diffItem(c, a, b) {
  const set = {}, unset = [], delta = {}
  for (const k of Object.keys(b)) {
    if (eq(a[k], b[k])) continue
    if (DELTA[c]?.includes(k) && typeof a[k] === 'number' && typeof b[k] === 'number') delta[k] = b[k] - a[k]
    else set[k] = b[k]
  }
  for (const k of Object.keys(a)) if (!(k in b)) unset.push(k)
  const op = {}
  if (Object.keys(set).length) op.set = set
  if (unset.length) op.unset = unset
  if (Object.keys(delta).length) op.delta = delta
  return Object.keys(op).length ? op : null
}

export async function flush() {
  if (!base) return
  if (inflight) { dirty = true; return }
  inflight = true; dirty = false
  const cur = snapshot()
  const ops = []; const order = {}; const kv = {}
  for (const c of Object.keys(COLLS)) {
    const b = base.docs[c], n = cur.docs[c]
    for (const [id, v] of n) {
      const old = b.get(id)
      if (!old) ops.push({ c, id, create: JSON.parse(v.str) })
      else if (old.str !== v.str) { const op = diffItem(c, old.obj, v.obj); if (op) ops.push({ c, id, ...op }) }
    }
    for (const id of b.keys()) if (!n.has(id)) ops.push({ c, id, del: true })
    if (!SORTED_BY_TIME.has(c)) {
      const common = new Set([...b.keys()].filter((i) => n.has(i)))
      const a1 = base.orderIds[c].filter((i) => common.has(i)), a2 = cur.orderIds[c].filter((i) => common.has(i))
      if (!eq(a1, a2)) order[c] = cur.orderIds[c]
    }
  }
  for (const k of KV) if (cur.kv[k] !== base.kv[k]) kv[k] = S[k]
  if (S.nextInvoice > (base.nextInvoice || 0)) kv.nextInvoice = S.nextInvoice
  if (!ops.length && !Object.keys(order).length && !Object.keys(kv).length) { inflight = false; setSync('saved'); return }
  try {
    const r = await call('admin/sync', { method: 'POST', admin: true, body: { ops, order, kv } })
    base = cur; base.nextInvoice = S.nextInvoice
    // the server renumbered an admin-created order (invoice clash) → copy its numbers back
    for (const [id, m] of Object.entries(r.remap || {})) {
      const o = S.orders.find((x) => x.id === id)
      if (o) { Object.assign(o, m); const e = base.docs.orders.get(id); if (e) { Object.assign(e.obj, m); e.str = JSON.stringify(e.obj) } }
    }
    if (r.nextInvoice > S.nextInvoice) S.nextInvoice = r.nextInvoice
    if (Object.keys(r.remap || {}).length) refresh()
    setSync('saved')
  } catch (e) {
    if (e.status === 401) { setSync('error', 'Admin session expired — please log in again'); localStorage.removeItem(ADMIN_TOKEN_KEY); stopAdminSync(); location.reload(); return }
    setSync('error', e.message || 'Could not reach the server')
    dirty = true
    clearTimeout(timer); timer = setTimeout(flush, 8000) // retry
  } finally {
    inflight = false
    if (dirty && syncState.status !== 'error') scheduleSync()
  }
}

function startPoll() {
  clearInterval(pollTimer)
  pollTimer = setInterval(() => { if (!document.hidden && base && !inflight) poll() }, 15000)
}
const replaceInPlace = (target, src) => { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, src) }
export async function poll() {
  if (!base) return
  let d
  try { d = await call(`admin/poll?since=${since}`, { admin: true }) } catch (e) { if (e.status === 401) { localStorage.removeItem(ADMIN_TOKEN_KEY); location.reload() } return }
  if (!d || !base) return
  let changed = false
  for (const [c, list] of Object.entries(d.docs || {})) {
    if (!COLLS[c]) continue
    for (const doc of list) {
      const id = keyOf(c, doc)
      const local = (S[c] ||= []).find((x) => keyOf(c, x) === id)
      const bs = base.docs[c].get(id)
      if (local) {
        if (bs && JSON.stringify(local) !== bs.str) continue            // an unsaved local edit wins this round
        if (JSON.stringify(local) === JSON.stringify(doc)) { if (!bs) base.docs[c].set(id, { str: JSON.stringify(doc), obj: JSON.parse(JSON.stringify(doc)) }); continue }
        replaceInPlace(local, doc); changed = true
      } else { S[c].unshift(doc); changed = true; if (c === 'orders' && doc.status === 'pending') window.dispatchEvent(new CustomEvent('scg:new-order', { detail: doc })) }
      base.docs[c].set(id, { str: JSON.stringify(doc), obj: JSON.parse(JSON.stringify(doc)) })
    }
    base.orderIds[c] = S[c].map((x) => keyOf(c, x))
  }
  for (const [k, v] of Object.entries(d.kv || {})) {
    if (k === 'nextInvoice') { if (v > S.nextInvoice) { S.nextInvoice = v; base.nextInvoice = v } continue }
    if (!KV.includes(k)) continue
    if (JSON.stringify(S[k]) !== base.kv[k]) continue                    // unsaved local edit
    const val = OBJECT_KEYS.includes(k) && Array.isArray(v) ? {} : v
    if (JSON.stringify(S[k]) === JSON.stringify(val)) continue
    if (S[k] && typeof S[k] === 'object') replaceInPlace(S[k], val); else S[k] = val
    base.kv[k] = JSON.stringify(S[k]); changed = true
  }
  since = d.t - 3000
  if (changed) refresh()
}

/* ---------------- storefront → server (small fire-and-forget calls) ---------------- */
export const liveLogChat = (chatId, page, entries) => call('chat/log', { method: 'POST', body: { chatId, page, entries } }).catch(() => {})
export const liveLandingView = (slug) => call('landing/view', { method: 'POST', body: { slug } }).catch(() => {})
export const liveValidateCoupon = (code, subtotal) => call('coupons/validate', { method: 'POST', body: { code, subtotal } })

/** Book a parcel with Steadfast through the server (the API keys never leave it). COD = order total unless already paid. */
export async function bookSteadfast(order, note = '') {
  return call('admin/courier/steadfast', { method: 'POST', admin: true, body: { orderId: order.id, note } })
}

/** Latest Steadfast status + full tracking history (rider notes) for one order; the server also moves the order status. */
export async function refreshCourier(order) {
  const r = await call('admin/courier/refresh', { method: 'POST', admin: true, body: { orderId: order.id } })
  const fresh = r.order
  const local = S.orders.find((x) => x.id === order.id)
  if (local && fresh) {
    Object.keys(local).forEach((k) => delete local[k]); Object.assign(local, fresh)
    const e = base?.docs.orders.get(order.id); if (e) { e.obj = JSON.parse(JSON.stringify(fresh)); e.str = JSON.stringify(fresh) }
    refresh()
  }
  return fresh
}
/** Check every open Steadfast parcel at once (max 40 per click). */
export async function refreshAllCouriers() {
  const r = await call('admin/courier/refresh-all', { method: 'POST', admin: true })
  since = 0; await poll()
  return r
}
export const courierBalance = () => call('admin/courier/balance', { method: 'POST', admin: true })

/** after the server rewrote image references, pull the fresh data */
export async function refreshAfterMirror() { since = 0; await poll() }

/** Live courier booking: Steadfast through the API; Pathao / RedX need the consignment ID typed in (booked in their panel). */
export async function courierLive(o, c, by, { tracking: typed = '', note = '' } = {}) {
  if (c === 'steadfast') {
    const r = await bookSteadfast(o, note)
    sendToCourier(o, c, by, r.tracking, { consignmentId: r.consignmentId, courierLog: r.courierLog || [], courierStatus: r.courierStatus || '', codAmount: r.codAmount })
    return
  }
  const tracking = (typed || '').trim()
  if (!tracking) throw new Error(`Enter the ${COURIERS[c].t} consignment / tracking ID`)
  sendToCourier(o, c, by, tracking)
}

export { DAY }
