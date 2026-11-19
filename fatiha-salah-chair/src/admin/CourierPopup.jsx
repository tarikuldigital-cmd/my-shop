import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LIVE } from '../config/env'
import { courierLive } from '../lib/live'
import { S, useDb, save, meName, setStatus, sendToCourier, waNum, RETURN_REASONS } from '../store/db'
import { toast } from './ui'
import { courierFeed, COURIER_ST } from './courierLog'
import { playAlert } from './courierSound'

/**
 * Floating courier alerts: every Steadfast update (rider note, hold, cancel + reason, return, partial…) EXCEPT plain "delivered"
 * pops up over whatever admin page is open, for 25 seconds, as a detailed card. The admin can ignore one (✕) or all of them.
 * Mounted once in AdminApp, so it shows on Orders, Products, Settings… every admin screen.
 */
const SHOW_MS = 25000
const MAX_CARDS = 3
const POPPED_KEY = 'fatiha_courier_popped'
const TEST_EVENT = 'fatiha-courier-test'

const DELIVERED_ST = new Set(['delivered', 'delivered_approval_pending'])
const isDelivered = (e) => DELIVERED_ST.has(e.status) || (!e.status && /ডেলিভারি সম্পন্ন|ডেলিভারি হয়েছে|\bdelivered\b/i.test(e.message || '') && !/cancel|ক্যান্সেল|বাতিল|not delivered|partial|আংশিক|ফেরত/i.test(e.message || ''))

/** pop up only: cancel notifications + notes written by the rider (no booking / in-transit / hold / pending status updates, no delivered) */
const CANCEL_ST = new Set(['cancelled', 'cancelled_approval_pending'])
const wanted = (e) => !isDelivered(e) && (CANCEL_ST.has(e.status) || !e.status)

/** rider name / phone: use the fields if the courier sent them, otherwise try to read them out of the note text */
export function riderOf(e) {
  const msg = e.message || ''
  const phone = e.riderPhone || (msg.match(/(?:\+?88)?(01[3-9]\d{8})/) || [])[1] || ''
  let name = e.riderName || ''
  if (!name) {
    const m = msg.match(/(?:রাইডার(?:ের)?(?:\s*নাম)?|rider(?:\s*name)?|delivery\s*man|ডেলিভারি\s*ম্যান)\s*[:：]\s*([^\d,।\n()]{2,30})/i)
    if (m) name = m[1].replace(/\s+(ফোন|মোবাইল|নম্বর|নাম্বার|phone|mobile|number|no).*$/i, '').trim()
  }
  return { name, phone }
}

const kind = (e) => {
  if (e.status === 'hold' || /hold|হোল্ড/i.test(e.message || '')) return { label: 'কাস্টমার/পার্সেল হোল্ড', tone: 'amber', icon: '⏳' }
  if (/cancel|ক্যান্সেল|বাতিল/i.test(`${e.status} ${e.message}`)) return { label: 'ডেলিভারি ক্যান্সেল', tone: 'red', icon: '❌' }
  if (/return|ফেরত/i.test(`${e.status} ${e.message}`)) return { label: 'পার্সেল ফেরত', tone: 'red', icon: '↩' }
  if (e.status === 'partial_delivered' || e.status === 'partial_delivered_approval_pending') return { label: 'আংশিক ডেলিভারি', tone: 'amber', icon: '📦' }
  if (e.status === 'exceptional') return { label: 'কুরিয়ারে সমস্যা', tone: 'red', icon: '⚠' }
  return { label: 'রাইডার নোট', tone: 'blue', icon: '🛵' }
}
const alertKind = (list) => { const ks = list.map((c) => kind(c.e).label); return ks.includes('পার্সেল ফেরত') ? 'return' : ks.some((l) => l === 'ডেলিভারি ক্যান্সেল' || l === 'কুরিয়ারে সমস্যা') ? 'cancel' : 'note' }
const TONE = {
  red: { bar: 'bg-red-600', head: 'bg-red-50 text-red-800', ring: 'border-red-300' },
  amber: { bar: 'bg-amber-500', head: 'bg-amber-50 text-amber-800', ring: 'border-amber-300' },
  blue: { bar: 'bg-sky-600', head: 'bg-sky-50 text-sky-800', ring: 'border-sky-300' },
}
const hhmm = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const getPopped = () => { try { return Number(localStorage.getItem(POPPED_KEY) || 0) } catch { return 0 } }
const setPopped = (t) => { try { localStorage.setItem(POPPED_KEY, String(t)) } catch { /* private mode */ } }

