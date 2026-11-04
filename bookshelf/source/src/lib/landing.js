/* Landing-page content model + auto-fill. Pure functions, no store import (db.js imports this). */
export const THEMES = {
  green: { label: 'সবুজ', c: '#0f7a4a', d: '#0a5c37', soft: '#e8f5ee' },
  blue: { label: 'নীল', c: '#1d5fd1', d: '#143f8f', soft: '#e8effc' },
  red: { label: 'লাল', c: '#d62839', d: '#9f1d2a', soft: '#fdebed' },
  purple: { label: 'বেগুনি', c: '#6d3fc4', d: '#4b2a8c', soft: '#f0eafb' },
  dark: { label: 'ডার্ক', c: '#1f2937', d: '#0b1220', soft: '#eef0f3' },
}

export const DEFAULT_FEATURES = [
  { icon: '🚚', title: 'সারাদেশে হোম ডেলিভারি', text: 'আপনার ঠিকানায় পৌঁছে দেওয়া হবে' },
  { icon: '💵', title: 'ক্যাশ অন ডেলিভারি', text: 'বই হাতে পেয়ে টাকা দিন' },
  { icon: '📞', title: 'কল করে কনফার্মেশন', text: 'অর্ডারের পর আমাদের প্রতিনিধি কল করবেন' },
]
export const DEFAULT_FAQ = [
  { q: 'কীভাবে অর্ডার করবো?', a: 'পেজের নিচের ফর্মে নাম, মোবাইল নাম্বার ও ঠিকানা দিয়ে "অর্ডার কনফার্ম করুন" বাটনে ক্লিক করুন। আমাদের প্রতিনিধি ফোন করে অর্ডার নিশ্চিত করবেন।' },
  { q: 'পেমেন্ট কীভাবে করবো?', a: 'ক্যাশ অন ডেলিভারি — বই হাতে পেয়ে টাকা পরিশোধ করুন।' },
  { q: 'ডেলিভারি চার্জ কত?', a: 'অর্ডার ফর্মে এলাকা বাছাই করলেই ডেলিভারি চার্জ ও সর্বমোট টাকা দেখতে পাবেন।' },
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
    badge: pct ? `${pct}% ছাড়` : '',
    bullets: (p.comboItems?.length ? lis.filter((x) => !p.comboItems.includes(x)) : lis).slice(0, 6),
    showSpecs: true,
    showCombo: true,
    features: DEFAULT_FEATURES.map((x) => ({ ...x })),
    testimonials: [],
    faq: DEFAULT_FAQ.map((x) => ({ ...x })),
    videoUrl: '',
    ctaText: 'অর্ডার করতে চাই',
    formTitle: 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন',
    urgencyText: 'অফারটি সীমিত সময়ের জন্য',
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
