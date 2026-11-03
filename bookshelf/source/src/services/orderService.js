import api, { ENDPOINTS, TOKEN_KEY } from '../config/api'
import { USE_MOCK } from '../config/env'
import { delay, local, ApiError } from './mockStore'

const unwrap = (d) => (d && 'data' in d && !('meta' in d) ? d.data : d)
const normalizePhone = (p = '') => p.replace(/[^\d]/g, '').replace(/^88/, '')

export const ORDER_STATUSES = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/**
 * payload: { name, phone, address, shippingArea, paymentMethod, note,
 *            items: [{ productId, slug, name, price, quantity }], subtotal, shippingCharge, total }
 */
export async function placeOrder(payload) {
  if (!USE_MOCK) return unwrap(await api.post(ENDPOINTS.placeOrder, payload))
  await delay(400)
  const orders = local.orders()
  const invoice = `BS${String(100000 + orders.length + 1)}`
  const token = localStorage.getItem(TOKEN_KEY)
  const order = {
    id: orders.length + 1,
    invoice,
    ...payload,
    phone: normalizePhone(payload.phone),
    customerToken: token || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  local.saveOrders([order, ...orders])
  return order
}

export async function getMyOrders() {
  if (!USE_MOCK) return unwrap(await api.get(ENDPOINTS.orders))
  await delay()
  const token = localStorage.getItem(TOKEN_KEY)
  const phone = token?.replace('mock-', '')
  return local.orders().filter((o) => o.customerToken === token || o.phone === phone)
}

export async function getMyOrder(invoice) {
  if (!USE_MOCK) return unwrap(await api.get(ENDPOINTS.order(invoice)))
  const order = (await getMyOrders()).find((o) => o.invoice === invoice)
  if (!order) throw new ApiError('অর্ডার পাওয়া যায়নি', 404)
  return order
}

export async function trackOrder({ phone, invoice }) {
  if (!USE_MOCK) return unwrap(await api.post(ENDPOINTS.trackOrder, { phone, invoice }))
  await delay(300)
  const p = normalizePhone(phone)
  const list = local.orders().filter((o) => o.phone === p && (!invoice || o.invoice.toLowerCase() === invoice.trim().toLowerCase()))
  if (!list.length) throw new ApiError('এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি', 404)
  return list
}
