import { useEffect, useState } from 'react'
import { loadDetails } from '../services/catalogService'
import { S, save, useDb, hasOptions, syncVariantSummary } from '../store/db'
import { Field, Modal, Pill, tk, toast, Empty } from './ui'
import Img from '../components/common/Img'
import { discountPercent } from '../utils/format'
import { storeUrl } from '../config/env'
import ImageUploader from './ImageUploader'

const slugify = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

const BLANK = { name: '', slug: '', price: 0, oldPrice: null, stock: null, images: [], categories: [], subcategories: [], sku: '', brand: '', shortDescription: '', description: '', specs: [], options: [], variants: [], seoTitle: '', seoDescription: '', active: true, featured: false, isNew: false, sold: 0, productType: 'Physical' }

/** every combination of the option values: Colour × Size → "Black / M", "Black / L", … */
const combos = (opts) => opts.reduce((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]).map((x) => x.join(' / '))

/* ---------- variants: options (Colour, Size, Model…) + one row per combination with its own price / stock / SKU ---------- */
function VariantEditor({ f, setF }) {
  const [draft, setDraft] = useState(() => f.options.map((o) => ({ name: o.name, text: o.values.join(', ') })))
  const apply = (rows) => {
    setDraft(rows)
    const options = rows.map((r) => ({ name: r.name.trim(), values: [...new Set(r.text.split(',').map((x) => x.trim()).filter(Boolean))] })).filter((o) => o.name && o.values.length)
    const keys = options.length ? combos(options) : []
    const old = new Map(f.variants.map((v) => [v.key, v]))
    const variants = keys.map((key, i) => old.get(key) || { key, price: f.price || 0, oldPrice: f.oldPrice ?? null, stock: null, sku: f.sku ? `${f.sku}-${i + 1}` : '' })
    setF((x) => ({ ...x, options, variants }))
  }
  const setV = (key, field, val) => setF((x) => ({ ...x, variants: x.variants.map((v) => (v.key === key ? { ...v, [field]: field === 'sku' ? val : numOrNull(val) } : v)) }))
  const fillAll = (field) => {
    const first = f.variants[0]?.[field]
    setF((x) => ({ ...x, variants: x.variants.map((v) => ({ ...v, [field]: first })) }))
  }
  return (
    <section className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Variants <span className="text-xs font-normal text-muted">(colour, size, model, capacity… — each combination gets its own price and stock)</span></p>
        {draft.length < 3 && <button type="button" className="btn-outline px-2 py-1 text-xs" onClick={() => apply([...draft, { name: draft.length ? 'Size' : 'Colour', text: '' }])}>+ Add option</button>}
      </div>
      {draft.length === 0 && <p className="mt-2 text-xs text-muted">No variants — the product has one price and one stock. Add an option like “Colour: Black, White”.</p>}
      <div className="mt-2 space-y-2">
        {draft.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
            <input className="field" value={r.name} placeholder="Option name, e.g. Colour" onChange={(e) => apply(draft.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} aria-label="Option name" />
            <input className="field" value={r.text} placeholder="Values separated by commas, e.g. Black, White, Blue" onChange={(e) => apply(draft.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} aria-label="Option values" />
            <button type="button" className="text-sm text-red-600" onClick={() => apply(draft.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
      </div>
      {f.variants.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="p-1.5">Variant</th><th className="p-1.5">Price ৳ * <button type="button" className="text-brand" onClick={() => fillAll('price')}>copy ↓</button></th><th className="p-1.5">Old price ৳ <button type="button" className="text-brand" onClick={() => fillAll('oldPrice')}>copy ↓</button></th><th className="p-1.5">Stock <button type="button" className="text-brand" onClick={() => fillAll('stock')}>copy ↓</button></th><th className="p-1.5">SKU</th></tr></thead>
            <tbody>{f.variants.map((v) => (
              <tr key={v.key} className="border-t border-line">
                <td className="p-1.5 font-medium">{v.key}</td>
                <td className="p-1.5"><input type="number" className="field py-1" value={v.price ?? ''} onChange={(e) => setV(v.key, 'price', e.target.value)} aria-label={`${v.key} price`} /></td>
                <td className="p-1.5"><input type="number" className="field py-1" value={v.oldPrice ?? ''} onChange={(e) => setV(v.key, 'oldPrice', e.target.value)} aria-label={`${v.key} old price`} /></td>
                <td className="p-1.5"><input type="number" className="field py-1" value={v.stock ?? ''} placeholder="∞" onChange={(e) => setV(v.key, 'stock', e.target.value)} aria-label={`${v.key} stock`} /></td>
                <td className="p-1.5"><input className="field py-1" value={v.sku || ''} onChange={(e) => setV(v.key, 'sku', e.target.value)} aria-label={`${v.key} SKU`} /></td>
              </tr>
            ))}</tbody>
          </table>
          <p className="mt-1 text-xs text-muted">Empty stock = not tracked (always available). 0 = that variant shows as out of stock. The product card shows the lowest price.</p>
        </div>
      )}
    </section>
  )
}

function SpecsEditor({ f, setF }) {
  const rows = f.specs || []
  const up = (list) => setF((x) => ({ ...x, specs: list }))
  return (
    <section>
      <div className="mb-2 flex items-center justify-between"><p className="font-semibold">Specifications <span className="text-xs font-normal text-muted">(shown in the “Specifications” tab)</span></p><button type="button" className="btn-outline px-2 py-1 text-xs" onClick={() => up([...rows, { k: '', v: '' }])}>+ Add row</button></div>
      {rows.length === 0 && <p className="text-xs text-muted">e.g. Battery — 300mAh · Bluetooth — 5.3 · Warranty — 6 months</p>}
      <div className="space-y-2">{rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
          <input className="field" placeholder="Name" value={r.k} onChange={(e) => up(rows.map((x, k) => (k === i ? { ...x, k: e.target.value } : x)))} />
          <input className="field" placeholder="Value" value={r.v} onChange={(e) => up(rows.map((x, k) => (k === i ? { ...x, v: e.target.value } : x)))} />
          <button type="button" className="text-red-600" onClick={() => up(rows.filter((_, k) => k !== i))} aria-label="Remove row">×</button>
        </div>))}
      </div>
    </section>
  )
}

function ProductForm({ product, onDone }) {
  const [f, setF] = useState(() => ({ ...BLANK, ...product, images: [...(product?.images || [])], options: (product?.options || []).map((o) => ({ ...o, values: [...o.values] })), variants: (product?.variants || []).map((v) => ({ ...v })), specs: (product?.specs || []).map((r) => ({ ...r })) }))
  const [err, setErr] = useState('')
  // the long description is loaded on demand (not part of the catalogue download)
  useEffect(() => { if (product && typeof product.description !== 'string') loadDetails(product).then((p) => setF((x) => ({ ...x, description: p.description || '' }))) }, [product])
  const set = (k, num) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF({ ...f, [k]: num ? (v === '' ? null : Number(v)) : v })
  }
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })
  const opts = f.options.length > 0 && f.variants.length > 0
  const submit = (e) => {
    e.preventDefault()
    const slug = f.slug.trim() || slugify(f.name)
    if (!f.name.trim()) return setErr('Product name is required')
    if (opts ? f.variants.some((v) => !v.price) : !f.price) return setErr(opts ? 'Every variant needs a price' : 'Selling price is required')
    if (!f.categories.length) return setErr('Choose at least one category')
    if (!f.images.length && !confirm('This product has no image. Save without an image?')) return
    if (S.products.some((p) => p.slug === slug && p.id !== product?.id)) return setErr('Another product already uses this URL slug')
    const data = { ...f, slug, name: f.name.trim(), specs: (f.specs || []).filter((r) => r.k?.trim() && r.v?.trim()) }
    if (!opts) { data.options = []; data.variants = [] }
    syncVariantSummary(data)
    if (product?.id) Object.assign(S.products.find((p) => p.id === product.id), data)
    else S.products.unshift({ ...data, id: Math.floor(Date.now() / 1000), createdAt: Date.now() })
    save(); toast(product?.id ? 'Product updated' : 'Product added'); onDone()
  }
  const pct = discountPercent(f.price, f.oldPrice)
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Product name *" className="sm:col-span-2"><input className="field" value={f.name} onChange={set('name')} /></Field>
        <Field label="URL slug" hint={`/product/${f.slug || slugify(f.name) || '…'}`}><input className="field" value={f.slug} onChange={set('slug')} placeholder="auto from name" /></Field>
        <Field label="Product code (SKU)"><input className="field" value={f.sku || ''} onChange={set('sku')} placeholder="e.g. SCG-P2" /></Field>
        {!opts && <>
          <Field label="Selling price (৳) *"><input type="number" className="field" value={f.price ?? ''} onChange={set('price', true)} /></Field>
          <Field label="Original price (৳)" hint={pct ? `Shows "${pct}% OFF"` : 'Leave empty for no discount badge'}><input type="number" className="field" value={f.oldPrice ?? ''} onChange={set('oldPrice', true)} /></Field>
          <Field label="Stock" hint="Empty = not tracked (always available). 0 = shows Out of stock."><input type="number" className="field" value={f.stock ?? ''} onChange={set('stock', true)} /></Field>
        </>}
        <Field label="Brand"><input className="field" value={f.brand || ''} onChange={set('brand')} placeholder="e.g. Xiaomi, Baseus, No brand" /></Field>
        <div className="flex flex-wrap items-end gap-4 pb-2 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set('active')} />Visible on website</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={set('featured')} />Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.isNew} onChange={set('isNew')} />New arrival</label>
        </div>
      </section>

      <VariantEditor f={f} setF={setF} />

      <section className="rounded-lg border border-line bg-surface/50 p-3">
        <ImageUploader kind="product" label="Product images * — the first image is the main one (shown on cards and lists)" value={f.images} onChange={(v) => setF((x) => ({ ...x, images: v }))} max={10} />
      </section>

      <section>
        <p className="mb-2 font-semibold">Categories *</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {S.categories.map((c) => (
            <div key={c.slug} className="rounded-md border border-line p-2 text-sm">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.categories.includes(c.slug)} onChange={() => toggle('categories', c.slug)} />{c.name}</label>
              {(c.subcategories || []).map((s) => <label key={s.slug} className="ml-5 flex items-center gap-2 text-xs"><input type="checkbox" checked={f.subcategories.includes(s.slug)} onChange={() => toggle('subcategories', s.slug)} />{s.name}</label>)}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Short description (shown near the price)" className="sm:col-span-2"><textarea rows={2} className="field" value={f.shortDescription || ''} onChange={set('shortDescription')} /></Field>
        <Field label="Full description (HTML allowed: <p>, <ul><li>, <b>…)" className="sm:col-span-2"><textarea rows={6} className="field font-mono text-xs" value={f.description || ''} onChange={set('description')} /></Field>
      </section>

      <SpecsEditor f={f} setF={setF} />

      <section className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">SEO <span className="text-xs font-normal text-muted">(empty = uses the product name and description)</span></p>
        <Field label="SEO title" hint={`${(f.seoTitle || f.name).length}/60 characters`}><input className="field" value={f.seoTitle} onChange={set('seoTitle')} /></Field>
        <Field label="Meta description" hint={`${(f.seoDescription || '').length}/160 characters`}><input className="field" value={f.seoDescription} onChange={set('seoDescription')} /></Field>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-white py-3"><button className="btn-accent">Save product</button><button type="button" className="btn-outline" onClick={onDone}>Cancel</button></div>
    </form>
  )
}

