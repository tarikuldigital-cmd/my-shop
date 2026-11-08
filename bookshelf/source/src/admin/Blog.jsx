import { useEffect, useState } from 'react'
import { Field, Modal, Pill, Empty, toast } from './ui'
import ImageUploader from './ImageUploader'
import Img from '../components/common/Img'
import { S, useDb } from '../store/db'
import { LIVE, storeUrl } from '../config/env'
import { liveApi } from '../lib/live'
import { CATS, catOf } from '../lib/blogCats'
import { slugify } from '../lib/landing'

const blank = () => ({ id: '', slug: '', cat: 'guide', title: { bn: '', en: '' }, excerpt: { bn: '', en: '' }, body: { bn: '', en: '' }, cover: '', tags: [], books: [], published: true, featured: false, source: '', at: Date.now() })

function Editor({ post, onDone }) {
  useDb()
  const isNew = !post.id
  const [f, setF] = useState(() => ({ ...post, tagsText: (post.tags || []).join(', ') }))
  const [lang, setLang] = useState('bn')
  const [pq, setPq] = useState('')
  const [busy, setBusy] = useState(false)
  const setL = (k) => (e) => setF({ ...f, [k]: { ...f[k], [lang]: e.target.value } })
  const matches = pq.trim().length < 2 ? [] : S.products.filter((p) => `${p.name} ${p.sku || ''}`.toLowerCase().includes(pq.toLowerCase())).slice(0, 6)
  const picked = (f.books || []).map((s) => S.products.find((p) => p.slug === s)).filter(Boolean)

  const save = async () => {
    if (!f.title.bn.trim() && !f.title.en.trim()) return toast('Title is required (Bangla or English)')
    const slug = slugify(f.slug || f.title.en || f.title.bn).slice(0, 120) || 'post'
    const body = { ...f, slug, tags: f.tagsText.split(',').map((t) => t.trim()).filter(Boolean) }
    delete body.tagsText
    if (!LIVE) return toast('Demo mode: posts save only on the live server')
    setBusy(true)
    try { await liveApi('admin/posts', { method: 'POST', admin: true, body }); toast('Saved'); onDone(true) } catch (e) { toast(e.message || 'Could not save') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Category" className="min-w-48 flex-1"><select className="field" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.bn} / {c.en}</option>)}</select></Field>
        <Field label="URL slug (English letters, optional)" hint={`/blog/${slugify(f.slug || f.title.en || f.title.bn) || '…'}`} className="min-w-48 flex-1"><input className="field" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="ielts-writing-tips" /></Field>
      </div>
      <div className="inline-flex overflow-hidden rounded-full border border-line text-sm">
        {[['bn', 'বাংলা'], ['en', 'English']].map(([k, t]) => <button key={k} type="button" onClick={() => setLang(k)} className={`px-4 py-1.5 font-semibold ${lang === k ? 'bg-brand text-white' : 'bg-white'}`}>{t}</button>)}
      </div>
      <Field label={`Title (${lang})`}><input className="field" value={f.title[lang]} onChange={setL('title')} /></Field>
      <Field label={`Short summary for Google & cards (${lang})`} hint="about 150 characters"><textarea rows={2} className="field" value={f.excerpt[lang]} onChange={setL('excerpt')} /></Field>
      <Field label={`Article body (${lang})`} hint="## Heading · ### Sub-heading · - list · 1. numbered · **bold** · [text](/product/slug) · > quote · ![alt](image-url) · --- · {{books:writing}} or {{combo}} shows an animated book strip there"><textarea rows={16} className="field font-mono text-sm" value={f.body[lang]} onChange={setL('body')} /></Field>
      <div>
        <p className="field-label">Cover image</p>
        <div className="w-60"><ImageUploader kind="blog" multiple={false} aspect="aspect-[16/9]" value={f.cover ? [f.cover] : []} onChange={(v) => setF({ ...f, cover: v[0] || '' })} /></div>
      </div>
      <div>
        <p className="field-label">Books to promote on this post (links to the book pages)</p>
        <input className="field" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Type a book name…" />
        {matches.length > 0 && <ul className="mt-1 divide-y rounded-lg border border-line bg-white">{matches.map((p) => <li key={p.id}><button type="button" className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-surface" onClick={() => { if (!f.books.includes(p.slug)) setF({ ...f, books: [...f.books, p.slug] }); setPq('') }}><Img src={p.images?.[0]} className="h-10 w-8 object-contain" alt="" />{p.name}</button></li>)}</ul>}
        <div className="mt-2 flex flex-wrap gap-2">{(f.books || []).map((s) => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs">{picked.find((p) => p.slug === s)?.name || s}<button type="button" onClick={() => setF({ ...f, books: f.books.filter((x) => x !== s) })} aria-label="Remove">×</button></span>)}</div>
        <p className="mt-1 text-xs text-muted">If you pick none, the category’s default books are shown.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Tags (comma separated)" className="min-w-48 flex-1"><input className="field" value={f.tagsText} onChange={(e) => setF({ ...f, tagsText: e.target.value })} placeholder="ielts, writing, band 7" /></Field>
        <Field label="Source / credit" className="min-w-48 flex-1"><input className="field" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="e.g. British Council (official)" /></Field>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured on blog home</label>
      </div>
      <div className="flex gap-2 border-t border-line pt-3">
        <button className="btn-brand" disabled={busy} onClick={save}>{busy ? 'Saving…' : isNew ? 'Publish post' : 'Save changes'}</button>
        <button className="btn-outline" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  )
}

export default function Blog() {
  const [posts, setPosts] = useState(null)
  const [edit, setEdit] = useState(null)
  const load = () => (LIVE ? liveApi('admin/posts', { admin: true }).then((j) => setPosts(j.posts)).catch((e) => { toast(e.message); setPosts([]) }) : setPosts([]))
  useEffect(() => { load() }, [])
  const open = async (p) => {
    if (!LIVE) return setEdit(p)
    try { setEdit((await liveApi(`posts/${encodeURIComponent(p.slug)}`, { admin: true })).post) } catch (e) { toast(e.message) }
  }
  const del = async (p) => {
    if (!confirm(`Delete “${p.title.bn || p.title.en}”? This cannot be undone.`)) return
    try { await liveApi(`admin/posts/${p.id}`, { method: 'DELETE', admin: true }); toast('Deleted'); load() } catch (e) { toast(e.message) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-bold">IELTS Blog</h1><p className="text-sm text-muted">Write Bangla + English guides. They appear at /blog and in the sitemap for Google.</p></div>
        <button className="btn-accent" onClick={() => setEdit(blank())}>+ New post</button>
      </div>
      {!LIVE && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Demo mode — posts can be created only on the live server.</p>}
      {posts === null ? <p className="text-muted">Loading…</p> : posts.length === 0 ? <Empty>No posts yet</Empty> : (
        <ul className="divide-y rounded-xl border border-line bg-white">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              {p.cover ? <Img folder="blog" src={p.cover} alt="" className="h-12 w-20 rounded object-cover" /> : <div className="flex h-12 w-20 items-center justify-center rounded bg-green-50 text-2xl">{catOf(p.cat).icon}</div>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title.bn || p.title.en}</p>
                <p className="text-xs text-muted">{catOf(p.cat).bn} · /blog/{p.slug}</p>
              </div>
              {p.featured && <Pill tone="amber">Featured</Pill>}
              <Pill tone={p.published ? "green" : "gray"}>{p.published ? 'Live' : 'Draft'}</Pill>
              <a className="btn-outline text-xs" href={storeUrl(`/blog/${p.slug}`)} target="_blank" rel="noreferrer">View</a>
              <button className="btn-outline text-xs" onClick={() => open(p)}>Edit</button>
              <button className="px-2 text-sm text-red-600" onClick={() => del(p)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit post' : 'New post'} drawer>
        {edit && <Editor key={edit.id || 'new'} post={edit} onDone={(saved) => { setEdit(null); if (saved) load() }} />}
      </Modal>
    </div>
  )
}