/** fires a fake alert so the admin can see how it looks (button in the bell panel) */
export const showTestCourierPopup = () => window.dispatchEvent(new CustomEvent(TEST_EVENT))

export default function CourierPopup() {
  useDb()
  const nav = useNavigate()
  const [cards, setCards] = useState([])
  const baseline = useRef(null)
  const ignored = useRef(new Set())
  const holding = useRef(new Set())   // cards waiting for a confirm / busy — never auto-close those

  const add = (list) => setCards((cur) => {
    const have = new Set(cur.map((c) => c.key))
    const fresh = list.filter((c) => !have.has(c.key) && !ignored.current.has(c.key)).map((c) => ({ ...c, shownAt: Date.now() }))
    if (fresh.length) setTimeout(() => playAlert(alertKind(fresh)), 0)
    return fresh.length ? [...fresh, ...cur].slice(0, MAX_CARDS) : cur
  })

  // new courier updates (webhook / 15 s poll / "Refresh status") → cards
  const feed = courierFeed(60)
  useEffect(() => {
    const newest = feed[0]?.at || 0
    if (baseline.current === null) { baseline.current = Math.max(getPopped(), Date.now() - 6 * 3600 * 1000) }
    const fresh = feed.filter((e) => e.at > baseline.current)
    if (!fresh.length) return
    baseline.current = Math.max(baseline.current, newest)
    setPopped(baseline.current)
    add(fresh.filter(wanted).reverse().map((e) => ({ key: `${e.orderId}:${e.at}:${e.message}`, e })))
  })

  // test button
  useEffect(() => {
    const on = () => add([{
      key: `test:${Date.now()}`, test: true,
      e: { at: Date.now(), status: 'hold', message: 'রাইডার নোট: কাস্টমার বলেছেন কাল দুপুরের পর ডেলিভারি দিতে — আজ বাসায় নেই। (এটি টেস্ট নোটিফিকেশন)', invoice: 'FA100123', name: 'রাহিম উদ্দিন', orderId: '', consignment: '58201934', product: 'ফাতিহা আয়াত সালাহ চেয়ার — গোল্ডেন', riderName: 'মোঃ করিম', riderPhone: '01712345678' },
    }])
    window.addEventListener(TEST_EVENT, on)
    return () => window.removeEventListener(TEST_EVENT, on)
  }, [])

  // auto-close after 25 s
  useEffect(() => {
    if (!cards.length) return
    const t = setInterval(() => setCards((cur) => cur.filter((c) => holding.current.has(c.key) || Date.now() - c.shownAt < SHOW_MS)), 500)
    return () => clearInterval(t)
  }, [cards.length])

  const close = (c) => { ignored.current.add(c.key); setCards((cur) => cur.filter((x) => x.key !== c.key)) }
  const closeAll = () => { cards.forEach((c) => ignored.current.add(c.key)); setCards([]) }

  if (!cards.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-3 px-3" aria-live="assertive">
      {cards.length > 1 && <button onClick={closeAll} className="pointer-events-auto rounded-full bg-gray-900/90 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">সবগুলো ইগনোর করুন ({cards.length})</button>}
      {cards.map((c) => <Card key={c.key} c={c} hold={(on) => { on ? holding.current.add(c.key) : holding.current.delete(c.key) }} onClose={() => close(c)} onOpen={() => { close(c); if (!c.test) nav(`/admin/orders?open=${c.e.invoice}`) }} />)}
    </div>
  )
}

