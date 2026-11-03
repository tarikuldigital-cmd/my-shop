import api, { ENDPOINTS } from '../config/api'
import { USE_MOCK } from '../config/env'
import { delay } from './mockStore'
import { S, save, product as findProduct, flashOn } from '../store/db'

const live = () => S.products.filter((p) => p.active !== false)
const bySlugLive = (slug) => { const p = findProduct(slug); return p && p.active !== false ? p : null }

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
  if (USE_MOCK) return S.settings
  return unwrap(await api.get(ENDPOINTS.settings))
}

export async function getCategories() {
  if (USE_MOCK) return S.categories
  return unwrap(await api.get(ENDPOINTS.categories))
}

export async function getHome() {
  if (USE_MOCK) {
    await delay()
    const h = S.home
    const pick = (slugs = []) => slugs.map(bySlugLive).filter(Boolean)
    const flash = pick(h.flashSale)
    return {
      banners: h.banners,
      flash: flashOn() ? h.flash : null,
      flashSale: h.sections.flashSale ? flash : [],
      hotDeal: h.sections.hotDeal ? (Array.isArray(h.hotDeal) ? pick(h.hotDeal) : flash) : [],
      allProducts: h.sections.allProducts ? pick(h.allProducts) : [],
      categorySections: h.sections.categories ? S.categories.map((c) => ({ category: c, products: pick(h.categorySections[c.slug]) })) : [],
      reviewBanner: h.sections.reviews ? h.reviewBanner : null,
      showRecent: h.sections.recentlyViewed,
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
  let list = live()
  if (category) list = list.filter((p) => p.categories.includes(category))
  if (subcategory) list = list.filter((p) => p.subcategories.includes(subcategory))
  if (keyword) {
    const k = keyword.trim().toLowerCase()
    list = list.filter((p) => `${p.name} ${p.author || ''} ${p.publisher || ''} ${p.isbn || ''}`.toLowerCase().includes(k))
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
    const p = bySlugLive(slug)
    if (!p) throw Object.assign(new Error('Product not found'), { status: 404 })
    return p
  }
  return unwrap(await api.get(ENDPOINTS.product(slug)))
}

export async function getRelatedProducts(product, limit = 12) {
  if (USE_MOCK) {
    const cat = product.categories[0]
    return live().filter((p) => p.slug !== product.slug && p.categories.includes(cat)).slice(0, limit)
  }
  return unwrap(await api.get(ENDPOINTS.related(product.slug)))
}

export async function getPage(slug) {
  if (USE_MOCK) {
    await delay(50)
    const page = S.pages[slug]
    if (!page) throw Object.assign(new Error('Page not found'), { status: 404 })
    return page
  }
  return unwrap(await api.get(ENDPOINTS.page(slug)))
}

export async function sendContactMessage(payload) {
  if (USE_MOCK) {
    await delay(300)
    S.messages.unshift({ id: Date.now(), ...payload, at: Date.now(), read: false })
    save()
    return { message: 'আপনার মেসেজ পাঠানো হয়েছে। শীঘ্রই আমরা যোগাযোগ করব।' }
  }
  return api.post(ENDPOINTS.contact, payload)
}

export async function getReviews(slug) {
  if (USE_MOCK) {
    const data = S.reviews.filter((r) => r.slug === slug && r.approved)
    return { average: data.length ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0, count: data.length, data }
  }
  return api.get(ENDPOINTS.reviews(slug))
}

/** Reviews are held for admin approval. */
export async function submitReview(slug, { name, phone, rating, text }) {
  if (!USE_MOCK) return api.post(ENDPOINTS.reviews(slug), { rating, text })
  await delay(200)
  S.reviews.unshift({ id: Date.now(), slug, name, phone, rating, text, approved: false, at: Date.now() })
  save()
  return { message: 'ধন্যবাদ! রিভিউটি যাচাইয়ের পর প্রকাশ করা হবে।' }
}

/** Instant search suggestions for the header search box. */
export function suggest(keyword, limit = 6) {
  const k = keyword.trim().toLowerCase()
  if (k.length < 2) return []
  return live().filter((p) => `${p.name} ${p.author || ''}`.toLowerCase().includes(k)).slice(0, limit)
}

export function productsBySlugs(slugs) {
  return slugs.map(bySlugLive).filter(Boolean)
}
