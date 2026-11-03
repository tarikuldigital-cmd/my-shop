import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Img from '../components/common/Img'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { Breadcrumb, DiscountBadge, Price, Spinner } from '../components/common/ui'
import QtyStepper from '../components/product/QtyStepper'
import { ProductRow } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getProduct, getRelatedProducts, getReviews } from '../services/catalogService'
import { useCart } from '../context/CartContext'
import { useSite } from '../context/SiteContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import NotFound from './NotFound'

function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div className="card relative flex aspect-square items-center justify-center overflow-hidden p-3">
        <Img src={images[active]} alt={name} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button key={src} onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${i === active ? 'border-accent' : 'border-line'}`} aria-label={`Image ${i + 1}`}>
              <Img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Tabs({ product, settings }) {
  const [tab, setTab] = useState('description')
  const { user } = useAuth()
  const { data: reviews } = useAsync(() => getReviews(product.slug), [product.slug])
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'orderpolicy', label: 'Order Policy' },
    { id: 'writeReview', label: `Reviews (${reviews?.count ?? 0})` },
  ]
  return (
    <section className="card mt-8" id={tab}>
      <div className="flex overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-5 py-3 text-sm font-semibold ${tab === t.id ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-ink'}`}>{t.label}</button>
        ))}
      </div>
      <div className="prose-bs p-5 text-sm">
        {tab === 'description' && (product.description
          ? <div dangerouslySetInnerHTML={{ __html: product.description }} />
          : <p className="text-muted">এই বইয়ের বিবরণ এখনো যোগ করা হয়নি।</p>)}
        {tab === 'orderpolicy' && <div dangerouslySetInnerHTML={{ __html: settings.orderPolicyHtml }} />}
        {tab === 'writeReview' && (
          <div>
            <p className="mb-3 flex items-center gap-1 font-semibold">
              {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" className="h-4 w-4 text-gray-300" />)}
              <span className="ml-1">{(reviews?.average ?? 0).toFixed(2)}/5</span>
              <span className="text-muted">({reviews?.count ?? 0} reviews)</span>
            </p>
            {reviews?.data?.length ? null : <p className="text-muted">এখনো কোনো রিভিউ নেই।</p>}
            <h4>Write a review</h4>
            {user
              ? <p className="text-muted">রিভিউ জমা দেওয়ার ফিচার ব্যাকএন্ড যুক্ত হলে চালু হবে।</p>
              : <Link to="/customer/login" className="btn-brand">Login to Post Your Review</Link>}
          </div>
        )}
      </div>
    </section>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { settings, findCategory } = useSite()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const { data: product, loading, error } = useAsync(() => getProduct(slug), [slug])
  const { data: related } = useAsync(() => (product ? getRelatedProducts(product) : Promise.resolve([])), [product?.slug])

  if (loading) return <Spinner className="py-24" />
  if (error || !product) return <NotFound />

  const category = findCategory(product.categories[0])
  const save = product.oldPrice > product.price ? product.oldPrice - product.price : 0

  const orderNow = () => { add(product, qty); navigate('/customer/checkout') }
  const addToCart = () => { add(product, qty); setAdded(true); setTimeout(() => setAdded(false), 2000) }

  return (
    <div className="container-x py-5">
      <Breadcrumb items={[...(category ? [{ to: `/category/${category.slug}`, label: category.name }] : []), { label: product.name }]} />

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.9fr]">
        <Gallery images={product.images} name={product.name} />

        <div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Price price={product.price} oldPrice={product.oldPrice} size="lg" />
            <DiscountBadge price={product.price} oldPrice={product.oldPrice} className="text-sm" />
          </div>
          {save > 0 && <p className="mt-1 text-sm text-green-700">Save {formatPrice(save)}</p>}

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Product Code</dt><dd>{product.sku || 'N/A'}</dd>
            <dt className="text-muted">Product Type</dt><dd>{product.productType || 'Physical'}</dd>
            <dt className="text-muted">Brand</dt><dd>{product.brand || 'N/A'}</dd>
            {category && (<><dt className="text-muted">Category</dt><dd><Link className="text-brand hover:underline" to={`/category/${category.slug}`}>{category.name}</Link></dd></>)}
          </dl>

          {product.variations?.length > 0 && (
            <div className="mt-4 text-sm">{/* reserved for Laravel product attributes (size/edition etc.) */}</div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} />
            <button onClick={addToCart} className="btn-outline h-10">{added ? <><Icon name="check" className="h-4 w-4" />কার্টে যোগ হয়েছে</> : <><Icon name="cart" className="h-4 w-4" />কার্টে যোগ করুন</>}</button>
          </div>
          <button onClick={orderNow} className="btn-accent mt-3 w-full py-3 text-base">অর্ডার করুন</button>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a href={`tel:${settings.phone}`} className="btn-brand py-2.5"><Icon name="phone" className="h-4 w-4" />কল করুন {settings.phone}</a>
            <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] py-2.5 text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Whatsapp {settings.phoneIntl}</a>
          </div>
        </div>

        <aside className="card h-fit p-4 md:col-span-2 lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="truck" />Delivery Charge (Courier)</h2>
          <ul className="divide-y divide-line text-sm">
            {settings.shipping.map((s) => (
              <li key={s.id} className="flex justify-between py-2"><span>{s.labelEn}</span><span className="font-semibold">{formatPrice(s.charge)}</span></li>
            ))}
          </ul>
          <p className="mt-3 rounded bg-surface p-3 text-xs leading-5 text-muted">৩-৫ দিনের মধ্যে সারাদেশে ডেলিভারী। ক্যাশ অন ডেলিভারি সুবিধা আছে।</p>
        </aside>
      </div>

      <Tabs product={product} settings={settings} />

      {related?.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-4">Related Products</h2>
          <ProductRow products={related} />
        </section>
      )}
    </div>
  )
}
