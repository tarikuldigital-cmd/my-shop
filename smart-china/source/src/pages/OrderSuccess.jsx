import { Link, useLocation, useParams } from 'react-router-dom'
import Icon from '../components/common/Icon'
import { formatPrice } from '../utils/format'

export default function OrderSuccess() {
  const { invoice } = useParams()
  const order = useLocation().state?.order
  return (
    <div className="container-x py-12">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"><Icon name="check" className="h-9 w-9" strokeWidth={2.5} /></div>
        <h1 className="mt-4 text-2xl font-bold">Thank you! Your order has been placed</h1>
        <p className="mt-2 text-muted">Invoice ID: <span className="font-semibold text-ink">{invoice}</span></p>
        {order && <p className="mt-1 text-muted">Total: <span className="font-semibold text-accent">{formatPrice(order.total)}</span> ({order.payment?.method === 'cod' ? 'Cash on delivery' : `${order.payment?.method} — payment will be verified`})</p>}
        <p className="mt-4 text-sm">Our team will call you shortly to confirm the order. Your order details and a tracking link will be sent to your phone by SMS.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={order?.trackCode ? `/track/${order.trackCode}` : '/customer/order-track'} className="btn-brand">Track order</Link>
          <Link to="/" className="btn-outline">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
