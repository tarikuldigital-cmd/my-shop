import { Link, useNavigate } from 'react-router-dom'
import Img from '../common/Img'
import { DiscountBadge, Price } from '../common/ui'
import { useCart } from '../../context/CartContext'
import { inStock } from '../../store/db'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const navigate = useNavigate()
  const url = `/product/${product.slug}`

  // Live-site behaviour: "অর্ডার করুন" puts the book in the cart and opens checkout.
  const orderNow = () => {
    add(product, 1)
    navigate('/customer/checkout')
  }

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:shadow-md">
      <Link to={url} className="relative block aspect-[3/4] overflow-hidden bg-white">
        <Img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105" />
        <DiscountBadge price={product.price} oldPrice={product.oldPrice} className="absolute left-2 top-2" />
        {!inStock(product) && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold text-white">স্টকে নেই</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={url} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:text-brand" title={product.name}>{product.name}</Link>
        <Price price={product.price} oldPrice={product.oldPrice} />
        {product.author ? <p className="truncate text-xs text-muted">{product.author}</p> : <p className="text-xs text-muted">Sold {product.sold ?? 0}</p>}
        <button onClick={orderNow} disabled={!inStock(product)} className="btn-accent mt-auto w-full">{inStock(product) ? 'অর্ডার করুন' : 'স্টকে নেই'}</button>
      </div>
    </article>
  )
}
