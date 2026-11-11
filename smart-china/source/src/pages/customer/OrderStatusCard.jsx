import { ORDER_STATUSES } from '../../services/orderService'
import { formatDate, formatPrice } from '../../utils/format'
import { Link } from 'react-router-dom'
import { trackCode } from '../../store/db'

const FLOW = ['pending', 'confirmed', 'ready', 'transit', 'delivered']

export function StatusPill({ status }) {
  const tone = ['cancelled', 'returned', 'partial'].includes(status) ? 'bg-red-100 text-red-700' : status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{ORDER_STATUSES[status] || status}</span>
}

export default function OrderStatusCard({ order, showItems = true }) {
  const step = Math.max(FLOW.indexOf(order.status), order.status === 'hold' ? 0 : -1)
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">Invoice: {order.invoice}</p>
          <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3"><StatusPill status={order.status} /><Link to={`/track/${order.trackCode || trackCode(order)}`} className="text-sm font-semibold text-brand hover:underline">Full tracking →</Link></div>
      </div>
      {!['cancelled', 'returned', 'partial'].includes(order.status) && (
        <ol className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px]">
          {FLOW.map((s, i) => (
            <li key={s}>
              <div className={`mb-1 h-1.5 rounded ${i <= step ? 'bg-accent' : 'bg-line'}`} />
              <span className={i <= step ? 'font-semibold' : 'text-muted'}>{ORDER_STATUSES[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {showItems && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {order.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-2"><span className="line-clamp-1">{i.name}{i.variant ? ` (${i.variant})` : ''} × {i.quantity}</span><span>{formatPrice(i.price * i.quantity)}</span></li>
          ))}
          <li className="flex justify-between py-2 text-muted"><span>Delivery charge</span><span>{formatPrice(order.shippingCharge)}</span></li>
          <li className="flex justify-between py-2 font-bold"><span>Total</span><span className="text-accent">{formatPrice(order.total)}</span></li>
        </ul>
      )}
    </div>
  )
}
