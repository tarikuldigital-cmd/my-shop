// Live-visitor heartbeat: tells the backend "this visitor is on page X right now".
// One id per browser (so 2 tabs = 1 visitor). Only runs against the real backend (LIVE mode).
import { useEffect } from 'react'
import { LIVE, API_BASE_URL } from '../config/env'

const EVERY = 25000
const endpoint = () => `${API_BASE_URL.replace(/\/$/, '')}/presence`

function sid() {
  try {
    let v = localStorage.getItem('fatiha_vid')
    if (!v) { v = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9-]/g, '').slice(0, 36); localStorage.setItem('fatiha_vid', v) }
    return v
  } catch { return '' }
}

// Where the visit came from (first page of this tab session): utm_source, fbclid → facebook, gclid → google
function source() {
  try {
    let s = sessionStorage.getItem('fatiha_src')
    if (s === null) {
      const q = new URLSearchParams(location.search)
      s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('gclid') ? 'google' : '')
      sessionStorage.setItem('fatiha_src', s)
      sessionStorage.setItem('fatiha_ref', document.referrer || '')
    }
    return s
  } catch { return '' }
}

function send(path, extra = {}) {
  const id = sid()
  if (!id) return
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { return '' } })()
  const payload = JSON.stringify({ sid: id, path, tz, title: document.title.slice(0, 180), src: source(), ref: (() => { try { return sessionStorage.getItem('fatiha_ref') || '' } catch { return '' } })(), ...extra })
  try {
    if (extra.leave && navigator.sendBeacon) { navigator.sendBeacon(endpoint(), new Blob([payload], { type: 'application/json' })); return }
    fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
  } catch { /* ignore */ }
}

/** Call from storefront layouts with the current path. */
export function usePresence(path) {
  useEffect(() => {
    if (!LIVE) return
    const beat = () => { if (document.visibilityState === 'visible') send(path) }
    const t0 = setTimeout(beat, 600)           // after the page title is set
    const iv = setInterval(beat, EVERY)
    const onVis = () => (document.visibilityState === 'visible' ? beat() : null)
    const onHide = () => send(path, { leave: 1 })
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => { clearTimeout(t0); clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide) }
  }, [path])
}
