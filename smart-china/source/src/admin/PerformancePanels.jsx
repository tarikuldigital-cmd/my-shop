// Employee performance + parcel success ratio (shared by the admin Dashboard).
import { useState } from 'react'
import { S, DAY } from '../store/db'
import { Chips, Panel, startOfDay } from './ui'

const SYSTEM = /^(customer|system|website|courier|steadfast|pathao|redx|webhook)/i
const confirmer = (o) => (o.history || []).find((h) => h.s === 'confirmed')
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0)

function Ratio({ v, n }) {
  const p = pc(v, n)
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-16 overflow-hidden rounded-full bg-surface"><i className={`block h-full rounded-full ${p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${p}%` }} /></span>
      <b className="tabular-nums">{n ? `${p}%` : '—'}</b>
    </span>
  )
}

/** Who confirmed which orders, and how those orders ended. */
export function EmployeePerformance({ from = 0, to = Infinity, rangeLabel }) {
  const rows = {}
  const row = (n) => (rows[n] ||= { name: n, confirmed: 0, delivered: 0, cancelled: 0, returned: 0, open: 0, sent: 0 })
  S.orders.forEach((o) => {
    const c = confirmer(o)
    if (c && c.at >= from && c.at < to && !SYSTEM.test(c.by || '')) {
      const r = row(c.by)
      r.confirmed++
      if (o.status === 'delivered') r.delivered++
      else if (o.status === 'cancelled') r.cancelled++
      else if (['returned', 'partial'].includes(o.status)) r.returned++
      else r.open++
    }
    ;(o.history || []).forEach((h) => { if (h.s === 'ready' && h.at >= from && h.at < to && !SYSTEM.test(h.by || '')) row(h.by).sent++ })
  })
  const list = Object.values(rows).sort((a, b) => b.confirmed - a.confirmed)
  return (
    <Panel title="Employee performance" sub={`orders confirmed · ${rangeLabel}`} className="xl:col-span-3">
      {list.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Employee</th><th>Confirmed</th><th>Sent to courier</th><th>Delivered</th><th>Cancelled</th><th>Returned</th><th>In progress</th><th>Delivery success</th></tr></thead>
            <tbody>{list.map((r, i) => (
              <tr key={r.name} className="border-t border-line">
                <td className="py-1.5 font-medium">{i === 0 && list.length > 1 ? '🏆 ' : ''}{r.name}</td><td className="font-semibold">{r.confirmed}</td><td>{r.sent}</td><td className="text-green-700">{r.delivered}</td><td className="text-red-600">{r.cancelled}</td><td className="text-rose-600">{r.returned}</td><td className="text-muted">{r.open}</td>
                <td><Ratio v={r.delivered} n={r.delivered + r.cancelled + r.returned} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted">No confirmed orders in this period. Each order is credited to the employee who confirmed it.</p>}
    </Panel>
  )
}

/** Delivered vs cancelled vs returned for 1 day / 7 days / 30 days. */
export function ParcelSuccess() {
  const [view, setView] = useState('all')
  const t0 = startOfDay()
  const W = [['Today', t0], ['7 days', t0 - 6 * DAY], ['30 days', t0 - 29 * DAY]]
  const stat = (from, filt) => {
    const L = S.orders.filter((o) => o.createdAt >= from && filt(o))
    const d = L.filter((o) => o.status === 'delivered').length
    const c = L.filter((o) => o.status === 'cancelled').length
    const r = L.filter((o) => ['returned', 'partial'].includes(o.status)).length
    return { n: L.length, d, c, r, open: L.length - d - c - r }
  }
  const shipped = (o) => (o.history || []).some((h) => ['ready', 'transit', 'delivered'].includes(h.s)) || !!o.courier
  const filt = view === 'ship' ? shipped : () => true
  return (
    <Panel title="Parcel success ratio" sub="delivered vs cancelled" className="xl:col-span-3" action={<Chips items={[['all', 'All orders'], ['ship', 'Sent to courier']]} value={view} onChange={setView} />}>
      <div className="grid gap-3 md:grid-cols-3">
        {W.map(([label, from]) => {
          const s = stat(from, filt)
          return (
            <div key={label} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex items-center justify-between"><b>{label}</b><span className="text-xs text-muted">{s.n} orders</span></div>
              <p className="text-3xl font-extrabold text-green-700">{pc(s.d, s.d + s.c + s.r)}%<span className="ml-1 text-xs font-medium text-muted">delivery success</span></p>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
                <div className="rounded bg-green-50 p-1.5"><p className="text-base font-bold text-green-700">{s.d}</p>Delivered</div>
                <div className="rounded bg-red-50 p-1.5"><p className="text-base font-bold text-red-600">{s.c}</p>Cancelled</div>
                <div className="rounded bg-rose-50 p-1.5"><p className="text-base font-bold text-rose-600">{s.r}</p>Returned</div>
                <div className="rounded bg-surface p-1.5"><p className="text-base font-bold">{s.open}</p>In progress</div>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
