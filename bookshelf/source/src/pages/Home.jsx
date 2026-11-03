import { Link } from 'react-router-dom'
import BannerSlider from '../components/common/BannerSlider'
import Img from '../components/common/Img'
import { Spinner } from '../components/common/ui'
import { ProductSection } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getHome } from '../services/catalogService'
import { useSite } from '../context/SiteContext'
import { useEffect, useState } from 'react'
import { useSeo } from '../lib/seo'
import { getRecent } from '../lib/recent'
import { productsBySlugs } from '../services/catalogService'
import { ProductRow } from '../components/product/ProductGrid'

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const left = Math.max(0, endsAt - now)
  const parts = [[Math.floor(left / 864e5), 'দিন'], [Math.floor(left / 36e5) % 24, 'ঘণ্টা'], [Math.floor(left / 6e4) % 60, 'মিনিট'], [Math.floor(left / 1e3) % 60, 'সেকেন্ড']]
  return (
    <div className="flex items-center gap-1.5" aria-label="Offer ends in">
      <span className="hidden text-xs text-muted sm:inline">শেষ হবে</span>
      {parts.map(([v, l]) => <span key={l} className="flex min-w-11 flex-col items-center rounded bg-sale px-1.5 py-0.5 text-white"><b className="text-sm leading-tight tabular-nums">{String(v).padStart(2, '0')}</b><span className="text-[9px] leading-tight">{l}</span></span>)}
    </div>
  )
}

const TRUST = [['🚚', 'সারাদেশে হোম ডেলিভারি', '৩-৫ দিনের মধ্যে'], ['💵', 'ক্যাশ অন ডেলিভারি', 'বই হাতে পেয়ে টাকা দিন'], ['📚', 'অরিজিনাল বই', 'IELTS, Spoken, SAT, GRE'], ['🔄', 'সহজ পরিবর্তন', 'ভুল বই ২৪ ঘণ্টায় জানালে']]

function TopCategories({ categories }) {
  return (
    <section className="container-x mt-8">
      <div className="mb-4 border-b-2 border-line">
        <h2 className="section-title -mb-0.5 inline-block border-b-2 border-accent pb-2">Top Categories</h2>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {categories.map((c) => (
          <Link key={c.slug} to={`/category/${c.slug}`} className="card group flex flex-col items-center gap-2 p-2 text-center transition hover:border-brand hover:shadow">
            <Img src={c.image} alt={c.name} className="aspect-square w-full rounded object-cover" />
            <span className="text-xs font-semibold group-hover:text-brand sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { categories } = useSite()
  const { data, loading } = useAsync(getHome, [])
  useSeo({})
  const recent = data?.showRecent ? productsBySlugs(getRecent()) : []

  return (
    <div className="pb-4">
      <div className="container-x mt-4">
        {data ? <BannerSlider banners={data.banners} /> : <div className="aspect-[21/9] animate-pulse rounded-lg bg-gray-200" />}
      </div>

      <section className="container-x mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TRUST.map(([icon, t, sub]) => (
          <div key={t} className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <div><p className="text-sm font-semibold leading-tight">{t}</p><p className="text-xs text-muted">{sub}</p></div>
          </div>
        ))}
      </section>

      <TopCategories categories={categories} />

      {loading && <Spinner />}
      {data && (
        <>
          <ProductSection title={data.flash?.title || 'Flash Sales'} badge="⚡" products={data.flashSale} extra={data.flash && <Countdown endsAt={data.flash.endsAt} />} />
          <ProductSection title="Hot Deal" badge="🔥" products={data.hotDeal} />
          <ProductSection title="All Products" products={data.allProducts} />
          {data.categorySections.map(({ category, products }) => (
            <ProductSection key={category.slug} title={category.name} products={products} viewMore={`/category/${category.slug}`} />
          ))}

          {recent.length > 0 && (
            <section className="container-x mt-8">
              <div className="mb-4 border-b-2 border-line"><h2 className="section-title -mb-0.5 inline-block border-b-2 border-accent pb-2">সম্প্রতি দেখেছেন</h2></div>
              <ProductRow products={recent} />
            </section>
          )}

          {data.reviewBanner && (
            <section className="container-x mt-10">
              <div className="mb-4 border-b-2 border-line">
                <h2 className="section-title -mb-0.5 inline-block border-b-2 border-accent pb-2">আমাদের সম্মানিত গ্রাহকদের পজিটিভ রিভিউ</h2>
              </div>
              <Img src={data.reviewBanner} alt="Customer reviews" className="w-full rounded-lg" />
            </section>
          )}
        </>
      )}
    </div>
  )
}
