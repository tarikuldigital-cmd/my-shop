import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, Modal, Pill, tk, toast, Empty } from './ui'
import Img from '../components/common/Img'
import { discountPercent } from '../utils/format'
import { storeUrl } from '../config/env'
import ImageUploader from './ImageUploader'

const slugify = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)

const BLANK = { name: '', slug: '', price: 0, oldPrice: null, stock: null, images: [], categories: [], subcategories: [], color: '', colorHex: '#0f5132', group: 'salah-chair', material: '', dimensions: '', warranty: '', lookInside: [], comboItems: [], sku: '', brand: '', shortDescription: '', descSource: '', description: '', seoTitle: '', seoDescription: '', active: true, featured: false, sold: 0, variations: [], productType: 'Physical' }

function ProductForm({ product, onDone }) {
  const [f, setF] = useState(() => ({ ...BLANK, ...product, images: [...(product?.images || [])], lookInside: [...(product?.lookInside || [])], comboText: (product?.comboItems || []).join('\n') }))
  const [err, setErr] = useState('')
  const set = (k, num) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF({ ...f, [k]: num ? (v === '' ? null : Number(v)) : v })
  }
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })
  const submit = (e) => {
    e.preventDefault()
    const slug = f.slug.trim() || slugify(f.name)
    if (!f.name.trim() || !f.price) return setErr('Name and selling price are required')
    if (f.duplicateOf && /\(কপি\)\s*$/.test(f.name.trim())) return setErr('ডুপ্লিকেট প্রোডাক্টের নামটা বদলে দিন (শেষের "(কপি)" মুছে নতুন নাম লিখুন)')
    if (!f.categories.length) return setErr('Choose at least one category')
    if (!f.images.length && !confirm('এই পণ্যের কোনো ছবি দেওয়া হয়নি। ছবি ছাড়াই সেভ করবেন?')) return
    if (S.products.some((p) => p.slug === slug && p.id !== product?.id)) return setErr('Another product already uses this URL slug')
    const data = { ...f, slug, name: f.name.trim(), comboItems: lines(f.comboText) }
    delete data.comboText
    delete data.duplicateOf
    if (product?.id) Object.assign(S.products.find((p) => p.id === product.id), data)
    else S.products.unshift({ ...data, id: Math.floor(Date.now() / 1000) })
    save(); toast(product?.id ? 'Product updated' : 'Product added'); onDone()
  }
  const pct = discountPercent(f.price, f.oldPrice)
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {f.duplicateOf && <p className="rounded-md border border-brand/30 bg-brand/5 p-3 text-sm">⧉ <b>{f.duplicateOf}</b>-এর সব তথ্য কপি হয়েছে। শুধু <b>নাম</b> বদলান আর নিচে পুরনো <b>ছবি</b> মুছে নতুন ছবি দিন, তারপর সেভ করুন। দরকার হলে দাম, স্টক, কালারও বদলাতে পারবেন।</p>}
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Product name *" className="sm:col-span-2"><input className="field" value={f.name} onChange={set('name')} /></Field>
        <Field label="URL slug" hint={`/product/${f.slug || slugify(f.name) || '…'}`}><input className="field" value={f.slug} onChange={set('slug')} placeholder="auto from name" /></Field>
        <Field label="Product code (SKU)"><input className="field" value={f.sku || ''} onChange={set('sku')} placeholder="e.g. P0194" /></Field>
        <Field label="Selling price (৳) *"><input type="number" className="field" value={f.price ?? ''} onChange={set('price', true)} /></Field>
        <Field label="Original price (৳)" hint={pct ? `Shows "${pct}% ছাড়"` : 'Leave empty for no discount badge'}><input type="number" className="field" value={f.oldPrice ?? ''} onChange={set('oldPrice', true)} /></Field>
        <Field label="স্টক (কয় পিস আছে)" hint="যত পিস আছে লিখুন — প্রতি অর্ডারে নিজে থেকে কমবে, ০ হলে ওয়েবসাইটে 'স্টকে নেই' দেখাবে ও অর্ডার বন্ধ হবে। অর্ডার ক্যানসেল হলে আবার ফিরে আসবে। খালি রাখলে স্টক গোনা হবে না।"><input type="number" className="field" value={f.stock ?? ''} onChange={set('stock', true)} /></Field>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set('active')} />Visible on website</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={set('featured')} />Featured</label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface/50 p-3">
        <ImageUploader kind="product" label="পণ্যের ছবি * — প্রথম ছবিটি মূল ছবি (কার্ড ও লিস্টে দেখাবে)" value={f.images} onChange={(v) => setF((x) => ({ ...x, images: v }))} max={8} />
      </section>

      <section>
        <p className="mb-2 font-semibold">Categories *</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {S.categories.map((c) => (
            <div key={c.slug} className="rounded-md border border-line p-2 text-sm">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.categories.includes(c.slug)} onChange={() => toggle('categories', c.slug)} />{c.name}</label>
              {c.subcategories.map((s) => <label key={s.slug} className="ml-5 flex items-center gap-2 text-xs"><input type="checkbox" checked={f.subcategories.includes(s.slug)} onChange={() => toggle('subcategories', s.slug)} />{s.name}</label>)}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <p className="font-semibold sm:col-span-3">কালার ও পণ্যের তথ্য <span className="text-xs font-normal text-muted">(একই "Color group"-এর সব পণ্য প্রোডাক্ট পেজে কালার অপশন হিসেবে পাশাপাশি দেখাবে)</span></p>
        <Field label="Color name / কালার" hint="e.g. Maroon, Sky Blue"><input className="field" value={f.color || ''} onChange={set('color')} /></Field>
        <Field label="Color swatch"><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded border border-line" value={f.colorHex || '#0f5132'} onChange={set('colorHex')} /><input className="field" value={f.colorHex || ''} onChange={set('colorHex')} /></div></Field>
        <Field label="Color group" hint="Same group = color options of one chair model"><input className="field" value={f.group || ''} onChange={set('group')} placeholder="salah-chair" /></Field>
        <Field label="Material / উপকরণ"><input className="field" value={f.material || ''} onChange={set('material')} placeholder="Golden metal frame, velvet fabric" /></Field>
        <Field label="Size / মাপ"><input className="field" value={f.dimensions || ''} onChange={set('dimensions')} placeholder="e.g. 80 × 55 × 50 cm" /></Field>
        <Field label="Warranty / গ্যারান্টি"><input className="field" value={f.warranty || ''} onChange={set('warranty')} /></Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Combo / package contents (one product per line)" hint="Shown as a checklist on combo products" className="sm:col-span-2"><textarea rows={3} className="field" value={f.comboText} onChange={set('comboText')} /></Field>
        <Field label="Short description (shown near the price)" hint={f.descSource === 'written' ? 'This text was written from the title/category — please check it against the product.' : undefined} className="sm:col-span-2"><textarea rows={2} className="field" value={f.shortDescription || ''} onChange={set('shortDescription')} /></Field>
        <Field label="Full description (HTML allowed)" className="sm:col-span-2"><textarea rows={6} className="field font-mono text-xs" value={f.description || ''} onChange={set('description')} /></Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">SEO <span className="text-xs font-normal text-muted">(empty = uses the product name and description)</span></p>
        <Field label="SEO title" hint={`${(f.seoTitle || f.name).length}/60 characters`}><input className="field" value={f.seoTitle} onChange={set('seoTitle')} /></Field>
        <Field label="Meta description" hint={`${(f.seoDescription || '').length}/160 characters`}><input className="field" value={f.seoDescription} onChange={set('seoDescription')} /></Field>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2"><button className="btn-accent">Save product</button><button type="button" className="btn-outline" onClick={onDone}>Cancel</button></div>
    </form>
  )
}


