import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Img from '../components/common/Img'
import Icon from '../components/common/Icon'
import { Alert, EmptyState } from '../components/common/ui'
import QtyStepper from '../components/product/QtyStepper'
import { useCart } from '../context/CartContext'
import { useSite } from '../context/SiteContext'
import { useAuth } from '../context/AuthContext'
import { placeOrder } from '../services/orderService'
import { validatePhone } from '../services/authService'
import { formatPrice } from '../utils/format'

// NOTE: the live checkout page could not be inspected (blocked to crawlers). Fields follow the
// site's own "Order procedure" page: name, mobile, full address, delivery area, payment method.
export default function Checkout() {
  const { items, subtotal, setQty, remove, clear } = useCart()
  const { settings } = useSite()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    shippingArea: settings.shipping[0].id,
    paymentMethod: settings.paymentMethods[0].id,
    note: '',
  })
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || '', phone: f.phone || user.phone || '', address: f.address || user.address || '' }))
  }, [user])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const area = settings.shipping.find((s) => s.id === form.shippingArea)
  const shippingCharge = items.length ? area.charge : 0
  const total = subtotal + shippingCharge
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'আপনার নাম লিখুন'
    if (!validatePhone(form.phone)) errs.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন'
    if (form.address.trim().length < 10) errs.address = 'সম্পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true); setServerError('')
    try {
      const order = await placeOrder({
        ...form,
        items: items.map(({ productId, slug, name, price, quantity, variation }) => ({ productId, slug, name, price, quantity, variation })),
        subtotal, shippingCharge, total,
      })
      clear()
      navigate(`/customer/order-success/${order.invoice}`, { state: { order } })
    } catch (err) {
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
        {/* Customer info */}
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
                    <span className="flex items-center gap-2"><input type="radio" name="area" value={s.id} checked={form.shippingArea === s.id} onChange={set('shippingArea')} />{s.label}</span>
                    <span className="font-semibold">{formatPrice(s.charge)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">পেমেন্ট মেথড</legend>
              {settings.paymentMethods.map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded-md border border-brand bg-brand/5 p-3 text-sm">
                  <input type="radio" name="payment" value={m.id} checked={form.paymentMethod === m.id} onChange={set('paymentMethod')} />{m.label}
                </label>
              ))}
            </fieldset>
            <div>
              <label className="field-label" htmlFor="note">অতিরিক্ত নোট (ঐচ্ছিক)</label>
              <input id="note" className="field" value={form.note} onChange={set('note')} />
            </div>
          </div>
        </section>

        {/* Cart + summary */}
        <section className="card h-fit p-5">
          <h2 className="mb-3 font-bold">আপনার অর্ডার ({items.length})</h2>
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
          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>সাব-টোটাল</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>ডেলিভারি চার্জ ({area.label})</dt><dd>{formatPrice(shippingCharge)}</dd></div>
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
