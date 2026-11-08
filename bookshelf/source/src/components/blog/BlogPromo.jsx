import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Img from '../common/Img'
import { Price } from '../common/ui'
import ProductCard from '../product/ProductCard'
import { useDb } from '../../store/db'
import { productsBySlugs } from '../../services/catalogService'
import { BOOKS_BY_CAT, topicSlugs, BOOKS_BY_TOPIC } from '../../lib/blogCats'

/** Resolve product slugs (post-chosen first, then topic defaults) to live products; missing ones are skipped. */
export function usePromoBooks({ slugs = [], topics = [], cat, limit = 8 }) {
  useDb()
  const fallback = topicSlugs(topics.length ? topics : BOOKS_BY_CAT[cat] || ['combo'])
  const all = [...new Set([...slugs, ...fallback])]
  return productsBySlugs(all).slice(0, limit)
}

const REASONS = {
  bn: [
    'আইইএলটিএস-এ উচ্চ স্কোরের জন্য নির্ভরযোগ্য বই থেকে নিয়মিত অনুশীলন অপরিহার্য',
    'প্রকৃত পরীক্ষার ধাঁচের প্রশ্ন ও মক টেস্ট পরীক্ষার প্রস্তুতিকে বাস্তবসম্মত করে',
    'কম্বো প্যাকেজে আলাদাভাবে কেনার তুলনায় উল্লেখযোগ্য সাশ্রয় হয়',
    'সর্বশেষ সংস্করণ ও হালনাগাদ প্রশ্ন সংকলন আমাদের সংগ্রহে রয়েছে',
    'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা',
  ],
  en: [
    'Consistent practice from reliable books is essential for a high IELTS band score',
    'Authentic exam-style questions and mock tests make preparation realistic',
    'Combo packages offer significant savings over buying titles individually',
    'Latest editions and updated question banks are available in our collection',
    'Cash on delivery available across Bangladesh',
  ],
}

/** Headline strip: why books matter for preparation. */
export function WhyBuyStrip({ lang = 'bn' }) {
  const list = REASONS[lang] || REASONS.bn
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % list.length), 4000); return () => clearInterval(t) }, [list.length])
  return (
    <div className="bk-shine rounded-lg p-[2px]">
      <div className="flex items-center gap-4 rounded-[6px] bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-accent">{lang === 'en' ? 'Why books matter' : 'বই কেন প্রয়োজন'}</p>
          <p key={i} className="bk-slide mt-0.5 font-serif text-sm font-semibold leading-6 sm:text-base">{list[i]}</p>
        </div>
        <Link to="/category/combo-package" className="btn-accent hidden whitespace-nowrap sm:inline-flex">{lang === 'en' ? 'Browse books' : 'বইগুলো দেখুন'}</Link>
      </div>
    </div>
  )
}

/** Auto-scrolling book strip. Each item links to the book page (backlink). */
export function BookMarquee({ books, title }) {
  if (!books.length) return null
  const row = [...books, ...books]
  return (
    <section className="my-6 overflow-hidden rounded-xl border border-line bg-surface py-3" aria-label={title}>
      {title && <p className="px-4 pb-2 text-sm font-bold text-brand">{title}</p>}
      <div className="bk-marquee flex gap-3 px-3">
        {row.map((p, k) => (
          <Link key={k} to={`/product/${p.slug}`} className="card flex w-56 shrink-0 items-center gap-3 p-2 hover:shadow-md" title={p.name}>
            <Img src={p.images?.[0]} alt={p.name} className="h-20 w-14 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-semibold leading-4">{p.name}</p>
              <Price price={p.price} oldPrice={p.oldPrice} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Sticky rotating call-to-action at the bottom of the screen on every blog page. */
export function StickyCta({ books, lang = 'bn' }) {
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const [hidden, setHidden] = useState(false)
  useEffect(() => { if (books.length < 2) return; const t = setInterval(() => setI((x) => (x + 1) % books.length), 4500); return () => clearInterval(t) }, [books.length])
  if (hidden || !books.length) return null
  const p = books[i % books.length]
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,.08)] backdrop-blur">
      <div key={p.slug} className="bk-slide mx-auto flex max-w-3xl items-center gap-3">
        <Img src={p.images?.[0]} alt={p.name} className="bk-float h-12 w-9 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
          <p className="hidden text-xs text-muted sm:block">{lang === 'en' ? 'Prepare with the right book. Cash on delivery available.' : 'সঠিক বইয়ের মাধ্যমে প্রস্তুতি নিন। ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।'}</p>
        </div>
        <Price price={p.price} oldPrice={p.oldPrice} />
        <button onClick={() => navigate(`/product/${p.slug}`)} className="btn-accent bk-glow whitespace-nowrap">{lang === 'en' ? 'Order now' : 'অর্ডার করুন'}</button>
        <button onClick={() => setHidden(true)} aria-label="close" className="px-1 text-lg text-muted">×</button>
      </div>
    </div>
  )
}

/** End-of-post: why books matter + book grid + combo CTA. */
export function EndPromo({ books, lang = 'bn' }) {
  const combos = usePromoBooks({ slugs: [], topics: ['combo'], limit: 3 })
  if (!books.length && !combos.length) return null
  return (
    <section className="mt-10 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-serif text-xl font-bold text-brand">{lang === 'en' ? 'Why prepare with books?' : 'প্রস্তুতির জন্য কেন বই প্রয়োজন?'}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6">
        {REASONS[lang].map((t) => <li key={t}>{t}</li>)}
      </ul>
      {books.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-sm font-bold">{lang === 'en' ? 'Recommended for this topic' : 'এই বিষয়ে প্রস্তাবিত বই'}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{books.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </>
      )}
      {combos.length > 0 && (
        <div className="mt-5 rounded-xl bg-white p-4">
          <p className="font-bold">{lang === 'en' ? 'Combo packages: every module in one order, at a lower combined price' : 'কম্বো প্যাকেজ: সব মডিউলের বই একসঙ্গে, তুলনামূলক কম মূল্যে'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {combos.map((p) => <Link key={p.id} to={`/product/${p.slug}`} className="btn-outline text-xs">{p.name}</Link>)}
          </div>
        </div>
      )}
    </section>
  )
}
