import { Link, useParams } from 'react-router-dom'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { EmptyState, Spinner } from '../components/common/ui'
import useAsync from '../hooks/useAsync'
import { getTracking } from '../services/orderService'
import { useSite } from '../context/SiteContext'
import { useSeo } from '../lib/seo'
import { COURIERS, trackUrl } from '../store/db'
import { formatPrice } from '../utils/format'

const STEPS = [
  ['pending', 'অর্ডার গ্রহণ করা হয়েছে', 'আমরা আপনার অর্ডারটি পেয়েছি'],
  ['confirmed', 'অর্ডার কনফার্ম', 'ফোনে অর্ডারটি নিশ্চিত করা হয়েছে'],
  ['ready', 'প্যাক করে কুরিয়ারে দেওয়া হয়েছে', 'বই প্যাক করে কুরিয়ারে হস্তান্তর'],
  ['transit', 'পথে আছে', 'কুরিয়ার আপনার ঠিকানায় নিয়ে আসছে'],
  ['delivered', 'ডেলিভারি সম্পন্ন', 'বই আপনার হাতে পৌঁছেছে'],
]
const mask = (p = '') => (p.length > 6 ? `${p.slice(0, 3)}*****${p.slice(-3)}` : p)
const when = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function TrackOrder() {
  const { code } = useParams()
  const { settings } = useSite()
  const { data: o, loading, error } = useAsync(() => getTracking(code), [code])
  useSeo({ title: 'অর্ডার ট্র্যাকিং', noindex: true })

  if (loading) return <Spinner className="py-24" />
  if (error || !o) {
    return (
      <div className="container-x py-12">
        <EmptyState title={error?.message || 'অর্ডার পাওয়া যায়নি'} icon="search">
          <Link to="/customer/order-track" className="btn-accent">মোবাইল নাম্বার দিয়ে খুঁজুন</Link>
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

  return (
    <div className="container-x max-w-3xl py-6">
      <div className="card overflow-hidden">
        <div className="bg-brand px-5 py-5 text-white">
          <p className="text-sm text-white/70">অর্ডার নম্বর</p>
          <p className="text-2xl font-bold">{o.invoice}</p>
          <p className="mt-1 text-sm text-white/80">অর্ডারের তারিখ: {when(o.createdAt)}</p>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {stopped ? (o.status === 'cancelled' ? '✕ অর্ডারটি বাতিল হয়েছে' : '↩ অর্ডারটি ফেরত এসেছে') : `● ${STEPS[current][1]}`}
          </p>
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
                    {s === 'ready' && done && o.courier && (
                      <p className="mt-1 text-sm">{COURIERS[o.courier].t} · ট্র্যাকিং: <b>{o.tracking}</b></p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {url && !stopped && (
          <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
            <span><Icon name="truck" className="mr-1 inline h-5 w-5 text-accent" /> {COURIERS[o.courier].t}-এর সাইটে পার্সেলের সর্বশেষ অবস্থান দেখুন</span>
            <a href={url} target="_blank" rel="noreferrer" className="btn-accent">কুরিয়ারে ট্র্যাক করুন ↗</a>
          </div>
        )}

        <div className="grid gap-4 border-t border-line p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">ডেলিভারি</p>
            <p>{o.name} · {mask(o.phone)}</p>
            <p className="text-muted">{area?.label}{area?.eta ? ` · সাধারণত ${area.eta}` : ''}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold">পেমেন্ট</p>
            <p>সর্বমোট {formatPrice(o.total)}</p>
            <p className={dueNow ? 'text-accent' : 'text-green-700'}>{dueNow ? `ডেলিভারির সময় দিতে হবে ${formatPrice(dueNow)}` : 'পেমেন্ট সম্পন্ন'}</p>
          </div>
        </div>

        <ul className="divide-y divide-line border-t border-line px-5 text-sm">
          {o.items.map((i) => (
            <li key={i.slug} className="flex justify-between gap-3 py-2.5"><Link to={`/product/${i.slug}`} className="line-clamp-1 hover:text-brand">{i.name} × {i.quantity}</Link><span>{formatPrice(i.price * i.quantity)}</span></li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3 border-t border-line bg-surface p-5">
          <a href={`tel:${settings.phone}`} className="btn-brand"><Icon name="phone" className="h-4 w-4" />কল করুন {settings.phone}</a>
          <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}?text=${encodeURIComponent(`আমার অর্ডার ${o.invoice} সম্পর্কে জানতে চাই`)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] text-white"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
          {o.status === 'delivered' && o.items[0] && <Link to={`/product/${o.items[0].slug}`} className="btn-outline">বইটির রিভিউ দিন</Link>}
        </div>
      </div>
    </div>
  )
}