function Card({ c, onClose, onOpen, hold }) {
  const { e } = c
  const [ask, setAsk] = useState('')   // '' | 'resend' | 'return'
  const [busy, setBusy] = useState(false)
  const [who, setWho] = useState('customer')   // whom the rider should call on the re-send
  const k = kind(e)
  const t = TONE[k.tone]
  const order = c.test ? null : findOrder(e.orderId)
  const rider = riderOf(e)
  const product = c.test ? e.product : (order?.items || []).map((x) => `${x.name}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`).join(', ')
  const parcelId = e.consignment || order?.consignmentId || order?.tracking || ''
  const rows = [
    ['পার্সেল আইডি', e.invoice + (parcelId ? ` · CID ${parcelId}` : '')],
    ['পার্সেলের নাম', product || '—'],
    ['কাস্টমার', `${e.name || order?.name || '—'}${order?.phone ? ` · ${order.phone}` : ''}`],
    ['রাইডারের নাম', rider.name || 'নোটে নেই'],
    ['রাইডারের ফোন', rider.phone ? <a className="pointer-events-auto font-semibold text-brand underline" href={`tel:${rider.phone}`}>{rider.phone}</a> : 'নোটে নেই'],
  ]

  const chooseAsk = (v) => { setAsk(v); hold(!!v) }
  const msgFor = () => {
    const nm = e.name || order?.name || ''
    const site = S.settings.siteName
    const base = `আসসালামু আলাইকুম ${nm}, ${site} থেকে বলছি। আপনার অর্ডার ${e.invoice}`
    if (k.label === 'পার্সেল ফেরত') return `${base} ডেলিভারি করা যায়নি এবং পার্সেল ফেরত আসছে। আবার পাঠাতে চাইলে কবে ও কোথায় রিসিভ করবেন জানাবেন কি?`
    if (k.label === 'কাস্টমার/পার্সেল হোল্ড') return `${base} কুরিয়ার হোল্ডে আছে। কখন ডেলিভারি নিলে সুবিধা হবে জানাবেন কি?`
    return `${base} ডেলিভারি করতে গিয়ে রাইডার আপনাকে পাননি/সমস্যা হয়েছে। আবার ডেলিভারি দিতে কখন ও কোথায় থাকবেন জানাবেন কি?`
  }
  const phone = order?.phone || ''
  const rnote = who === 'rider' && rider.phone ? `আবার ডেলিভারি — রাইডারকে কল দিন: ${rider.phone}` : `আবার ডেলিভারি — কাস্টমারকে কল দিন: ${phone}`
  const doResend = async () => {
    if (c.test) { toast('এটা টেস্ট কার্ড — আসল কার্ডে পার্সেল আবার পাঠানো হবে'); return chooseAsk('') }
    if (!order) return toast('অর্ডার খুঁজে পাওয়া যায়নি')
    setBusy(true)
    try {
      if (LIVE) await courierLive(order, order.courier || 'steadfast', meName(), rnote, true)
      else sendToCourier(order, order.courier || 'steadfast', meName())
      if (order.status === 'cancelled') setStatus(order, 'confirmed', meName(), 'Re-sent to courier')
      if (['transit', 'ready', 'confirmed'].includes(order.status) && order.status !== 'ready') { order.status = 'ready'; order.history.push({ s: 'ready', by: meName(), at: Date.now(), note: 'Re-sent to courier' }) }
      save(); toast(`${order.invoice}: আবার কুরিয়ারে পাঠানো হয়েছে`); chooseAsk(''); onClose()
    } catch (err) { toast(err.message || 'পাঠানো যায়নি') } finally { setBusy(false) }
  }
  const doReturn = () => {
    if (c.test) { toast('এটা টেস্ট কার্ড — আসল কার্ডে অর্ডার "Returned" হবে'); return chooseAsk('') }
    if (!order) return toast('অর্ডার খুঁজে পাওয়া যায়নি')
    setStatus(order, 'returned', meName(), RETURN_REASONS[3]); save(); toast(`${order.invoice}: ফেরত নেওয়া হয়েছে (Returned)`); chooseAsk(''); onClose()
  }
  const quick = 'inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold shadow-sm'
  return (
    <div className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border-2 ${t.ring} bg-white shadow-2xl`} role="alert">
      <div className={`flex items-center justify-between gap-2 px-4 py-2 ${t.head}`}>
        <p className="font-bold">{k.icon} {k.label}</p>
        <button onClick={onClose} className="rounded-full bg-white/80 px-3 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white" aria-label="ইগনোর">✕ ইগনোর</button>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <p className="rounded-lg bg-gray-50 p-2.5 font-medium leading-snug text-ink">{e.message}</p>
        {COURIER_ST[e.status] && COURIER_ST[e.status] !== e.message && <p className="text-xs text-muted">স্ট্যাটাস: {COURIER_ST[e.status]}</p>}
        <dl className="grid grid-cols-[7.5rem_1fr] gap-x-2 gap-y-1 text-[13px]">
          {rows.map(([a, b]) => <div key={a} className="contents"><dt className="text-muted">{a}</dt><dd className="break-words font-medium text-ink">{b}</dd></div>)}
        </dl>
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
          {phone ? <a href={`tel:${phone}`} className={`${quick} bg-sky-600 text-white`}>📞 কাস্টমারকে কল</a> : <span className={`${quick} bg-gray-100 text-gray-400`}>📞 ফোন নেই</span>}
          {phone ? <a href={`https://wa.me/${waNum(phone)}?text=${encodeURIComponent(msgFor())}`} target="_blank" rel="noreferrer" className={`${quick} bg-[#25D366] text-white`}>💬 WhatsApp-এ মেসেজ</a> : <span className={`${quick} bg-gray-100 text-gray-400`}>💬 WhatsApp নেই</span>}
          <button disabled={busy} onClick={() => chooseAsk('resend')} className={`${quick} bg-brand text-white`}>🔁 আবার ডেলিভারি পাঠান</button>
          <button disabled={busy} onClick={() => chooseAsk('return')} className={`${quick} border border-red-300 bg-red-50 text-red-700`}>↩ ফেরত নিন</button>
        </div>
        {ask && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <p className="font-semibold">{ask === 'resend' ? 'নতুন করে কুরিয়ারে পার্সেল বুক হবে। কাকে কল দিতে হবে বেছে নিন — নম্বরসহ নোটটি পার্সেলের সাথে Steadfast-এ যাবে। নিশ্চিত?' : 'অর্ডারটি "Returned" হিসেবে মার্ক হবে। নিশ্চিত?'}</p>
            {ask === 'resend' && (
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                <button type="button" onClick={() => setWho('customer')} className={`rounded-md border px-2 py-1.5 text-left font-semibold ${who === 'customer' ? 'border-gray-900 bg-white' : 'border-amber-200 bg-amber-100/50'}`}>{who === 'customer' ? '●' : '○'} কাস্টমারকে কল দিন · {phone || 'নম্বর নেই'}</button>
                {rider.phone && <button type="button" onClick={() => setWho('rider')} className={`rounded-md border px-2 py-1.5 text-left font-semibold ${who === 'rider' ? 'border-gray-900 bg-white' : 'border-amber-200 bg-amber-100/50'}`}>{who === 'rider' ? '●' : '○'} রাইডারকে কল দিন · {rider.phone}</button>}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button disabled={busy} onClick={ask === 'resend' ? doResend : doReturn} className="rounded-md bg-gray-900 px-3 py-1.5 font-bold text-white">{busy ? 'অপেক্ষা করুন…' : 'হ্যাঁ, করুন'}</button>
              <button disabled={busy} onClick={() => chooseAsk('')} className="rounded-md bg-white px-3 py-1.5 font-semibold text-gray-700">না</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted">{hhmm(e.at)}</span>
          {!c.test && <button onClick={onOpen} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">অর্ডার খুলুন →</button>}
        </div>
      </div>
      <div className="h-1.5 bg-gray-100"><div className={`h-full ${t.bar}`} style={{ animation: `courierShrink ${SHOW_MS}ms linear forwards` }} /></div>
      <style>{'@keyframes courierShrink{from{width:100%}to{width:0}}'}</style>
    </div>
  )
}

const findOrder = (id) => S.orders.find((o) => o.id === id) || null
