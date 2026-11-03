import axios from 'axios'
import { API_BASE_URL } from './env'

/**
 * Central Axios instance for the Laravel REST API.
 * - Sends the Sanctum/Passport bearer token when the customer is logged in.
 * - Returns the response body; services unwrap Laravel's `{ data }` envelope.
 */
export const TOKEN_KEY = 'bookshelf_token'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem(TOKEN_KEY)
    const message = error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status, errors: error.response?.data?.errors }))
  },
)

export default api

/**
 * Expected Laravel endpoints (adjust paths here only when the real API is known).
 */
export const ENDPOINTS = {
  settings: '/settings',
  home: '/home',
  categories: '/categories',
  products: '/products', // ?category=&subcategory=&keyword=&min_price=&max_price=&sort=&page=
  product: (slug) => `/products/${encodeURIComponent(slug)}`,
  related: (slug) => `/products/${encodeURIComponent(slug)}/related`,
  page: (slug) => `/pages/${encodeURIComponent(slug)}`,
  contact: '/contact',
  login: '/customer/login',
  register: '/customer/register',
  forgotPassword: '/customer/forgot-password',
  verifyOtp: '/customer/verify-otp',
  me: '/customer/me',
  logout: '/customer/logout',
  orders: '/customer/orders',
  order: (id) => `/customer/orders/${id}`,
  placeOrder: '/orders',
  trackOrder: '/orders/track',
  reviews: (slug) => `/products/${encodeURIComponent(slug)}/reviews`,
}
