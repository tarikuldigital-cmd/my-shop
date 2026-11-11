import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Img from '../components/common/Img'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { Alert, Breadcrumb, DiscountBadge, Price, Spinner } from '../components/common/ui'
import QtyStepper from '../components/product/QtyStepper'
import { ProductRow } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getProduct, getRelatedProducts, getReviews, submitReview } from '../services/catalogService'
import { useCart } from '../context/CartContext'
import { useSite } from '../context/SiteContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { useSeo, productJsonLd } from '../lib/seo'
import { track } from '../lib/tracking'
import { addRecent } from '../lib/recent'
import { inStock, hasOptions, variantOf, variantInStock } from '../store/db'
import NotFound from './NotFound'

function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [images])
  return (
    <div>
      <div className="card relative flex aspect-square items-center justify-center overflow-hidden bg-white p-3">
        <Img src={images[active]} alt={name} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button key={src} onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 bg-white ${i === active ? 'border-accent' : 'border-line'}`} aria-label={`Image ${i + 1}`}>
              <Img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Colour / size / model buttons. Combinations that are out of stock are shown crossed out. */
function VariantPicker({ product, picked, setPicked }) {
  return (
    <div className="mt-4 space-y-3">
      {product.options.map((o, oi) => (
        <div key={o.name}>
          <p className="mb-1.5 text-sm"><span className="text-muted">{o.name}:</span> <b>{picked[oi] || 'Choose'}</b></p>
          <div className="flex flex-wrap gap-2">
            {o.values.map((val) => {
              const trial = picked.map((x, k) => (k === oi ? val : x))
              const full = trial.every(Boolean) ? variantOf(product, trial.join(' / ')) : null
              const soldOut = full ? !variantInStock(full) : false
              const on = picked[oi] === val
              return (
                <button key={val} type="button" onClick={() => setPicked(trial)} aria-pressed={on}
                  className={`min-w-11 rounded-md border px-3 py-1.5 text-sm transition ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'} ${soldOut ? 'text-muted line-through opacity-60' : ''}`}>{val}</button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Stars({ value, size = 'h-4 w-4' }) {
  return <span className="inline-flex">{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" className={`${size} ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />)}</span>
}

function ReviewForm({ slug, user, onDone }) {
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [msg, setMsg] = useState(null)
  const send = async (e) => {
    e.preventDefault()
    if (text.trim().length < 5) return setMsg({ type: 'error', text: 'Please write a few words' })
    const r = await submitReview(slug, { name: name || 'Customer', phone: user?.phone || '', rating, text: text.trim() })
    setMsg({ type: 'success', text: r.message }); setText(''); onDone?.()
  }
  return (
    <form onSubmit={send} className="mt-3 space-y-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((s) => <button type="button" key={s} onClick={() => setRating(s)} aria-label={`${s} star`} role="radio" aria-checked={rating === s}><Icon name="star" className={`h-7 w-7 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} /></button>)}
      </div>
      {!user && <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
      <textarea className="field" rows={3} placeholder="Share your experience with this product…" value={text} onChange={(e) => setText(e.target.value)} />
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <button className="btn-brand">Submit review</button>
    </form>
  )
}

function Tabs({ product, settings, tab, setTab }) {
  const { user } = useAuth()
  const [v, setV] = useState(0)
  const { data: reviews } = useAsync(() => getReviews(product.slug), [product.slug, v])
  const info = [['Brand', product.brand], ['Product code', product.sku], ...(product.specs || []).map((r) => [r.k, r.v])].filter(([k, x]) => k && x)
  const tabs = [
    { id: 'description', label: 'Description' },
    ...(info.length ? [{ id: 'specs', label: 'Specifications' }] : []),
    { id: 'orderpolicy', label: 'Order Policy' },
    { id: 'writeReview', label: `Reviews (${reviews?.count ?? 0})` },
  ]
  return (
    <section className="card mt-8 scroll-mt-40" id="tabs">
      <div className="flex overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-5 py-3 text-sm font-semibold ${tab === t.id ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-ink'}`}>{t.label}</button>
        ))}
      </div>
      <div className="prose-bs p-5 text-sm">
        {tab === 'description' && (product.description
          ? <div dangerouslySetInnerHTML={{ __html: product.description }} />
          : <p className="text-muted">No description has been added yet.</p>)}
        {tab === 'specs' && (
          <table className="w-full max-w-lg text-sm"><tbody>{info.map(([k, x]) => <tr key={k} className="border-b border-line"><th className="w-32 py-2 text-left font-medium text-muted">{k}</th><td className="py-2">{x}</td></tr>)}</tbody></table>
        )}
        {tab === 'orderpolicy' && <div dangerouslySetInnerHTML={{ __html: settings.orderPolicyHtml }} />}
        {tab === 'writeReview' && (
          <div>
            <p className="mb-3 flex items-center gap-2 font-semibold"><Stars value={reviews?.average ?? 0} /><span>{(reviews?.average ?? 0).toFixed(2)}/5</span><span className="font-normal text-muted">({reviews?.count ?? 0} reviews)</span></p>
            {reviews?.data?.length ? (
              <ul className="mb-5 space-y-3">
                {reviews.data.map((r) => <li key={r.id} className="rounded-md bg-surface p-3"><div className="flex items-center gap-2"><b>{r.name}</b><Stars value={r.rating} size="h-3.5 w-3.5" /></div><p className="mt-1">{r.text}</p></li>)}
              </ul>
            ) : <p className="text-muted">No reviews yet. Be the first to review this product!</p>}
            <h4>Write a review</h4>
            <ReviewForm slug={product.slug} user={user} onDone={() => setV((x) => x + 1)} />
          </div>
        )}
      </div>
    </section>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { settings, findCategory } = useSite()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [tab, setTab] = useState('description')
  const [picked, setPicked] = useState([])
  const [needPick, setNeedPick] = useState(false)

  const { data: product, loading, error } = useAsync(() => getProduct(slug), [slug])
  const { data: related } = useAsync(() => (product ? getRelatedProducts(product) : Promise.resolve([])), [product?.slug])

  useSeo(product ? {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || `${product.name} — ${formatPrice(product.price)}. Cash on delivery, nationwide home delivery.`,
    image: product.images[0] && (product.images[0].includes('/') ? product.images[0] : `product/${product.images[0]}`),
    jsonLd: productJsonLd(product, location.href),
  } : {})

  useEffect(() => {
    if (!product) return
    setTab('description'); setQty(1); setNeedPick(false)
    // pre-select the first in-stock combination so most customers can order in one tap
    const first = hasOptions(product) ? (product.variants.find(variantInStock) || product.variants[0]) : null
    setPicked(first ? first.key.split(' / ') : [])
    addRecent(product.slug)
    track('ViewContent', { items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1, category: product.categories[0] }], value: product.price })
    if (params.get('buy')) document.getElementById('buy-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [product]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner className="py-24" />
  if (error || !product) return <NotFound />

  const opts = hasOptions(product)
  const key = opts && picked.length === product.options.length && picked.every(Boolean) ? picked.join(' / ') : ''
  const v = opts ? variantOf(product, key) : null
  const price = v ? v.price : product.price
  const oldPrice = v ? v.oldPrice : product.oldPrice
  const stock = v ? v.stock : product.stock
  const available = opts ? (v ? variantInStock(v) : inStock(product)) : inStock(product)
  const category = findCategory(product.categories[0])
  const save = oldPrice > price ? oldPrice - price : 0
  const shareUrl = location.href
  const ready = () => { if (opts && !v) { setNeedPick(true); return false } return true }
  const orderNow = () => { if (!ready()) return; add(product, qty, key); navigate('/customer/checkout') }
  const addToCart = () => { if (!ready()) return; add(product, qty, key); setAdded(true); setTimeout(() => setAdded(false), 2000) }
  const waText = `I want to order: ${product.name}${key ? ` (${key})` : ''} × ${qty}. ${shareUrl}`

  return (
    <div className="container-x py-5 pb-24 md:pb-5">
      <Breadcrumb items={[...(category ? [{ to: `/category/${category.slug}`, label: category.name }] : []), { label: product.name }]} />

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.9fr]">
        <Gallery images={product.images} name={product.name} />

        <div id="buy-box">
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Price price={price} oldPrice={oldPrice} size="lg" />
            <DiscountBadge price={price} oldPrice={oldPrice} className="text-sm" />
          </div>
          {save > 0 && <p className="mt-1 text-sm text-green-700">You save {formatPrice(save)}</p>}
          <p className={`mt-2 text-sm font-semibold ${available ? 'text-green-700' : 'text-red-600'}`}>
            {!available ? '✕ Out of stock' : typeof stock === 'number' && stock <= 5 ? `● Only ${stock} left` : '● In stock'}
          </p>

          {product.shortDescription && <p className="mt-3 rounded-md bg-surface p-3 text-sm leading-relaxed text-ink/80">{product.shortDescription}</p>}

          {opts && <VariantPicker product={product} picked={picked} setPicked={(p) => { setPicked(p); setNeedPick(false) }} />}
          {needPick && <p className="mt-2 text-sm font-semibold text-red-600">Please choose {product.options.filter((o, i) => !picked[i]).map((o) => o.name.toLowerCase()).join(' and ') || 'an option'}.</p>}

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Product code</dt><dd>{v?.sku || product.sku || 'N/A'}</dd>
            {product.brand && <><dt className="text-muted">Brand</dt><dd>{product.brand}</dd></>}
            {category && (<><dt className="text-muted">Category</dt><dd><Link className="text-brand hover:underline" to={`/category/${category.slug}`}>{category.name}</Link></dd></>)}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} />
            <button onClick={addToCart} disabled={!available} className="btn-outline h-10">{added ? <><Icon name="check" className="h-4 w-4" />Added to cart</> : <><Icon name="cart" className="h-4 w-4" />Add to cart</>}</button>
          </div>
          <button onClick={orderNow} disabled={!available} className="btn-accent mt-3 w-full py-3 text-base">{available ? 'Order now — Cash on delivery' : 'Out of stock'}</button>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a href={`tel:${settings.phone}`} className="btn-brand py-2.5"><Icon name="phone" className="h-4 w-4" />Call {settings.phone}</a>
            <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] py-2.5 text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Order on WhatsApp</a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Share:</span>
            <a className="hover:text-brand" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">Facebook</a>
            <a className="hover:text-brand" href={`https://wa.me/?text=${encodeURIComponent(`${product.name} ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <button className="hover:text-brand" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy link</button>
            <button className="hover:text-brand" onClick={() => { setTab('writeReview'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }) }}>See reviews</button>
          </div>
        </div>

        <aside className="card h-fit p-4 md:col-span-2 lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="truck" />Delivery charge</h2>
          <ul className="divide-y divide-line text-sm">
            {settings.shipping.map((s) => (
              <li key={s.id} className="flex justify-between py-2"><span>{s.label}<span className="block text-xs text-muted">{s.eta}</span></span><span className="font-semibold">{formatPrice(s.charge)}</span></li>
            ))}
          </ul>
          {settings.freeShippingMin > 0 && <p className="mt-2 text-xs font-semibold text-green-700">Free delivery on orders over ৳{settings.freeShippingMin}</p>}
          <ul className="mt-3 space-y-1.5 rounded bg-surface p-3 text-xs leading-5 text-muted">
            <li>✓ Nationwide delivery by courier</li>
            <li>✓ Cash on delivery — pay when the parcel arrives</li>
            <li>✓ Check the product in front of the delivery person</li>
            <li>✓ Damaged or wrong item? Tell us within 3 days for a replacement</li>
          </ul>
        </aside>
      </div>

      <Tabs product={product} settings={settings} tab={tab} setTab={setTab} />

      {related?.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-4">Related products</h2>
          <ProductRow products={related} />
        </section>
      )}

      {/* Sticky order bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-muted">{product.name}{key ? ` · ${key}` : ''}</p><p className="font-bold text-accent">{formatPrice(price)}</p></div>
        <button onClick={orderNow} disabled={!available} className="btn-accent px-6 py-3">{available ? 'Order now' : 'Out of stock'}</button>
      </div>
    </div>
  )
}
