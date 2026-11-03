import { Link } from 'react-router-dom'
import BannerSlider from '../components/common/BannerSlider'
import Img from '../components/common/Img'
import { Spinner } from '../components/common/ui'
import { ProductSection } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getHome } from '../services/catalogService'
import { useSite } from '../context/SiteContext'

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

  return (
    <div className="pb-4">
      <div className="container-x mt-4">
        {data ? <BannerSlider banners={data.banners} /> : <div className="aspect-[21/9] animate-pulse rounded-lg bg-gray-200" />}
      </div>

      <TopCategories categories={categories} />

      {loading && <Spinner />}
      {data && (
        <>
          <ProductSection title="Flash Sales" badge="⚡" products={data.flashSale} />
          <ProductSection title="Hot Deal" badge="🔥" products={data.hotDeal} />
          <ProductSection title="All Products" products={data.allProducts} />
          {data.categorySections.map(({ category, products }) => (
            <ProductSection key={category.slug} title={category.name} products={products} viewMore={`/category/${category.slug}`} />
          ))}

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
