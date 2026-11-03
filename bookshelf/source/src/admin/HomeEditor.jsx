import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, Panel, tk, toast } from './ui'
import Img from '../components/common/Img'

/** Pick an ordered list of books (by slug). */
function BookPicker({ value, onChange, max }) {
  const [q, setQ] = useState('')
  const items = value.map((s) => S.products.find((p) => p.slug === s)).filter(Boolean)
  const matches = q.length > 1 ? S.products.filter((p) => !value.includes(p.slug) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  const move = (i, d) => { const v = [...value]; const j = i + d; if (j < 0 || j >= v.length) return;[v[i], v[j]] = [v[j], v[i]]; onChange(v) }
  return (
    <div>
      <ol className="divide-y divide-line rounded-md border border-line text-sm">
        {items.map((p, i) => (
          <li key={p.slug} className="flex items-center gap-2 p-2">
            <span className="w-5 text-xs text-muted">{i + 1}</span><span className="flex-1 truncate">{p.name}</span><span className="text-xs text-muted">{tk(p.price)}</span>
            <button type="button" onClick={() => move(i, -1)} aria-label="Up">↑</button><button type="button" onClick={() => move(i, 1)} aria-label="Down">↓</button>
            <button type="button" className="text-red-600" onClick={() => onChange(value.filter((s) => s !== p.slug))} aria-label="Remove">×</button>
          </li>
        ))}
        {!items.length && <li className="p-2 text-muted">No books selected</li>}
      </ol>
      {(!max || value.length < max) && <input className="field mt-2" placeholder="Search a book to add…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {matches.length > 0 && <ul className="mt-1 divide-y divide-line rounded-md border border-line text-sm">{matches.map((p) => <li key={p.slug}><button type="button" className="w-full px-3 py-2 text-left hover:bg-surface" onClick={() => { onChange([...value, p.slug]); setQ('') }}>{p.name}</button></li>)}</ul>}
    </div>
  )
}

const toLocal = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export default function HomeEditor() {
  useDb()
  const h = S.home
  const [cat, setCat] = useState(S.categories[0]?.slug)
  const up = (fn) => { fn(); save() }
  const hotSame = !Array.isArray(h.hotDeal)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Homepage & banners</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Banner slider" sub="2–5 wide images (21:9 works best)">
          <ul className="space-y-3">
            {h.banners.map((b, i) => (
              <li key={i} className="grid grid-cols-[120px_1fr_auto] items-start gap-2">
                <Img src={b.image} alt="" className="aspect-[21/9] w-full rounded object-cover text-[8px]" />
                <div className="space-y-1">
                  <input className="field font-mono text-xs" value={b.image} onChange={(e) => up(() => { b.image = e.target.value })} aria-label="Banner image" placeholder="banner/… or https://…" />
                  <input className="field text-xs" value={b.link || ''} onChange={(e) => up(() => { b.link = e.target.value || null })} placeholder="Link when clicked, e.g. /category/combo-package" aria-label="Banner link" />
                </div>
                <button className="px-2 text-red-600" onClick={() => up(() => h.banners.splice(i, 1))} aria-label="Remove banner">×</button>
              </li>
            ))}
          </ul>
          <button className="mt-2 text-sm text-brand" onClick={() => up(() => h.banners.push({ image: '', link: null }))}>+ Add banner</button>
        </Panel>

        <Panel title="Sections on the homepage">
          {[['flashSale', 'Flash Sales'], ['hotDeal', 'Hot Deal'], ['allProducts', 'All Products'], ['categories', 'Category sections'], ['reviews', 'Customer reviews banner'], ['recentlyViewed', 'Recently viewed (per visitor)']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={!!h.sections[k]} onChange={(e) => up(() => { h.sections[k] = e.target.checked })} />{l}</label>
          ))}
          <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={h.flash.on} onChange={(e) => up(() => { h.flash.on = e.target.checked })} />Show flash-sale countdown</label>
            <Field label="Flash sale ends at"><input type="datetime-local" className="field" value={toLocal(h.flash.endsAt)} onChange={(e) => up(() => { h.flash.endsAt = new Date(e.target.value).getTime() })} /></Field>
            <Field label="Reviews banner image"><input className="field font-mono text-xs" value={h.reviewBanner || ''} onChange={(e) => up(() => { h.reviewBanner = e.target.value })} /></Field>
          </div>
        </Panel>

        <Panel title="Flash Sales books"><BookPicker value={h.flashSale} onChange={(v) => up(() => { h.flashSale = v })} /></Panel>
        <Panel title="Hot Deal books" action={<label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={hotSame} onChange={(e) => up(() => { h.hotDeal = e.target.checked ? 'sameAsFlashSale' : [...h.flashSale] })} />Same as Flash Sales (as on the live site)</label>}>
          {hotSame ? <p className="text-sm text-muted">Uses the Flash Sales list.</p> : <BookPicker value={h.hotDeal} onChange={(v) => up(() => { h.hotDeal = v })} />}
        </Panel>
        <Panel title="All Products section"><BookPicker value={h.allProducts} onChange={(v) => up(() => { h.allProducts = v })} /></Panel>
        <Panel title="Category section books" action={<select className="field w-auto py-1 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>{S.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}>
          <BookPicker value={h.categorySections[cat] || []} onChange={(v) => up(() => { h.categorySections[cat] = v })} max={12} />
        </Panel>
      </div>
      <p className="text-sm text-muted">Changes save automatically. <button className="text-brand" onClick={() => toast('Saved')}>Saved ✓</button></p>
    </div>
  )
}
