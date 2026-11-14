import api, { ENDPOINTS, TOKEN_KEY } from '../config/api'
import { USE_MOCK } from '../config/env'
import { delay, ApiError } from './mockStore'
import { S, STATUS, createOrder, normPhone, upsertIncomplete, removeIncomplete, orderByTrackCode } from '../store/db'

const unwrap = (d) => (d && 'data' in d && !('meta' in d) ? d.data : d)

export const ORDER_STATUSES = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.t]))
const myPhone = () => localStorage.getItem(TOKEN_KEY)?.replace('mock-', '') || null

/**
 * payload: { name, phone, address, shippingArea, paymentMethod, trx, sender, couponCode, note, items: [{ productId, slug, name, price, quantity }] }
 * Totals are recalculated here (and by the backend) — never trusted from the browser.
 */
export async function placeOrder(payload) {
  if (!USE_MOCK) return unwrap(await api.post(ENDPOINTS.placeOrder, payload))
  await delay(400)
  const payment = payload.paymentMethod && payload.paymentMethod !== 'cod'
    ? { method: payload.paymentMethod, status: 'pending', trx: payload.trx?.trim().toUpperCase(), sender: normPhone(payload.sender) }
    : { method: 'cod', status: 'unpaid' }
  return createOrder({ ...payload, payment, customerPhone: myPhone() })
}

export async function getMyOrders() {
  if (!USE_MOCK) return unwrap(await api.get(ENDPOINTS.orders))
  await delay()
  const phone = myPhone()
  return S.orders.filter((o) => phone && (o.customerPhone === phone || o.phone === phone))
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
  const p = normPhone(phone)
  const list = S.orders.filter((o) => o.phone === p && (!invoice || o.invoice.toLowerCase() === invoice.trim().toLowerCase()))
  if (!list.length) throw new ApiError('এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি', 404)
  return list
}

/** Abandoned-checkout capture (Laravel: POST /checkout/draft). */
export async function saveCheckoutDraft(draftId, data) {
  if (!USE_MOCK) return api.post('/checkout/draft', { draft_id: draftId, ...data }).catch(() => {})
  upsertIncomplete(draftId, data)
}
export async function discardCheckoutDraft(draftId) {
  if (!USE_MOCK) return api.post('/checkout/draft/discard', { draft_id: draftId }).catch(() => {})
  removeIncomplete(draftId)
}

/** Public tracking page (/track/:code) — the code comes from the order SMS. Laravel: GET /orders/track/{code} */
export async function getTracking(code) {
  if (!USE_MOCK) return unwrap(await api.get(`/orders/track/${encodeURIComponent(code)}`))
  await delay(200)
  const o = orderByTrackCode(code)
  if (!o) throw new ApiError('এই ট্র্যাকিং লিংকে কোনো অর্ডার পাওয়া যায়নি', 404)
  return o
}
