// Mock "backend" used while VITE_USE_MOCK=true. Shapes mirror a typical Laravel API so the
// UI does not change when real endpoints are switched on.
import products from '../mocks/products.json'
import categories from '../mocks/categories.json'
import home from '../mocks/home.json'
import pages from '../mocks/pages.json'
import settings from '../mocks/settings.json'

export const db = { products, categories, home, pages, settings }

export const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms))

export const bySlug = new Map(products.map((p) => [p.slug, p]))

// Local persistence for things a backend would normally store
const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d }
}
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ }
}
export const local = {
  users: () => read('mock_users', []),
  saveUsers: (u) => write('mock_users', u),
  orders: () => read('mock_orders', []),
  saveOrders: (o) => write('mock_orders', o),
}

export class ApiError extends Error {
  constructor(message, status = 422, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}
