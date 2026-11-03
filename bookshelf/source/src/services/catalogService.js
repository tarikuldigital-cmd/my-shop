import api, { ENDPOINTS } from '../config/api'
import { USE_MOCK } from '../config/env'
import { db, delay, bySlug } from './mockStore'

const unwrap = (d) => (d && typeof d === 'object' && 'data' in d && !('meta' in d) ? d.data : d)
export const PER_PAGE = 24

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Product: Latest' },
  { value: 'oldest', label: 'Product: Oldest' },
  { value: 'price_desc', label: 'Price: High To Low' },
  { value: 'price_asc', label: 'Price: Low To High' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
]

const sorters = {
  latest: (a, b) => b.id - a.id,
  oldest: (a, b) => a.id - b.id,
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
}

export async function getSettings() {
  if (USE_MOCK) return db.settings
  return unwrap(await api.get(ENDPOINTS.settings))
}

export async function getCategories() {
  if (USE_MOCK) return db.categories
  return unwrap(await api.get(ENDPOINTS.categories))
}

export async function getHome() {
  if (USE_MOCK) {
    await delay()
    const pick = (slugs) => slugs.map((s) => bySlug.get(s)).filter(Boolean)
    const flash = pick(db.home.flashSale)
    return {
      banners: db.home.banners,
      flashSale: flash,
      hotDeal: flash,
      allProducts: pick(db.home.allProducts),
      categorySections: db.categories.map((c) => ({ category: c, products: pick(db.home.categorySections[c.slug] || []) })),
      reviewBanner: db.home.reviewBanner,
    }
  }
  return unwrap(await api.get(ENDPOINTS.home))
}

/**
 * List products. Params: { category, subcategory, keyword, minPrice, maxPrice, sort, page }
 * Returns a Laravel-style paginator: { data, meta: { current_page, last_page, per_page, total, from, to } }
 */
export async function getProducts(params = {}) {
  const { category, subcategory, keyword, minPrice, maxPrice, sort = 'latest', page = 1 } = params
  if (!USE_MOCK) {
    return api.get(ENDPOINTS.products, {
      params: { category, subcategory, keyword, min_price: minPrice, max_price: maxPrice, sort, page },
    })
  }
  await delay()
  let list = db.products
  if (category) list = list.filter((p) => p.categories.includes(category))
  if (subcategory) list = list.filter((p) => p.subcategories.includes(subcategory))
  if (keyword) {
    const k = keyword.trim().toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(k))
  }
  if (minPrice) list = list.filter((p) => p.price >= Number(minPrice))
  if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice))
  list = [...list].sort(sorters[sort] || sorters.latest)
  const total = list.length
  const last = Math.max(1, Math.ceil(total / PER_PAGE))
  const current = Math.min(Math.max(1, Number(page)), last)
  const start = (current - 1) * PER_PAGE
  const data = list.slice(start, start + PER_PAGE)
  return {
    data,
    meta: { current_page: current, last_page: last, per_page: PER_PAGE, total, from: total ? start + 1 : 0, to: start + data.length },
  }
}

export async function getProduct(slug) {
  if (USE_MOCK) {
    await delay()
    const p = bySlug.get(slug)
    if (!p) throw Object.assign(new Error('Product not found'), { status: 404 })
    return p
  }
  return unwrap(await api.get(ENDPOINTS.product(slug)))
}

export async function getRelatedProducts(product, limit = 12) {
  if (USE_MOCK) {
    const cat = product.categories[0]
    return db.products.filter((p) => p.slug !== product.slug && p.categories.includes(cat)).slice(0, limit)
  }
  return unwrap(await api.get(ENDPOINTS.related(product.slug)))
}

export async function getPage(slug) {
  if (USE_MOCK) {
    await delay(50)
    const page = db.pages[slug]
    if (!page) throw Object.assign(new Error('Page not found'), { status: 404 })
    return page
  }
  return unwrap(await api.get(ENDPOINTS.page(slug)))
}

export async function sendContactMessage(payload) {
  if (USE_MOCK) {
    await delay(300)
    return { message: 'আপনার মেসেজ পাঠানো হয়েছে। শীঘ্রই আমরা যোগাযোগ করব।' }
  }
  return api.post(ENDPOINTS.contact, payload)
}

export async function getReviews(slug) {
  if (USE_MOCK) return { average: 0, count: 0, data: [] }
  return api.get(ENDPOINTS.reviews(slug))
}
