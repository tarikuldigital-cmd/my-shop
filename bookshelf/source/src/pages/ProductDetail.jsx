import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { useSeo, bookJsonLd } from '../lib/seo'
import { track } from '../lib/tracking'
import { addRecent } from '../lib/recent'
import { inStock } from '../store/db'
import NotFound from './NotFound'

function Gallery({ images, name, lookInside, onLook }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div className="card relative flex aspect-square items-center justify-center overflow-hidden p-3">
        <Img src={images[active]} alt={name} className="h-full w-full object-contain" />
        {lookInside.length > 0 && (
          <button onClick={onLook} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-brand-dark">📖 একটু পড়ে দেখুন</button>
        )}
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

function LookInside({ pages, name, onClose }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => Math.min(pages.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [pages.length, onClose])
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={`${name} preview`}>
      <div className="flex items-center justify-between text-white"><span className="truncate text-sm">{name} — পৃষ্ঠা {i + 1}/{pages.length}</span><button onClick={onClose} aria-label="Close preview"><Icon name="close" className="h-7 w-7" /></button></div>
      <div className="relative flex flex-1 items-center justify-center py-3">
        <Img src={pages[i]} alt={`Page ${i + 1}`} className="max-h-full max-w-full rounded bg-white object-contain" />
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={!i} className="absolute left-0 rounded-full bg-white/20 p-2 text-white disabled:opacity-30" aria-label="Previous page"><Icon name="chevronLeft" /></button>
        <button onClick={() => setI(Math.min(pages.length - 1, i + 1))} disabled={i === pages.length - 1} className="absolute right-0 rounded-full bg-white/20 p-2 text-white disabled:opacity-30" aria-label="Next page"><Icon name="chevronRight" /></button>
      </div>
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
    if (text.trim().length < 5) return setMsg({ type: 'error', text: 'অন্তত কয়েকটি শব্দ লিখুন' })
    const r = await submitReview(slug, { name: name || 'Customer', phone: user?.phone || '', rating, text: text.trim() })
    setMsg({ type: 'success', text: r.message }); setText(''); onDone?.()
  }
  return (
    <form onSubmit={send} className="mt-3 space-y-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((s) => <button type="button" key={s} onClick={() => setRating(s)} aria-label={`${s} star`} role="radio" aria-checked={rating === s}><Icon name="star" className={`h-7 w-7 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} /></button>)}
      </div>
      {!user && <input className="field" placeholder="আপনার নাম" value={name} onChange={(e) => setName(e.target.value)} />}
      <textarea className="field" rows={3} placeholder="বইটি সম্পর্কে আপনার মতামত লিখুন…" value={text} onChange={(e) => setText(e.target.value)} />
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <button className="btn-brand">রিভিউ দিন</button>
    </form>
  )
}

