import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, toast } from './ui'
import Img from '../components/common/Img'

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Categories() {
  useDb()
  const [newName, setNewName] = useState('')
  const move = (i, d) => { const c = S.categories; const j = i + d; if (j < 0 || j >= c.length) return;[c[i], c[j]] = [c[j], c[i]]; save() }
  const count = (slug) => S.products.filter((p) => p.categories.includes(slug)).length

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <p className="text-sm text-muted">The order here is the order of the main menu, the Top Categories grid and the homepage sections.</p>
      <div className="space-y-3">
        {S.categories.map((c, i) => (
          <div key={c.slug} className="card grid gap-3 p-4 md:grid-cols-[80px_1fr_1fr_auto]">
            <Img src={c.image} alt="" className="h-20 w-20 rounded object-cover text-[9px]" />
            <div className="space-y-2">
              <Field label={`Name · /category/${c.slug} · ${count(c.slug)} books`}><input className="field" value={c.name} onChange={(e) => { c.name = e.target.value; save() }} /></Field>
              <Field label="Image (path or URL)"><input className="field font-mono text-xs" value={c.image || ''} onChange={(e) => { c.image = e.target.value; save() }} /></Field>
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
              <button className="btn-outline px-2 text-red-600" disabled={count(c.slug) > 0} title={count(c.slug) ? 'Move its books first' : 'Delete'} onClick={() => { if (confirm(`Delete ${c.name}?`)) { S.categories.splice(i, 1); save() } }}>Delete</button>
            </div>
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
