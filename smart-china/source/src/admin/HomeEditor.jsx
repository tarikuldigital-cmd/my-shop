import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, Panel, tk, toast } from './ui'
import ImageUploader from './ImageUploader'

/** Pick an ordered list of products (by slug). */
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
        {!items.length && <li className="p-2 text-muted">No products selected</li>}
      </ol>
      {(!max || value.length < max) && <input className="field mt-2" placeholder="Search a product to add…" value={q} onChange={(e) => setQ(e.target.value)} />}
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
        <Panel title="Banner slider" sub="2–5 wide images (21:9 works best). Without an image, the title / subtitle / button show as a text banner.">
          <ul className="space-y-3">
            {h.banners.map((b, i) => (
              <li key={i} className="rounded-md border border-line p-3">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold">Banner {i + 1}
                  <span className="flex gap-2 font-normal">
                    <button onClick={() => up(() => { if (i) [h.banners[i - 1], h.banners[i]] = [h.banners[i], h.banners[i - 1]] })} disabled={!i} aria-label="Move up">↑</button>
                    <button onClick={() => up(() => { if (i < h.banners.length - 1) [h.banners[i + 1], h.banners[i]] = [h.banners[i], h.banners[i + 1]] })} aria-label="Move down">↓</button>
                    <button className="text-red-600" onClick={() => up(() => h.banners.splice(i, 1))}>Delete banner</button>
                  </span>
                </div>
                <ImageUploader kind="banner" multiple={false} aspect="aspect-[21/9]" value={b.image ? [b.image] : []} onChange={(v) => up(() => { b.image = v[0] || '' })} />
                {!b.image && <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input className="field text-xs" value={b.title || ''} onChange={(e) => up(() => { b.title = e.target.value })} placeholder="Title (text banner)" aria-label="Banner title" />
                  <input className="field text-xs" value={b.sub || ''} onChange={(e) => up(() => { b.sub = e.target.value })} placeholder="Subtitle" aria-label="Banner subtitle" />
                  <input className="field text-xs" value={b.cta || ''} onChange={(e) => up(() => { b.cta = e.target.value })} placeholder="Button text" aria-label="Banner button" />
                </div>}
                <input className="field mt-2 text-xs" value={b.link || ''} onChange={(e) => up(() => { b.link = e.target.value || null })} placeholder="Link when clicked, e.g. /category/winter-gadgets (optional)" aria-label="Banner link" />
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
            <div className="sm:col-span-2"><ImageUploader kind="banner" multiple={false} aspect="aspect-[21/9]" label="Customer reviews banner" value={h.reviewBanner ? [h.reviewBanner] : []} onChange={(v) => up(() => { h.reviewBanner = v[0] || '' })} /></div>
          </div>
        </Panel>

        <Panel title="Flash sale products"><BookPicker value={h.flashSale} onChange={(v) => up(() => { h.flashSale = v })} /></Panel>
        <Panel title="Hot deal products" action={<label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={hotSame} onChange={(e) => up(() => { h.hotDeal = e.target.checked ? 'sameAsFlashSale' : [...h.flashSale] })} />Same as Flash Sales (as on the live site)</label>}>
          {hotSame ? <p className="text-sm text-muted">Uses the Flash Sales list.</p> : <BookPicker value={h.hotDeal} onChange={(v) => up(() => { h.hotDeal = v })} />}
        </Panel>
        <Panel title="All Products section"><BookPicker value={h.allProducts} onChange={(v) => up(() => { h.allProducts = v })} /></Panel>
        <Panel title="Category section products" action={<select className="field w-auto py-1 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>{S.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}>
          <BookPicker value={h.categorySections[cat] || []} onChange={(v) => up(() => { h.categorySections[cat] = v })} max={12} />
        </Panel>
      </div>
      <p className="text-sm text-muted">Changes save automatically. <button className="text-brand" onClick={() => toast('Saved')}>Saved ✓</button></p>
    </div>
  )
}
