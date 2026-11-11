import { Link, useNavigate } from 'react-router-dom'
import Img from '../common/Img'
import { DiscountBadge, Price } from '../common/ui'
import { useCart } from '../../context/CartContext'
import { inStock, hasOptions, variantInStock } from '../../store/db'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const navigate = useNavigate()
  const url = `/product/${product.slug}`
  const opts = hasOptions(product)
  const several = opts && new Set(product.variants.map((v) => v.price)).size > 1
  const only = opts && product.variants.filter(variantInStock).length === 1 ? product.variants.find(variantInStock) : null

  // "Order now": products without options (or with only one in-stock option) go straight to checkout;
  // otherwise the product page opens so the customer can pick colour / size / model.
  const orderNow = () => {
    if (opts && !only) return navigate(`${url}?buy=1`)
    add(product, 1, only?.key || '')
    navigate('/customer/checkout')
  }

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={url} className="relative block aspect-square overflow-hidden bg-white">
        <Img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <DiscountBadge price={product.price} oldPrice={product.oldPrice} className="absolute left-2 top-2" />
        {product.isNew && <span className="absolute right-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">New</span>}
        {!inStock(product) && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold text-white">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={url} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:text-brand" title={product.name}>{product.name}</Link>
        <div className="flex items-baseline gap-1">{several && <span className="text-[11px] text-muted">from</span>}<Price price={product.price} oldPrice={product.oldPrice} /></div>
        <p className="text-xs text-muted">{opts ? `${product.variants.length} options` : ''}{opts && product.sold ? ' · ' : ''}{product.sold ? `${product.sold} sold` : ''}</p>
        <button onClick={orderNow} disabled={!inStock(product)} className="btn-accent mt-auto w-full">{!inStock(product) ? 'Out of stock' : opts && !only ? 'Choose & order' : 'Order now'}</button>
      </div>
    </article>
  )
}
