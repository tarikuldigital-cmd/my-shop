/*
 * Mock backend shared by the storefront and the admin panel.
 * Everything is kept in this browser's localStorage, so admin changes show up on the
 * storefront in the same browser only. In production these functions map 1:1 to the
 * Laravel API described in docs/BACKEND_API_SPEC.md.
 */
import { useSyncExternalStore } from 'react'
import seedProducts from '../mocks/products.json'
import seedCategories from '../mocks/categories.json'
import seedHome from '../mocks/home.json'
import seedPages from '../mocks/pages.json'
import { BOOK_FIELDS, defaultSettings } from './defaults'
import { LIVE } from '../config/env'
export { defaultSettings }

const KEY = 'bookshelf_db_v1'
export const DAY = 864e5
export const HOUR = 36e5

/* ---------------- constants ---------------- */
export const STATUS = {
  pending: { t: 'Pending', c: 'amber' },
  confirmed: { t: 'Confirmed', c: 'sky' },
  hold: { t: 'On hold', c: 'violet' },
  ready: { t: 'Ready to ship', c: 'indigo' },
  transit: { t: 'In transit', c: 'orange' },
  delivered: { t: 'Delivered', c: 'green' },
  cancelled: { t: 'Cancelled', c: 'red' },
  partial: { t: 'Partial return', c: 'rose' },
  returned: { t: 'Returned', c: 'rose' },
}
export const ST_KEYS = Object.keys(STATUS)
export const COURIERS = { steadfast: { t: 'Steadfast', p: 'SF' }, pathao: { t: 'Pathao', p: 'PT' }, redx: { t: 'RedX', p: 'RX' } }
export const PAY = { cod: 'Cash on delivery', bkash: 'bKash', nagad: 'Nagad' }
export const PAY_ST = { unpaid: 'Collect on delivery', pending: 'To verify', paid: 'Paid', failed: 'Wrong TrxID' }
export const CANCEL_REASONS = ['Did not answer the phone', 'Customer changed their mind', 'Duplicate order', 'Delivery charge too high', 'Fake order', 'Out of stock']
export const RETURN_REASONS = ['Wrong book sent', 'Damaged / printing defect', 'Missing books in package', 'Customer refused the parcel']
export const INC_ST = { new: 'New, follow-up pending', contacted: 'Contacted', converted: 'Converted to order', dropped: 'Dropped' }
export const SOURCES = ['Website', 'Landing page', 'Facebook', 'Phone', 'WhatsApp', 'Messenger']

export const meName = () => S.settings.staff[S.me ?? 0] || 'Admin'
export const normPhone = (p = '') => String(p).replace(/[^\d]/g, '').replace(/^88/, '')
export const validPhone = (p) => /^01[3-9]\d{8}$/.test(normPhone(p))

