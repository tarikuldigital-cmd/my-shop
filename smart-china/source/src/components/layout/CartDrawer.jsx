import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import Img from '../common/Img'
import QtyStepper from '../product/QtyStepper'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/format'

/** Mini cart (the live site shows it as a header dropdown). */
export default function CartDrawer({ open, onClose }) {
  const { items, subtotal, setQty, remove } = useCart()
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 flex h-full w-96 max-w-[92%] flex-col bg-white shadow-xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-label="Shopping cart">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-bold">Your cart ({items.length})</h2>
          <button onClick={onClose} aria-label="Close cart"><Icon name="close" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted">
              <Icon name="cart" className="h-12 w-12" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3 p-4">
                  <Img src={i.image} alt={i.name} className="h-20 w-16 shrink-0 rounded border border-line object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${i.slug}`} onClick={onClose} className="line-clamp-2 text-sm font-medium hover:text-brand">{i.name}</Link>
                    {i.variant && <p className="text-xs text-muted">{i.variant}</p>}
                    <p className="mt-1 text-sm font-semibold text-accent">{formatPrice(i.price)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <QtyStepper value={i.quantity} onChange={(q) => setQty(i.key, q)} small />
                      <button onClick={() => remove(i.key)} className="text-muted hover:text-red-600" aria-label={`Remove ${i.name}`}><Icon name="trash" className="h-4 w-4" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-line p-4">
          <div className="mb-3 flex justify-between font-semibold"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <Link to="/customer/checkout" onClick={onClose} className="btn-accent w-full py-3">Checkout</Link>
        </div>
      </aside>
    </div>
  )
}