function Tabs({ product, settings, tab, setTab }) {
  const { user } = useAuth()
  const [v, setV] = useState(0)
  const { data: reviews } = useAsync(() => getReviews(product.slug), [product.slug, v])
  const info = [['লেখক', product.author], ['প্রকাশনী', product.publisher], ['ISBN', product.isbn], ['পৃষ্ঠা', product.pages], ['সংস্করণ', product.edition], ['ভাষা', product.language], ['কভার', product.coverType], ['প্রিন্ট', product.brand]].filter(([, x]) => x)
  const tabs = [
    { id: 'description', label: 'Description' },
    ...(info.length ? [{ id: 'specs', label: 'বইয়ের তথ্য' }] : []),
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
          : <p className="text-muted">এই বইয়ের বিবরণ এখনো যোগ করা হয়নি।</p>)}
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
            ) : <p className="text-muted">এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি আপনিই দিন!</p>}
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
  const navigate = useNavigate()
  const { add } = useCart()
  const { settings, findCategory } = useSite()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [look, setLook] = useState(false)
  const [tab, setTab] = useState('description')

  const { data: product, loading, error } = useAsync(() => getProduct(slug), [slug])
  const { data: related } = useAsync(() => (product ? getRelatedProducts(product) : Promise.resolve([])), [product?.slug])

  useSeo(product ? {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription ||  `${product.name} — ${formatPrice(product.price)}। ক্যাশ অন ডেলিভারি, সারাদেশে হোম ডেলিভারি।`,
    image: product.images[0] && (product.images[0].includes('/') ? product.images[0] : `product/${product.images[0]}`),
    jsonLd: bookJsonLd(product, location.href),
  } : {})

  useEffect(() => {
    if (!product) return
    setTab('description'); setQty(1)
    addRecent(product.slug)
    track('ViewContent', { items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1, category: product.categories[0] }], value: product.price })
  }, [product])

  if (loading) return <Spinner className="py-24" />
  if (error || !product) return <NotFound />

  const category = findCategory(product.categories[0])
  const save = product.oldPrice > product.price ? product.oldPrice - product.price : 0
  const available = inStock(product)
  const shareUrl = location.href
  const orderNow = () => { add(product, qty); navigate('/customer/checkout') }
  const addToCart = () => { add(product, qty); setAdded(true); setTimeout(() => setAdded(false), 2000) }

  return (
    <div className="container-x py-5 pb-24 md:pb-5">
      <Breadcrumb items={[...(category ? [{ to: `/category/${category.slug}`, label: category.name }] : []), { label: product.name }]} />

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.9fr]">
        <Gallery images={product.images} name={product.name} lookInside={product.lookInside || []} onLook={() => setLook(true)} />

        <div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.name}</h1>
          {product.author && <p className="mt-1 text-sm text-muted">লেখক: <Link to={`/search?keyword=${encodeURIComponent(product.author)}`} className="font-medium text-brand hover:underline">{product.author}</Link></p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Price price={product.price} oldPrice={product.oldPrice} size="lg" />
            <DiscountBadge price={product.price} oldPrice={product.oldPrice} className="text-sm" />
          </div>
          {save > 0 && <p className="mt-1 text-sm text-green-700">Save {formatPrice(save)}</p>}
          <p className={`mt-2 text-sm font-semibold ${available ? 'text-green-700' : 'text-red-600'}`}>
            {!available ? '✕ স্টকে নেই' : typeof product.stock === 'number' && product.stock <= 5 ? `● মাত্র ${product.stock}টি বাকি আছে` : '● স্টকে আছে'}
          </p>

          {product.shortDescription && <p className="mt-3 rounded-md bg-surface p-3 text-sm leading-relaxed text-ink/80">{product.shortDescription}</p>}

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Product Code</dt><dd>{product.sku || 'N/A'}</dd>
            <dt className="text-muted">Product Type</dt><dd>{product.productType || 'Physical'}</dd>
            {product.publisher && <><dt className="text-muted">Publisher</dt><dd>{product.publisher}</dd></>}
            {product.pages && <><dt className="text-muted">Pages</dt><dd>{product.pages}</dd></>}
            <dt className="text-muted">Brand</dt><dd>{product.brand || 'N/A'}</dd>
            {category && (<><dt className="text-muted">Category</dt><dd><Link className="text-brand hover:underline" to={`/category/${category.slug}`}>{category.name}</Link></dd></>)}
          </dl>

          {product.comboItems?.length > 0 && (
            <div className="mt-4 rounded-md border border-line bg-surface p-3 text-sm">
              <p className="mb-1 font-semibold">এই প্যাকেজে যা যা থাকছে ({product.comboItems.length}টি)</p>
              <ul className="grid gap-1 sm:grid-cols-2">{product.comboItems.map((b) => <li key={b} className="flex gap-1.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />{b}</li>)}</ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} />
            <button onClick={addToCart} disabled={!available} className="btn-outline h-10">{added ? <><Icon name="check" className="h-4 w-4" />কার্টে যোগ হয়েছে</> : <><Icon name="cart" className="h-4 w-4" />কার্টে যোগ করুন</>}</button>
          </div>
          <button onClick={orderNow} disabled={!available} className="btn-accent mt-3 w-full py-3 text-base">{available ? 'অর্ডার করুন' : 'স্টকে নেই'}</button>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a href={`tel:${settings.phone}`} className="btn-brand py-2.5"><Icon name="phone" className="h-4 w-4" />কল করুন {settings.phone}</a>
            <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}?text=${encodeURIComponent(`${product.name} বইটি অর্ডার করতে চাই। ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] py-2.5 text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />WhatsApp-এ অর্ডার</a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>শেয়ার করুন:</span>
            <a className="hover:text-brand" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">Facebook</a>
            <a className="hover:text-brand" href={`https://wa.me/?text=${encodeURIComponent(`${product.name} ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <button className="hover:text-brand" onClick={() => navigator.clipboard?.writeText(shareUrl)}>লিংক কপি</button>
            <button className="hover:text-brand" onClick={() => { setTab('writeReview'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }) }}>See Reviews</button>
          </div>
        </div>

        <aside className="card h-fit p-4 md:col-span-2 lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="truck" />Delivery Charge (Courier)</h2>
          <ul className="divide-y divide-line text-sm">
            {settings.shipping.map((s) => (
              <li key={s.id} className="flex justify-between py-2"><span>{s.labelEn}<span className="block text-xs text-muted">{s.eta}</span></span><span className="font-semibold">{formatPrice(s.charge)}</span></li>
            ))}
          </ul>
          {settings.freeShippingMin > 0 && <p className="mt-2 text-xs font-semibold text-green-700">৳{settings.freeShippingMin}+ অর্ডারে ফ্রি ডেলিভারি</p>}
          <ul className="mt-3 space-y-1.5 rounded bg-surface p-3 text-xs leading-5 text-muted">
            <li>✓ ৩-৫ দিনের মধ্যে সারাদেশে ডেলিভারী</li>
            <li>✓ ক্যাশ অন ডেলিভারি — বই হাতে পেয়ে টাকা দিন</li>
            <li>✓ ভুল/ত্রুটিপূর্ণ বই ২৪ ঘণ্টার মধ্যে জানালে পরিবর্তন</li>
          </ul>
        </aside>
      </div>

      <Tabs product={product} settings={settings} tab={tab} setTab={setTab} />

      {related?.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-4">Related Products</h2>
          <ProductRow products={related} />
        </section>
      )}

      {/* Sticky order bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-muted">{product.name}</p><p className="font-bold text-accent">{formatPrice(product.price)}</p></div>
        <button onClick={orderNow} disabled={!available} className="btn-accent px-6 py-3">{available ? 'অর্ডার করুন' : 'স্টকে নেই'}</button>
      </div>

      {look && <LookInside pages={product.lookInside} name={product.name} onClose={() => setLook(false)} />}
    </div>
  )
}
