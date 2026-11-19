import { LIVE } from '../config/env'
import { courierLive, liveCourierRefresh, liveCourierRefreshAll } from '../lib/live'
import { COURIER_ST, CourierLog } from './courierLog'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  S, STATUS, ST_KEYS, COURIERS, PAY, PAY_ST, CANCEL_REASONS, RETURN_REASONS, SOURCES, DAY,
  save, useDb, setStatus, product, productById, sendToCourier, createOrder, riskOf, trackUrl, waNum, validPhone, meName, shippingFor, normPhone, openIncompleteFor,
} from '../store/db'
import { Empty, Field, Modal, Pill, tk, fdate, startOfDay, toast } from './ui'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import Img from '../components/common/Img'
import { busy, fraudCheck, getKey, ratioTone, fraudText } from './fraud'
import { flag, countryName } from './country'
import { trackLink, renderSms, sendSms, SMS_EVENTS } from '../lib/sms'

const PER_PAGE = 20
const TABS = [['all', 'All Orders'], ...ST_KEYS.map((k) => [k, STATUS[k].t])]

/* ---------- courier history badge ---------- */
function FraudBadge({ phone }) {
  const [, re] = useState(0)
  const p = phone
  const c = S.fraud[p]
  const run = (e) => { e.stopPropagation(); fraudCheck(p, !!c, () => re((x) => x + 1)).catch((err) => toast(err.message)) }
  if (busy.has(p)) return <span className="text-xs text-muted">Checking…</span>
  if (!c) return <button onClick={run} className="rounded border border-line px-2 py-0.5 text-xs hover:border-brand">Check</button>
  if (!c.sum.total) return <button onClick={run} title={fraudText(c)}><Pill tone="sky">New customer</Pill></button>
  if (c.sf) return <button onClick={run} title={fraudText(c)} className="flex flex-col items-start gap-0.5"><Pill tone={c.sf.reports ? 'red' : ratioTone(c.sf.delivery)}>{c.sf.delivery}% · {c.sf.range}</Pill>{c.sf.reports > 0 && <span className="text-[10px] font-semibold text-red-600">⚠ {c.sf.reports} report</span>}</button>
  return <button onClick={run} title={`Total ${c.sum.total} · Delivered ${c.sum.ok} · Cancelled ${c.sum.cancel}`}><Pill tone={ratioTone(c.sum.ratio)}>{Math.round(c.sum.ratio)}% · {c.sum.ok}/{c.sum.total}</Pill></button>
}

/* ---------- printable invoices ---------- */
function printInvoices(orders) {
  const st = S.settings
  const rows = (o) => o.items.map((i) => `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">৳${i.price}</td><td style="text-align:right">৳${i.price * i.quantity}</td></tr>`).join('')
  const html = orders.map((o) => `
    <section style="page-break-after:always;padding:24px;font-family:Arial,sans-serif;font-size:13px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h2 style="margin:0">${st.siteName}</h2><div>${st.address}</div><div>Hotline: ${st.phone}</div></div>
        <div style="text-align:right"><h3 style="margin:0">INVOICE</h3><div><b>${o.invoice}</b></div><div>${new Date(o.createdAt).toLocaleDateString('en-GB')}</div>${o.tracking ? `<div>${COURIERS[o.courier]?.t || ''}: ${o.tracking}</div>` : ''}</div>
      </div>
      <hr/><div><b>Bill to:</b> ${o.name} · ${o.phone}${o.abroadPhone ? ` · Overseas: ${o.abroadPhone}` : ''}<br/>${o.address}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px" border="1" cellpadding="6">
        <thead><tr style="background:#f3f4f6"><th style="text-align:left">Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows(o)}</tbody>
      </table>
      <table style="margin-left:auto;margin-top:8px"><tr><td>Subtotal</td><td style="text-align:right">৳${o.subtotal}</td></tr><tr><td>Delivery</td><td style="text-align:right">৳${o.shippingCharge}</td></tr>${o.discount ? `<tr><td>Discount</td><td style="text-align:right">-৳${o.discount}</td></tr>` : ''}${o.adminDiscount ? `<tr><td>Special discount</td><td style="text-align:right">-৳${o.adminDiscount}</td></tr>` : ''}<tr><td><b>${o.payment?.status === 'paid' ? 'Paid' : 'Collect (COD)'}</b></td><td style="text-align:right"><b>৳${o.payment?.status === 'paid' ? 0 : o.total}</b></td></tr></table>
      <p style="margin-top:24px;color:#555">ধন্যবাদ! পণ্য পেয়ে ডেলিভারি ম্যানের সামনে চেক করে নিন।</p>
    </section>`).join('')
  const w = window.open('', '_blank')
  if (!w) return toast('Allow pop-ups to print invoices')
  w.document.write(`<html><head><title>Invoices</title></head><body style="margin:0">${html}<script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}

function exportCSV(list) {
  const head = ['Invoice', 'Date', 'Name', 'Phone', 'Address', 'Area', 'Products', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Status', 'Payment', 'Payment status', 'TrxID', 'Courier', 'Tracking', 'Source', 'Overseas phone/WhatsApp', 'Country (IP)']
  const rows = list.map((o) => [o.invoice, new Date(o.createdAt).toISOString().slice(0, 16).replace('T', ' '), o.name, o.phone, o.address, o.shippingArea, o.items.map((i) => `${i.name} x${i.quantity}`).join('; '), o.subtotal, o.shippingCharge, (o.discount || 0) + (o.adminDiscount || 0), o.total, STATUS[o.status].t, PAY[o.payment?.method || 'cod'], PAY_ST[o.payment?.status || 'unpaid'], o.payment?.trx || '', o.courier ? COURIERS[o.courier].t : '', o.tracking, o.source, o.abroadPhone || '', o.country ? countryName(o.country) : ''])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `fatiha-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  toast(`CSV of ${list.length} orders downloaded`)
}

/* ---------- order drawer ---------- */
const NEXT = {
  pending: [['confirmed', 'Confirm', 'btn-accent'], ['hold', 'Put on hold', 'btn-outline'], ['cancelled', 'Cancel', 'btn-outline text-red-600']],
  confirmed: [['courier', 'Send to courier', 'btn-accent'], ['hold', 'Put on hold', 'btn-outline'], ['cancelled', 'Cancel', 'btn-outline text-red-600']],
  hold: [['confirmed', 'Confirm', 'btn-accent'], ['cancelled', 'Cancel', 'btn-outline text-red-600']],
  ready: [['transit', 'Picked up by courier', 'btn-accent'], ['cancelled', 'Cancel', 'btn-outline text-red-600']],
  transit: [['delivered', 'Delivered', 'btn-accent'], ['partial', 'Partial return', 'btn-outline'], ['returned', 'Returned', 'btn-outline text-red-600']],
  delivered: [['returned', 'Return / replacement', 'btn-outline']],
  cancelled: [['pending', 'Move back to pending', 'btn-outline']],
  partial: [], returned: [],
}

/* ---------- drawer helpers ---------- */
const itemImage = (i) => i.image || productById(i.productId)?.images?.[0] || product(i.slug)?.images?.[0] || null

function ContactRow({ label, phone, wa, msg, highlight }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${highlight ? 'border-accent/40 bg-accent/5' : 'border-line bg-surface/60'}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`text-base font-bold tabular-nums ${highlight ? 'text-accent' : 'text-ink'}`}>{phone}</p>
      </div>
      <div className="flex gap-2">
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"><Icon name="phone" className="h-4 w-4" />Call</a>
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" title="Confirm on WhatsApp" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe5a]"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5"><dt className="text-muted">{label}</dt><dd className="min-w-0">{children}</dd></div>
}


