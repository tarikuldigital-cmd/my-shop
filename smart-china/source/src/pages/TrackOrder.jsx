import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { EmptyState, Spinner } from '../components/common/ui'
import useAsync from '../hooks/useAsync'
import { getTracking } from '../services/orderService'
import { useSite } from '../context/SiteContext'
import { useSeo } from '../lib/seo'
import { COURIERS, COURIER_ST, trackUrl } from '../store/db'
import { formatPrice } from '../utils/format'

const STEPS = [
  ['pending', 'Order placed', 'We have received your order'],
  ['confirmed', 'Order confirmed', 'Confirmed by our team'],
  ['ready', 'Handed to courier', 'Packed and handed to the courier'],
  ['transit', 'On the way', 'The courier is bringing it to you'],
  ['delivered', 'Delivered', 'The parcel has reached you'],
]
const mask = (p = '') => (p.length > 6 ? `${p.slice(0, 3)}*****${p.slice(-3)}` : p)
const when = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Live courier updates: every status and rider / hub note the courier has sent for this parcel. */
function CourierUpdates({ o }) {
  const log = [...(o.courierLog || [])].reverse()
  const name = COURIERS[o.courier]?.t || 'Courier'
  const latest = log[0]
  return (
    <section className="mx-5 mb-5 overflow-hidden rounded-lg border border-brand/25">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-brand/5 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{name} live status</p>
          <p className="font-bold text-brand">{latest ? (COURIER_ST[o.courierStatus] || latest.message) : 'Waiting for the courier to pick up the parcel'}</p>
          <p className="text-xs text-muted">Tracking ID: <b className="text-ink">{o.tracking}</b></p>
        </div>
        <Icon name="truck" className="h-8 w-8 text-brand" />
      </div>
      {log.length > 0 ? (
        <ol className="space-y-3 px-4 py-4">
          {log.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? 'bg-accent ring-4 ring-accent/20' : 'bg-gray-300'}`} />
              <div className="min-w-0">
                <p className={`text-sm ${i === 0 ? 'font-semibold' : ''}`}>{e.message}</p>
                <p className="text-xs text-muted">{when(e.at)}{e.status && COURIER_ST[e.status] && e.message !== COURIER_ST[e.status] ? ` · ${COURIER_ST[e.status]}` : ''}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="px-4 py-4 text-sm text-muted">Courier updates (pickup, hub, rider details) will appear here as soon as {name} sends them.</p>}
    </section>
  )
}

export default function TrackOrder() {
  const { code } = useParams()
  const { settings } = useSite()
  const [tick, setTick] = useState(0)
  const { data: o, loading, error } = useAsync(() => getTracking(code), [code, tick])
  useSeo({ title: 'Order tracking', noindex: true })
  // while the parcel is moving, refresh every 2 minutes so the page stays current if left open
  useEffect(() => {
    if (!o || !['ready', 'transit', 'hold'].includes(o.status)) return
    const t = setInterval(() => !document.hidden && setTick((x) => x + 1), 120000)
    return () => clearInterval(t)
  }, [o])

  if (loading && !o) return <Spinner className="py-24" />
  if (error || !o) {
    return (
      <div className="container-x py-12">
        <EmptyState title={error?.message || 'Order not found'} icon="search">
          <Link to="/customer/order-track" className="btn-accent">Search with your mobile number</Link>
        </EmptyState>
      </div>
    )
  }

  const reached = (s) => o.history.find((h) => h.s === s || (s === 'confirmed' && ['ready', 'transit', 'delivered'].includes(h.s)))
  const order = ['pending', 'confirmed', 'ready', 'transit', 'delivered']
  const current = Math.max(0, ...o.history.map((h) => order.indexOf(h.s)).filter((i) => i >= 0), order.indexOf(o.status))
  const stopped = ['cancelled', 'returned', 'partial'].includes(o.status)
  const url = trackUrl(o)
  const dueNow = o.payment?.status === 'paid' ? 0 : o.total
  const area = settings.shipping.find((s) => s.id === o.shippingArea)
  const headline = o.status === 'cancelled' ? '✕ This order was cancelled' : o.status === 'partial' ? '↩ Partly delivered' : o.status === 'returned' ? '↩ The parcel was returned' : `● ${STEPS[current][1]}`

  return (
    <div className="container-x max-w-3xl py-6">
      <div className="card overflow-hidden">
        <div className="bg-brand px-5 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm text-white/70">Order number</p>
              <p className="text-2xl font-bold">{o.invoice}</p>
              <p className="mt-1 text-sm text-white/80">Placed on {when(o.createdAt)}</p>
            </div>
            <button onClick={() => setTick((x) => x + 1)} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25" aria-label="Refresh tracking">{loading ? 'Updating…' : '↻ Refresh'}</button>
          </div>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{headline}</p>
        </div>

        {!stopped && (
          <ol className="relative space-y-0 px-5 py-6">
            {STEPS.map(([s, title, sub], i) => {
              const done = i <= current
              const h = reached(s)
              return (
                <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${i < current ? 'bg-accent' : 'bg-line'}`} aria-hidden="true" />}
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-accent bg-accent text-white' : 'border-line bg-white text-muted'} ${i === current ? 'ring-4 ring-accent/20' : ''}`}>
                    {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : <span className="text-xs">{i + 1}</span>}
                  </span>
                  <div className="pt-1">
                    <p className={`font-semibold ${done ? '' : 'text-muted'}`}>{title}</p>
                    <p className="text-xs text-muted">{done && h ? when(h.at) : sub}</p>
                    {s === 'ready' && done && o.courier && <p className="mt-1 text-sm">{COURIERS[o.courier]?.t} · Tracking: <b>{o.tracking}</b></p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {o.courier && o.tracking && <CourierUpdates o={o} />}

        {url && !stopped && (
          <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-3 text-sm">
            <span>Also available on the {COURIERS[o.courier].t} website</span>
            <a href={url} target="_blank" rel="noreferrer" className="btn-outline">Open {COURIERS[o.courier].t} tracking ↗</a>
          </div>
        )}

        <div className="grid gap-4 border-t border-line p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">Delivery</p>
            <p>{o.name} · {mask(o.phone)}</p>
            <p className="text-muted">{area?.label}{area?.eta ? ` · usually ${area.eta}` : ''}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold">Payment</p>
            <p>Total {formatPrice(o.total)}</p>
            <p className={dueNow ? 'text-accent' : 'text-green-700'}>{dueNow ? `Pay ${formatPrice(dueNow)} to the rider on delivery` : 'Paid'}</p>
          </div>
        </div>

        <ul className="divide-y divide-line border-t border-line px-5 text-sm">
          {o.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-2.5"><Link to={`/product/${i.slug}`} className="line-clamp-1 hover:text-brand">{i.name}{i.variant ? ` (${i.variant})` : ''} × {i.quantity}</Link><span>{formatPrice(i.price * i.quantity)}</span></li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3 border-t border-line bg-surface p-5">
          <a href={`tel:${settings.phone}`} className="btn-brand"><Icon name="phone" className="h-4 w-4" />Call {settings.phone}</a>
          <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}?text=${encodeURIComponent(`I have a question about my order ${o.invoice}`)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] text-white"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
          {o.status === 'delivered' && o.items[0] && <Link to={`/product/${o.items[0].slug}`} className="btn-outline">Review the product</Link>}
        </div>
      </div>
    </div>
  )
}
