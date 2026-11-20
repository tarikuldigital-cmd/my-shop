import { useState } from 'react'
import { Link } from 'react-router-dom'
import { S, STATUS, ST_KEYS, COURIERS, DAY, HOUR, riskOf, useDb, clearDemoData } from '../store/db'
import { Chips, HBars, Kpi, Panel, Pill, tk, startOfDay, toast, fdate } from './ui'
import { LiveVisitorsPanel } from './LiveVisitors'
import { EmployeePerformance, ParcelSuccess } from './PerformancePanels'

const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7', '7 days'], ['30', '30 days'], ['all', 'All time']]
function bounds(r) {
  const t0 = startOfDay()
  if (r === 'today') return [t0, Infinity]
  if (r === 'yesterday') return [t0 - DAY, t0]
  if (r === 'all') return [0, Infinity]
  return [t0 - (+r - 1) * DAY, Infinity]
}
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0)
function Delta({ cur, prev, invert = false }) {
  const d = pct(cur, prev)
  if (!d) return <span className="text-muted">no change vs previous period</span>
  const good = invert ? d < 0 : d > 0
  return <span className={good ? 'text-green-600' : 'text-red-600'}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}% <span className="text-muted">vs previous period</span></span>
}
const isLive = (o) => !['cancelled', 'returned'].includes(o.status)

