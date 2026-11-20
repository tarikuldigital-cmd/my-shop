import { S } from '../store/db'

/** Steadfast delivery_status → short text (same wording as api/lib/orders.php SF_STATUS_TEXT) */
export const COURIER_ST = {
  in_review: 'Booked — waiting for pickup', pending: 'With the rider — on the way', hold: 'On hold at courier',
  delivered_approval_pending: 'Delivered (approval pending)', partial_delivered_approval_pending: 'Partly delivered (approval pending)',
  cancelled_approval_pending: 'Cancelled (approval pending)', unknown_approval_pending: 'Under review',
  delivered: 'Delivered', partial_delivered: 'Partly delivered', cancelled: 'Cancelled — returning', exceptional: 'Courier problem', unknown: 'Unknown', in_transit: 'In transit', out_for_delivery: 'Out for delivery',
}
const fdate = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Courier timeline: every status / rider note the courier sent (webhook or "Refresh status"). */
export function CourierLog({ o }) {
  const log = [...(o.courierLog || [])].reverse()
  if (!log.length) return <p className="text-xs text-muted">No courier updates yet.{o.courier === 'steadfast' ? ' They arrive by Steadfast webhook, or press “Refresh status”.' : ''}</p>
  return (
    <ol className="space-y-2 border-l-2 border-brand/30 pl-4 text-xs">
      {log.map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-brand ring-4 ring-brand/15' : 'bg-gray-300'}`} />
          <p className="font-medium text-ink">{!e.status && '🛵 '}{e.message}</p>
          <p className="text-muted">{fdate(e.at)}{COURIER_ST[e.status] && COURIER_ST[e.status] !== e.message ? ` · ${COURIER_ST[e.status]}` : ''}{!e.status ? ' · rider / hub note' : ''}</p>
        </li>
      ))}
    </ol>
  )
}

const SEEN_KEY = 'scg_courier_seen'
export const courierSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY) || 0) } catch { return 0 } }
export const markCourierSeen = () => { try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch { /* private mode */ } }

/** Every courier update across orders, newest first (for the notification bell). */
export function courierFeed(limit = 40) {
  const out = []
  for (const o of S.orders) for (const e of o.courierLog || []) if (e.message && !/booked|created by sender/i.test(e.message)) out.push({ ...e, invoice: o.invoice, name: o.name, orderId: o.id, consignment: o.consignmentId || '', rider: !e.status || /^\d+$/.test(e.status) })
  return out.sort((a, b) => b.at - a.at).slice(0, limit)
}
