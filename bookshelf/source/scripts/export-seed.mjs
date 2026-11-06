// Builds api/seed/seed.json — the starting data the PHP installer loads into MySQL.
// Run: node scripts/export-seed.mjs   (also runs automatically in `npm run build:cpanel`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { BOOK_FIELDS, defaultSettings } from '../src/store/defaults.js'
const j = (f) => JSON.parse(readFileSync(new URL(`../src/mocks/${f}`, import.meta.url)))
const products = j('products.json').map((p) => ({ ...BOOK_FIELDS, ...p }))
const home = j('home.json')
const pages = Object.fromEntries(Object.entries(j('pages.json')).filter(([k]) => !k.startsWith('_')))
const seed = {
  products, categories: j('categories.json'),
  home: { ...home, flash: { on: false, title: 'Flash Sales', endsAt: 0 }, sections: { flashSale: true, hotDeal: true, allProducts: true, categories: true, reviews: true, recentlyViewed: true } },
  pages, settings: defaultSettings(),
  coupons: [{ code: 'IELTS50', type: 'flat', value: 50, min: 500, active: true, used: 0, expires: '' }],
  nextInvoice: 100101,
}
mkdirSync(new URL('../api/seed/', import.meta.url), { recursive: true })
writeFileSync(new URL('../api/seed/seed.json', import.meta.url), JSON.stringify(seed))
console.log('seed: products', products.length, 'categories', seed.categories.length)
