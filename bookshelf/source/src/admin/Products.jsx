import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, Modal, Pill, tk, toast, Empty } from './ui'
import Img from '../components/common/Img'
import { discountPercent } from '../utils/format'
import { storeUrl } from '../config/env'

const slugify = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)

const BLANK = { name: '', slug: '', price: 0, oldPrice: null, stock: null, images: [], categories: [], subcategories: [], author: '', publisher: '', isbn: '', pages: null, edition: '', language: 'Bangla', coverType: 'Paperback', lookInside: [], comboItems: [], sku: '', brand: '', description: '', seoTitle: '', seoDescription: '', active: true, featured: false, sold: 0, variations: [], productType: 'Physical' }

function ProductForm({ product, onDone }) {
  const [f, setF] = useState(() => ({ ...BLANK, ...product, imagesText: (product?.images || []).join('\n'), lookText: (product?.lookInside || []).join('\n'), comboText: (product?.comboItems || []).join('\n') }))
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
    if (!f.categories.length) return setErr('Choose at least one category')
    if (S.products.some((p) => p.slug === slug && p.id !== product?.id)) return setErr('Another book already uses this URL slug')
    const data = { ...f, slug, name: f.name.trim(), images: lines(f.imagesText), lookInside: lines(f.lookText), comboItems: lines(f.comboText) }
    delete data.imagesText; delete data.lookText; delete data.comboText
    if (product?.id) Object.assign(S.products.find((p) => p.id === product.id), data)
    else S.products.unshift({ ...data, id: Math.floor(Date.now() / 1000) })
    save(); toast(product?.id ? 'Book updated' : 'Book added'); onDone()
  }
  const pct = discountPercent(f.price, f.oldPrice)
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Book name *" className="sm:col-span-2"><input className="field" value={f.name} onChange={set('name')} /></Field>
        <Field label="URL slug" hint={`/product/${f.slug || slugify(f.name) || '…'}`}><input className="field" value={f.slug} onChange={set('slug')} placeholder="auto from name" /></Field>
        <Field label="Product code (SKU)"><input className="field" value={f.sku || ''} onChange={set('sku')} placeholder="e.g. P0194" /></Field>
        <Field label="Selling price (৳) *"><input type="number" className="field" value={f.price ?? ''} onChange={set('price', true)} /></Field>
        <Field label="Original price (৳)" hint={pct ? `Shows "${pct}% ছাড়"` : 'Leave empty for no discount badge'}><input type="number" className="field" value={f.oldPrice ?? ''} onChange={set('oldPrice', true)} /></Field>
        <Field label="Stock" hint="Empty = not tracked (always available). 0 = shows Out of stock."><input type="number" className="field" value={f.stock ?? ''} onChange={set('stock', true)} /></Field>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set('active')} />Visible on website</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={set('featured')} />Featured</label>
        </div>
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
        <p className="font-semibold sm:col-span-3">Book information <span className="text-xs font-normal text-muted">(shown on the product page and in Google results)</span></p>
        <Field label="Author / লেখক"><input className="field" value={f.author} onChange={set('author')} /></Field>
        <Field label="Publisher / প্রকাশনী"><input className="field" value={f.publisher} onChange={set('publisher')} /></Field>
        <Field label="ISBN"><input className="field" value={f.isbn} onChange={set('isbn')} /></Field>
        <Field label="Pages"><input type="number" className="field" value={f.pages ?? ''} onChange={set('pages', true)} /></Field>
        <Field label="Edition"><input className="field" value={f.edition} onChange={set('edition')} placeholder="e.g. 2026 Edition" /></Field>
        <Field label="Language"><select className="field" value={f.language} onChange={set('language')}><option value="">—</option><option>Bangla</option><option>English</option><option>English & Bangla</option></select></Field>
        <Field label="Cover"><select className="field" value={f.coverType} onChange={set('coverType')}><option value="">—</option><option>Paperback</option><option>Hardcover</option><option>Spiral</option></select></Field>
        <Field label="Print"><input className="field" value={f.brand || ''} onChange={set('brand')} placeholder="e.g. White print / News print" /></Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Product images (one per line)" hint="File name from /uploads/product/ or a full https:// link. File upload comes with the backend."><textarea rows={3} className="field font-mono text-xs" value={f.imagesText} onChange={set('imagesText')} /></Field>
        <Field label="একটু পড়ে দেখুন — preview page images (one per line)" hint="Shows a 'Look inside' button with these pages"><textarea rows={3} className="field font-mono text-xs" value={f.lookText} onChange={set('lookText')} /></Field>
        <Field label="Combo / package contents (one book per line)" hint="Shown as a checklist on combo products" className="sm:col-span-2"><textarea rows={3} className="field" value={f.comboText} onChange={set('comboText')} /></Field>
        <Field label="Description (HTML allowed)" className="sm:col-span-2"><textarea rows={6} className="field font-mono text-xs" value={f.description || ''} onChange={set('description')} /></Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">SEO <span className="text-xs font-normal text-muted">(empty = uses the book name and description)</span></p>
        <Field label="SEO title" hint={`${(f.seoTitle || f.name).length}/60 characters`}><input className="field" value={f.seoTitle} onChange={set('seoTitle')} /></Field>
        <Field label="Meta description" hint={`${(f.seoDescription || '').length}/160 characters`}><input className="field" value={f.seoDescription} onChange={set('seoDescription')} /></Field>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2"><button className="btn-accent">Save book</button><button type="button" className="btn-outline" onClick={onDone}>Cancel</button></div>
    </form>
  )
}

