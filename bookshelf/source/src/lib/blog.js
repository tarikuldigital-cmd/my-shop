import { useEffect, useState } from 'react'
import { LIVE } from '../config/env'
import { liveApi } from './live'

/* Posts come from the API in live mode; the demo (GitHub Pages) build shows the bundled starter articles. */
const demoPosts = async () => (await import('../../api/seed/posts.json')).default.posts.map((p) => ({ ...p, at: p.at || 1793491200000 })).sort((a, b) => b.at - a.at)
const strip = ({ body, ...rest }) => rest

export async function fetchPosts({ cat = '', q = '' } = {}) {
  if (LIVE) {
    const j = await liveApi(`posts?${new URLSearchParams({ ...(cat ? { cat } : {}), ...(q ? { q } : {}) })}`)
    return j.posts
  }
  const t = q.trim().toLowerCase()
  return (await demoPosts()).filter((p) => (!cat || p.cat === cat) && (!t || JSON.stringify([p.title, p.excerpt, p.tags]).toLowerCase().includes(t))).map(strip)
}
export async function fetchPost(slug) {
  if (LIVE) return liveApi(`posts/${encodeURIComponent(slug)}`)
  const all = await demoPosts()
  const post = all.find((p) => p.slug === slug)
  if (!post) throw Object.assign(new Error('Not found'), { status: 404 })
  return { post, related: all.filter((p) => p.cat === post.cat && p.id !== post.id).slice(0, 3).map(strip) }
}

/* ---- language (Bangla / English) ---- */
const LANG_KEY = 'bookshelf_blog_lang'
const listeners = new Set()
const initial = () => {
  try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'bn') return q; return localStorage.getItem(LANG_KEY) || 'bn' } catch { return 'bn' }
}
let current = initial()
export function setLang(l) { current = l; try { localStorage.setItem(LANG_KEY, l) } catch { /* private mode */ } listeners.forEach((f) => f(l)) }
export function useLang() {
  const [l, set] = useState(current)
  useEffect(() => { listeners.add(set); return () => listeners.delete(set) }, [])
  return [l, setLang]
}
/** Text in the chosen language, falling back to the other one when it is empty. */
export const tr = (v, lang) => (v && typeof v === 'object' ? (v[lang]?.trim() ? v[lang] : v.bn || v.en || '') : v || '')
export const readMin = (text) => Math.max(1, Math.round((text || '').trim().split(/\s+/).length / 180))
export const fmtDate = (ms, lang) => new Date(ms).toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
