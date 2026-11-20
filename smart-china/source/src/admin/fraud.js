/*
 * BD Courier courier-history (fraud) check — same approach as Smart China Gallery.
 * Demo: the API key is kept only in this browser (separate localStorage key, never in the store/backups/GitHub).
 * Live: Laravel calls https://api.bdcourier.com/courier-check server-side with the key from .env.
 */
import { S, save, normPhone } from '../store/db'

import { LIVE } from '../config/env'
import { liveCourierHistory } from '../lib/live'
const KEY_LS = 'scg_bdc_key'
const TTL = 12 * 3600 * 1000
export const busy = new Set()
export const getKey = () => localStorage.getItem(KEY_LS) || ''
export const setKey = (k) => (k ? localStorage.setItem(KEY_LS, k) : localStorage.removeItem(KEY_LS))

export function parse(resp) {
  const num = (...v) => { for (const x of v) if (x != null && x !== '' && !isNaN(+x)) return +x; return null }
  const root = resp?.courierData || resp?.data?.courierData || resp?.data || resp
  const rows = []
  let sum = null
  if (root && typeof root === 'object') {
    for (const [k, v] of Object.entries(root)) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue
      const total = num(v.total_parcel, v.total_parcels, v.total)
      const ok = num(v.success_parcel, v.success_parcels, v.success, v.delivered)
      const cancel = num(v.cancelled_parcel, v.cancel_parcel, v.cancelled, v.returned)
      if (total == null && ok == null) continue
      const r = { k, name: v.name || k, total: total ?? (ok || 0) + (cancel || 0), ok: ok || 0, cancel: cancel ?? Math.max(0, (total || 0) - (ok || 0)) }
      r.ratio = num(v.success_ratio) ?? (r.total ? (r.ok / r.total) * 100 : 0)
      if (/^(summary|total)$/i.test(k)) sum = r; else rows.push(r)
    }
  }
  if (!sum) {
    const t = rows.reduce((a, r) => ({ total: a.total + r.total, ok: a.ok + r.ok, cancel: a.cancel + r.cancel }), { total: 0, ok: 0, cancel: 0 })
    sum = { ...t, ratio: t.total ? (t.ok / t.total) * 100 : 0 }
  }
  return { sum, rows }
}

export async function fraudCheck(phone, force = false, onChange = () => {}) {
  const p = normPhone(phone)
  const cached = S.fraud[p]
  if (!force && cached && Date.now() - cached.at < TTL) return cached
  if (LIVE) return steadfastCheck(p, onChange)
  const key = getKey()
  if (!key) throw new Error('Add your BD Courier API key in Settings → Courier first')
  busy.add(p); onChange()
  try {
    let r
    try {
      r = await fetch('https://api.bdcourier.com/courier-check?phone=' + p, { method: 'POST', headers: { Authorization: 'Bearer ' + key, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: p }) })
    } catch { throw new Error('BD Courier blocked the browser request. This check works from the Laravel backend.') }
    const j = await r.json().catch(() => { throw new Error(`Unreadable reply (HTTP ${r.status})`) })
    if (r.status === 401 || r.status === 403) throw new Error('BD Courier rejected the API key')
    if (!r.ok || j.status === 'error') throw new Error('BD Courier: ' + (j.message || r.status))
    const res = { ...parse(j), at: Date.now() }
    S.fraud[p] = res
    save()
    return res
  } finally { busy.delete(p); onChange() }
}
export const ratioTone = (r) => (r >= 80 ? 'green' : r >= 60 ? 'amber' : 'red')

/** Live site: Steadfast's own customer record (server-side, with the Steadfast keys saved in Settings → Courier). */
export const REPORT_TEXT = { no_response: 'No response', refused: 'Refused parcel', fake_order: 'Fake order', wrong_address: 'Wrong address', fraud: 'Fraud' }
async function steadfastCheck(p, onChange) {
  busy.add(p); onChange()
  try {
    const j = await liveCourierHistory(p)
    const ok = j.delivered_count, cancel = j.cancelled_count
    const known = j.delivery_ratio != null
    const res = {
      at: Date.now(), source: 'steadfast',
      sum: { total: known ? (ok != null && cancel != null ? ok + cancel : -1) : 0, ok: ok ?? null, cancel: cancel ?? null, ratio: j.delivery_ratio ?? 0 },
      sf: { delivery: j.delivery_ratio, cancel: j.cancellation_ratio, band: j.volume_band, range: j.volume_range, reports: j.total_reports || 0, categories: j.fraud_categories || {}, doubtful: !!j.doubtful_reports },
      rows: [],
    }
    S.fraud[p] = res
    save()
    return res
  } finally { busy.delete(p); onChange() }
}
/** One-line text for a check result (Steadfast or BD Courier). */
export function fraudText(c) {
  if (c.sf) {
    if (c.sf.delivery == null) return 'New customer — no parcel history at Steadfast'
    const reps = c.sf.reports ? ` · ⚠ ${c.sf.reports} report(s)${Object.keys(c.sf.categories).length ? ' (' + Object.entries(c.sf.categories).map(([k, n]) => `${REPORT_TEXT[k] || k} ${n}`).join(', ') + ')' : ''}` : ''
    return `Steadfast: ${c.sf.delivery}% delivered, ${c.sf.cancel ?? 0}% cancelled · ${c.sf.range ?? ''} parcels${c.sum.ok != null ? ` (${c.sum.ok} delivered / ${c.sum.cancel} cancelled)` : ''}${reps}`
  }
  return c.sum.total ? `${Math.round(c.sum.ratio)}% success · ${c.sum.ok} delivered / ${c.sum.cancel} cancelled of ${c.sum.total}` : 'New customer (no parcels with any courier)'
}