/* ---------- edit customer info + special discount ---------- */
export const orderTotal = (o) => Math.max(0, (o.subtotal || 0) + (o.shippingCharge || 0) - (o.discount || 0) - (o.adminDiscount || 0))

function OrderEdit({ o, focus, onClose }) {
  const [f, setF] = useState({ name: o.name || '', phone: o.phone || '', address: o.address || '', shippingArea: o.shippingArea || 'inside_dhaka', abroadPhone: o.abroadPhone || '', note: o.note || '', shippingCharge: o.shippingCharge ?? 0, disc: o.adminDiscount || 0, discType: 'tk' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const base = (o.subtotal || 0) + (+f.shippingCharge || 0) - (o.discount || 0)
  const discTk = Math.min(base, Math.max(0, Math.round(f.discType === 'pct' ? (base * (+f.disc || 0)) / 100 : +f.disc || 0)))
  const newTotal = Math.max(0, base - discTk)
  const booked = o.courier && o.tracking
  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return setErr('নাম লিখুন')
    if (!validPhone(f.phone)) return setErr('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন')
    if (f.address.trim().length < 5) return setErr('ঠিকানা লিখুন')
    const ab = f.abroadPhone.replace(/[\s()-]/g, '')
    if (ab && !/^\+?\d{8,15}$/.test(ab)) return setErr('বিদেশের নাম্বারটি দেশের কোডসহ সঠিকভাবে দিন')
    const changes = []
    const upd = (k, v, label) => { if ((o[k] ?? '') !== v) { o[k] = v; changes.push(label) } }
    upd('name', f.name.trim(), 'নাম')
    upd('phone', normPhone(f.phone), 'ফোন')
    upd('address', f.address.trim(), 'ঠিকানা')
    upd('abroadPhone', ab, 'বিদেশের নাম্বার')
    upd('note', f.note.trim(), 'নোট')
    if (o.shippingArea !== f.shippingArea) { o.shippingArea = f.shippingArea; changes.push('ডেলিভারি এরিয়া') }
    if ((o.shippingCharge ?? 0) !== Math.max(0, +f.shippingCharge || 0)) { o.shippingCharge = Math.max(0, +f.shippingCharge || 0); changes.push(`ডেলিভারি চার্জ ৳${o.shippingCharge}`) }
    if ((o.adminDiscount || 0) !== discTk) { o.adminDiscount = discTk; changes.push(discTk ? `ডিসকাউন্ট ৳${discTk}` : 'ডিসকাউন্ট বাদ') }
    if (!changes.length) return onClose()
    o.total = orderTotal(o)
    o.history.push({ s: 'note', by: meName(), at: Date.now(), note: `Edited: ${changes.join(', ')} · মোট ৳${o.total}` })
    save(); toast(`${o.invoice} আপডেট হয়েছে`); onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-3 text-sm" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="কাস্টমারের নাম *"><input className="field" value={f.name} onChange={set('name')} autoFocus={focus !== 'discount'} /></Field>
        <Field label="মোবাইল নাম্বার *"><input className="field" type="tel" value={f.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="ঠিকানা *"><textarea className="field" rows={2} value={f.address} onChange={set('address')} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ডেলিভারি এরিয়া"><select className="field" value={f.shippingArea} onChange={(e) => { const a = e.target.value; setF({ ...f, shippingArea: a, shippingCharge: shippingFor(a, o.subtotal) }) }}>{S.settings.shipping.map((x) => <option key={x.id} value={x.id}>{x.labelEn} (৳{x.charge})</option>)}</select></Field>
        <Field label="ডেলিভারি চার্জ (৳)"><input className="field" type="number" min={0} value={f.shippingCharge} onChange={set('shippingCharge')} /></Field>
      </div>
      <Field label="বিদেশের ফোন / WhatsApp (ঐচ্ছিক)"><input className="field" type="tel" value={f.abroadPhone} onChange={set('abroadPhone')} placeholder="+966…" /></Field>
      <Field label="কাস্টমারের নোট"><input className="field" value={f.note} onChange={set('note')} /></Field>

      <div className={`rounded-lg border-2 p-3 ${focus === 'discount' ? 'border-accent bg-accent/5' : 'border-line bg-surface/60'}`}>
        <p className="mb-2 font-semibold">🎁 স্পেশাল ডিসকাউন্ট</p>
        <div className="flex gap-2">
          <input className="field" type="number" min={0} value={f.disc} onChange={set('disc')} autoFocus={focus === 'discount'} aria-label="Discount" />
          <select className="field w-28" value={f.discType} onChange={set('discType')}><option value="tk">৳ টাকা</option><option value="pct">% পার্সেন্ট</option></select>
        </div>
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between"><span className="text-muted">প্রোডাক্ট</span><span>{tk(o.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted">ডেলিভারি</span><span>{tk(+f.shippingCharge || 0)}</span></div>
          {o.discount > 0 && <div className="flex justify-between"><span className="text-muted">কুপন{o.coupon && ` (${o.coupon})`}</span><span>−{tk(o.discount)}</span></div>}
          {discTk > 0 && <div className="flex justify-between text-green-700"><span>স্পেশাল ডিসকাউন্ট</span><span>−{tk(discTk)}</span></div>}
          <div className="flex justify-between border-t border-dashed border-line pt-1 text-sm font-bold"><span>নতুন মোট</span><span className="text-brand">{tk(newTotal)}</span></div>
        </div>
      </div>

      {booked && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">⚠ এই অর্ডার আগেই {COURIERS[o.courier]?.t || o.courier}-এ বুক হয়েছে। এখানে বদলালে কুরিয়ারের পার্সেলে নাম/ঠিকানা/COD বদলাবে না — কুরিয়ার প্যানেলেও ঠিক করে নিন।</p>}
      {err && <p className="text-red-600">{err}</p>}
      <div className="flex gap-2"><button className="btn-accent flex-1 py-2.5">সেভ করুন</button><button type="button" className="btn-outline" onClick={onClose}>বাতিল</button></div>
    </form>
  )
}

function OrderDrawer({ order: o, onClose }) {
  useDb()
  const [extra, setExtra] = useState(null)
  const [note, setNote] = useState('')
  const [courier, setCourier] = useState('steadfast')
  const [riderNote, setRiderNote] = useState('')
  const [busyRef, setBusyRef] = useState(false)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(null)
  const [, re] = useState(0)
  if (!o) return null
  const risk = riskOf(o)
  const prev = S.orders.filter((x) => x.phone === o.phone && x.id !== o.id)
  const p = o.payment || { method: 'cod', status: 'unpaid' }
  const fr = S.fraud[o.phone]
  const confirmMsg = `আসসালামু আলাইকুম ${o.name}, ${S.settings.siteName} থেকে বলছি। আপনার অর্ডার ${o.invoice}: ${o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}। মোট ৳${o.total} (ক্যাশ অন ডেলিভারি)। ঠিকানা: ${o.address}। অর্ডারটি কনফার্ম করতে "Yes" লিখে রিপ্লাই দিন।`

  const act = (s) => {
    if (['courier', 'cancelled', 'returned', 'partial'].includes(s)) { setExtra(s); setReason(s === 'cancelled' ? CANCEL_REASONS[0] : RETURN_REASONS[0]); return }
    setStatus(o, s, meName()); save(); toast(`${o.invoice}: ${STATUS[s].t}`)
  }
  const confirmExtra = async () => {
    if (extra === 'courier') {
      try { await (LIVE ? courierLive(o, courier, meName(), riderNote.trim()) : sendToCourier(o, courier, meName())); setRiderNote(''); toast(`${o.invoice} sent to ${COURIERS[courier].t}`) } catch (e) { return toast(e.message) }
    }
    else { setStatus(o, extra, meName(), reason); toast(`${o.invoice}: ${STATUS[extra].t}`) }
    save(); setExtra(null)
  }
  const payStatus = (s) => { o.payment.status = s; o.history.push({ s: 'note', by: meName(), at: Date.now(), note: `Payment: ${PAY_ST[s]}` }); save(); toast('Payment updated') }

  return (
    <Modal open onClose={onClose} drawer title={<>{o.invoice} <Pill s={o.status} /> <span className="text-xs font-normal text-muted">{fdate(o.createdAt)}</span></>}>
      <div className="space-y-5 text-sm">
        {risk.length > 0 && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{risk.map((r) => <p key={r}>⚠ {r}</p>)}</div>}

        {/* ---------- customer & contact card ---------- */}
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold ring-2 ring-gold/70">{(o.name || '?').trim().charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight">{o.name}</p>
              <p className="text-xs text-white/75">Customer · ordered {fdate(o.createdAt)}</p>
            </div>
            {o.country && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold" title="IP অনুযায়ী">{flag(o.country)} {countryName(o.country)}</span>}
            <button type="button" className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand shadow hover:bg-gold" onClick={() => setEditing('info')}>✏️ এডিট</button>
          </div>
          <div className="space-y-3 p-4">
            <ContactRow label="Phone" phone={o.phone} wa={waNum(o.phone)} msg={confirmMsg} />
            {o.abroadPhone && (
              <div>
                <ContactRow label="🌍 Overseas buyer" phone={o.abroadPhone} wa={o.abroadPhone.replace(/\D/g, '')} msg={confirmMsg} highlight />
                <p className="mt-1 px-1 text-xs text-muted">Ordered from abroad — the phone above is the receiver in Bangladesh</p>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2.5">
              <Icon name="location" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Delivery address</p>
                <p className="break-words font-medium leading-snug">{o.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">{o.shippingArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</span>
            </div>
            {o.note && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900"><p className="text-[11px] font-semibold uppercase tracking-wide">Customer note</p><p>{o.note}</p></div>}
          </div>
        </section>

        {/* ---------- ordered products (with photos) ---------- */}
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="font-semibold">Ordered products</h3>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">{(() => { const n = o.items.reduce((s, i) => s + i.quantity, 0); return `${n} ${n > 1 ? 'pcs' : 'pc'}` })()}</span>
          </div>
          <ul className="divide-y divide-line">
            {o.items.map((i) => (
              <li key={i.slug || i.productId} className="flex items-center gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface sm:h-20 sm:w-20">
                  <Img src={itemImage(i)} alt={i.name} className="h-full w-full object-cover text-[9px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{i.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{tk(i.price)} each</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">× {i.quantity}</span>
                  <p className="mt-1 font-bold">{tk(i.price * i.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-line bg-surface/60 px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{tk(o.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Delivery</span><span>{tk(o.shippingCharge)}</span></div>
            {o.discount > 0 && <div className="flex justify-between"><span className="text-muted">Discount{o.coupon && ` (${o.coupon})`}</span><span className="text-green-700">−{tk(o.discount)}</span></div>}
            {o.adminDiscount > 0 && <div className="flex justify-between"><span className="text-muted">Special discount</span><span className="text-green-700">−{tk(o.adminDiscount)}</span></div>}
            <div className="flex justify-end"><button type="button" className="text-xs font-semibold text-accent hover:underline" onClick={() => setEditing('discount')}>🎁 {o.adminDiscount > 0 ? 'ডিসকাউন্ট বদলান' : 'ডিসকাউন্ট দিন'}</button></div>
            <div className="mt-1 flex items-center justify-between border-t border-dashed border-line pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-brand">{tk(o.total)}</span>
            </div>
            {p.method === 'cod' && p.status !== 'paid' && <p className="text-right text-xs font-medium text-accent">Cash on delivery — collect {tk(o.total)}</p>}
          </div>
        </section>

        {/* ---------- order details ---------- */}
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <h3 className="border-b border-line px-4 py-2.5 font-semibold">Order details</h3>
          <dl className="divide-y divide-line text-sm">
            <DetailRow label="Source">{o.source}{o.coupon && ` · coupon ${o.coupon}`}</DetailRow>
            <DetailRow label="Payment">
              {PAY[p.method]} · <Pill tone={p.status === 'paid' ? 'green' : p.status === 'pending' ? 'amber' : p.status === 'failed' ? 'red' : 'gray'}>{PAY_ST[p.status]}</Pill>
              {p.trx && <p className="mt-1">TrxID <b>{p.trx}</b> · from {p.sender}</p>}
              {p.method !== 'cod' && p.status !== 'paid' && <div className="mt-2 flex gap-2"><button className="btn-accent" onClick={() => payStatus('paid')}>Payment received</button><button className="btn-outline text-red-600" onClick={() => payStatus('failed')}>TrxID doesn't match</button></div>}
            </DetailRow>
            <DetailRow label="Courier">{o.courier ? <>{COURIERS[o.courier].t} · {trackUrl(o) ? <a className="text-brand" href={trackUrl(o)} target="_blank" rel="noreferrer">{o.tracking} ↗</a> : o.tracking}</> : '—'}</DetailRow>
            <DetailRow label="Courier history">
              {fr ? <><span className={fr.sf?.reports ? 'font-semibold text-red-600' : ''}>{fraudText(fr)}</span> <button className="ml-1 text-xs text-brand" onClick={() => fraudCheck(o.phone, true, () => re((x) => x + 1)).catch((e) => toast(e.message))}>↻</button></>
                : <button className="text-brand" onClick={() => fraudCheck(o.phone, true, () => re((x) => x + 1)).catch((e) => toast(e.message))}>{LIVE || getKey() ? 'Check courier history' : 'Add BD Courier key in Settings → Courier'}</button>}
            </DetailRow>
            <DetailRow label="Previous orders">{prev.length ? prev.map((x) => <span key={x.id} className="mr-2 inline-flex items-center gap-1">{x.invoice} <Pill s={x.status} /></span>) : 'First order'}</DetailRow>
          </dl>
        </section>

        <div>
          <p className="mb-2 font-semibold">Actions</p>
          <div className="flex flex-wrap gap-2">
            {NEXT[o.status].map(([s, label, cls]) => <button key={s} className={cls} onClick={() => act(s)}>{label}</button>)}
            <button className="btn-outline" onClick={() => printInvoices([o])}>Print invoice</button>
          </div>
          {extra && (
            <div className="mt-3 space-y-2 rounded-md border border-line bg-surface p-3">
              {extra === 'courier'
                ? <><Field label="Courier"><select className="field" value={courier} onChange={(e) => setCourier(e.target.value)}>{Object.entries(COURIERS).map(([k, c]) => <option key={k} value={k}>{c.t}</option>)}</select></Field>
                  {courier === 'steadfast' && <Field label="রাইডারের জন্য নোট (ঐচ্ছিক)" hint="Steadfast পার্সেলের নোটে যাবে। বিদেশি অর্ডার হলে বিদেশের নাম্বার নিজে থেকেই যোগ হবে।"><input className="field" value={riderNote} onChange={(e) => setRiderNote(e.target.value)} placeholder="যেমন: কল করে ডেলিভারি দিন" /></Field>}</>
                : <Field label="Reason"><select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>{(extra === 'cancelled' ? CANCEL_REASONS : RETURN_REASONS).map((r) => <option key={r}>{r}</option>)}</select></Field>}
              <div className="flex gap-2"><button className="btn-brand" onClick={confirmExtra}>Confirm</button><button className="btn-outline" onClick={() => setExtra(null)}>Back</button></div>
              {extra === 'courier' && <p className="text-xs text-muted">{LIVE ? 'Steadfast: পার্সেল সরাসরি Steadfast-এ বুক হবে (COD সহ), আসল ট্র্যাকিং কোড সেভ হবে। অন্য কুরিয়ারে ট্র্যাকিং আইডি হাতে দিতে হবে।' : 'Demo creates a tracking code. On the live site this books the parcel in Steadfast.'}</p>}
            </div>
          )}
        </div>

        {o.courier && (
          <div className="rounded-md border border-line p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">🚚 কুরিয়ার আপডেট ও রাইডার নোট{o.courierStatus && <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs font-normal">{COURIER_ST[o.courierStatus] || o.courierStatus}</span>}</p>
              {LIVE && o.courier === 'steadfast' && o.tracking && <button className="btn-outline px-2 py-1 text-xs" disabled={busyRef} onClick={async () => { setBusyRef(true); try { await liveCourierRefresh(o); toast('Steadfast থেকে সর্বশেষ আপডেট আনা হয়েছে') } catch (e) { toast(e.message) } finally { setBusyRef(false) } }}>{busyRef ? 'Refreshing…' : '↻ Refresh status'}</button>}
            </div>
            {(o.codAmount != null || o.codCollected != null || o.courierCharge != null) && <p className="mb-2 text-xs text-muted">{o.codAmount != null && <>COD ৳{o.codAmount}</>}{o.codCollected != null && <> · আদায় ৳{o.codCollected}</>}{o.courierCharge != null && <> · কুরিয়ার চার্জ ৳{o.courierCharge}</>}</p>}
            <CourierLog o={o} />
          </div>
        )}

        <div className="rounded-md border border-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">SMS & tracking</p>
            <button className="text-brand" onClick={() => { navigator.clipboard?.writeText(trackLink(o)); toast('Tracking link copied') }}>Copy tracking link</button>
          </div>
          <a href={trackLink(o)} target="_blank" rel="noreferrer" className="block truncate text-xs text-brand">{trackLink(o)}</a>
          <ul className="mt-2 space-y-1 text-xs">
            {S.smsLog.filter((x) => x.invoice === o.invoice).map((x) => (
              <li key={x.id} className="flex gap-2"><Pill tone={x.status === 'sent' ? 'green' : x.status === 'sending' ? 'sky' : 'amber'}>{x.status === 'sent' ? 'Sent' : x.status === 'sending' ? '…' : 'Not sent'}</Pill><span className="text-muted">{fdate(x.at)}</span><span className="flex-1">{x.text}</span></li>
            ))}
            {!S.smsLog.some((x) => x.invoice === o.invoice) && <li className="text-muted">No SMS for this order yet{o.demo ? ' (sample orders never send SMS)' : ''}.</li>}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(SMS_EVENTS).filter((k) => k !== 'shipped' || o.tracking).map((k) => (
              <button key={k} className="btn-outline px-2 py-1 text-xs" onClick={async () => { const r = await sendSms({ to: o.phone, text: renderSms(S.settings.sms.templates[k], o), event: k === 'placed' ? 'resend' : k, order: o }); toast(r.status === 'sent' ? 'SMS sent ✓' : r.info) }}>Send “{SMS_EVENTS[k].split(' (')[0]}”</button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-semibold">Timeline</p>
          <ol className="space-y-2 border-l-2 border-line pl-4">
            {[...o.history].reverse().map((h, i) => (
              <li key={i}><span className="font-medium">{h.s === 'note' ? 'Note' : STATUS[h.s]?.t}</span> · {h.by} · <span className="text-muted">{fdate(h.at)}</span>{h.note && <p className="text-muted">{h.note}</p>}</li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <input className="field" placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-outline" onClick={() => { if (!note.trim()) return; o.history.push({ s: 'note', by: meName(), at: Date.now(), note: note.trim() }); save(); setNote('') }}>Add</button>
          </div>
        </div>
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${o.invoice} — ${editing === 'discount' ? 'ডিসকাউন্ট দিন' : 'অর্ডার এডিট'}`}>{editing && <OrderEdit o={o} focus={editing} onClose={() => setEditing(null)} />}</Modal>
    </Modal>
  )
}

/* ---------- manual order (phone / Facebook / WhatsApp) ---------- */
export function NewOrderForm({ onDone, initial }) {
  const [f, setF] = useState({ name: initial?.name || '', phone: initial?.phone || '', address: initial?.address || '', shippingArea: initial?.shippingArea || 'inside_dhaka', source: initial ? 'Recovered from incomplete' : 'Phone', confirmed: true, disc: '' })
  const [items, setItems] = useState(initial?.items?.map((i) => ({ ...i })) || [])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const matches = q.length > 1 ? S.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const ship = shippingFor(f.shippingArea, sub)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !validPhone(f.phone) || f.address.trim().length < 5 || !items.length) return setErr('Name, valid phone, address and at least one product are required')
    const out = items.find((i) => { const p = productById(i.productId) || product(i.slug); return p && typeof p.stock === 'number' && p.stock < i.quantity })
    if (out) { const p = productById(out.productId) || product(out.slug); return setErr(`"${out.name}" স্টকে ${p.stock}টি আছে`) }
    const o = createOrder({ ...f, items, source: f.source, by: meName(), status: f.confirmed ? 'confirmed' : 'pending', adminDiscount: +f.disc || 0 })
    toast(`${o.invoice} created`)
    onDone(o)
  }
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input className="field" value={f.name} onChange={set('name')} /></Field>
        <Field label="Phone *"><input className="field" value={f.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Address *"><input className="field" value={f.address} onChange={set('address')} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Delivery area"><select className="field" value={f.shippingArea} onChange={set('shippingArea')}>{S.settings.shipping.map((s) => <option key={s.id} value={s.id}>{s.labelEn} (৳{s.charge})</option>)}</select></Field>
        <Field label="Source"><select className="field" value={f.source} onChange={set('source')}>{[...SOURCES, 'Recovered from incomplete'].map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Add products">
        <input className="field" placeholder="Type a product name…" value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.length > 0 && (
          <ul className="mt-1 divide-y divide-line rounded-md border border-line">
            {matches.map((p) => <li key={p.slug}><button type="button" disabled={p.stock === 0} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-50" onClick={() => { setItems((x) => x.some((i) => i.slug === p.slug) ? x : [...x, { productId: p.id, slug: p.slug, name: p.name, price: p.price, quantity: 1 }]); setQ('') }}><span className="truncate">{p.name}{typeof p.stock === 'number' && <span className={`ml-2 text-xs ${p.stock ? 'text-muted' : 'font-semibold text-red-600'}`}>{p.stock ? `স্টক ${p.stock}` : 'স্টক আউট'}</span>}</span><span>{tk(p.price)}</span></button></li>)}
          </ul>
        )}
      </Field>
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line text-sm">
          {items.map((i) => (
            <li key={i.slug} className="flex items-center gap-2 p-2">
              <span className="flex-1 truncate">{i.name}</span>
              <input type="number" min={1} className="field w-16" value={i.quantity} onChange={(e) => setItems((x) => x.map((y) => y.slug === i.slug ? { ...y, quantity: Math.max(1, +e.target.value) } : y))} aria-label="Quantity" />
              <span className="w-16 text-right">{tk(i.price * i.quantity)}</span>
              <button type="button" className="text-red-600" onClick={() => setItems((x) => x.filter((y) => y.slug !== i.slug))} aria-label="Remove">×</button>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 p-2"><span className="text-muted">🎁 ডিসকাউন্ট (৳)</span><input type="number" min={0} className="field w-28" value={f.disc} onChange={set('disc')} placeholder="0" /></li>
          <li className="flex justify-between p-2 font-semibold"><span>Total incl. delivery {tk(ship)}</span><span>{tk(Math.max(0, sub + ship - (+f.disc || 0)))}</span></li>
        </ul>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.confirmed} onChange={set('confirmed')} />Customer already confirmed by phone</label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn-accent w-full py-2.5">Create order</button>
    </form>
  )
}

/* ---------- orders page ---------- */
export default function Orders() {
  useDb()
  const [status, setStatusTab] = useState('all')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [courier, setCourier] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [bulk, setBulk] = useState('')
  const [openId, setOpenId] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [refAll, setRefAll] = useState(false)
  // ?open=FA100123 (from the notification bell) opens that order
  const [sp, setSp] = useSearchParams()
  useEffect(() => { const inv = sp.get('open'); if (!inv) return; const o = S.orders.find((x) => x.invoice === inv); if (o) setOpenId(o.id); sp.delete('open'); setSp(sp, { replace: true }) }, [sp]) // eslint-disable-line react-hooks/exhaustive-deps

  const base = useMemo(() => {
    const a = from ? new Date(from + 'T00:00').getTime() : 0
    const b = to ? new Date(to + 'T00:00').getTime() + DAY : Infinity
    return S.orders.filter((o) => o.createdAt >= a && o.createdAt < b && (!courier || o.courier === courier))
  }, [from, to, courier, S.orders.length, S.orders])
  const term = q.trim().toLowerCase()
  const all = base.filter((o) => (status === 'all' || o.status === status) && (!term || `${o.invoice} ${o.name} ${o.phone} ${o.address} ${o.tracking}`.toLowerCase().includes(term)))
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE))
  const pg = Math.min(page, pages)
  const list = all.slice((pg - 1) * PER_PAGE, pg * PER_PAGE)
  const count = (k) => (k === 'all' ? base.length : base.filter((o) => o.status === k).length)
  const t0 = startOfDay()
  const today = S.orders.filter((o) => o.createdAt >= t0)
  const filt = (fn) => { fn(); setPage(1); setSel(new Set()) }

  const applyBulk = async () => {
    if (!bulk) return toast('Choose a bulk action')
    if (bulk === 'csv') return exportCSV(sel.size ? all.filter((o) => sel.has(o.id)) : all)
    if (!sel.size) return toast('Select orders first')
    const chosen = S.orders.filter((o) => sel.has(o.id))
    if (bulk === 'print') return printInvoices(chosen)
    if (bulk.startsWith('st:')) { const s = bulk.slice(3); chosen.forEach((o) => setStatus(o, s, meName(), s === 'cancelled' ? 'Bulk cancelled' : '')); toast(`${chosen.length} orders → ${STATUS[s].t}`) }
    if (bulk.startsWith('c:')) {
      const c = bulk.slice(2); let n = 0, err = ''
      for (const o of chosen) {
        if (!['pending', 'confirmed', 'hold'].includes(o.status) || o.tracking) continue
        try { await (LIVE ? courierLive(o, c, meName()) : sendToCourier(o, c, meName())); n++ } catch (e) { err = e.message; if (LIVE && c !== 'steadfast') break }
      }
      toast(`${n} orders sent to ${COURIERS[c].t}${chosen.length - n ? `, ${chosen.length - n} skipped` : ''}${err ? ` — ${err}` : ''}`)
    }
    save(); setSel(new Set())
  }

  const allSel = list.length > 0 && list.every((o) => sel.has(o.id))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order management</h1>
          {LIVE && <button className="btn-outline mt-2 px-3 py-1.5 text-xs" disabled={refAll} onClick={async () => { setRefAll(true); try { const r = await liveCourierRefreshAll(); toast(`Steadfast: ${r.checked}টি পার্সেল চেক হয়েছে, ${r.statusChanged}টির স্ট্যাটাস বদলেছে${r.errors?.length ? ' · ' + r.errors[0] : ''}`) } catch (e) { toast(e.message) } finally { setRefAll(false) } }}>{refAll ? 'Steadfast চেক হচ্ছে…' : '↻ সব কুরিয়ার পার্সেলের স্ট্যাটাস আপডেট'}</button>}
        </div>
        <div className="rounded-lg bg-brand px-4 py-2 text-white">
          <p className="text-[11px] uppercase tracking-wide text-white/70">Today</p>
          <p className="text-xl font-bold">{today.length} new · {today.filter((o) => o.status === 'pending').length} pending</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3">
        <input type="date" className="field w-auto" value={from} onChange={(e) => filt(() => setFrom(e.target.value))} aria-label="From date" />
        <span>–</span>
        <input type="date" className="field w-auto" value={to} onChange={(e) => filt(() => setTo(e.target.value))} aria-label="To date" />
        <select className="field w-auto" value={courier} onChange={(e) => filt(() => setCourier(e.target.value))} aria-label="Courier"><option value="">Courier: All</option>{Object.entries(COURIERS).map(([k, c]) => <option key={k} value={k}>{c.t}</option>)}</select>
        <input type="search" className="field min-w-48 flex-1" placeholder="Search invoice / phone / name / tracking…" value={q} onChange={(e) => filt(() => setQ(e.target.value))} />
        {(from || to || courier || q || status !== 'all') && <button className="text-sm text-brand" onClick={() => filt(() => { setFrom(''); setTo(''); setCourier(''); setQ(''); setStatusTab('all') })}>Clear filters</button>}
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => filt(() => setStatusTab(k))} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${status === k ? 'border-accent font-semibold text-accent' : 'border-transparent text-muted hover:text-ink'}`}>
            {l} <span className="rounded-full bg-surface px-1.5 text-xs">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="field w-auto" value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Bulk action">
          <option value="">Bulk action…</option>
          <optgroup label="Change status">{ST_KEYS.map((k) => <option key={k} value={`st:${k}`}>{STATUS[k].t}</option>)}</optgroup>
          <optgroup label="Send to courier">{Object.entries(COURIERS).map(([k, c]) => <option key={k} value={`c:${k}`}>{c.t}</option>)}</optgroup>
          <optgroup label="Other"><option value="print">Print invoices</option><option value="csv">Export CSV</option></optgroup>
        </select>
        <button className="btn-brand" onClick={applyBulk}>Apply{sel.size ? ` (${sel.size})` : ''}</button>
        <span className="flex-1" />
        <span className="text-sm text-muted">Page {pg}/{pages}</span>
        <button className="btn-outline" disabled={pg <= 1} onClick={() => setPage(pg - 1)}>‹</button>
        <button className="btn-outline" disabled={pg >= pages} onClick={() => setPage(pg + 1)}>›</button>
        <button className="btn-accent" onClick={() => setNewOpen(true)}>+ New order</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3"><input type="checkbox" checked={allSel} onChange={(e) => { const s = new Set(sel); list.forEach((o) => (e.target.checked ? s.add(o.id) : s.delete(o.id))); setSel(s) }} aria-label="Select page" /></th>
              <th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Courier history</th><th className="p-3">Status</th><th className="p-3">Amount</th><th className="p-3">Courier</th><th className="p-3">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length ? list.map((o) => {
              const risk = ['pending', 'confirmed', 'hold'].includes(o.status) ? riskOf(o) : []
              const paid = o.payment?.status === 'paid'
              return (
                <tr key={o.id} className={`cursor-pointer hover:bg-surface ${sel.has(o.id) ? 'bg-brand/5' : ''}`} onClick={() => setOpenId(o.id)}>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(o.id)} onChange={(e) => { const s = new Set(sel); e.target.checked ? s.add(o.id) : s.delete(o.id); setSel(s) }} aria-label={`Select ${o.invoice}`} /></td>
                  <td className="p-3"><b>{o.invoice}</b> {risk.length > 0 && <Pill tone="red">Risk</Pill>}{o.demo && <Pill tone="gray">sample</Pill>}<div className="text-xs text-muted">{fdate(o.createdAt)}</div></td>
                  <td className="p-3">{o.name}{o.country && <span className={`ml-1 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${o.country === 'BD' ? 'border-line text-muted' : 'border-accent/40 bg-accent/10 text-accent'}`} title={`অর্ডার এসেছে: ${countryName(o.country)} (IP অনুযায়ী)`}>{flag(o.country)} {countryName(o.country)}</span>}{o.abroadPhone && <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent" title={`Overseas: ${o.abroadPhone}`}>🌍 Abroad</span>}<div className="max-w-52 truncate text-xs text-muted">{o.address} · {o.items.reduce((n, i) => n + i.quantity, 0)} products</div></td>
                  <td className="whitespace-nowrap p-3">{o.phone} <a href={`https://wa.me/${waNum(o.phone)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-block align-middle text-green-600" aria-label="WhatsApp"><WhatsAppIcon className="h-4 w-4" /></a>{o.status === 'pending' && openIncompleteFor(o.phone).length > 0 && <div className="mt-1"><span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" title="এই নাম্বার Incomplete orders-এও আছে">Duplicate</span> <span className="text-xs text-muted">Incomplete-এও আছে</span></div>}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><FraudBadge phone={o.phone} /></td>
                  <td className="p-3"><Pill s={o.status} /></td>
                  <td className="p-3 font-semibold">{tk(o.total)}</td>
                  <td className="p-3 text-xs">{o.courier ? <>{COURIERS[o.courier].t}<br />{trackUrl(o) ? <a className="text-brand" href={trackUrl(o)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{o.tracking} ↗</a> : o.tracking}{o.courierLog?.length > 0 && <p className="mt-0.5 max-w-44 truncate text-muted" title={o.courierLog[o.courierLog.length - 1].message}>{!o.courierLog[o.courierLog.length - 1].status && '🛵 '}{o.courierLog[o.courierLog.length - 1].message}</p>}</> : '—'}</td>
                  <td className="p-3"><Pill tone={paid ? 'green' : o.payment?.status === 'pending' ? 'amber' : 'gray'}>{paid ? 'PAID' : o.payment?.status === 'pending' ? 'VERIFY' : 'DUE'}</Pill>{o.payment?.method !== 'cod' && <div className="text-xs text-muted">{PAY[o.payment?.method]}</div>}</td>
                </tr>
              )
            }) : <tr><td colSpan={9}><Empty>No orders match these filters</Empty></td></tr>}
          </tbody>
        </table>
      </div>

      {openId && <OrderDrawer order={S.orders.find((o) => o.id === openId)} onClose={() => setOpenId(null)} />}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New order (phone / Facebook / WhatsApp)"><NewOrderForm onDone={() => setNewOpen(false)} /></Modal>
    </div>
  )
}
