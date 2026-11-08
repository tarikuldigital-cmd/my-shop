import { useEffect, useState } from 'react'
import { Field, Modal, Pill, Empty, toast } from './ui'
import ImageUploader from './ImageUploader'
import Img from '../components/common/Img'
import { LIVE, storeUrl } from '../config/env'
import { liveApi } from '../lib/live'
import { CATS, catOf } from '../lib/blogCats'
import { slugify } from '../lib/landing'

const blank = () => ({ id: '', slug: '', cat: 'guide', title: { bn: '', en: '' }, excerpt: { bn: '', en: '' }, body: { bn: '', en: '' }, cover: '', tags: [], level: '', published: true, featured: false, source: '', at: Date.now() })

function Editor({ post, onDone }) {
  const isNew = !post.id
  const [f, setF] = useState(() => ({ ...post, tagsText: (post.tags || []).join(', ') }))
  const [lang, setLang] = useState('bn')
  const [busy, setBusy] = useState(false)
  const setL = (k) => (e) => setF({ ...f, [k]: { ...f[k], [lang]: e.target.value } })

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
        <Field label="Category" className="min-w-48 flex-1"><select className="field" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c.slug} value={c.slug}>{c.bn} / {c.en}</option>)}</select></Field>
        <Field label="URL slug (English letters, optional)" hint={`/blog/${slugify(f.slug || f.title.en || f.title.bn) || '…'}`} className="min-w-48 flex-1"><input className="field" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="ielts-writing-tips" /></Field>
      </div>
      <div className="inline-flex overflow-hidden rounded-full border border-line text-sm">
        {[['bn', 'বাংলা'], ['en', 'English']].map(([k, t]) => <button key={k} type="button" onClick={() => setLang(k)} className={`px-4 py-1.5 font-semibold ${lang === k ? 'bg-brand text-white' : 'bg-white'}`}>{t}</button>)}
      </div>
      <Field label={`Title (${lang})`}><input className="field" value={f.title[lang]} onChange={setL('title')} /></Field>
      <Field label={`Short summary for Google & cards (${lang})`} hint="about 150 characters"><textarea rows={2} className="field" value={f.excerpt[lang]} onChange={setL('excerpt')} /></Field>
      <Field label={`Article body (${lang})`} hint="## Heading · ### Sub-heading · - list · 1. numbered · **bold** · [text](/product/slug) · > quote · ![alt](image-url) · ---"><textarea rows={16} className="field font-mono text-sm" value={f.body[lang]} onChange={setL('body')} /></Field>
      <div>
        <p className="field-label">Cover image</p>
        <div className="w-60"><ImageUploader kind="blog" multiple={false} aspect="aspect-[16/9]" value={f.cover ? [f.cover] : []} onChange={(v) => setF({ ...f, cover: v[0] || '' })} /></div>
      </div>
      <Field label="Package promo level" hint="One combo-package box is shown on each article. Beginner shows low-priced combos; Advanced shows the higher-priced combos."><select className="field" value={f.level || ''} onChange={(e) => setF({ ...f, level: e.target.value })}><option value="">Both (default)</option><option value="beginner">Beginner</option><option value="advanced">Advanced</option></select></Field>
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

function NewsPanel() {
  const [feeds, setFeeds] = useState(null)
  const [last, setLast] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (LIVE) liveApi('admin/news', { admin: true }).then((j) => { setFeeds(j.feeds || []); setLast(j.last || 0) }).catch((e) => { toast(e.message); setFeeds([]) }); else setFeeds([]) }, [])
  const upd = (i, k, v) => setFeeds(feeds.map((x, n) => (n === i ? { ...x, [k]: v } : x)))
  const save = async () => { setBusy(true); try { const j = await liveApi('admin/news', { method: 'POST', admin: true, body: { feeds } }); setFeeds(j.feeds); toast('News sources saved') } catch (e) { toast(e.message) } finally { setBusy(false) } }
  const fetchNow = async () => { setBusy(true); try { await liveApi('admin/news', { method: 'POST', admin: true, body: { feeds } }); const j = await liveApi('admin/news/refresh', { method: 'POST', admin: true, body: {} }); toast(`${j.added} new item(s) added`) } catch (e) { toast(e.message) } finally { setBusy(false) } }
  if (feeds === null) return null
  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <div><h2 className="font-bold">Automatic news sources (RSS)</h2><p className="text-xs text-muted">New headlines are fetched about every 6 hours and shown under “Latest News” with a link to the publisher. {last ? `Last fetch: ${new Date(last).toLocaleString()}` : 'Not fetched yet.'}</p></div>
      {feeds.map((x, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input className="field w-40" value={x.name} onChange={(e) => upd(i, 'name', e.target.value)} placeholder="Name" />
          <input className="field min-w-56 flex-1" value={x.url} onChange={(e) => upd(i, 'url', e.target.value)} placeholder="https://…/feed" />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!x.enabled} onChange={(e) => upd(i, 'enabled', e.target.checked)} /> On</label>
          <button className="px-2 text-sm text-red-600" onClick={() => setFeeds(feeds.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline text-sm" onClick={() => setFeeds([...feeds, { name: '', url: '', enabled: true }])}>+ Add source</button>
        <button className="btn-brand text-sm" disabled={busy} onClick={save}>Save sources</button>
        <button className="btn-outline text-sm" disabled={busy} onClick={fetchNow}>{busy ? 'Working…' : 'Fetch news now'}</button>
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
      {LIVE && <NewsPanel />}
      {!LIVE && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Demo mode — posts can be created only on the live server.</p>}
      {posts === null ? <p className="text-muted">Loading…</p> : posts.length === 0 ? <Empty>No posts yet</Empty> : (
        <ul className="divide-y rounded-xl border border-line bg-white">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              {p.cover ? <Img folder="blog" src={p.cover} alt="" className="h-12 w-20 rounded object-cover" /> : <div className="h-12 w-20 rounded bg-green-50" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title.bn || p.title.en}</p>
                <p className="text-xs text-muted">{catOf(p.cat).bn} · /blog/{p.slug}</p>
              </div>
              {p.external && <Pill tone="gray">News</Pill>}
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
