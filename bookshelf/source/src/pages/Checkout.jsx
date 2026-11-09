import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Img from '../components/common/Img'
import Icon from '../components/common/Icon'
import { Alert, EmptyState } from '../components/common/ui'
import QtyStepper from '../components/product/QtyStepper'
import { useCart } from '../context/CartContext'
import { useSite } from '../context/SiteContext'
import { useAuth } from '../context/AuthContext'
import { placeOrder, saveCheckoutDraft, discardCheckoutDraft } from '../services/orderService'
import { validPhone, couponCalc, shippingFor } from '../store/db'
import { LIVE } from '../config/env'
import { liveValidateCoupon } from '../lib/live'
import { track, customerData } from '../lib/tracking'
import { useSeo } from '../lib/seo'
import { formatPrice } from '../utils/format'

// NOTE: the live checkout page could not be inspected (blocked to crawlers). Fields follow the
// site's own "Order procedure" page: name, mobile, full address, delivery area, payment method.
export default function Checkout() {
  const { items, subtotal, setQty, remove, clear } = useCart()
  const { settings } = useSite()
  const { user } = useAuth()
  const navigate = useNavigate()
  useSeo({ title: 'অর্ডার করুন', noindex: true })

  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', shippingArea: settings.shipping[0].id, paymentMethod: 'cod', trx: '', sender: '', note: '' })
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponMsg, setCouponMsg] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const draftId = useRef(`d${Date.now()}`)
  const done = useRef(false)

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || '', phone: f.phone || user.phone || '', address: f.address || user.address || '' }))
  }, [user])
  useEffect(() => { if (items.length) track('InitiateCheckout', { items, value: subtotal }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Incomplete-order capture: once a valid mobile number is typed, keep a draft for the admin to follow up.
  useEffect(() => {
    if (done.current || !validPhone(form.phone) || !items.length) return
    const t = setTimeout(() => saveCheckoutDraft(draftId.current, {
      name: form.name.trim(), phone: form.phone, address: form.address.trim(), shippingArea: form.shippingArea,
      items: items.map(({ productId, slug, name, price, quantity }) => ({ productId, slug, name, price, quantity })), subtotal,
    }), 800)
    return () => clearTimeout(t)
  }, [form.name, form.phone, form.address, form.shippingArea, items, subtotal])

  const area = settings.shipping.find((s) => s.id === form.shippingArea)
  const shippingCharge = items.length ? shippingFor(form.shippingArea, subtotal) : 0
  // live mode: coupon codes never leave the server — it validates and returns the discount
  const [srvDiscount, setSrvDiscount] = useState(0)
  useEffect(() => {
    if (!LIVE || !coupon) { setSrvDiscount(0); return }
    let off = false
    liveValidateCoupon(coupon, subtotal).then((r) => { if (!off) { if (r.error) { setCoupon(''); setSrvDiscount(0); setCouponMsg({ type: 'error', text: r.error }) } else setSrvDiscount(r.discount) } }).catch(() => {})
    return () => { off = true }
  }, [coupon, subtotal])
  const cc = LIVE ? { discount: srvDiscount } : couponCalc(coupon, subtotal)
  const total = subtotal + shippingCharge - (cc.discount || 0)
  const freeMin = settings.freeShippingMin
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const payMethods = [['cod', 'ক্যাশ অন ডেলিভারি', 'বই হাতে পেয়ে টাকা দিন'], settings.bkashNumber && ['bkash', 'bKash', `Send Money: ${settings.bkashNumber}`], settings.nagadNumber && ['nagad', 'Nagad', `Send Money: ${settings.nagadNumber}`]].filter(Boolean)

  const applyCoupon = async () => {
    let r
    if (LIVE) { try { r = await liveValidateCoupon(couponInput, subtotal) } catch (e) { r = { error: e.message } } } else r = couponCalc(couponInput, subtotal)
    if (r.error) { setCoupon(''); setCouponMsg({ type: 'error', text: r.error }) }
    else { setCoupon(couponInput); setCouponMsg({ type: 'success', text: `কুপন যোগ হয়েছে — ${formatPrice(r.discount)} ছাড়` }) }
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'আপনার নাম লিখুন'
    if (!validPhone(form.phone)) errs.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন'
    if (form.address.trim().length < 10) errs.address = 'সম্পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)'
    if (form.paymentMethod !== 'cod' && (!validPhone(form.sender) || form.trx.trim().length < 6)) errs.trx = 'যে নাম্বার থেকে টাকা পাঠিয়েছেন সেটি ও সঠিক TrxID দিন'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true); setServerError('')
    try {
      done.current = true
      const eventId = `${Date.now()}.${Math.random().toString(36).slice(2, 9)}` // shared with Meta CAPI for deduplication
      const order = await placeOrder({
        ...form, couponCode: coupon, eventId,
        items: items.map(({ productId, slug, name, price, quantity, variation }) => ({ productId, slug, name, price, quantity, variation })),
      })
      await discardCheckoutDraft(draftId.current)
      track('Purchase', { items: order.items, value: order.total, orderId: order.invoice, eventId, customer: customerData(form, settings.shipping.find((x) => x.id === form.shippingArea)?.label, user?.email) })
      clear()
      navigate(`/customer/order-success/${order.invoice}`, { state: { order } })
    } catch (err) {
      done.current = false
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <div className="container-x py-12">
        <EmptyState title="আপনার কার্টে কোনো বই নেই" icon="cart">
          <Link to="/" className="btn-accent">বই বাছাই করুন</Link>
        </EmptyState>
      </div>
    )
  }

  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>

  return (
    <div className="container-x py-6">
      <h1 className="mb-4 text-xl font-bold text-brand">অর্ডার করুন</h1>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.2fr_1fr]" noValidate>
        <section className="card p-5">
          <h2 className="mb-1 font-bold">ডেলিভারি তথ্য</h2>
          <p className="mb-4 text-xs text-muted">অর্ডার কনফার্ম করতে আপনার নাম, মোবাইল নাম্বার ও ঠিকানা লিখুন।</p>
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="name">আপনার নাম *</label>
              <input id="name" className="field" value={form.name} onChange={set('name')} autoComplete="name" />
              {err('name')}
            </div>
            <div>
              <label className="field-label" htmlFor="phone">মোবাইল নাম্বার *</label>
              <input id="phone" className="field" value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" />
              {err('phone')}
            </div>
            <div>
              <label className="field-label" htmlFor="address">সম্পূর্ণ ঠিকানা *</label>
              <textarea id="address" rows={3} className="field" value={form.address} onChange={set('address')} placeholder="বাসা/রোড, এলাকা, থানা, জেলা" autoComplete="street-address" />
              {err('address')}
            </div>
            <fieldset>
              <legend className="field-label">ডেলিভারি এরিয়া *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {settings.shipping.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${form.shippingArea === s.id ? 'border-brand bg-brand/5' : 'border-line'}`}>
                    <span className="flex items-center gap-2"><input type="radio" name="area" value={s.id} checked={form.shippingArea === s.id} onChange={set('shippingArea')} />{s.label}<span className="text-xs text-muted">({s.eta})</span></span>
                    <span className="font-semibold">{formatPrice(s.charge)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">পেমেন্ট মেথড</legend>
              <div className="grid gap-2">
                {payMethods.map(([id, label, sub]) => (
                  <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${form.paymentMethod === id ? 'border-brand bg-brand/5' : 'border-line'}`}>
                    <input type="radio" name="payment" value={id} checked={form.paymentMethod === id} onChange={set('paymentMethod')} />
                    <span className="font-medium">{label}</span><span className="text-xs text-muted">{sub}</span>
                  </label>
                ))}
              </div>
              {form.paymentMethod !== 'cod' && (
                <div className="mt-3 space-y-3 rounded-md bg-surface p-3 text-sm">
                  <p>{form.paymentMethod === 'bkash' ? settings.bkashNumber : settings.nagadNumber} নাম্বারে <b>{formatPrice(total)}</b> Send Money করে নিচে তথ্য দিন।</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="field" placeholder="যে নাম্বার থেকে পাঠিয়েছেন" inputMode="tel" value={form.sender} onChange={set('sender')} aria-label="Sender number" />
                    <input className="field uppercase" placeholder="Transaction ID (TrxID)" value={form.trx} onChange={set('trx')} aria-label="Transaction ID" />
                  </div>
                  {err('trx')}
                </div>
              )}
            </fieldset>
            <div>
              <label className="field-label" htmlFor="note">অতিরিক্ত নোট (ঐচ্ছিক)</label>
              <input id="note" className="field" value={form.note} onChange={set('note')} />
            </div>
          </div>
        </section>

        <section className="card h-fit p-5 lg:sticky lg:top-36">
          <h2 className="mb-3 font-bold">আপনার অর্ডার ({items.length})</h2>
          {freeMin > 0 && (
            <div className="mb-3 rounded-md bg-green-50 p-3 text-xs text-green-800">
              {subtotal >= freeMin ? '🎉 আপনি ফ্রি ডেলিভারি পাচ্ছেন!' : <>আর মাত্র <b>{formatPrice(freeMin - subtotal)}</b> এর বই নিলে ফ্রি ডেলিভারি</>}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-green-200"><i className="block h-full bg-green-600" style={{ width: `${Math.min(100, (subtotal / freeMin) * 100)}%` }} /></div>
            </div>
          )}
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.slug} className="flex gap-3 py-3">
                <Img src={i.image} alt={i.name} className="h-20 w-16 shrink-0 rounded border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${i.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand">{i.name}</Link>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QtyStepper value={i.quantity} onChange={(q) => setQty(i.slug, q)} small />
                    <span className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</span>
                    <button type="button" onClick={() => remove(i.slug)} className="text-muted hover:text-red-600" aria-label={`Remove ${i.name}`}><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input className="field" placeholder="কুপন কোড" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} aria-label="Coupon code" />
            <button type="button" className="btn-outline shrink-0" onClick={applyCoupon}>প্রয়োগ করুন</button>
          </div>
          {couponMsg && <div className="mt-2"><Alert type={couponMsg.type}>{couponMsg.text}</Alert></div>}
          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>সাব-টোটাল</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>ডেলিভারি চার্জ ({area.label})</dt><dd>{shippingCharge ? formatPrice(shippingCharge) : 'ফ্রি'}</dd></div>
            {cc.discount > 0 && <div className="flex justify-between text-green-700"><dt>কুপন ছাড় ({coupon.toUpperCase()})</dt><dd>−{formatPrice(cc.discount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>সর্বমোট</dt><dd className="text-accent">{formatPrice(total)}</dd></div>
          </dl>
          <div className="mt-4"><Alert>{serverError}</Alert></div>
          <button disabled={submitting} className="btn-accent mt-3 w-full py-3 text-base">{submitting ? 'অপেক্ষা করুন...' : 'অর্ডার কনফার্ম করুন'}</button>
          <p className="mt-2 text-center text-xs text-muted">অর্ডারের পর আমাদের প্রতিনিধি ফোনে অর্ডারটি নিশ্চিত করবেন।</p>
        </section>
      </form>
    </div>
  )
}
