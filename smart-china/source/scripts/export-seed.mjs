// Builds api/seed/seed.json — the starting data the PHP installer loads into MySQL.
// Run: node scripts/export-seed.mjs   (also runs automatically in `npm run build:cpanel`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { PRODUCT_FIELDS, defaultSettings } from '../src/store/defaults.js'
const j = (f) => JSON.parse(readFileSync(new URL(`../src/mocks/${f}`, import.meta.url)))
const descriptions = j('descriptions.json')
const products = j('products.json').map((p) => ({ ...PRODUCT_FIELDS, ...p, description: p.description ?? descriptions[p.slug] ?? '' }))
const home = j('home.json')
const pages = Object.fromEntries(Object.entries(j('pages.json')).filter(([k]) => !k.startsWith('_')))
const seed = {
  products, categories: j('categories.json'),
  home: { ...home, flash: { on: true, title: 'Flash Sale', endsAt: Date.now() + 7 * 864e5 }, sections: { flashSale: true, hotDeal: true, allProducts: true, categories: true, reviews: true, recentlyViewed: true } },
  pages, settings: defaultSettings(),
  coupons: [{ code: 'WELCOME10', type: 'percent', value: 10, min: 1000, active: true, used: 0, expires: '' }],
  nextInvoice: 100101,
}
mkdirSync(new URL('../api/seed/', import.meta.url), { recursive: true })
writeFileSync(new URL('../api/seed/seed.json', import.meta.url), JSON.stringify(seed))
console.log('seed: products', products.length, 'categories', seed.categories.length)
