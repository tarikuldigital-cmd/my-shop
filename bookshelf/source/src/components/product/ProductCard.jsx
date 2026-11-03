import { Link, useNavigate } from 'react-router-dom'
import Img from '../common/Img'
import { DiscountBadge, Price } from '../common/ui'
import { useCart } from '../../context/CartContext'

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
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={url} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:text-brand" title={product.name}>{product.name}</Link>
        <Price price={product.price} oldPrice={product.oldPrice} />
        <p className="text-xs text-muted">Sold {product.sold ?? 0}</p>
        <button onClick={orderNow} className="btn-accent mt-auto w-full">অর্ডার করুন</button>
      </div>
    </article>
  )
}