export default function Products() {
  useDb()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [edit, setEdit] = useState(null)
  const [page, setPage] = useState(1)
  const term = q.toLowerCase()
  const all = S.products.filter((p) => (!cat || p.categories.includes(cat)) && (!term || `${p.name} ${p.author} ${p.sku} ${p.isbn}`.toLowerCase().includes(term)))
  const pages = Math.max(1, Math.ceil(all.length / 25))
  const list = all.slice((Math.min(page, pages) - 1) * 25, Math.min(page, pages) * 25)
  const missing = (p) => [!p.images.length && 'image', !p.description && 'description', !p.author && 'author'].filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Books / Products <span className="text-base font-normal text-muted">({S.products.length})</span></h1>
        <button className="btn-accent" onClick={() => setEdit({})}>+ Add book</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="search" className="field max-w-sm" placeholder="Search name, author, SKU, ISBN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <select className="field w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }}><option value="">All categories</option>{S.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Book</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Missing info</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.length ? list.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="flex items-center gap-3"><Img src={p.images[0]} alt="" className="h-14 w-11 shrink-0 rounded border border-line object-cover text-[8px]" /><div className="min-w-0"><p className="line-clamp-2 font-medium">{p.name}</p><p className="text-xs text-muted">{p.sku || `#${p.id}`}{p.author && ` · ${p.author}`}</p></div></div></td>
                <td className="p-3 text-xs">{p.categories.map((c) => S.categories.find((x) => x.slug === c)?.name).join(', ')}</td>
                <td className="whitespace-nowrap p-3"><b>{tk(p.price)}</b>{p.oldPrice > p.price && <div className="text-xs text-muted line-through">{tk(p.oldPrice)}</div>}</td>
                <td className="p-3">{p.stock === null || p.stock === undefined ? <span className="text-muted">—</span> : p.stock === 0 ? <Pill tone="red">Out</Pill> : p.stock <= 3 ? <Pill tone="amber">{p.stock}</Pill> : p.stock}</td>
                <td className="p-3 text-xs text-amber-700">{missing(p).join(', ') || '✓'}</td>
                <td className="p-3">{p.active !== false ? <Pill tone="green">Live</Pill> : <Pill tone="gray">Hidden</Pill>}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <button className="text-brand" onClick={() => setEdit(p)}>Edit</button>
                  <a className="ml-3 text-muted" href={storeUrl(`/product/${p.slug}`)} target="_blank" rel="noreferrer">View</a>
                </td>
              </tr>
            )) : <tr><td colSpan={7}><Empty>No books found</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 text-sm"><span className="self-center text-muted">Page {Math.min(page, pages)}/{pages}</span><button className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><button className="btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit book' : 'Add a new book'} wide>{edit && <ProductForm product={edit.id ? edit : null} onDone={() => setEdit(null)} />}</Modal>
    </div>
  )
}