/* ---------------- seed ---------------- */
function demoOrders(products, now) {
  // Clearly-marked sample orders so the dashboard is not empty in the demo. "Clear demo data" removes them.
  const names = ['Rahim Uddin', 'Nusrat Jahan', 'Tanvir Ahmed', 'Sadia Islam', 'Mahmudul Hasan', 'Farhana Akter', 'Arif Hossain', 'Jannatul Ferdous', 'Shakil Khan', 'Tasnim Rahman']
  const areas = ['Mirpur 10, Dhaka', 'Dhanmondi 27, Dhaka', 'Agrabad, Chattogram', 'Zindabazar, Sylhet', 'Uttara Sector 7, Dhaka', 'Shaheb Bazar, Rajshahi', 'Mohammadpur, Dhaka', 'Khulna Sadar, Khulna']
  const flow = ['pending', 'pending', 'confirmed', 'hold', 'ready', 'transit', 'delivered', 'delivered', 'delivered', 'cancelled', 'returned']
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const pick = (a) => a[Math.floor(rnd() * a.length)]
  const list = []
  for (let i = 0; i < 28; i++) {
    const at = now - Math.floor(rnd() * 20 * DAY) - Math.floor(rnd() * 10 * HOUR)
    const n = 1 + Math.floor(rnd() * 3)
    const items = Array.from({ length: n }, () => { const p = pick(products); return { productId: p.id, slug: p.slug, name: p.name, price: p.price, quantity: 1 + Math.floor(rnd() * 2) } })
    const address = pick(areas)
    const inside = address.includes('Dhaka')
    const subtotal = items.reduce((s, x) => s + x.price * x.quantity, 0)
    const shippingCharge = inside ? 70 : 120
    const status = pick(flow)
    const history = [{ s: 'pending', by: 'Customer', at }]
    const steps = { confirmed: ['confirmed'], hold: ['hold'], ready: ['confirmed', 'ready'], transit: ['confirmed', 'ready', 'transit'], delivered: ['confirmed', 'ready', 'transit', 'delivered'], cancelled: ['cancelled'], returned: ['confirmed', 'ready', 'transit', 'returned'] }[status] || []
    steps.forEach((s, k) => history.push({ s, by: 'Admin', at: at + (k + 1) * 6 * HOUR, note: s === 'cancelled' ? pick(CANCEL_REASONS) : '' }))
    const courier = ['ready', 'transit', 'delivered', 'returned'].includes(status) ? pick(['steadfast', 'steadfast', 'pathao', 'redx']) : ''
    list.push({
      id: `o${at}${i}`, invoice: `BS${100001 + i}`, demo: true,
      name: pick(names), phone: `017${String(10000000 + Math.floor(rnd() * 89999999))}`, address,
      shippingArea: inside ? 'inside_dhaka' : 'outside_dhaka', items, subtotal, shippingCharge, discount: 0, total: subtotal + shippingCharge,
      payment: { method: 'cod', status: status === 'delivered' ? 'paid' : 'unpaid' },
      status, courier, tracking: courier ? COURIERS[courier].p + (10000000 + i * 7919) : '', source: pick(SOURCES.filter((x) => x !== 'Landing page')), note: '',
      cancelReason: status === 'cancelled' ? history[history.length - 1].note : '', createdAt: at, history,
    })
  }
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

function demoIncomplete(products, now) {
  return [0, 1, 2, 3].map((i) => {
    const p = products[(i * 17) % products.length]
    return { id: `d${i}`, demo: true, name: ['Sabbir', '', 'Mitu Akter', 'Rakib'][i], phone: ['01712345678', '01898765432', '01611223344', '01555667788'][i], address: ['Badda, Dhaka', '', 'Cumilla Sadar', 'Savar, Dhaka'][i], items: [{ productId: p.id, slug: p.slug, name: p.name, price: p.price, quantity: 1 }], subtotal: p.price, status: i === 3 ? 'contacted' : 'new', log: [], at: now - (i + 1) * 5 * HOUR, updated: now - (i + 1) * 5 * HOUR }
  })
}

function seed() {
  const now = Date.now()
  const products = seedProducts.map((p) => ({ ...BOOK_FIELDS, ...p }))
  return {
    version: 1,
    products: LIVE ? [] : products,
    categories: LIVE ? [] : seedCategories,
    home: { ...seedHome, flash: { on: true, title: 'Flash Sales', endsAt: now + 3 * DAY }, sections: { flashSale: true, hotDeal: true, allProducts: true, categories: true, reviews: true, recentlyViewed: true } },
    pages: Object.fromEntries(Object.entries(seedPages).filter(([k]) => !k.startsWith('_'))),
    settings: defaultSettings(),
    orders: LIVE ? [] : demoOrders(products, now),
    incomplete: LIVE ? [] : demoIncomplete(products, now),
    coupons: [{ code: 'IELTS50', type: 'flat', value: 50, min: 500, active: true, used: 0, expires: '' }],
    reviews: [],
    landings: [],
    chats: [],
    messages: [],
    nextInvoice: 100101,
    fraud: {},
    smsLog: [],
    lastSeen: now,
  }
}

/* ---------------- persistence + subscription ---------------- */
function load() {
  if (LIVE) return seed() // live mode: the server is the source of truth — nothing is read from or written to localStorage
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw?.version === 1) {
      // merge new default keys added after the user's data was first saved
      const d = defaultSettings()
      raw.settings = { ...d, ...raw.settings, tracking: { ...d.tracking, ...raw.settings?.tracking }, seo: { ...d.seo, ...raw.settings?.seo }, courier: { ...d.courier, ...raw.settings?.courier }, chat: { ...d.chat, ...raw.settings?.chat }, sms: { ...d.sms, ...raw.settings?.sms, events: { ...d.sms.events, ...raw.settings?.sms?.events }, templates: { ...d.sms.templates, ...raw.settings?.sms?.templates } } }
      raw.smsLog ||= []
      // the new Bookshelf logo replaces the old remote logo files (a logo the admin typed in is left alone)
      for (const k of ['logoDark', 'logoWhite']) if (/^settings\/bookshelf-logo/.test(raw.settings[k] || '')) raw.settings[k] = d[k]
      raw.landings ||= []
      raw.chats ||= []
      // the first, shorter order-received text is replaced by the new formal one (edited texts are left alone)
      if (['সম্মানিত {name}, Bookshelf থেকে আপনার অর্ডার ({invoice}) পেয়েছি। পণ্য: {product}, মূল্য {price}৳, ডেলিভারিসহ মোট {total}৳। অর্ডার করার জন্য ধন্যবাদ! আমাদের প্রতিনিধি কল করে অর্ডারটি কনফার্ম করবেন। ট্র্যাক: {link}'].includes(raw.settings.sms?.templates?.placed) || raw.settings.sms?.templates?.placed === '{name}, Bookshelf-এ অর্ডার {invoice} গ্রহণ হয়েছে। মোট {total}৳। ট্র্যাক: {link}') raw.settings.sms.templates.placed = defaultSettings().sms.templates.placed
      // v2 (book details): fill the descriptive fields for products saved before they existed,
      // without overwriting anything the admin has already written.
      if (raw.products && !raw.detailsV2) {
        const bySlug = new Map(seedProducts.map((x) => [x.slug, x]))
        raw.products.forEach((p) => {
          const sd = bySlug.get(p.slug)
          if (!sd) return
          ;['shortDescription', 'description', 'descSource', 'sku', 'author', 'publisher', 'pages', 'edition', 'language', 'coverType'].forEach((k) => { if (!p[k] && sd[k]) p[k] = sd[k] })
          if (!p.comboItems?.length && sd.comboItems?.length) p.comboItems = sd.comboItems
        })
        raw.detailsV2 = true
      }
      // v3 (cover images): books saved without any image get the cover from the seed list (admin-set images are kept)
      if (raw.products && !raw.imagesV3) {
        const bySlug = new Map(seedProducts.map((x) => [x.slug, x]))
        raw.products.forEach((p) => { const sd = bySlug.get(p.slug); if (!p.images?.length && sd?.images?.length) p.images = [...sd.images] })
        raw.imagesV3 = true
      }
      return raw
    }
  } catch { /* corrupted or unavailable */ }
  return seed()
}

