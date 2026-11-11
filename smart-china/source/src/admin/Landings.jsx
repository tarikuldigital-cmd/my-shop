import { useMemo, useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Field, Modal, Pill, Empty, toast } from './ui'
import Img from '../components/common/Img'
import { storeUrl } from '../config/env'
import { THEMES, newLanding, contentFromProduct, slugify } from '../lib/landing'
import { loadDetails } from '../services/catalogService'

const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const toLocal = (t) => { if (!t) return ''; const d = new Date(t - new Date(t).getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16) }

function ListEditor({ label, items, onChange, fields, blank, addText }) {
  return (
    <div className="space-y-2">
      <p className="field-label">{label}</p>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-line bg-surface p-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {fields.map(([k, ph, wide, area]) => area
              ? <textarea key={k} rows={2} className={`field ${wide ? 'sm:col-span-2' : ''}`} placeholder={ph} value={it[k] || ''} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} />
              : <input key={k} className={`field ${wide ? 'sm:col-span-2' : ''}`} placeholder={ph} value={it[k] || ''} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} />)}
          </div>
          <button type="button" className="self-start px-2 text-red-600" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">×</button>
        </div>
      ))}
      <button type="button" className="btn-outline text-sm" onClick={() => onChange([...items, { ...blank }])}>+ {addText}</button>
    </div>
  )
}

