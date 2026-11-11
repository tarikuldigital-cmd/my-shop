import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'

export function ProductGrid({ products, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' }) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${cols}`}>
      {products.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  )
}

/** Homepage block: title bar + optional "View More" link + grid. */
export function ProductSection({ title, products, viewMore, badge, extra }) {
  if (!products?.length) return null
  return (
    <section className="container-x mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b-2 border-line">
        <h2 className="section-title -mb-0.5 flex items-center gap-2 border-b-2 border-accent pb-2">
          {badge && <span aria-hidden="true">{badge}</span>}{title}
        </h2>
        {extra && <div className="pb-2">{extra}</div>}
        {viewMore && <Link to={viewMore} className="pb-2 text-sm font-semibold text-accent hover:underline">View More</Link>}
      </div>
      <ProductGrid products={products} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" />
    </section>
  )
}

/** Horizontally scrollable row (used for related products). */
export function ProductRow({ products }) {
  return (
    <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:gap-4">
      {products.map((p) => (
        <div key={p.slug} className="w-40 shrink-0 snap-start sm:w-48"><ProductCard product={p} /></div>
      ))}
    </div>
  )
}
