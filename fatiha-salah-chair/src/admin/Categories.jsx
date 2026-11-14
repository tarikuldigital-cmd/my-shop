import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, toast } from './ui'
import ImageUploader from './ImageUploader'
import { storeUrl } from '../config/env'

const link = (slug) => storeUrl(`/category/${slug}`)
const copy = (t) => { navigator.clipboard?.writeText(t).then(() => toast('Campaign link copied ✓'), () => prompt('Copy this link', t)) }

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Categories() {
  useDb()
  const [newName, setNewName] = useState('')
  const move = (i, d) => { const c = S.categories; const j = i + d; if (j < 0 || j >= c.length) return;[c[i], c[j]] = [c[j], c[i]]; save() }
  const count = (slug) => S.products.filter((p) => p.categories.includes(slug)).length

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <p className="text-sm text-muted">The order here is the order of the main menu and the homepage sections. Every category has its own link for ad campaigns — new products added to a category appear on its page automatically. Categories with no products are hidden from the menu.</p>
      <div className="space-y-3">
        {S.categories.map((c, i) => (
          <div key={c.slug} className="card space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-[150px_1fr_1fr_auto]">
              <ImageUploader kind="category" multiple={false} aspect="aspect-square" value={c.image ? [c.image] : []} onChange={(v) => { c.image = v[0] || ''; save() }} />
              <div className="space-y-2">
                <Field label={`Name · ${count(c.slug)} products`}><input className="field" value={c.name} onChange={(e) => { c.name = e.target.value; save() }} /></Field>
                <div className="rounded-md bg-surface p-2 text-xs">
                  <p className="font-semibold">📣 Campaign link (Facebook/Google ads)</p>
                  <p className="mt-1 break-all text-brand">{link(c.slug)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-accent px-2 py-1 text-xs" onClick={() => copy(link(c.slug))}>Copy link</button>
                    <a className="btn-outline px-2 py-1 text-xs" href={link(c.slug)} target="_blank" rel="noreferrer">Open ↗</a>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.hideInMenu === true} onChange={(e) => { c.hideInMenu = e.target.checked; save() }} />Hide from the menu (the link still works — good for ad-only categories)</label>
              </div>
              <div>
                <p className="field-label">Subcategories</p>
                <ul className="space-y-1">
                  {c.subcategories.map((s, k) => (
                    <li key={s.slug} className="flex gap-1">
                      <input className="field py-1" value={s.name} onChange={(e) => { s.name = e.target.value; save() }} aria-label="Subcategory name" />
                      <button className="px-2 text-red-600" onClick={() => { c.subcategories.splice(k, 1); save() }} aria-label="Remove subcategory">×</button>
                    </li>
                  ))}
                </ul>
                <button className="mt-1 text-sm text-brand" onClick={() => { const n = prompt('Subcategory name'); if (n) { c.subcategories.push({ slug: slugify(n), name: n }); save() } }}>+ Add subcategory</button>
              </div>
              <div className="flex gap-1 md:flex-col">
                <button className="btn-outline px-2" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button className="btn-outline px-2" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button className="btn-outline px-2 text-red-600" disabled={count(c.slug) > 0} title={count(c.slug) ? 'Move its products first' : 'Delete'} onClick={() => { if (confirm(`Delete ${c.name}?`)) { S.categories.splice(i, 1); save() } }}>Delete</button>
              </div>
            </div>
            <details className="rounded-md border border-line p-3" open={!!(c.headline || c.intro || c.banner)}>
              <summary className="cursor-pointer text-sm font-semibold">Category page for campaigns — banner, headline & text (optional)</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2"><ImageUploader kind="banner" multiple={false} label="Top banner (wide, e.g. 1680×720) — empty = no banner" aspect="aspect-[21/9]" value={c.banner ? [c.banner] : []} onChange={(v) => { c.banner = v[0] || ''; save() }} /></div>
                <Field label="Small line above the headline" hint="e.g. Sit for Salah • Feel the Peace"><input className="field" value={c.kicker || ''} onChange={(e) => { c.kicker = e.target.value; save() }} /></Field>
                <Field label="Headline"><input className="field" value={c.headline || ''} onChange={(e) => { c.headline = e.target.value; save() }} /></Field>
                <Field label="Intro text" className="md:col-span-2"><textarea rows={3} className="field" value={c.intro || ''} onChange={(e) => { c.intro = e.target.value; save() }} /></Field>
                <Field label="SEO title (Google / Facebook share)"><input className="field" value={c.seoTitle || ''} onChange={(e) => { c.seoTitle = e.target.value; save() }} /></Field>
                <Field label="SEO description"><input className="field" value={c.seoDescription || ''} onChange={(e) => { c.seoDescription = e.target.value; save() }} /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.showTrust !== false} onChange={(e) => { c.showTrust = e.target.checked; save() }} />Show delivery / COD trust strip</label>
              </div>
            </details>
          </div>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newName.trim()) return; const slug = slugify(newName); if (S.categories.some((c) => c.slug === slug)) return toast('Category exists'); S.categories.push({ slug, name: newName.trim(), image: '', subcategories: [] }); S.home.categorySections[slug] = []; save(); setNewName(''); toast('Category added') }}>
        <input className="field max-w-xs" placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-accent">Add category</button>
      </form>
    </div>
  )
}