export default function Products() {
  useDb()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [stockF, setStockF] = useState('')
  const [edit, setEdit] = useState(null)
  const [page, setPage] = useState(1)
  const term = q.toLowerCase()
  const low = (p) => typeof p.stock === 'number' && p.stock <= 3
  const all = S.products.filter((p) => (!cat || p.categories.includes(cat)) && (!term || `${p.name} ${p.sku} ${p.brand || ''} ${(p.variants || []).map((v) => `${v.key} ${v.sku}`).join(' ')}`.toLowerCase().includes(term))
    && (!stockF || (stockF === 'low' ? low(p) : stockF === 'out' ? p.stock === 0 || (hasOptions(p) && p.variants.some((v) => v.stock === 0)) : stockF === 'noprice' ? !p.price : p.active === false)))
  const pages = Math.max(1, Math.ceil(all.length / 25))
  const list = all.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25)
  const missing = (p) => [!p.images.length && 'image', !p.price && 'price', p.description === '' && 'description'].filter(Boolean)
  const stockCell = (p) => {
    if (hasOptions(p)) {
      const out = p.variants.filter((v) => v.stock === 0).length
      return <span className="text-xs">{p.stock ?? '∞'} total<br /><span className="text-muted">{p.variants.length} variants{out ? <b className="text-red-600"> · {out} out</b> : ''}</span></span>
    }
    return p.stock === null || p.stock === undefined ? <span className="text-muted">—</span> : p.stock === 0 ? <Pill tone="red">Out</Pill> : p.stock <= 3 ? <Pill tone="amber">{p.stock}</Pill> : p.stock
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products <span className="text-base font-normal text-muted">({S.products.length})</span></h1>
        <button className="btn-accent" onClick={() => setEdit({})}>+ Add product</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="search" className="field max-w-sm" placeholder="Search name, SKU, brand, variant…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <select className="field w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }}><option value="">All categories</option>{S.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <select className="field w-auto" value={stockF} onChange={(e) => { setStockF(e.target.value); setPage(1) }}><option value="">All stock</option><option value="low">Low stock (≤3)</option><option value="out">Out of stock</option><option value="hidden">Hidden</option><option value="noprice">No price</option></select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Sold</th><th className="p-3">Missing</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.length ? list.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="flex items-center gap-3"><Img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded border border-line object-cover text-[8px]" /><div className="min-w-0"><p className="line-clamp-2 font-medium">{p.name}</p><p className="text-xs text-muted">{p.sku || `#${p.id}`}{hasOptions(p) && ` · ${p.options.map((o) => o.name).join(' / ')}`}</p></div></div></td>
                <td className="p-3 text-xs">{p.categories.map((c) => S.categories.find((x) => x.slug === c)?.name).join(', ')}</td>
                <td className="whitespace-nowrap p-3">{hasOptions(p) && new Set(p.variants.map((v) => v.price)).size > 1 && <span className="text-xs text-muted">from </span>}<b>{tk(p.price)}</b>{p.oldPrice > p.price && <div className="text-xs text-muted line-through">{tk(p.oldPrice)}</div>}</td>
                <td className="p-3">{stockCell(p)}</td>
                <td className="p-3">{p.sold || 0}</td>
                <td className="p-3 text-xs text-amber-700">{missing(p).join(', ') || '✓'}</td>
                <td className="p-3">{p.active !== false ? <Pill tone="green">Live</Pill> : <Pill tone="gray">Hidden</Pill>}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <button className="text-brand" onClick={() => setEdit(p)}>Edit</button>
                  <a className="ml-3 text-muted" href={storeUrl(`/product/${p.slug}`)} target="_blank" rel="noreferrer">View</a>
                </td>
              </tr>
            )) : <tr><td colSpan={8}><Empty>No products found</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 text-sm"><span className="self-center text-muted">Page {Math.min(page, pages)}/{pages}</span><button className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><button className="btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit product' : 'Add a new product'} wide>{edit && <ProductForm product={edit.id ? edit : null} onDone={() => setEdit(null)} />}</Modal>
    </div>
  )
}
