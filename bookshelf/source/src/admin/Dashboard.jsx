import { useState } from 'react'
import { Link } from 'react-router-dom'
import { S, STATUS, ST_KEYS, COURIERS, DAY, HOUR, riskOf, useDb, clearDemoData } from '../store/db'
import { Chips, HBars, Kpi, Panel, tk, startOfDay, toast } from './ui'

const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7', '7 days'], ['30', '30 days'], ['all', 'All time']]
function bounds(r) {
  const t0 = startOfDay()
  if (r === 'today') return [t0, Infinity]
  if (r === 'yesterday') return [t0 - DAY, t0]
  if (r === 'all') return [0, Infinity]
  return [t0 - (+r - 1) * DAY, Infinity]
}
const isLive = (o) => !['cancelled', 'returned'].includes(o.status)

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  return (
    <div className="flex h-44 items-end gap-0.5 sm:gap-1" role="img" aria-label="Orders per day">
      {data.map((d, i) => (
        <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="relative w-full rounded-t bg-brand/80 transition group-hover:bg-accent" style={{ height: `${Math.max(2, (d.v / max) * 150)}px` }} title={`${d.label}: ${d.v} orders, ${tk(d.s)}`} />
          {(i % Math.ceil(data.length / 10) === 0 || i === data.length - 1) && <span className="text-[10px] text-muted">{d.label}</span>}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  useDb()
  const [range, setRange] = useState('30')
  const [a, b] = bounds(range)
  const L = S.orders.filter((o) => o.createdAt >= a && o.createdAt < b)
  const live = L.filter(isLive)
  const sales = live.reduce((s, o) => s + o.total, 0)
  const by = (st) => L.filter((o) => o.status === st)
  const rate = (x, y) => (y ? Math.round((x / y) * 100) : 0)

  const days = range === 'all' ? 30 : ['today', 'yesterday'].includes(range) ? 7 : +range
  const t0 = startOfDay()
  const trend = Array.from({ length: days }, (_, k) => {
    const d0 = t0 - (days - 1 - k) * DAY
    const os = S.orders.filter((o) => o.createdAt >= d0 && o.createdAt < d0 + DAY)
    const dd = new Date(d0)
    return { label: `${dd.getDate()}/${dd.getMonth() + 1}`, v: os.length, s: os.filter(isLive).reduce((s, o) => s + o.total, 0) }
  })

  const books = {}
  live.forEach((o) => o.items.forEach((i) => { books[i.name] = (books[i.name] || 0) + i.quantity }))
  const topBooks = Object.entries(books).sort((x, y) => y[1] - x[1]).slice(0, 7)
  const cats = {}
  live.forEach((o) => o.items.forEach((i) => {
    const p = S.products.find((x) => x.id === i.productId)
    const c = S.categories.find((x) => x.slug === p?.categories[0])?.name || 'Other'
    cats[c] = (cats[c] || 0) + i.price * i.quantity
  }))
  const topCats = Object.entries(cats).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, v, tk(v)])
  const sources = {}
  L.forEach((o) => { sources[o.source] = (sources[o.source] || 0) + 1 })
  const cour = Object.keys(COURIERS).map((c) => {
    const os = L.filter((o) => o.courier === c)
    const d = os.filter((o) => o.status === 'delivered').length
    const r = os.filter((o) => o.status === 'returned').length
    return { c, n: os.length, d, r, rate: rate(d, d + r) }
  })

  const now = Date.now()
  const lastAt = (o) => o.history[o.history.length - 1].at
  const p6 = S.orders.filter((o) => o.status === 'pending' && now - o.createdAt > 6 * HOUR)
  const r24 = S.orders.filter((o) => o.status === 'ready' && now - lastAt(o) > 24 * HOUR)
  const t5 = S.orders.filter((o) => o.status === 'transit' && now - lastAt(o) > 5 * DAY)
  const inc = S.incomplete.filter((x) => x.status === 'new')
  const payPending = S.orders.filter((o) => o.payment?.status === 'pending')
  const low = S.products.filter((p) => typeof p.stock === 'number' && p.stock <= 3)
  const codPipe = S.orders.filter((o) => ['ready', 'transit'].includes(o.status)).reduce((s, o) => s + o.total, 0)

  const insights = []
  if (payPending.length) insights.push(['warn', `${payPending.length} bKash/Nagad payment(s) waiting for TrxID verification.`, '/admin/orders'])
  if (inc.length) insights.push(['warn', `${inc.length} incomplete checkout(s) waiting for a call — potential ${tk(inc.reduce((s, x) => s + x.subtotal, 0))}.`, '/admin/incomplete'])
  if (p6.length) insights.push(['warn', `${p6.length} order(s) pending for more than 6 hours. Late confirmation raises cancellations.`, '/admin/orders'])
  S.orders.filter((o) => ['pending', 'confirmed', 'hold'].includes(o.status)).map((o) => [o, riskOf(o)]).filter(([, r]) => r.length).slice(0, 3)
    .forEach(([o, r]) => insights.push(['risk', `${o.invoice} (${o.name}): ${r[0]}. Call before shipping.`, '/admin/orders']))
  if (low.length) insights.push(['warn', `${low.length} book(s) have 3 or fewer copies left, e.g. ${low[0].name}.`, '/admin/products'])
  const rv = S.reviews.filter((r) => !r.approved).length
  if (rv) insights.push(['ok', `${rv} new review(s) waiting for approval.`, '/admin/reviews'])
  if (topCats[0]) insights.push(['ok', `Top-selling category in this period: ${topCats[0][0]} (${topCats[0][2]}).`])
  const hasDemo = S.orders.some((o) => o.demo) || S.incomplete.some((x) => x.demo)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Chips items={RANGES} value={range} onChange={setRange} />
      </div>
      {hasDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span>The dashboard shows <b>sample orders</b> so you can try every feature. Real orders from the website appear here too.</span>
          <button className="btn-outline" onClick={() => { clearDemoData(); toast('Sample orders removed') }}>Clear sample data</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total orders" value={L.length} sub={`${by('pending').length} pending`} />
        <Kpi label="Total sales" value={tk(sales)} sub="excl. cancelled/returned" tone="border-accent" />
        <Kpi label="Delivered" value={by('delivered').length} sub={tk(by('delivered').reduce((s, o) => s + o.total, 0))} tone="border-green-500" />
        <Kpi label="Cancelled" value={by('cancelled').length} sub={`Cancel rate ${rate(by('cancelled').length, L.length)}%`} tone="border-red-500" />
        <Kpi label="Avg. order value" value={tk(live.length ? sales / live.length : 0)} tone="border-sky-500" />
        <Kpi label="Returned" value={by('returned').length} sub={`Return rate ${rate(by('returned').length, by('delivered').length + by('returned').length)}%`} tone="border-rose-500" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Order trend" sub={`last ${days} days`} className="xl:col-span-2"><BarChart data={trend} /></Panel>
        <Panel title="Orders by status"><HBars rows={ST_KEYS.map((k) => [STATUS[k].t, by(k).length]).filter((r) => r[1])} /></Panel>
        <Panel title="Smart insights" className="xl:col-span-2">
          {insights.length ? (
            <ul className="space-y-2">
              {insights.map(([kind, text, to], i) => (
                <li key={i} className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${kind === 'risk' ? 'border-red-200 bg-red-50' : kind === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                  <span className="flex-1">{text}</span>{to && <Link to={to} className="shrink-0 font-semibold text-brand">Open →</Link>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No alerts right now.</p>}
        </Panel>
        <Panel title="Processing SLA" sub="right now">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {[[p6.length, 'Pending > 6 h'], [r24.length, 'Ready, not picked up > 24 h'], [t5.length, 'In transit > 5 days'], [inc.length, 'Incomplete to call']].map(([v, l]) => (
              <div key={l} className={`rounded-md p-3 ${v ? 'bg-red-50 text-red-700' : 'bg-surface'}`}><p className="text-2xl font-bold">{v}</p>{l}</div>
            ))}
          </div>
        </Panel>
        <Panel title="Best-selling books"><HBars rows={topBooks} /></Panel>
        <Panel title="Sales by category"><HBars rows={topCats} /></Panel>
        <Panel title="Order source"><HBars rows={Object.entries(sources).sort((x, y) => y[1] - x[1])} /></Panel>
        <Panel title="Courier performance" className="xl:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Courier</th><th>Orders</th><th>Delivered</th><th>Returned</th><th>Success</th></tr></thead>
            <tbody>{cour.map((c) => <tr key={c.c} className="border-t border-line"><td className="py-1.5">{COURIERS[c.c].t}</td><td>{c.n}</td><td>{c.d}</td><td>{c.r}</td><td>{c.d + c.r ? `${c.rate}%` : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="COD with couriers"><p className="text-2xl font-bold">{tk(codPipe)}</p><p className="text-xs text-muted">Ready + in-transit orders, cash still to collect</p></Panel>
      </div>
    </div>
  )
}