export const S = load()
const subs = new Set()
let version = 0
export const liveHooks = { onSave: null }
export function save() {
  version++
  if (LIVE) liveHooks.onSave?.()
  else { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch { /* quota */ } }
  subs.forEach((f) => f())
}
/** re-render subscribers without saving (used after data arrives from the server) */
export function refresh() { version++; subs.forEach((f) => f()) }
/** back to an empty live skeleton (after admin logout) */
export function resetState() { const s = seed(); Object.keys(S).forEach((k) => delete S[k]); Object.assign(S, s); refresh() }
export function useDb() {
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)
  return S
}
export function resetDb() { localStorage.removeItem(KEY); location.reload() }
export function clearDemoData() {
  S.orders = S.orders.filter((o) => !o.demo)
  S.incomplete = S.incomplete.filter((x) => !x.demo)
  save()
}
export function exportDb() { return JSON.stringify(S, null, 1) }
export function importDb(json) {
  const data = JSON.parse(json)
  if (data.version !== 1) throw new Error('Not a Bookshelf backup file')
  Object.keys(S).forEach((k) => delete S[k])
  Object.assign(S, data)
  save()
}

/* ---------------- hooks (SMS module subscribes; avoids circular imports) ---------------- */
export const hooks = { orderEvent: null }
const emitOrderEvent = (o, event) => { try { hooks.orderEvent?.(o, event) } catch { /* never block an order */ } }

