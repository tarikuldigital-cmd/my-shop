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
    ['📚', 'শুধু ভিডিও দেখে নয়, বই পড়ে প্র্যাকটিস করলেই ব্যান্ড স্কোর বাড়ে'],
    ['🎯', 'আসল পরীক্ষার ধাঁচের প্রশ্ন ও মক টেস্ট — বই ছাড়া এই অভ্যাস তৈরি হয় না'],
    ['💰', 'কম্বো প্যাকেজে আলাদা আলাদা কেনার চেয়ে অনেক সাশ্রয়'],
    ['🔄', 'প্রতি মাসে আপডেটেড প্রশ্ন ও সর্বশেষ এডিশন আমাদের কাছে'],
    ['🚚', 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি'],
  ],
  en: [
    ['📚', 'Books beat videos for IELTS — daily practice on paper lifts your band score'],
    ['🎯', 'Real exam-style questions and mock tests build the right habit'],
    ['💰', 'Combo packages cost far less than buying books one by one'],
    ['🔄', 'Latest editions and monthly-updated question banks'],
    ['🚚', 'Cash on delivery across Bangladesh'],
  ],
}

/** Animated headline strip: why you need books to prepare. */
export function WhyBuyStrip({ lang = 'bn' }) {
  const list = REASONS[lang] || REASONS.bn
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % list.length), 3500); return () => clearInterval(t) }, [list.length])
  const [ic, tx] = list[i]
  return (
    <div className="bk-shine rounded-xl p-[2px]">
      <div className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3">
        <span className="bk-float text-2xl" aria-hidden="true">{ic}</span>
        <p key={i} className="bk-slide text-sm font-semibold sm:text-base">{tx}</p>
        <Link to="/category/combo-package" className="btn-accent ml-auto hidden whitespace-nowrap sm:inline-flex">{lang === 'en' ? 'See books' : 'বই দেখুন'}</Link>
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
          <p className="text-xs text-muted">{lang === 'en' ? 'Prepare with the right book — cash on delivery' : 'সঠিক বই দিয়ে প্রস্তুতি নিন — ক্যাশ অন ডেলিভারি'}</p>
        </div>
        <Price price={p.price} oldPrice={p.oldPrice} />
        <button onClick={() => navigate(`/product/${p.slug}`)} className="btn-accent bk-glow whitespace-nowrap">{lang === 'en' ? 'Buy now' : 'কিনুন'}</button>
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
    <section className="mt-10 rounded-2xl border border-brand/20 bg-gradient-to-br from-green-50 to-orange-50 p-4 sm:p-6">
      <h2 className="text-xl font-bold text-brand">{lang === 'en' ? 'Why prepare with books?' : 'প্রস্তুতির জন্য কেন বই কিনবেন?'}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {REASONS[lang].map(([ic, t]) => <li key={t}><span className="mr-1.5">{ic}</span>{t}</li>)}
      </ul>
      {books.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-sm font-bold">{lang === 'en' ? 'Recommended for this topic' : 'এই বিষয়ের জন্য প্রস্তাবিত বই'}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{books.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </>
      )}
      {combos.length > 0 && (
        <div className="mt-5 rounded-xl bg-white p-4">
          <p className="font-bold">{lang === 'en' ? '🎁 Combo packages — everything in one order, at a lower price' : '🎁 কম্বো প্যাকেজ — সব বই এক অর্ডারে, কম দামে'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {combos.map((p) => <Link key={p.id} to={`/product/${p.slug}`} className="btn-outline text-xs">{p.name}</Link>)}
          </div>
        </div>
      )}
    </section>
  )
}
