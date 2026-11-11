import { Link, useParams } from 'react-router-dom'
import { EmptyState, Spinner } from '../../components/common/ui'
import useAsync from '../../hooks/useAsync'
import { getMyOrder } from '../../services/orderService'
import AccountShell from './AccountShell'
import OrderStatusCard from './OrderStatusCard'

export default function OrderDetail() {
  const { invoice } = useParams()
  const { data: order, loading, error } = useAsync(() => getMyOrder(invoice), [invoice])
  return (
    <AccountShell title={`Order ${invoice}`}>
      {loading && <Spinner />}
      {error && <EmptyState title={error.message}><Link to="/customer/orders" className="btn-brand">My Orders</Link></EmptyState>}
      {order && (
        <div className="space-y-4">
          <OrderStatusCard order={order} />
          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Delivery details</h2>
            <p>{order.name} · {order.phone}</p>
            <p className="text-muted">{order.address}</p>
          </div>
        </div>
      )}
    </AccountShell>
  )
}