function BarChart({ data, metric = 'v' }) {
  const max = Math.max(1, ...data.map((d) => d[metric]))
  return (
    <div className="flex h-44 items-end gap-0.5 sm:gap-1" role="img" aria-label="Orders per day">
      {data.map((d, i) => (
        <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="relative w-full rounded-t bg-brand/80 transition group-hover:bg-accent" style={{ height: `${Math.max(2, (d[metric] / max) * 150)}px` }} title={`${d.label}: ${d.v} orders, ${tk(d.s)}`} />
          {(i % Math.ceil(data.length / 10) === 0 || i === data.length - 1) && <span className="text-[10px] text-muted">{d.label}</span>}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  useDb()
  const [range, setRange] = useState('30')
  const [metric, setMetric] = useState('v')
  const [a, b] = bounds(range)
  const L = S.orders.filter((o) => o.createdAt >= a && o.createdAt < b)
  const live = L.filter(isLive)
  const sales = live.reduce((s, o) => s + o.total, 0)
  const by = (st) => L.filter((o) => o.status === st)
  // previous period of equal length, for growth indicators
  const span = range === 'all' ? 0 : b === Infinity ? Date.now() - a : b - a
  const P = span ? S.orders.filter((o) => o.createdAt >= a - span && o.createdAt < a) : []
  const pLive = P.filter(isLive)
  const pSales = pLive.reduce((s, o) => s + o.total, 0)
  // new vs returning customers (by phone)
  const seenBefore = new Set(S.orders.filter((o) => o.createdAt < a).map((o) => o.phone))
  const buyers = [...new Set(L.map((o) => o.phone))]
  const returning = buyers.filter((ph) => seenBefore.has(ph)).length
  const newCust = buyers.length - returning
  const recent = [...S.orders].sort((x, y) => y.createdAt - x.createdAt).slice(0, 8)
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
  if (low.length) insights.push(['warn', `${low.length} product(s) have 3 or fewer left in stock, e.g. ${low[0].name}.`, '/admin/products'])
  const rv = S.reviews.filter((r) => !r.approved).length
  if (rv) insights.push(['ok', `${rv} new review(s) waiting for approval.`, '/admin/reviews'])
  if (topCats[0]) insights.push(['ok', `Top-selling category in this period: ${topCats[0][0]} (${topCats[0][2]}).`])
  const hasDemo = S.orders.some((o) => o.demo) || S.incomplete.some((x) => x.demo)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <LiveVisitorsPanel />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips items={RANGES} value={range} onChange={setRange} />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/admin/orders" className="btn-outline">Orders{by('pending').length ? ` (${by('pending').length} pending)` : ''}</Link>
          <Link to="/admin/products" className="btn-outline">Products</Link>
          <Link to="/admin/incomplete" className="btn-outline">Incomplete{inc.length ? ` (${inc.length})` : ''}</Link>
        </div>
      </div>
      {hasDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span>The dashboard shows <b>sample orders</b> so you can try every feature. Real orders from the website appear here too.</span>
          <button className="btn-outline" onClick={() => { clearDemoData(); toast('Sample orders removed') }}>Clear sample data</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total sales" value={tk(sales)} sub={range === 'all' ? 'excl. cancelled/returned' : <Delta cur={sales} prev={pSales} />} tone="border-accent" />
        <Kpi label="Total orders" value={L.length} sub={range === 'all' ? `${by('pending').length} pending` : <Delta cur={L.length} prev={P.length} />} />
        <Kpi label="Avg. order value" value={tk(live.length ? sales / live.length : 0)} sub={range === 'all' ? undefined : <Delta cur={live.length ? sales / live.length : 0} prev={pLive.length ? pSales / pLive.length : 0} />} tone="border-sky-500" />
        <Kpi label="Delivered" value={by('delivered').length} sub={`${tk(by('delivered').reduce((s, o) => s + o.total, 0))} · ${rate(by('delivered').length, L.length)}% of orders`} tone="border-green-500" />
        <Kpi label="Cancelled" value={by('cancelled').length} sub={`Cancel rate ${rate(by('cancelled').length, L.length)}%`} tone="border-red-500" />
        <Kpi label="Returned" value={by('returned').length} sub={`Return rate ${rate(by('returned').length, by('delivered').length + by('returned').length)}%`} tone="border-rose-500" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Sales overview" sub={`last ${days} days`} className="xl:col-span-2" action={<Chips items={[['v', 'Orders'], ['s', 'Revenue']]} value={metric} onChange={setMetric} />}><BarChart data={trend} metric={metric} /></Panel>
        <Panel title="Orders by status"><HBars rows={ST_KEYS.map((k) => [STATUS[k].t, by(k).length]).filter((r) => r[1])} /></Panel>
        <Panel title="Recent orders" className="xl:col-span-2" action={<Link to="/admin/orders" className="text-sm font-semibold text-brand">View all →</Link>}>
          {recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted"><tr><th className="py-1">Order</th><th>Customer</th><th>Total</th><th>Status</th><th className="text-right">Placed</th></tr></thead>
                <tbody>{recent.map((o) => (
                  <tr key={o.id || o.invoice} className="border-t border-line">
                    <td className="py-1.5 font-medium">{o.invoice}</td><td className="max-w-[9rem] truncate">{o.name}</td><td>{tk(o.total)}</td><td><Pill s={o.status} /></td><td className="text-right text-xs text-muted">{fdate(o.createdAt)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted">No orders yet.</p>}
        </Panel>
        <Panel title="Customers" sub="this period">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-surface p-3"><p className="text-2xl font-bold">{buyers.length}</p>Buyers</div>
            <div className="rounded-md bg-surface p-3"><p className="text-2xl font-bold">{newCust}</p>New</div>
            <div className="rounded-md bg-surface p-3"><p className="text-2xl font-bold">{returning}</p>Returning</div>
          </div>
        </Panel>
        <Panel title="Low stock" sub="3 or fewer left" action={<Link to="/admin/products" className="text-sm font-semibold text-brand">Manage →</Link>}>
          {low.length ? (
            <ul className="divide-y divide-line text-sm">
              {low.slice(0, 6).map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-1.5"><span className="truncate">{p.name}</span><span className={`shrink-0 font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">All products are well stocked.</p>}
        </Panel>
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
        <Panel title="Best-selling products"><HBars rows={topBooks} /></Panel>
        <Panel title="Sales by category"><HBars rows={topCats} /></Panel>
        <Panel title="Order source"><HBars rows={Object.entries(sources).sort((x, y) => y[1] - x[1])} /></Panel>
        <Panel title="Courier performance" className="xl:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Courier</th><th>Orders</th><th>Delivered</th><th>Returned</th><th>Success</th></tr></thead>
            <tbody>{cour.map((c) => <tr key={c.c} className="border-t border-line"><td className="py-1.5">{COURIERS[c.c].t}</td><td>{c.n}</td><td>{c.d}</td><td>{c.r}</td><td>{c.d + c.r ? `${c.rate}%` : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="COD with couriers"><p className="text-2xl font-bold">{tk(codPipe)}</p><p className="text-xs text-muted">Ready + in-transit orders, cash still to collect</p></Panel>
        <ParcelSuccess />
        <EmployeePerformance from={a} to={b} rangeLabel={(RANGES.find((r) => r[0] === range) || [])[1]} />
      </div>
    </div>
  )
}
