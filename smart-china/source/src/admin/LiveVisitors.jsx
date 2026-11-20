// Live visitors (who is on the website right now) — polls GET /api/v1/admin/live every 10s.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LIVE } from '../config/env'
import { liveApi } from '../lib/live'
import { Panel, Empty } from './ui'
import { flag, countryName as country } from './country'

const POLL = 10000
let data = null, err = '', timer = null, subs = new Set()
async function load() {
  try { data = await liveApi('admin/live', { admin: true }); err = '' } catch (e) { err = e.message || 'Error' }
  subs.forEach((f) => f({}))
}
// Demo site (no server): a moving sample so the panel can be seen.
function demoData() {
  const t = Math.floor(Date.now() / 1000)
  const wob = Math.floor(t / 10) % 3
  const v = [
    ['/product/smart-watch-series-8', 'Smart Watch Series 8', 'mobile', 'facebook', 'BD', 240],
    ['/customer/checkout', 'Order now', 'mobile', 'facebook', 'BD', 410],
    ['/', 'Home', 'mobile', 'direct', 'BD', 60],
    ['/category/winter-gadgets', 'Winter Gadgets', 'desktop', 'google', 'BD', 130],
    ['/product/room-heater', 'Room Heater', 'mobile', 'facebook', 'BD', 30],
    ['/product/wireless-earbuds', 'Wireless Earbuds', 'mobile', 'instagram', 'BD', 90],
  ].slice(0, 4 + wob).map(([path, title, device, src, country, ago]) => ({ path, title, device, src, country, since: t - ago, seen: t }))
  const count = (k) => v.reduce((m, x) => ({ ...m, [x[k]]: (m[x[k]] || 0) + 1 }), {})
  const pages = Object.entries(count('path')).map(([path, c]) => ({ path, title: v.find((x) => x.path === path).title, count: c }))
  return { now: v.length, last30: 17 + wob, today: 63 + wob, visitors: v, pages, devices: { mobile: 0, desktop: 0, tablet: 0, ...count('device') }, sources: count('src'), countries: count('country'), demo: true }
}

function useLive() {
  const [, force] = useState({})
  useEffect(() => {
    if (!LIVE) { const iv = setInterval(() => force({}), POLL); return () => clearInterval(iv) }
    subs.add(force)
    if (subs.size === 1) { load(); timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL) }
    return () => { subs.delete(force); if (!subs.size) { clearInterval(timer); timer = null } }
  }, [])
  return LIVE ? { data, err } : { data: demoData(), err: '' }
}

const PAGE_NAME = (p) => {
  if (p === '/' || p === '') return 'Home page'
  if (p.startsWith('/product/')) return 'Product page'
  if (p.startsWith('/category/')) return 'Category page'
  if (p.startsWith('/customer/checkout')) return '🛒 Checkout page'
  if (p.startsWith('/customer/order-success')) return '✅ Order placed'
  if (p.startsWith('/lp/')) return 'Landing page'
  if (p.startsWith('/track') || p.startsWith('/t/') || p.includes('order-track')) return 'Order tracking'
  if (p.startsWith('/search')) return 'Search'
  return 'Other pages'
}
const clean = (t) => (t || '').replace(/\s*[-—|]\s*Smart China Gallery.*$/i, '').trim()
const dur = (s) => { const m = Math.max(0, Math.round((Date.now() / 1000 - s) / 60)); return m < 1 ? '<1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }
const DEV = { mobile: '📱 Mobile', desktop: '💻 Desktop', tablet: '📲 Tablet' }
const SRC = (s) => (/facebook|fb|instagram|ig|meta/i.test(s) ? '📘 Facebook/Instagram' : /google/i.test(s) ? '🔍 Google' : s === 'direct' ? '🔗 Direct' : s)

/** Small "● 5 live" indicator for the admin header. */
export function LiveBadge() {
  const { data } = useLive()
  const n = data?.now ?? 0
  return (
    <Link to="/admin#live" title="Visitors on the website right now" className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
      <span className="relative flex h-2.5 w-2.5">{n > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}<span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${n > 0 ? 'bg-green-600' : 'bg-gray-400'}`} /></span>
      {n} live
    </Link>
  )
}

/** Full panel for the Dashboard. */
export function LiveVisitorsPanel() {
  const { data, err } = useLive()
  const n = data?.now ?? 0
  return (
    <div id="live">
      <Panel title="🟢 Live visitors" sub={LIVE ? 'Updates every 10 seconds' : 'Demo — sample data; the live site shows real visitors'}>
        {err && !data && <p className="text-sm text-red-600">Could not load: {err}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-4xl font-extrabold text-green-700">
              <span className="relative flex h-3.5 w-3.5">{n > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}<span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${n > 0 ? 'bg-green-600' : 'bg-gray-400'}`} /></span>{n}
            </p>
            <p className="mt-1 text-xs font-medium text-green-800">on the site right now</p>
          </div>
          <div className="rounded-lg bg-surface p-4 text-center"><p className="text-3xl font-bold">{data?.last30 ?? 0}</p><p className="mt-1 text-xs text-muted">visitors in the last 30 minutes</p></div>
          <div className="rounded-lg bg-surface p-4 text-center"><p className="text-3xl font-bold">{data?.today ?? 0}</p><p className="mt-1 text-xs text-muted">visitors today</p></div>
        </div>

        {n === 0 ? <div className="mt-4"><Empty>No one is on the site right now</Empty></div> : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Who is on which page</p>
              <ul className="divide-y divide-line rounded-md border border-line text-sm">
                {data.visitors.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{PAGE_NAME(v.path)}{clean(v.title) && v.path !== '/' ? <span className="font-normal text-muted"> · {clean(v.title)}</span> : null}</span>
                      <span className="block text-xs text-muted">{flag(v.country)} {country(v.country)} · {DEV[v.device] || v.device} · {SRC(v.src)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{dur(v.since)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">By country</p>
                {Object.entries(data.countries || {}).map(([cc, c]) => <div key={cc} className="flex justify-between gap-2 py-0.5"><span className="truncate">{flag(cc)} {country(cc)}</span><b>{c}</b></div>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">By page</p>
                {data.pages.map((p) => <div key={p.path} className="flex justify-between gap-2 py-0.5"><span className="truncate">{PAGE_NAME(p.path)}{p.path.startsWith('/product/') && clean(p.title) ? ` · ${clean(p.title)}` : ''}</span><b>{p.count}</b></div>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Devices</p>
                {Object.entries(data.devices).filter(([, c]) => c).map(([d, c]) => <div key={d} className="flex justify-between py-0.5"><span>{DEV[d] || d}</span><b>{c}</b></div>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Where they came from</p>
                {Object.entries(data.sources).map(([s, c]) => <div key={s} className="flex justify-between py-0.5"><span className="truncate">{SRC(s)}</span><b>{c}</b></div>)}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
