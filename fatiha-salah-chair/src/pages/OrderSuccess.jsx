import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import Img from '../components/common/Img'
import { useSite } from '../context/SiteContext'
import { formatPrice } from '../utils/format'

const PAY = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' }

function waLink(base, phone, text) {
  let url = (base || '').trim()
  if (!url) {
    const d = String(phone || '').replace(/\D/g, '')
    if (!d) return ''
    url = `https://wa.me/${d.startsWith('0') ? '88' + d : d}`
  }
  return `${url}${url.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`
}

const STEPS = [
  { icon: 'check', t: 'অর্ডার গৃহীত', d: 'এইমাত্র' },
  { icon: 'phone', t: 'ফোনে কনফার্ম', d: 'কিছুক্ষণের মধ্যে' },
  { icon: 'box', t: 'প্যাকিং ও শিপিং', d: '২৪ ঘণ্টার মধ্যে' },
  { icon: 'truck', t: 'ডেলিভারি', d: 'ঢাকায় ১–২ দিন, বাইরে ২–৩ দিন' },
]

export default function OrderSuccess() {
  const { invoice } = useParams()
  const order = useLocation().state?.order
  const { settings } = useSite()
  const [copied, setCopied] = useState(false)

  const items = order?.items || []
  const msg = [
    'আসসালামু আলাইকুম, আমি ওয়েবসাইট থেকে অর্ডার করেছি।',
    `Invoice: ${invoice}`,
    order?.name && `নাম: ${order.name}`,
    items.length && `পণ্য: ${items.map((i) => `${i.name} x${i.quantity}`).join(', ')}`,
    order?.total != null && `মোট: ${formatPrice(order.total)}`,
  ].filter(Boolean).join('\n')
  const wa = waLink(settings?.whatsappUrl, settings?.phone, msg)
  const track = order?.trackCode ? `/track/${order.trackCode}` : '/customer/order-track'
  const method = order?.payment?.method || 'cod'

  const copy = async () => {
    try { await navigator.clipboard.writeText(invoice); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="bg-gradient-to-b from-green-50 via-white to-white">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Hero */}
          <div className="card overflow-hidden p-0 text-center">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 pb-8 pt-9 text-white">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-green-600 shadow-lg"><Icon name="check" className="h-10 w-10" strokeWidth={3} /></span>
              </div>
              <h1 className="mt-5 text-2xl font-bold md:text-3xl">ধন্যবাদ{order?.name ? `, ${order.name}` : ''}!</h1>
              <p className="mt-1 text-white/90">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে</p>
            </div>
            <div className="-mt-5 px-6 pb-6">
              <div className="mx-auto inline-flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 shadow-sm">
                <span className="text-sm text-muted">Invoice</span>
                <span className="font-mono text-lg font-bold tracking-wide text-ink">{invoice}</span>
                <button onClick={copy} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200" aria-label="Copy invoice">
                  <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />{copied ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>
              <p className="mt-4 text-sm text-muted">আমাদের প্রতিনিধি শীঘ্রই <b className="text-ink">{order?.phone || 'আপনার নাম্বারে'}</b> ফোন করে অর্ডারটি নিশ্চিত করবেন। ট্র্যাকিং লিংক SMS-এ পাঠানো হবে।</p>
            </div>
          </div>

          {/* WhatsApp CTA */}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl bg-[#25d366] p-4 text-white shadow-md transition hover:brightness-105 active:scale-[.99]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"><WhatsAppIcon className="h-7 w-7" /></span>
              <span className="flex-1 text-left">
                <span className="block text-base font-bold">WhatsApp-এ মেসেজ দিন</span>
                <span className="block text-sm text-white/90">দ্রুত কনফার্ম বা যেকোনো প্রশ্নের জন্য — অর্ডারের তথ্য নিজে থেকেই লেখা থাকবে</span>
              </span>
              <Icon name="arrowRight" className="h-5 w-5 shrink-0" />
            </a>
          )}

          {/* What happens next */}
          <div className="card p-5">
            <h2 className="font-semibold">এরপর কী হবে?</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-4 sm:gap-2">
              {STEPS.map((s, i) => (
                <li key={s.t} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${i === 0 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon name={s.icon} className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-semibold">{s.t}</span><span className="block text-xs text-muted">{s.d}</span></span>
                </li>
              ))}
            </ol>
          </div>

          {/* Order summary */}
          {order && (
            <div className="card p-5">
              <h2 className="font-semibold">অর্ডারের বিবরণ</h2>
              <ul className="mt-3 divide-y divide-line">
                {items.map((i, k) => (
                  <li key={k} className="flex items-center gap-3 py-3">
                    <Img src={i.image} alt={i.name} className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-snug">{i.name}</p><p className="text-xs text-muted">{formatPrice(i.price)} × {i.quantity}</p></div>
                    <p className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
                {order.subtotal != null && <div className="flex justify-between"><dt className="text-muted">সাবটোটাল</dt><dd>{formatPrice(order.subtotal)}</dd></div>}
                {order.shippingCharge != null && <div className="flex justify-between"><dt className="text-muted">ডেলিভারি চার্জ</dt><dd>{formatPrice(order.shippingCharge)}</dd></div>}
                {!!order.discount && <div className="flex justify-between text-green-700"><dt>ডিসকাউন্ট</dt><dd>− {formatPrice(order.discount)}</dd></div>}
                <div className="flex justify-between pt-1 text-base font-bold"><dt>সর্বমোট</dt><dd className="text-accent">{formatPrice(order.total)}</dd></div>
              </dl>
              <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div className="flex gap-2"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><div><p className="text-xs text-muted">ডেলিভারি ঠিকানা</p><p className="font-medium">{order.address}</p></div></div>
                <div className="flex gap-2"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><div><p className="text-xs text-muted">পেমেন্ট</p><p className="font-medium">{PAY[method] || method}{method === 'cod' ? ' — পণ্য হাতে পেয়ে টাকা দিন' : ' — পেমেন্ট যাচাই করা হবে'}</p></div></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to={track} className="btn-brand flex items-center justify-center gap-2"><Icon name="truck" className="h-4 w-4" />অর্ডার ট্র্যাক করুন</Link>
            {settings?.phone && <a href={`tel:${settings.phone}`} className="btn-outline flex items-center justify-center gap-2"><Icon name="phone" className="h-4 w-4" />কল করুন</a>}
            <Link to="/" className="btn-outline flex items-center justify-center gap-2"><Icon name="cart" className="h-4 w-4" />আরও কেনাকাটা</Link>
          </div>
          <p className="text-center text-xs text-muted">কোনো সমস্যা হলে <Link to="/complain" className="underline">এখানে অভিযোগ জানান</Link></p>
        </div>
      </div>
    </div>
  )
}