/** Public tracking code used in SMS links: /track/BS100101-K7Q2 */
export function trackCode(o) {
  if (!o.trackCode) o.trackCode = `${o.invoice}-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X')}`
  return o.trackCode
}
export const orderByTrackCode = (code) => S.orders.find((o) => o.trackCode && o.trackCode.toUpperCase() === String(code).toUpperCase())

/* ---------------- domain helpers ---------------- */
export const product = (slug) => S.products.find((p) => p.slug === slug)
export const productById = (id) => S.products.find((p) => p.id === id)
export const inStock = (p) => p.stock === null || p.stock === undefined || p.stock > 0
export const flashOn = () => S.home.flash?.on && S.home.flash.endsAt > Date.now()

export function shippingFor(areaId, subtotal) {
  const area = S.settings.shipping.find((s) => s.id === areaId) || S.settings.shipping[0]
  if (S.settings.freeShippingMin && subtotal >= S.settings.freeShippingMin) return 0
  return area.charge
}

export function couponCalc(code, subtotal) {
  if (!code) return { discount: 0 }
  const c = S.coupons.find((x) => x.code.toLowerCase() === code.trim().toLowerCase() && x.active)
  if (!c || (c.expires && new Date(c.expires + 'T23:59') < new Date())) return { discount: 0, error: 'কুপন কোডটি সঠিক নয় বা মেয়াদ শেষ' }
  if (c.min && subtotal < c.min) return { discount: 0, error: `এই কুপন ব্যবহার করতে কমপক্ষে ৳${c.min} এর অর্ডার করতে হবে` }
  const discount = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal)
  return { discount, coupon: c }
}

function adjustStock(items, sign) {
  for (const it of items) {
    const p = productById(it.productId)
    if (p && typeof p.stock === 'number') p.stock = Math.max(0, p.stock + sign * it.quantity)
  }
}

export function createOrder({ name, phone, address, shippingArea, items, couponCode, note, source = 'Website', by = 'Customer', status = 'pending', payment, customerPhone }) {
  const subtotal = items.reduce((s, x) => s + x.price * x.quantity, 0)
  const shippingCharge = shippingFor(shippingArea, subtotal)
  const cc = couponCalc(couponCode, subtotal)
  const now = Date.now()
  const o = {
    id: `o${now}${Math.floor(Math.random() * 999)}`,
    invoice: `BS${S.nextInvoice++}`,
    name, phone: normPhone(phone), address, shippingArea, items, subtotal, shippingCharge,
    discount: cc.discount || 0, coupon: cc.coupon?.code || '', total: subtotal + shippingCharge - (cc.discount || 0),
    payment: payment || { method: 'cod', status: 'unpaid' },
    status: 'pending', courier: '', tracking: '', source, note: note || '', customerPhone: customerPhone || null,
    createdAt: now, history: [{ s: 'pending', by, at: now, note: source !== 'Website' ? `${source} order` : '' }],
  }
  if (cc.coupon) cc.coupon.used = (cc.coupon.used || 0) + 1
  adjustStock(items, -1)
  if (status !== 'pending') { o.status = status; o.history.push({ s: status, by, at: now + 1, note: '' }) }
  trackCode(o)
  S.orders.unshift(o)
  // an incomplete checkout from the same phone in the last 3 days is now recovered
  S.incomplete.forEach((x) => {
    if (x.phone === o.phone && ['new', 'contacted'].includes(x.status) && now - x.at < 3 * DAY) {
      x.status = 'converted'; x.orderInvoice = o.invoice; x.updated = now
      x.log.push({ t: `Ordered (${o.invoice})`, by: 'System', at: now })
    }
  })
  save()
  emitOrderEvent(o, 'placed')
  if (o.status === 'confirmed') emitOrderEvent(o, 'confirmed')
  return o
}

