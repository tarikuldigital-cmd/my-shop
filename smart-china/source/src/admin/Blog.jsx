import { useEffect, useState } from 'react'
import { Field, Modal, Pill, Empty, toast } from './ui'
import ImageUploader from './ImageUploader'
import Img from '../components/common/Img'
import { LIVE, storeUrl } from '../config/env'
import { liveApi } from '../lib/live'
import { CATS, catOf } from '../lib/blog'
import { slugify } from '../lib/landing'
import { S, save, useDb } from '../store/db'

const blank = () => ({ id: '', slug: '', cat: 'news', title: '', excerpt: '', body: '', cover: '', tags: [], published: true, featured: false, at: Date.now() })

function Editor({ post, onDone }) {
  const isNew = !post.id
  const [f, setF] = useState(() => ({ ...post, tagsText: (post.tags || []).join(', ') }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    if (!f.title.trim()) return toast('Title is required')
    const slug = slugify(f.slug || f.title).slice(0, 120) || 'post'
    const body = { ...f, slug, tags: f.tagsText.split(',').map((t) => t.trim()).filter(Boolean) }
    delete body.tagsText
    if (!LIVE) {
      S.posts ||= []
      if (S.posts.some((p) => p.slug === slug && p.id !== f.id)) return toast('This slug is already used')
      if (body.id) Object.assign(S.posts.find((p) => p.id === body.id), body, { updated: Date.now() })
      else S.posts.unshift({ ...body, id: `p${Date.now().toString(36)}`, at: Date.now() })
      save(); toast('Saved'); return onDone(true)
    }
    setBusy(true)
    try { await liveApi('admin/posts', { method: 'POST', admin: true, body }); toast('Saved'); onDone(true) } catch (e) { toast(e.message || 'Could not save') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Category" className="min-w-48 flex-1"><select className="field" value={f.cat} onChange={set('cat')}>{CATS.map((c) => <option key={c.slug} value={c.slug}>{c.t}</option>)}</select></Field>
        <Field label="URL slug (optional)" hint={`/blog/${slugify(f.slug || f.title) || '…'}`} className="min-w-48 flex-1"><input className="field" value={f.slug} onChange={set('slug')} placeholder="auto from the title" /></Field>
      </div>
      <Field label="Title"><input className="field" value={f.title} onChange={set('title')} /></Field>
      <Field label="Short summary for Google & cards" hint="about 150 characters"><textarea rows={2} className="field" value={f.excerpt} onChange={set('excerpt')} /></Field>
      <Field label="Article body" hint="## Heading · ### Sub-heading · - list · 1. numbered · **bold** · [text](/product/slug) · > quote · ![alt](image-url) · ---"><textarea rows={16} className="field font-mono text-sm" value={f.body} onChange={set('body')} /></Field>
      <div>
        <p className="field-label">Cover image</p>
        <div className="w-60"><ImageUploader kind="blog" multiple={false} aspect="aspect-[16/9]" value={f.cover ? [f.cover] : []} onChange={(v) => setF({ ...f, cover: v[0] || '' })} /></div>
      </div>
      <Field label="Tags (comma separated)"><input className="field" value={f.tagsText} onChange={set('tagsText')} placeholder="smart watch, winter, gift" /></Field>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured on blog home</label>
      </div>
      <div className="flex gap-2 border-t border-line pt-3">
        <button className="btn-brand" disabled={busy} onClick={submit}>{busy ? 'Saving…' : isNew ? 'Publish post' : 'Save changes'}</button>
        <button className="btn-outline" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  )
}

export default function Blog() {
  useDb()
  const [livePosts, setLivePosts] = useState(null)
  const [edit, setEdit] = useState(null)
  const load = () => (LIVE ? liveApi('admin/posts', { admin: true }).then((j) => setLivePosts(j.posts)).catch((e) => { toast(e.message); setLivePosts([]) }) : null)
  useEffect(() => { load() }, [])
  const posts = LIVE ? livePosts : [...(S.posts || [])].sort((a, b) => b.at - a.at)
  const open = async (p) => {
    if (!LIVE) return setEdit(p)
    try { setEdit((await liveApi(`posts/${encodeURIComponent(p.slug)}`, { admin: true })).post) } catch (e) { toast(e.message) }
  }
  const del = async (p) => {
    if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) return
    if (!LIVE) { S.posts = S.posts.filter((x) => x.id !== p.id); save(); return toast('Deleted') }
    try { await liveApi(`admin/posts/${p.id}`, { method: 'DELETE', admin: true }); toast('Deleted'); load() } catch (e) { toast(e.message) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-bold">Blog</h1><p className="text-sm text-muted">Write articles and buying guides. They appear at /blog and in the sitemap for Google.</p></div>
        <button className="btn-accent" onClick={() => setEdit(blank())}>+ New post</button>
      </div>
      {posts === null ? <p className="text-muted">Loading…</p> : posts.length === 0 ? <Empty>No posts yet</Empty> : (
        <ul className="divide-y rounded-xl border border-line bg-white">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              {p.cover ? <Img folder="blog" src={p.cover} alt="" className="h-12 w-20 rounded object-cover" /> : <div className="h-12 w-20 rounded bg-green-50" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title}</p>
                <p className="text-xs text-muted">{catOf(p.cat).t} · /blog/{p.slug}</p>
              </div>
              {p.featured && <Pill tone="amber">Featured</Pill>}
              <Pill tone={p.published ? 'green' : 'gray'}>{p.published ? 'Live' : 'Draft'}</Pill>
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
