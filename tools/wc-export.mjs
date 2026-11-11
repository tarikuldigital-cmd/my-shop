// Downloads the full WooCommerce catalogue of a shop through its public Store API and saves it as JSON.
// Usage: node tools/wc-export.mjs https://shop.varieytbazar.com data/varieytbazar
import { mkdirSync, writeFileSync } from 'node:fs'
const [base, out] = [process.argv[2].replace(/\/$/, ''), process.argv[3]]
mkdirSync(out, { recursive: true })
const get = async (url) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (r.ok) return { json: await r.json(), headers: r.headers }
    await new Promise((s) => setTimeout(s, 2000 * (i + 1)))
  }
  throw new Error('failed ' + url)
}
const all = []
for (let page = 1; ; page++) {
  const { json, headers } = await get(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${page}`)
  all.push(...json)
  console.log('page', page, json.length, 'total', headers.get('x-wp-total'))
  if (json.length < 100) break
}
// variations (price / stock per colour-size) for variable products
const vars = {}
for (const p of all) for (const v of p.variations || []) {
  try { vars[v.id] = (await get(`${base}/wp-json/wc/store/v1/products/${v.id}`)).json } catch { console.log('variation fail', v.id) }
}
const cats = (await get(`${base}/wp-json/wc/store/v1/products/categories?per_page=100`)).json
writeFileSync(`${out}/products.json`, JSON.stringify(all))
writeFileSync(`${out}/variations.json`, JSON.stringify(vars))
writeFileSync(`${out}/categories.json`, JSON.stringify(cats))
console.log('products', all.length, 'variations', Object.keys(vars).length, 'categories', cats.length)