export function setStatus(o, s, by, note = '') {
  if (o.status === s) return
  const prev = o.status
  if (s === 'cancelled' && !['cancelled', 'returned'].includes(prev)) adjustStock(o.items, 1)
  if (prev === 'cancelled' && s !== 'cancelled') adjustStock(o.items, -1)
  o.status = s
  if (s === 'cancelled') o.cancelReason = note
  if (s === 'returned') o.returnReason = note
  if (s === 'delivered' && o.payment?.method === 'cod') o.payment.status = 'paid'
  o.history.push({ s, by, at: Date.now(), note })
  if (['confirmed', 'delivered', 'cancelled'].includes(s)) emitOrderEvent(o, s)
}

export function sendToCourier(o, c, by, tracking = '') {
  // Demo: generates a tracking code. Live: POST to Steadfast /create_order from the Laravel backend.
  o.courier = c
  o.tracking = tracking || COURIERS[c].p + Math.floor(10000000 + Math.random() * 89999999)
  if (['pending', 'confirmed', 'hold'].includes(o.status)) {
    if (o.status !== 'confirmed') o.history.push({ s: 'confirmed', by, at: Date.now(), note: '' })
    o.status = 'ready'
    o.history.push({ s: 'ready', by, at: Date.now() + 1, note: `Sent to ${COURIERS[c].t}` })
  }
  emitOrderEvent(o, 'shipped')
}

export const trackUrl = (o) => !o.tracking ? '' : o.courier === 'steadfast' ? `https://steadfast.com.bd/t/${o.tracking}` : o.courier === 'redx' ? `https://redx.com.bd/track-parcel/?trackingId=${o.tracking}` : o.courier === 'pathao' ? `https://merchant.pathao.com/tracking?consignment_id=${o.tracking}&phone=${o.phone}` : ''
export const waNum = (p) => { p = normPhone(p); return p.startsWith('0') ? '88' + p : p }

export function riskOf(o) {
  const out = []
  const same = S.orders.filter((x) => x.phone === o.phone && x.id !== o.id)
  const bad = same.filter((x) => ['cancelled', 'returned'].includes(x.status)).length
  if (bad) out.push(`${bad} earlier order(s) from this number were cancelled or returned`)
  if (same.some((x) => Math.abs(x.createdAt - o.createdAt) < DAY && ['pending', 'confirmed', 'hold'].includes(x.status))) out.push('Another open order from this number within 24 hours — possible duplicate')
  if (!same.length && o.shippingArea === 'outside_dhaka' && o.total >= 3000) out.push('Large first order from outside Dhaka')
  return out
}

/* Incomplete checkout capture: called while the customer is typing on the checkout page */
export function upsertIncomplete(draftId, data) {
  let d = S.incomplete.find((x) => x.id === draftId)
  if (!d) { d = { id: draftId, at: Date.now(), status: 'new', log: [] }; S.incomplete.unshift(d) }
  Object.assign(d, data, { phone: normPhone(data.phone), updated: Date.now() })
  save()
}
export function removeIncomplete(draftId) {
  S.incomplete = S.incomplete.filter((x) => x.id !== draftId)
  save()
}
