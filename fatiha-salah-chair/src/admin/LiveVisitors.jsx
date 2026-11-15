// Live visitors (who is on the website right now) — polls GET /api/v1/admin/live every 10s.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LIVE } from '../config/env'
import { liveApi } from '../lib/live'
import { Panel, Empty } from './ui'

const POLL = 10000
let data = null, err = '', timer = null, subs = new Set()
async function load() {
  try { data = await liveApi('admin/live', { admin: true }); err = '' } catch (e) { err = e.message || 'Error' }
  subs.forEach((f) => f({}))
}
function useLive() {
  const [, force] = useState({})
  useEffect(() => {
    if (!LIVE) return
    subs.add(force)
    if (subs.size === 1) { load(); timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL) }
    return () => { subs.delete(force); if (!subs.size) { clearInterval(timer); timer = null } }
  }, [])
  return { data, err }
}

const PAGE_NAME = (p) => {
  if (p === '/' || p === '') return 'হোম পেজ'
  if (p.startsWith('/product/')) return 'প্রোডাক্ট পেজ'
  if (p.startsWith('/category/')) return 'ক্যাটাগরি পেজ'
  if (p.startsWith('/customer/checkout')) return '🛒 চেকআউট পেজ'
  if (p.startsWith('/customer/order-success')) return '✅ অর্ডার সফল'
  if (p.startsWith('/lp/')) return 'ল্যান্ডিং পেজ'
  if (p.startsWith('/track') || p.startsWith('/t/') || p.includes('order-track')) return 'অর্ডার ট্র্যাকিং'
  if (p.startsWith('/search')) return 'সার্চ'
  return 'অন্যান্য পেজ'
}
const clean = (t) => (t || '').replace(/\s*[-—|]\s*Fatiha Ayat Salah Chair.*$/i, '').trim()
const dur = (s) => { const m = Math.max(0, Math.round((Date.now() / 1000 - s) / 60)); return m < 1 ? '<১ মিনিট' : m < 60 ? `${m} মিনিট` : `${Math.floor(m / 60)} ঘণ্টা ${m % 60} মি.` }
const DEV = { mobile: '📱 মোবাইল', desktop: '💻 কম্পিউটার', tablet: '📲 ট্যাবলেট' }
const SRC = (s) => (/facebook|fb|instagram|ig|meta/i.test(s) ? '📘 Facebook/Instagram' : /google/i.test(s) ? '🔍 Google' : s === 'direct' ? '🔗 সরাসরি' : s)

/** Small "● 5 live" indicator for the admin header. */
export function LiveBadge() {
  const { data } = useLive()
  if (!LIVE) return null
  const n = data?.now ?? 0
  return (
    <Link to="/admin#live" title="এই মুহূর্তে ওয়েবসাইটে থাকা ভিজিটর" className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
      <span className="relative flex h-2.5 w-2.5">{n > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}<span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${n > 0 ? 'bg-green-600' : 'bg-gray-400'}`} /></span>
      {n} লাইভ
    </Link>
  )
}

/** Full panel for the Dashboard. */
export function LiveVisitorsPanel() {
  const { data, err } = useLive()
  if (!LIVE) return <Panel title="🟢 লাইভ ভিজিটর"><p className="text-sm text-muted">লাইভ ভিজিটর শুধু আসল ওয়েবসাইটে (fatihaayatsalahchair.com/admin) দেখা যাবে।</p></Panel>
  const n = data?.now ?? 0
  return (
    <div id="live">
      <Panel title="🟢 লাইভ ভিজিটর" sub="প্রতি ১০ সেকেন্ডে আপডেট হয়">
        {err && !data && <p className="text-sm text-red-600">লোড হয়নি: {err}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-4xl font-extrabold text-green-700">
              <span className="relative flex h-3.5 w-3.5">{n > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}<span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${n > 0 ? 'bg-green-600' : 'bg-gray-400'}`} /></span>{n}
            </p>
            <p className="mt-1 text-xs font-medium text-green-800">এই মুহূর্তে সাইটে আছেন</p>
          </div>
          <div className="rounded-lg bg-surface p-4 text-center"><p className="text-3xl font-bold">{data?.last30 ?? 0}</p><p className="mt-1 text-xs text-muted">গত ৩০ মিনিটে ভিজিটর</p></div>
          <div className="rounded-lg bg-surface p-4 text-center"><p className="text-3xl font-bold">{data?.today ?? 0}</p><p className="mt-1 text-xs text-muted">আজ মোট ভিজিটর</p></div>
        </div>

        {n === 0 ? <div className="mt-4"><Empty>এই মুহূর্তে কেউ সাইটে নেই</Empty></div> : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">কে কোন পেজে আছেন</p>
              <ul className="divide-y divide-line rounded-md border border-line text-sm">
                {data.visitors.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{PAGE_NAME(v.path)}{clean(v.title) && v.path !== '/' ? <span className="font-normal text-muted"> · {clean(v.title)}</span> : null}</span>
                      <span className="block text-xs text-muted">{DEV[v.device] || v.device} · {SRC(v.src)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{dur(v.since)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">পেজ অনুযায়ী</p>
                {data.pages.map((p) => <div key={p.path} className="flex justify-between gap-2 py-0.5"><span className="truncate">{PAGE_NAME(p.path)}{p.path.startsWith('/product/') && clean(p.title) ? ` · ${clean(p.title)}` : ''}</span><b>{p.count}</b></div>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">ডিভাইস</p>
                {Object.entries(data.devices).filter(([, c]) => c).map(([d, c]) => <div key={d} className="flex justify-between py-0.5"><span>{DEV[d] || d}</span><b>{c}</b></div>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">কোথা থেকে এসেছেন</p>
                {Object.entries(data.sources).map(([s, c]) => <div key={s} className="flex justify-between py-0.5"><span className="truncate">{SRC(s)}</span><b>{c}</b></div>)}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
