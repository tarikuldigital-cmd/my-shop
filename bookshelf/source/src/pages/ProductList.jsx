import { useState } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumb, EmptyState, Pagination, Spinner } from '../components/common/ui'
import Icon from '../components/common/Icon'
import { ProductGrid } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getProducts, SORT_OPTIONS } from '../services/catalogService'
import { useSite } from '../context/SiteContext'
import NotFound from './NotFound'

function CategoryTree({ categories, onPick }) {
  const linkCls = ({ isActive }) => `block rounded px-2 py-1.5 text-sm hover:bg-surface hover:text-brand ${isActive ? 'font-semibold text-brand' : ''}`
  return (
    <ul className="space-y-0.5">
      {categories.map((c) => (
        <li key={c.slug}>
          <NavLink to={`/category/${c.slug}`} onClick={onPick} className={linkCls}>{c.name}</NavLink>
          {c.subcategories?.length > 0 && (
            <ul className="ml-3 border-l border-line pl-2">
              {c.subcategories.map((s) => <li key={s.slug}><NavLink to={`/subcategory/${s.slug}`} onClick={onPick} className={linkCls}>{s.name}</NavLink></li>)}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

function PriceFilter({ params, setParams }) {
  const [min, setMin] = useState(params.get('min_price') || '')
  const [max, setMax] = useState(params.get('max_price') || '')
  const apply = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    min ? next.set('min_price', min) : next.delete('min_price')
    max ? next.set('max_price', max) : next.delete('max_price')
    next.delete('page')
    setParams(next)
  }
  return (
    <form onSubmit={apply}>
      <h3 className="mb-2 font-semibold">Price</h3>
      <div className="flex items-center gap-2">
        <input type="number" min="0" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="৳ Min" className="field" aria-label="Minimum price" />
        <span>-</span>
        <input type="number" min="0" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="৳ Max" className="field" aria-label="Maximum price" />
      </div>
      <button className="btn-brand mt-3 w-full">Filter</button>
    </form>
  )
}

export default function ProductList({ mode }) {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const { categories, findCategory, findSubcategory } = useSite()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const keyword = params.get('keyword') || ''
  const sort = params.get('sort') || 'latest'
  const page = Number(params.get('page') || 1)
  const minPrice = params.get('min_price') || ''
  const maxPrice = params.get('max_price') || ''

  let title = keyword
  let crumbs = [{ label: keyword }]
  const query = { sort, page, minPrice, maxPrice }
  let invalid = false
  if (mode === 'category') {
    const c = findCategory(slug)
    if (c) { title = c.name; crumbs = [{ label: c.name }]; query.category = slug } else invalid = true
  } else if (mode === 'subcategory') {
    const s = findSubcategory(slug)
    if (s) { title = s.name; crumbs = [{ to: `/category/${s.parent.slug}`, label: s.parent.name }, { label: s.name }]; query.subcategory = slug } else invalid = true
  } else {
    query.keyword = keyword
  }

  const { data, loading } = useAsync(() => (invalid ? Promise.resolve(null) : getProducts(query)), [mode, slug, keyword, sort, page, minPrice, maxPrice, invalid])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  if (invalid) return <NotFound />

  const sidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold">Categories</h3>
        <CategoryTree categories={categories} onPick={() => setFiltersOpen(false)} />
      </div>
      <PriceFilter key={`${minPrice}-${maxPrice}`} params={params} setParams={setParams} />
    </div>
  )

  return (
    <div className="container-x py-5">
      <Breadcrumb items={crumbs} />
      <div className="mt-4 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="card hidden h-fit p-4 lg:block">
          <h2 className="mb-4 border-b border-line pb-2 text-lg font-bold">Filter</h2>
          {sidebar}
        </aside>

        <div>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <h1 className="text-lg font-bold text-brand">{title}</h1>
              {data && <p className="text-xs text-muted">Showing {data.meta.from}-{data.meta.to} of {data.meta.total} Results</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen(true)} className="btn-outline lg:hidden"><Icon name="filter" className="h-4 w-4" />Filter</button>
              <select value={sort} onChange={(e) => update('sort', e.target.value)} className="field w-auto" aria-label="Sort products">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {loading && <Spinner />}
          {!loading && data?.data.length === 0 && (
            <EmptyState title="কোনো বই পাওয়া যায়নি" icon="search">
              <Link to="/" className="btn-accent">হোমে ফিরে যান</Link>
            </EmptyState>
          )}
          {!loading && data?.data.length > 0 && (
            <>
              <ProductGrid products={data.data} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
              <div className="mt-6"><Pagination meta={data.meta} onPage={(p) => update('page', String(p))} /></div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${filtersOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${filtersOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setFiltersOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-80 max-w-[88%] overflow-y-auto bg-white p-4 shadow-xl transition-transform ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-lg font-bold">Filter</h2>
            <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><Icon name="close" /></button>
          </div>
          {sidebar}
        </aside>
      </div>
    </div>
  )
}
