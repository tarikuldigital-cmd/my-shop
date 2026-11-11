import { LIVE } from '../config/env'
import { courierLive, refreshCourier, refreshAllCouriers } from '../lib/live'
import { useMemo, useState } from 'react'
import {
  S, STATUS, ST_KEYS, COURIERS, PAY, PAY_ST, CANCEL_REASONS, RETURN_REASONS, SOURCES, DAY,
  save, useDb, setStatus, sendToCourier, createOrder, riskOf, trackUrl, waNum, validPhone, meName, shippingFor, codOf, parcelText, COURIER_ST, hasOptions,
} from '../store/db'
import { Empty, Field, Modal, Pill, tk, fdate, startOfDay, toast } from './ui'
import { WhatsAppIcon } from '../components/common/Icon'
import { busy, fraudCheck, getKey, ratioTone } from './fraud'
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
  if (!c.sum.total) return <button onClick={run}><Pill tone="sky">New customer</Pill></button>
  return <button onClick={run} title={`Total ${c.sum.total} · Delivered ${c.sum.ok} · Cancelled ${c.sum.cancel}`}><Pill tone={ratioTone(c.sum.ratio)}>{Math.round(c.sum.ratio)}% · {c.sum.ok}/{c.sum.total}</Pill></button>
}

/* ---------- printable invoices ---------- */
function printInvoices(orders) {
  const st = S.settings
  const rows = (o) => o.items.map((i) => `<tr><td>${i.name}${i.variant ? ` <small>(${i.variant})</small>` : ''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">৳${i.price}</td><td style="text-align:right">৳${i.price * i.quantity}</td></tr>`).join('')
  const html = orders.map((o) => `
    <section style="page-break-after:always;padding:24px;font-family:Arial,sans-serif;font-size:13px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h2 style="margin:0">${st.siteName}</h2><div>${st.address}</div><div>Hotline: ${st.phone}</div></div>
        <div style="text-align:right"><h3 style="margin:0">INVOICE</h3><div><b>${o.invoice}</b></div><div>${new Date(o.createdAt).toLocaleDateString('en-GB')}</div>${o.tracking ? `<div>${COURIERS[o.courier]?.t || ''}: ${o.tracking}</div>` : ''}</div>
      </div>
      <hr/><div><b>Bill to:</b> ${o.name} · ${o.phone}<br/>${o.address}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px" border="1" cellpadding="6">
        <thead><tr style="background:#f3f4f6"><th style="text-align:left">Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows(o)}</tbody>
      </table>
      <table style="margin-left:auto;margin-top:8px"><tr><td>Subtotal</td><td style="text-align:right">৳${o.subtotal}</td></tr><tr><td>Delivery</td><td style="text-align:right">৳${o.shippingCharge}</td></tr>${o.discount ? `<tr><td>Discount</td><td style="text-align:right">-৳${o.discount}</td></tr>` : ''}<tr><td><b>${o.payment?.status === 'paid' ? 'Paid' : 'Collect (COD)'}</b></td><td style="text-align:right"><b>৳${o.payment?.status === 'paid' ? 0 : o.total}</b></td></tr></table>
      <p style="margin-top:24px;color:#555">Thank you for shopping with us! Please check the product in front of the delivery person.</p>
    </section>`).join('')
  const w = window.open('', '_blank')
  if (!w) return toast('Allow pop-ups to print invoices')
  w.document.write(`<html><head><title>Invoices</title></head><body style="margin:0">${html}<script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}

function exportCSV(list) {
  const head = ['Invoice', 'Date', 'Name', 'Phone', 'Address', 'Area', 'Products', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Status', 'Payment', 'Payment status', 'TrxID', 'Courier', 'Tracking', 'Courier status', 'Source']
  const rows = list.map((o) => [o.invoice, new Date(o.createdAt).toISOString().slice(0, 16).replace('T', ' '), o.name, o.phone, o.address, o.shippingArea, o.items.map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.quantity}`).join('; '), o.subtotal, o.shippingCharge, o.discount || 0, o.total, STATUS[o.status].t, PAY[o.payment?.method || 'cod'], PAY_ST[o.payment?.status || 'unpaid'], o.payment?.trx || '', o.courier ? COURIERS[o.courier].t : '', o.tracking, COURIER_ST[o.courierStatus] || o.courierStatus || '', o.source])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `smart-china-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  toast(`CSV of ${list.length} orders downloaded`)
}

/* ---------- copy helpers ---------- */
const copy = (text, label = 'Copied') => {
  const done = () => toast(`${label} ✓`)
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done))
  else fallbackCopy(text, done)
}
function fallbackCopy(text, done) {
  const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'
  document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done() } catch { toast('Copy failed — select the text manually') } t.remove()
}
function CopyBtn({ text, label, title = 'Copy' }) {
  return <button type="button" onClick={(e) => { e.stopPropagation(); copy(text, label) }} title={title} aria-label={title} className="rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-muted hover:border-brand hover:text-brand">Copy</button>
}

/** Courier timeline: every status / rider note the courier sent (webhook or "Refresh status") */
export function CourierLog({ o }) {
  const log = [...(o.courierLog || [])].reverse()
  if (!log.length) return <p className="text-xs text-muted">No courier updates yet.{o.courier === 'steadfast' ? ' Updates arrive by webhook, or press “Refresh status”.' : ''}</p>
  return (
    <ol className="space-y-2 border-l-2 border-brand/30 pl-4 text-xs">
      {log.map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-brand ring-4 ring-brand/15' : 'bg-gray-300'}`} />
          <p className="font-medium text-ink">{e.message}</p>
          <p className="text-muted">{fdate(e.at)}{COURIER_ST[e.status] && COURIER_ST[e.status] !== e.message ? ` · ${COURIER_ST[e.status]}` : ''}</p>
        </li>
      ))}
    </ol>
  )
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

