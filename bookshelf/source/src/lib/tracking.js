/*
 * Marketing tags, configured from Admin → Settings → Tracking & SEO (no code changes needed).
 * - Meta Pixel / Conversions API: NOT sent from the site. Configure them in Google Tag Manager (the dataLayer carries event_id for deduplication)
 * - Google Tag Manager (dataLayer with GA4 e-commerce events)
 * - GA4 direct (gtag) and Google Ads conversion — used only when GTM is NOT set, to avoid double counting
 * - TikTok Pixel
 * - Custom <head>/<body> code and domain-verification meta tags
 */
let loaded = {}

const addScript = (src, attrs = {}) => {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v))
  document.head.appendChild(s)
}
const addMeta = (name, content) => {
  if (!content || document.querySelector(`meta[name="${name}"]`)) return
  const m = document.createElement('meta')
  m.name = name
  m.content = content
  document.head.appendChild(m)
}
// Admin-supplied HTML snippets: <script> tags must be re-created to execute.
function injectHtml(html, target) {
  if (!html) return
  const box = document.createElement('div')
  box.innerHTML = html
  ;[...box.childNodes].forEach((node) => {
    if (node.nodeName === 'SCRIPT') {
      const s = document.createElement('script')
      ;[...node.attributes].forEach((a) => s.setAttribute(a.name, a.value))
      s.text = node.textContent
      target.appendChild(s)
    } else target.appendChild(node)
  })
}

export function initTracking(t = {}) {
  if (typeof window === 'undefined') return
  const w = window
  addMeta('facebook-domain-verification', t.fbDomainVerify)
  addMeta('google-site-verification', t.googleSiteVerify)

  // Meta Pixel is intentionally NOT loaded here: Meta (browser + server-side) is handled only inside Google Tag Manager.

  if (/^GTM-[A-Z0-9]+$/i.test(t.gtmId || '') && !loaded.gtm) {
    loaded.gtm = true
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    addScript(`https://www.googletagmanager.com/gtm.js?id=${t.gtmId}`)
  }

  const gtagIds = t.gtmId ? [] : [t.ga4Id, t.googleAdsId].filter((x) => /^(G|AW)-[A-Z0-9]+$/i.test(x || ''))
  if (gtagIds.length && !loaded.gtag) {
    loaded.gtag = true
    w.dataLayer = w.dataLayer || []
    w.gtag = function () { w.dataLayer.push(arguments) }
    w.gtag('js', new Date())
    gtagIds.forEach((id) => w.gtag('config', id, { send_page_view: false }))
    addScript(`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`)
  }

  if (/^[A-Z0-9]{10,30}$/i.test(t.tiktokPixelId || '') && !loaded.tiktok) {
    loaded.tiktok = true
    /* eslint-disable */
    !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++)ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e) { var n = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._u = n; var o = d.createElement('script'); o.async = !0; o.src = n + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a) } }(w, document, 'ttq')
    /* eslint-enable */
    w.ttq.load(t.tiktokPixelId)
  }

  if (!loaded.custom) {
    loaded.custom = true
    injectHtml(t.headCode, document.head)
    injectHtml(t.bodyCode, document.body)
  }
  loaded.settings = t
}

/**
 * Customer details for the Purchase event (GA4 "user_provided_data" format + flat keys).
 * Values are sent raw into the dataLayer; GTM tags hash them (SHA-256) before sending to Meta/Google.
 * Only fields the checkout actually collects are filled; the rest are left empty.
 */
export function customerData(form = {}, areaLabel = '', email = '') {
  const parts = String(form.name || '').trim().split(/\s+/).filter(Boolean)
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  const digits = String(form.phone || '').replace(/[^\d]/g, '').replace(/^88/, '')
  const phone = digits ? `+88${digits}` : ''
  const city = /ঢাকা.*(ভেতর|ভিতর)|inside\s*dhaka/i.test(areaLabel) ? 'Dhaka' : ''
  const address = String(form.address || '').trim()
  return {
    first_name: first, last_name: last, phone_number: phone, email: String(email || '').trim().toLowerCase(),
    street: address, city, country: 'BD',
    // aliases so GTM Data Layer variables can use whichever names they prefer
    address, user_first_name: first, user_last_name: last, user_phone: phone, user_email: String(email || '').trim().toLowerCase(), user_address: address, user_city: city, user_country: 'BD',
  }
}

const newEventId = () => `${Date.now()}.${Math.random().toString(36).slice(2, 9)}`
const ga4Items = (items) => items.map((i) => ({ item_id: String(i.productId ?? i.id), item_name: i.name, price: i.price, quantity: i.quantity ?? 1, item_category: i.category }))

/**
 * One call fans out to every configured platform.
 * event: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Search' | 'Lead'
 * data:  { items, value, orderId, query, path, title }
 */
export function track(event, data = {}) {
  const w = window
  const eventId = data.eventId || newEventId()
  const items = data.items || []
  const value = data.value ?? items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0)
  const ga4Name = { PageView: 'page_view', ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', Purchase: 'purchase', Search: 'search', Lead: 'generate_lead' }[event]
  const ga4 = event === 'Search' ? { search_term: data.query } : event === 'PageView' ? { page_path: data.path, page_title: data.title } : { currency: 'BDT', value, items: ga4Items(items), ...(data.orderId ? { transaction_id: data.orderId } : {}) }

  if (loaded.gtm && w.dataLayer) {
    if (event !== 'PageView') w.dataLayer.push({ ecommerce: null })
    const c = data.customer
    const ud = c ? { user_data: { email: c.email, phone_number: c.phone_number, address: { first_name: c.first_name, last_name: c.last_name, street: c.street, city: c.city, country: c.country } }, ...c } : {}
    w.dataLayer.push({ event: ga4Name, event_id: eventId, ...ud, ...(event === 'PageView' ? ga4 : { ecommerce: ga4 }) })
  } else if (w.gtag) {
    if (data.customer) w.gtag('set', 'user_data', { email: data.customer.email, phone_number: data.customer.phone_number, address: { first_name: data.customer.first_name, last_name: data.customer.last_name, street: data.customer.street, city: data.customer.city, country: data.customer.country } })
    w.gtag('event', ga4Name, ga4)
    const t = loaded.settings || {}
    if (event === 'Purchase' && t.googleAdsId && t.googleAdsLabel) w.gtag('event', 'conversion', { send_to: `${t.googleAdsId}/${t.googleAdsLabel}`, value, currency: 'BDT', transaction_id: data.orderId })
  }
  if (w.ttq) {
    const tt = { PageView: null, ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment', Search: 'Search', Lead: 'SubmitForm' }[event]
    if (event === 'PageView') w.ttq.page()
    else if (tt) w.ttq.track(tt, { value, currency: 'BDT', contents: items.map((i) => ({ content_id: String(i.productId ?? i.id), content_name: i.name, quantity: i.quantity ?? 1, price: i.price })), query: data.query }, { event_id: eventId })
  }
  return eventId
}
