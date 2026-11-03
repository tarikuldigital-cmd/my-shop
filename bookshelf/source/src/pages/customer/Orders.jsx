import { Link } from 'react-router-dom'
import { EmptyState, Spinner } from '../../components/common/ui'
import useAsync from '../../hooks/useAsync'
import { getMyOrders } from '../../services/orderService'
import { formatDate, formatPrice } from '../../utils/format'
import AccountShell from './AccountShell'
import { StatusPill } from './OrderStatusCard'

export default function Orders() {
  const { data: orders, loading } = useAsync(getMyOrders, [])
  return (
    <AccountShell title="My Orders">
      {loading && <Spinner />}
      {!loading && !orders?.length && (
        <EmptyState title="এখনো কোনো অর্ডার করা হয়নি"><Link to="/" className="btn-accent">বই বাছাই করুন</Link></EmptyState>
      )}
      {!loading && orders?.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.invoice}>
                  <td className="px-4 py-3 font-semibold">{o.invoice}</td>
                  <td className="px-4 py-3">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right"><Link to={`/customer/orders/${o.invoice}`} className="text-brand hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountShell>
  )
}
