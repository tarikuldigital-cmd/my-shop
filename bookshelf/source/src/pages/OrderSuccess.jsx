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
        <h1 className="mt-4 text-2xl font-bold">ধন্যবাদ! আপনার অর্ডার গ্রহণ করা হয়েছে</h1>
        <p className="mt-2 text-muted">Invoice ID: <span className="font-semibold text-ink">{invoice}</span></p>
        {order && <p className="mt-1 text-muted">সর্বমোট: <span className="font-semibold text-accent">{formatPrice(order.total)}</span> ({order.payment?.method === 'cod' ? 'ক্যাশ অন ডেলিভারি' : `${order.payment?.method} — পেমেন্ট যাচাই করা হবে`})</p>}
        <p className="mt-4 text-sm">আমাদের প্রতিনিধি শীঘ্রই ফোনে আপনার অর্ডারটি নিশ্চিত করবেন। অর্ডারের তথ্য ও ট্র্যাকিং লিংক আপনার মোবাইলে SMS করে পাঠানো হবে।</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={order?.trackCode ? `/track/${order.trackCode}` : '/customer/order-track'} className="btn-brand">অর্ডার ট্র্যাক করুন</Link>
          <Link to="/" className="btn-outline">আরও বই দেখুন</Link>
        </div>
      </div>
    </div>
  )
}
