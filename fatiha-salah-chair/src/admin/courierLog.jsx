import { S } from '../store/db'

/** Steadfast delivery_status → short text (same wording as api/lib/orders.php SF_STATUS_TEXT) */
export const COURIER_ST = {
  in_review: 'বুক হয়েছে — পিকআপের অপেক্ষায়', pending: 'রাইডারের কাছে — ডেলিভারির পথে', hold: 'কুরিয়ারে হোল্ড',
  delivered_approval_pending: 'ডেলিভারি (অনুমোদনের অপেক্ষায়)', partial_delivered_approval_pending: 'আংশিক ডেলিভারি (অনুমোদনের অপেক্ষায়)',
  cancelled_approval_pending: 'বাতিল (অনুমোদনের অপেক্ষায়)', unknown_approval_pending: 'যাচাই হচ্ছে',
  delivered: 'ডেলিভারি সম্পন্ন', partial_delivered: 'আংশিক ডেলিভারি', cancelled: 'বাতিল — ফেরত যাচ্ছে', exceptional: 'কুরিয়ারে সমস্যা', unknown: 'অজানা',
}
const fdate = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Courier timeline: every status / rider note the courier sent (webhook or "Refresh status"). */
export function CourierLog({ o }) {
  const log = [...(o.courierLog || [])].reverse()
  if (!log.length) return <p className="text-xs text-muted">এখনো কোনো কুরিয়ার আপডেট আসেনি।{o.courier === 'steadfast' ? ' Steadfast webhook থেকে নিজে আসবে, অথবা “Refresh status” চাপুন।' : ''}</p>
  return (
    <ol className="space-y-2 border-l-2 border-brand/30 pl-4 text-xs">
      {log.map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-brand ring-4 ring-brand/15' : 'bg-gray-300'}`} />
          <p className="font-medium text-ink">{!e.status && '🛵 '}{e.message}</p>
          <p className="text-muted">{fdate(e.at)}{COURIER_ST[e.status] && COURIER_ST[e.status] !== e.message ? ` · ${COURIER_ST[e.status]}` : ''}{!e.status ? ' · রাইডার/হাব নোট' : ''}</p>
        </li>
      ))}
    </ol>
  )
}

const SEEN_KEY = 'fatiha_courier_seen'
export const courierSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY) || 0) } catch { return 0 } }
export const markCourierSeen = () => { try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch { /* private mode */ } }

/** Every courier update across orders, newest first (for the notification bell). */
export function courierFeed(limit = 40) {
  const out = []
  for (const o of S.orders) for (const e of o.courierLog || []) if (e.message && !/বুক হয়েছে|booked|created by sender/i.test(e.message)) out.push({ ...e, invoice: o.invoice, name: o.name, orderId: o.id, rider: !e.status || /^\d+$/.test(e.status) })
  return out.sort((a, b) => b.at - a.at).slice(0, limit)
}
