import { useState } from 'react'
import { Alert, AuthCard } from '../../components/common/ui'
import { trackOrder } from '../../services/orderService'
import OrderStatusCard from './OrderStatusCard'

export default function OrderTrack() {
  const [phone, setPhone] = useState('')
  const [invoice, setInvoice] = useState('')
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setOrders(null)
    try { setOrders(await trackOrder({ phone, invoice })) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <AuthCard title="Order Track" subtitle="Enter the mobile number you ordered with to see the latest status">
        <form onSubmit={submit} className="space-y-4">
          <Alert>{error}</Alert>
          <div><label className="field-label" htmlFor="phone">Phone Number</label><input id="phone" required inputMode="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><label className="field-label" htmlFor="inv">Invoice ID (optional)</label><input id="inv" className="field" value={invoice} onChange={(e) => setInvoice(e.target.value)} /></div>
          <button disabled={busy} className="btn-accent w-full py-2.5">submit</button>
        </form>
      </AuthCard>
      {orders && (
        <div className="container-x -mt-4 mb-8 max-w-2xl space-y-4">
          {orders.map((o) => <OrderStatusCard key={o.invoice} order={o} />)}
        </div>
      )}
    </>
  )
}