function Editor({ landing, isNew, onDone }) {
  const [f, setF] = useState(() => ({ ...landing, bulletsText: (landing.bullets || []).join('\n') }))
  const [pq, setPq] = useState('')
  const [err, setErr] = useState('')
  const product = S.products.find((p) => p.id === f.productId)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const matches = useMemo(() => pq.trim().length < 2 ? [] : S.products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(pq.toLowerCase())).slice(0, 6), [pq])

  const pick = async (p) => {
    await loadDetails(p)
    const c = contentFromProduct(p)
    setF({ ...f, ...c, bulletsText: c.bullets.join('\n'), slug: isNew ? newLanding(p, S.landings).slug : f.slug })
    setPq('')
  }
  const refill = () => { if (!product || !confirm('Replace headline, benefits, FAQ etc. with fresh content from the product?')) return; const c = contentFromProduct(product); setF({ ...f, ...c, bulletsText: c.bullets.join('\n'), theme: f.theme }) }

  const submit = (e) => {
    e.preventDefault()
    const slug = slugify(f.slug)
    if (!product) return setErr('Choose a product first')
    if (!slug) return setErr('URL slug is required')
    if (S.landings.some((l) => l.slug === slug && l.id !== f.id)) return setErr('This URL is already used by another landing page')
    if (!f.headline.trim()) return setErr('Headline is required')
    const { bulletsText, ...rest } = f
    const out = { ...rest, slug, bullets: lines(bulletsText), testimonials: f.testimonials.filter((t) => t.text?.trim()), faq: f.faq.filter((q) => q.q?.trim() && q.a?.trim()), features: f.features.filter((x) => x.title?.trim()) }
    if (isNew) S.landings.unshift(out); else S.landings = S.landings.map((l) => l.id === out.id ? out : l)
    save(); toast('Landing page saved'); onDone(out)
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        <p className="font-semibold">1. Which product is this landing page for?</p>
        {product ? (
          <div className="flex items-center gap-3 rounded-lg border border-line p-2">
            <Img src={product.images[0]} alt="" className="h-14 w-11 rounded object-cover" />
            <div className="min-w-0 flex-1"><p className="line-clamp-1 font-medium">{product.name}</p><p className="text-xs text-muted">৳{product.price}{product.oldPrice > product.price && ` (was ৳${product.oldPrice})`} · images, price, variants and specs come from the product</p></div>
            <button type="button" className="btn-outline text-sm" onClick={refill}>Re-fill from product</button>
          </div>
        ) : null}
        <input className="field" placeholder={product ? 'Type a name to pick another product…' : 'Search a product by name…'} value={pq} onChange={(e) => setPq(e.target.value)} />
        {matches.length > 0 && <div className="divide-y divide-line rounded-lg border border-line">{matches.map((p) => <button type="button" key={p.id} onClick={() => pick(p)} className="flex w-full items-center gap-3 p-2 text-left hover:bg-surface"><Img src={p.images[0]} alt="" className="h-10 w-8 rounded object-cover" /><span className="line-clamp-1 flex-1 text-sm">{p.name}</span><b className="text-sm">৳{p.price}</b></button>)}</div>}
      </section>

      {product && <>
        <section className="grid gap-3 sm:grid-cols-2">
          <p className="font-semibold sm:col-span-2">2. Main text</p>
          <Field label="Headline" className="sm:col-span-2"><input className="field" value={f.headline} onChange={set('headline')} /></Field>
          <Field label="Sub-headline" className="sm:col-span-2"><textarea rows={2} className="field" value={f.subheadline} onChange={set('subheadline')} /></Field>
          <Field label="Badge (discount tag)"><input className="field" value={f.badge} onChange={set('badge')} placeholder="e.g. 30% OFF" /></Field>
          <Field label="Button text"><input className="field" value={f.ctaText} onChange={set('ctaText')} /></Field>
          <Field label="Order form title" className="sm:col-span-2"><input className="field" value={f.formTitle} onChange={set('formTitle')} /></Field>
          <Field label="Key benefits (one per line)" className="sm:col-span-2"><textarea rows={6} className="field" value={f.bulletsText} onChange={set('bulletsText')} /></Field>
          <Field label="YouTube video link (optional)" className="sm:col-span-2"><input className="field" value={f.videoUrl} onChange={set('videoUrl')} placeholder="https://www.youtube.com/watch?v=…" /></Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <p className="font-semibold sm:col-span-2">3. Offer & design</p>
          <Field label="Offer ends (optional)" hint="Shows a real countdown at the top; it hides itself when the time is up."><input type="datetime-local" className="field" value={toLocal(f.endsAt)} onChange={(e) => setF({ ...f, endsAt: e.target.value ? new Date(e.target.value).getTime() : null })} /></Field>
          <Field label="Top bar text"><input className="field" value={f.urgencyText} onChange={set('urgencyText')} /></Field>
          <div className="sm:col-span-2"><p className="field-label">Colour theme</p>
            <div className="flex flex-wrap gap-2">{Object.entries(THEMES).map(([k, t]) => <button type="button" key={k} onClick={() => setF({ ...f, theme: k })} className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm ${f.theme === k ? 'border-ink' : 'border-line'}`}><span className="h-4 w-4 rounded-full" style={{ background: t.c }} />{t.label}</button>)}</div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.showSpecs} onChange={set('showSpecs')} />Show specifications (brand, specs…)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.stickyCta} onChange={set('stickyCta')} />Sticky order button on mobile</label>
        </section>

        <section className="space-y-4">
          <p className="font-semibold">4. Trust, reviews & FAQ</p>
          <ListEditor label="Benefits (icon + text)" items={f.features} onChange={(v) => setF({ ...f, features: v })} blank={{ icon: '✅', title: '', text: '' }} addText="Add benefit" fields={[['icon', 'Icon / emoji'], ['title', 'Title'], ['text', 'Short text', true]]} />
          <ListEditor label="Customer reviews (real reviews only)" items={f.testimonials} onChange={(v) => setF({ ...f, testimonials: v })} blank={{ name: '', text: '' }} addText="Add review" fields={[['name', 'Name', true], ['text', 'Review', true, true]]} />
          <ListEditor label="FAQ" items={f.faq} onChange={(v) => setF({ ...f, faq: v })} blank={{ q: '', a: '' }} addText="Add question" fields={[['q', 'Question', true], ['a', 'Answer', true, true]]} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <p className="font-semibold sm:col-span-2">5. Link & status</p>
          <Field label="Page URL" hint={`/lp/${slugify(f.slug) || '…'}`}><input className="field" value={f.slug} onChange={set('slug')} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.active} onChange={set('active')} />Page is live (when off, visitors see 404)</label>
        </section>
      </>}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2"><button className="btn-accent">Save landing page</button><button type="button" className="btn-outline" onClick={() => onDone()}>Cancel</button></div>
    </form>
  )
}

export default function Landings() {
  useDb()
  const [edit, setEdit] = useState(null)
  const link = (l) => storeUrl(`/lp/${l.slug}`)
  const full = (l) => link(l)
  const copy = (l) => { navigator.clipboard?.writeText(full(l)); toast('Link copied') }
  const del = (l) => { if (confirm(`Delete "${l.headline}"?`)) { S.landings = S.landings.filter((x) => x.id !== l.id); save() } }
  const dup = (l) => { const c = { ...structuredClone(l), id: `lp${Date.now()}`, slug: `${l.slug}-copy`, views: 0, orders: 0, createdAt: Date.now(), active: false }; S.landings.unshift(c); save(); toast('Duplicated (hidden until you turn it live)') }
  const toggle = (l) => { l.active = !l.active; save() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Landing pages <span className="text-base font-normal text-muted">({S.landings.length})</span></h1><p className="text-sm text-muted">Sales pages for ads, one per product — orders arrive in Orders (Source: Landing page)</p></div>
        <button className="btn-accent" onClick={() => setEdit({ isNew: true, landing: { productId: null, headline: '', subheadline: '', badge: '', bullets: [], features: [], testimonials: [], faq: [], videoUrl: '', ctaText: 'Order now', formTitle: 'Fill in the form below to order', urgencyText: '', stickyCta: true, showSpecs: true, showCombo: true, theme: 'green', slug: '', active: true, views: 0, orders: 0, createdAt: Date.now(), endsAt: null, id: `lp${Date.now()}` } })}>+ New landing page</button>
      </div>

      {S.landings.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white"><Empty>No landing pages yet. Press "+ New landing page" and pick a product — the text is filled in for you.</Empty></div> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {S.landings.map((l) => {
            const p = S.products.find((x) => x.id === l.productId)
            const rate = l.views ? ((l.orders / l.views) * 100).toFixed(1) : '0'
            return (
              <div key={l.id} className="flex gap-3 rounded-lg border border-line bg-white p-3">
                <Img src={p?.images?.[0]} alt="" className="h-28 w-20 shrink-0 rounded border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-semibold">{l.headline}</p>{l.active ? <Pill tone="green">Live</Pill> : <Pill tone="gray">Hidden</Pill>}</div>
                  <p className="mt-0.5 truncate text-xs text-muted">/lp/{l.slug}</p>
                  <div className="mt-2 flex gap-4 text-sm"><span><b>{l.views || 0}</b> <span className="text-muted">visits</span></span><span><b>{l.orders || 0}</b> <span className="text-muted">orders</span></span><span><b>{rate}%</b> <span className="text-muted">convert</span></span></div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <button className="text-brand" onClick={() => setEdit({ landing: l })}>Edit</button>
                    <a className="text-brand" href={link(l)} target="_blank" rel="noreferrer">Preview ↗</a>
                    <button className="text-brand" onClick={() => copy(l)}>Copy link</button>
                    <button className="text-muted" onClick={() => toggle(l)}>{l.active ? 'Hide' : 'Go live'}</button>
                    <button className="text-muted" onClick={() => dup(l)}>Duplicate</button>
                    <button className="text-red-600" onClick={() => del(l)}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'New landing page' : 'Edit landing page'} wide>
        {edit && <Editor key={edit.landing.id} landing={edit.landing} isNew={!!edit.isNew} onDone={() => setEdit(null)} />}
      </Modal>
    </div>
  )
}