/* Stock in the product list — click to change quickly */
function StockCell({ p }) {
  const [v, setV] = useState(null)
  const tracked = typeof p.stock === 'number'
  const commit = () => {
    const n = v === '' ? null : Math.max(0, Math.round(+v))
    if (v !== null && n !== (tracked ? p.stock : null)) { p.stock = n; save(); toast(n === null ? `${p.name}: স্টক গোনা বন্ধ` : `${p.name}: স্টক ${n}`) }
    setV(null)
  }
  if (v !== null) return <input type="number" min={0} autoFocus className="field w-20 py-1" value={v} placeholder="—" onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setV(null) }} />
  return (
    <button type="button" title="ক্লিক করে স্টক বদলান" onClick={() => setV(tracked ? String(p.stock) : '')} className="rounded px-1 hover:bg-surface">
      {!tracked ? <span className="text-xs text-muted">— সেট করুন</span> : p.stock === 0 ? <Pill tone="red">স্টক আউট</Pill> : p.stock <= 3 ? <Pill tone="amber">{p.stock} পিস</Pill> : <span className="font-semibold">{p.stock} পিস</span>}
    </button>
  )
}

export default function Products() {
  useDb()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [edit, setEdit] = useState(null)
  const [page, setPage] = useState(1)
  const term = q.toLowerCase()
  const all = S.products.filter((p) => (!cat || p.categories.includes(cat)) && (!term || `${p.name} ${p.color || ''} ${p.sku}`.toLowerCase().includes(term)))
  const pages = Math.max(1, Math.ceil(all.length / 25))
  const list = all.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25)
  const missing = (p) => [!p.images.length && 'image', !p.description && 'description', !p.color && 'color'].filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products <span className="text-base font-normal text-muted">({S.products.length})</span></h1>
        <button className="btn-accent" onClick={() => setEdit({})}>+ Add product</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="search" className="field max-w-sm" placeholder="Search name, color, SKU…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <select className="field w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }}><option value="">All categories</option>{S.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Missing info</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.length ? list.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="flex items-center gap-3"><Img src={p.images[0]} alt="" className="h-14 w-11 shrink-0 rounded border border-line object-cover text-[8px]" /><div className="min-w-0"><p className="line-clamp-2 font-medium">{p.name}</p><p className="text-xs text-muted">{p.sku || `#${p.id}`}{p.color && <> · <span className="inline-block h-2.5 w-2.5 rounded-full border align-middle" style={{ background: p.colorHex }} /> {p.color}</>}</p></div></div></td>
                <td className="p-3 text-xs">{p.categories.map((c) => S.categories.find((x) => x.slug === c)?.name).join(', ')}</td>
                <td className="whitespace-nowrap p-3"><b>{tk(p.price)}</b>{p.oldPrice > p.price && <div className="text-xs text-muted line-through">{tk(p.oldPrice)}</div>}</td>
                <td className="p-3"><StockCell p={p} /></td>
                <td className="p-3 text-xs text-amber-700">{missing(p).join(', ') || '✓'}</td>
                <td className="p-3">{p.active !== false ? <Pill tone="green">Live</Pill> : <Pill tone="gray">Hidden</Pill>}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <button className="text-brand" onClick={() => setEdit(p)}>Edit</button>
                  <button className="ml-3 font-semibold text-brand" title="এই প্রোডাক্টের হুবহু কপি — শুধু নাম আর ছবি বদলে সেভ করুন" onClick={() => setEdit({ ...JSON.parse(JSON.stringify(p)), id: undefined, slug: '', sku: '', name: `${p.name} (কপি)`, sold: 0, duplicateOf: p.name })}>⧉ Duplicate</button>
                  <button className="ml-3 text-accent" title="নতুন কালার যোগ করুন (এই পণ্যের কপি)" onClick={() => setEdit({ ...p, id: undefined, slug: '', sku: '', color: '', name: p.name.replace(p.color || '\u0000', '').trim(), images: [], sold: 0 })}>+ Color</button>
                  <a className="ml-3 text-muted" href={storeUrl(`/product/${p.slug}`)} target="_blank" rel="noreferrer">View</a>
                </td>
              </tr>
            )) : <tr><td colSpan={7}><Empty>No products found</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 text-sm"><span className="self-center text-muted">Page {Math.min(page, pages)}/{pages}</span><button className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><button className="btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit product' : edit?.duplicateOf ? `ডুপ্লিকেট: ${edit.duplicateOf} — নাম আর ছবি বদলে সেভ করুন` : 'Add a new product / color'} wide>{edit && <ProductForm product={edit.id ? edit : (Object.keys(edit).length ? edit : null)} onDone={() => setEdit(null)} />}</Modal>
    </div>
  )
}
