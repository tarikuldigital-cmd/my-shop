/* Landing-page content model + auto-fill. Pure functions, no store import (db.js imports this). */
export const THEMES = {
  green: { label: 'Green', c: '#0f7a4a', d: '#0a5c37', soft: '#e8f5ee' },
  blue: { label: 'Blue', c: '#1d5fd1', d: '#143f8f', soft: '#e8effc' },
  red: { label: 'Red', c: '#d62839', d: '#9f1d2a', soft: '#fdebed' },
  purple: { label: 'Purple', c: '#6d3fc4', d: '#4b2a8c', soft: '#f0eafb' },
  dark: { label: 'Dark', c: '#1f2937', d: '#0b1220', soft: '#eef0f3' },
}

export const DEFAULT_FEATURES = [
  { icon: '🚚', title: 'Nationwide home delivery', text: 'Delivered to your door anywhere in Bangladesh' },
  { icon: '💵', title: 'Cash on delivery', text: 'Pay when the parcel arrives' },
  { icon: '📞', title: 'Phone confirmation', text: 'Our team calls you to confirm the order' },
]
export const DEFAULT_FAQ = [
  { q: 'How do I order?', a: 'Fill in your name, mobile number and address in the form below and press "Confirm order". Our team will call you to confirm.' },
  { q: 'How do I pay?', a: 'Cash on delivery — pay the rider when the parcel arrives.' },
  { q: 'What is the delivery charge?', a: 'Choose Inside or Outside Dhaka in the order form to see the delivery charge and the total.' },
  { q: 'Can I check the product before paying?', a: 'Yes. Check it in front of the delivery person. If anything is wrong, tell us within 3 days for a replacement.' },
]

const strip = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
export const slugify = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')

/** First sensible content for a product — taken from the product's own data, so nothing is invented. */
export function contentFromProduct(p) {
  const lis = [...(p.description || '').matchAll(/<li>(.*?)<\/li>/g)].map((m) => strip(m[1]))
  const pct = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  return {
    productId: p.id,
    headline: p.name,
    subheadline: p.shortDescription || strip(p.description).slice(0, 160),
    badge: pct ? `${pct}% OFF` : '',
    bullets: lis.slice(0, 6),
    showSpecs: true,
    showCombo: true,
    features: DEFAULT_FEATURES.map((x) => ({ ...x })),
    testimonials: [],
    faq: DEFAULT_FAQ.map((x) => ({ ...x })),
    videoUrl: '',
    ctaText: 'Order now',
    formTitle: 'Fill in the form below to order',
    urgencyText: 'Limited-time offer',
    stickyCta: true,
    theme: 'green',
  }
}

export function newLanding(p, existing = []) {
  let slug = slugify(p.slug || p.name).slice(0, 60) || 'offer'
  for (let i = 2; existing.some((l) => l.slug === slug); i++) slug = `${slugify(p.slug || p.name).slice(0, 55)}-${i}`
  return { id: `lp${Date.now()}`, slug, active: true, views: 0, orders: 0, createdAt: Date.now(), endsAt: null, ...contentFromProduct(p) }
}

/** "https://youtu.be/ID", "watch?v=ID", "/shorts/ID" → embed URL (or null). */
export function embedUrl(u = '') {
  const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}