function OrderDrawer({ order: o, onClose }) {
  useDb()
  const [extra, setExtra] = useState(null)
  const [note, setNote] = useState('')
  const [courier, setCourier] = useState(S.settings.courier?.defaultCourier || 'steadfast')
  const [trackId, setTrackId] = useState('')
  const [riderNote, setRiderNote] = useState('')
  const [busyC, setBusyC] = useState(false)
  const [reason, setReason] = useState('')
  const [, re] = useState(0)
  if (!o) return null
  const risk = riskOf(o)
  const prev = S.orders.filter((x) => x.phone === o.phone && x.id !== o.id)
  const p = o.payment || { method: 'cod', status: 'unpaid' }
  const fr = S.fraud[o.phone]
  const refreshNow = async () => { setBusyC(true); try { const r = await refreshCourier(o); toast(`${o.invoice}: ${COURIER_ST[r?.courierStatus] || r?.courierStatus || 'updated'}`) } catch (e) { toast(e.message) } finally { setBusyC(false) } }
  const confirmMsg = `Assalamu alaikum ${o.name}, this is ${S.settings.siteName}. Your order ${o.invoice}: ${o.items.map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} ×${i.quantity}`).join(', ')}. Total ৳${o.total} (cash on delivery). Address: ${o.address}. Please reply "Yes" to confirm the order.`

  const act = (s) => {
    if (['courier', 'cancelled', 'returned', 'partial'].includes(s)) { setExtra(s); setReason(s === 'cancelled' ? CANCEL_REASONS[0] : RETURN_REASONS[0]); return }
    setStatus(o, s, meName()); save(); toast(`${o.invoice}: ${STATUS[s].t}`)
  }
  const confirmExtra = async () => {
    if (extra === 'courier') {
      if (courier !== 'steadfast' && !trackId.trim()) return toast(`Enter the ${COURIERS[courier].t} consignment ID (book it in their panel first — use “Copy for courier”)`)
      setBusyC(true)
      try { await (LIVE ? courierLive(o, courier, meName(), { tracking: trackId, note: riderNote }) : sendToCourier(o, courier, meName(), trackId.trim())); toast(`${o.invoice} sent to ${COURIERS[courier].t} · COD ৳${codOf(o)}`) } catch (e) { setBusyC(false); return toast(e.message) }
      setBusyC(false); setTrackId(''); setRiderNote('')
    }
    else { setStatus(o, extra, meName(), reason); toast(`${o.invoice}: ${STATUS[extra].t}`) }
    save(); setExtra(null)
  }
  const payStatus = (s) => { o.payment.status = s; o.history.push({ s: 'note', by: meName(), at: Date.now(), note: `Payment: ${PAY_ST[s]}` }); save(); toast('Payment updated') }

  return (
    <Modal open onClose={onClose} drawer title={<>{o.invoice} <Pill s={o.status} /></>}>
      <div className="space-y-5 text-sm">
        {risk.length > 0 && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{risk.map((r) => <p key={r}>⚠ {r}</p>)}</div>}

        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-muted">Customer</dt><dd className="flex items-center gap-2 font-semibold">{o.name} <CopyBtn text={o.name} label="Name copied" /></dd>
          <dt className="text-muted">Phone</dt><dd className="flex flex-wrap items-center gap-2">{o.phone} <CopyBtn text={o.phone} label="Phone copied" /><a href={`tel:${o.phone}`} className="text-brand">Call</a><a href={`https://wa.me/${waNum(o.phone)}?text=${encodeURIComponent(confirmMsg)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600"><WhatsAppIcon className="h-4 w-4" />Confirm on WhatsApp</a></dd>
          <dt className="text-muted">Address</dt><dd><span>{o.address}</span> <CopyBtn text={o.address} label="Address copied" /><span className="block text-xs text-muted">{o.shippingArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</span></dd>
          <dt className="text-muted">Collect (COD)</dt><dd className="font-semibold">{tk(codOf(o))}{codOf(o) === 0 && <span className="ml-1 text-xs font-normal text-green-700">already paid</span>}</dd>
          <dt className="text-muted">Source</dt><dd>{o.source}{o.coupon && ` · coupon ${o.coupon}`}</dd>
          {o.note && <><dt className="text-muted">Customer note</dt><dd>{o.note}</dd></>}
          <dt className="text-muted">Payment</dt>
          <dd>
            {PAY[p.method]} · <Pill tone={p.status === 'paid' ? 'green' : p.status === 'pending' ? 'amber' : p.status === 'failed' ? 'red' : 'gray'}>{PAY_ST[p.status]}</Pill>
            {p.trx && <p className="mt-1">TrxID <b>{p.trx}</b> · from {p.sender}</p>}
            {p.method !== 'cod' && p.status !== 'paid' && <div className="mt-2 flex gap-2"><button className="btn-accent" onClick={() => payStatus('paid')}>Payment received</button><button className="btn-outline text-red-600" onClick={() => payStatus('failed')}>TrxID doesn't match</button></div>}
          </dd>
          <dt className="text-muted">Courier</dt><dd>{o.courier ? <>{COURIERS[o.courier].t} · {trackUrl(o) ? <a className="text-brand" href={trackUrl(o)} target="_blank" rel="noreferrer">{o.tracking} ↗</a> : o.tracking}{o.courierStatus && <> · <Pill tone={o.status === 'delivered' ? 'green' : o.status === 'returned' ? 'rose' : 'sky'}>{COURIER_ST[o.courierStatus] || o.courierStatus}</Pill></>}</> : '—'}</dd>
          <dt className="text-muted">Courier history</dt>
          <dd>{fr ? <>{fr.sum.total ? <><b>{Math.round(fr.sum.ratio)}%</b> success · {fr.sum.ok} delivered / {fr.sum.cancel} cancelled of {fr.sum.total}</> : 'New customer (no parcels with any courier)'}</>
            : <button className="text-brand" onClick={() => fraudCheck(o.phone, true, () => re((x) => x + 1)).catch((e) => toast(e.message))}>{getKey() ? 'Check courier history' : 'Add BD Courier key in Settings → Courier'}</button>}</dd>
          <dt className="text-muted">Previous orders</dt><dd>{prev.length ? prev.map((x) => <span key={x.id} className="mr-2 inline-flex items-center gap-1">{x.invoice} <Pill s={x.status} /></span>) : 'First order'}</dd>
        </dl>

        <table className="w-full">
          <thead className="bg-surface text-left text-xs text-muted"><tr><th className="p-2">Product</th><th className="p-2">Qty</th><th className="p-2 text-right">Total</th></tr></thead>
          <tbody>{o.items.map((i, k) => <tr key={k} className="border-b border-line"><td className="p-2">{i.name}{i.variant && <span className="ml-1 rounded bg-surface px-1.5 text-xs">{i.variant}</span>}<div className="text-xs text-muted">{tk(i.price)} each</div></td><td className="p-2">{i.quantity}</td><td className="p-2 text-right">{tk(i.price * i.quantity)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={2} className="p-2 text-right text-muted">Subtotal</td><td className="p-2 text-right">{tk(o.subtotal)}</td></tr>
            <tr><td colSpan={2} className="p-2 text-right text-muted">Delivery</td><td className="p-2 text-right">{tk(o.shippingCharge)}</td></tr>
            {o.discount > 0 && <tr><td colSpan={2} className="p-2 text-right text-muted">Discount</td><td className="p-2 text-right">−{tk(o.discount)}</td></tr>}
            <tr className="font-bold"><td colSpan={2} className="p-2 text-right">Total</td><td className="p-2 text-right">{tk(o.total)}</td></tr>
          </tfoot>
        </table>

        <div>
          <p className="mb-2 font-semibold">Actions</p>
          <div className="flex flex-wrap gap-2">
            {NEXT[o.status].map(([s, label, cls]) => <button key={s} className={cls} onClick={() => act(s)}>{label}</button>)}
            <button className="btn-outline" onClick={() => copy(parcelText(o), 'Name, phone, address & COD copied')}>📋 Copy for courier</button>
            <button className="btn-outline" onClick={() => printInvoices([o])}>Print invoice</button>
          </div>
          {extra && (
            <div className="mt-3 space-y-2 rounded-md border border-line bg-surface p-3">
              {extra === 'courier' ? <>
                <Field label="Courier"><select className="field" value={courier} onChange={(e) => setCourier(e.target.value)}>{Object.entries(COURIERS).map(([k, c]) => <option key={k} value={k}>{c.t}{k === 'steadfast' ? ' — automatic (API)' : ' — enter consignment ID'}</option>)}</select></Field>
                <div className="rounded-md bg-white p-2 text-xs leading-5">
                  <p><b>{o.name}</b> · {o.phone}</p><p>{o.address}</p>
                  <p>COD to collect: <b className="text-accent">{tk(codOf(o))}</b> · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</p>
                </div>
                {courier === 'steadfast'
                  ? <Field label="Note for the rider (optional)"><input className="field" value={riderNote} onChange={(e) => setRiderNote(e.target.value)} placeholder="e.g. call before delivery, fragile" maxLength={200} /></Field>
                  : <Field label={`${COURIERS[courier].t} consignment / tracking ID`}><input className="field" value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Book in their panel, then paste the ID here" /></Field>}
              </> : <Field label="Reason"><select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>{(extra === 'cancelled' ? CANCEL_REASONS : RETURN_REASONS).map((r) => <option key={r}>{r}</option>)}</select></Field>}
              <div className="flex gap-2"><button className="btn-brand" disabled={busyC} onClick={confirmExtra}>{busyC ? 'Sending…' : extra === 'courier' ? `Send to ${COURIERS[courier].t} · COD ${tk(codOf(o))}` : 'Confirm'}</button><button className="btn-outline" onClick={() => setExtra(null)}>Back</button></div>
              {extra === 'courier' && courier === 'steadfast' && <p className="text-xs text-muted">{LIVE ? 'Creates the parcel in your Steadfast account with this name, phone, address and COD amount. The tracking code is saved here and sent to the customer by SMS.' : 'Demo: creates a sample tracking code. On your server this calls the Steadfast API.'}</p>}
            </div>
          )}
        </div>

        {o.courier && (
          <div className="rounded-md border border-line p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Courier tracking {o.courierCheckedAt && <span className="text-xs font-normal text-muted">· checked {fdate(o.courierCheckedAt)}</span>}</p>
              {LIVE && o.courier === 'steadfast' && <button className="btn-outline px-2 py-1 text-xs" disabled={busyC} onClick={refreshNow}>{busyC ? 'Checking…' : '↻ Refresh status'}</button>}
            </div>
            <CourierLog o={o} />
            <p className="mt-2 text-[11px] text-muted">The customer sees these updates on their tracking page.</p>
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
    </Modal>
  )
}

/* ---------- manual order (phone / Facebook / WhatsApp) ---------- */
export function NewOrderForm({ onDone, initial }) {
  const [f, setF] = useState({ name: initial?.name || '', phone: initial?.phone || '', address: initial?.address || '', shippingArea: initial?.shippingArea || 'inside_dhaka', source: initial ? 'Recovered from incomplete' : 'Phone', confirmed: true })
  const [items, setItems] = useState(initial?.items?.map((i) => ({ ...i })) || [])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const matches = q.length > 1 ? S.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  const addItem = (p, v) => { const variant = v?.key || ''; setItems((x) => x.some((i) => i.slug === p.slug && (i.variant || '') === variant) ? x : [...x, { productId: p.id, slug: p.slug, name: p.name, variant, price: v ? v.price : p.price, quantity: 1 }]); setQ('') }
  const same = (a, b) => a.slug === b.slug && (a.variant || '') === (b.variant || '')
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const ship = shippingFor(f.shippingArea, sub)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !validPhone(f.phone) || f.address.trim().length < 5 || !items.length) return setErr('Name, valid phone, address and at least one product are required')
    const o = createOrder({ ...f, items, source: f.source, by: meName(), status: f.confirmed ? 'confirmed' : 'pending' })
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
          <ul className="mt-1 max-h-72 divide-y divide-line overflow-y-auto rounded-md border border-line">
            {matches.map((p) => <li key={p.slug} className="px-3 py-2 text-sm">
              {hasOptions(p)
                ? <><p className="font-medium">{p.name}</p><div className="mt-1 flex flex-wrap gap-1">{p.variants.map((v) => <button type="button" key={v.key} className="rounded border border-line px-2 py-0.5 text-xs hover:border-brand hover:text-brand" onClick={() => addItem(p, v)}>{v.key} · {tk(v.price)}{v.stock === 0 ? ' · out' : ''}</button>)}</div></>
                : <button type="button" className="flex w-full justify-between text-left hover:text-brand" onClick={() => addItem(p)}><span className="truncate">{p.name}</span><span>{tk(p.price)}</span></button>}
            </li>)}
          </ul>
        )}
      </Field>
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line text-sm">
          {items.map((i) => (
            <li key={`${i.slug}|${i.variant}`} className="flex items-center gap-2 p-2">
              <span className="flex-1 truncate">{i.name}{i.variant && <span className="text-xs text-muted"> · {i.variant}</span>}</span>
              <input type="number" min={1} className="field w-16" value={i.quantity} onChange={(e) => setItems((x) => x.map((y) => same(y, i) ? { ...y, quantity: Math.max(1, +e.target.value) } : y))} aria-label="Quantity" />
              <span className="w-16 text-right">{tk(i.price * i.quantity)}</span>
              <button type="button" className="text-red-600" onClick={() => setItems((x) => x.filter((y) => !same(y, i)))} aria-label="Remove">×</button>
            </li>
          ))}
          <li className="flex justify-between p-2 font-semibold"><span>Total incl. delivery {tk(ship)}</span><span>{tk(sub + ship)}</span></li>
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
    if (bulk === 'copy') return copy(chosen.map(parcelText).join('\n\n'), `${chosen.length} order(s) copied`)
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

  const [syncing, setSyncing] = useState(false)
  const syncCouriers = async () => {
    setSyncing(true)
    try { const r = await refreshAllCouriers(); toast(`Checked ${r.checked} of ${r.open} open Steadfast parcels · ${r.statusChanged} status change(s)${r.errors?.length ? ` · ${r.errors[0]}` : ''}`) } catch (e) { toast(e.message) } finally { setSyncing(false) }
  }
  const allSel = list.length > 0 && list.every((o) => sel.has(o.id))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Order management</h1>
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
          <optgroup label="Other"><option value="copy">Copy name / phone / address / COD</option><option value="print">Print invoices</option><option value="csv">Export CSV</option></optgroup>
        </select>
        <button className="btn-brand" onClick={applyBulk}>Apply{sel.size ? ` (${sel.size})` : ''}</button>
        <span className="flex-1" />
        <span className="text-sm text-muted">Page {pg}/{pages}</span>
        <button className="btn-outline" disabled={pg <= 1} onClick={() => setPage(pg - 1)}>‹</button>
        <button className="btn-outline" disabled={pg >= pages} onClick={() => setPage(pg + 1)}>›</button>
        {LIVE && <button className="btn-outline" disabled={syncing} onClick={syncCouriers} title="Ask Steadfast for the latest status of every open parcel">{syncing ? 'Checking couriers…' : '↻ Courier status'}</button>}
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
                  <td className="p-3"><span className="flex items-center gap-1.5">{o.name}<span onClick={(e) => e.stopPropagation()}><CopyBtn text={parcelText(o)} label="Name, phone, address & COD copied" title="Copy name, phone, address & COD" /></span></span><div className="max-w-52 truncate text-xs text-muted">{o.address} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</div></td>
                  <td className="whitespace-nowrap p-3">{o.phone} <a href={`https://wa.me/${waNum(o.phone)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-block align-middle text-green-600" aria-label="WhatsApp"><WhatsAppIcon className="h-4 w-4" /></a></td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><FraudBadge phone={o.phone} /></td>
                  <td className="p-3"><Pill s={o.status} /></td>
                  <td className="p-3 font-semibold">{tk(o.total)}</td>
                  <td className="p-3 text-xs">{o.courier ? <>{COURIERS[o.courier].t}<br />{trackUrl(o) ? <a className="text-brand" href={trackUrl(o)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{o.tracking} ↗</a> : o.tracking}{o.courierLog?.length > 0 && <span className="mt-0.5 block max-w-40 truncate text-muted" title={o.courierLog[o.courierLog.length - 1].message}>{o.courierLog[o.courierLog.length - 1].message}</span>}</> : '—'}</td>
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
