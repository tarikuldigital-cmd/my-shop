import { LIVE } from '../config/env'
import { liveApi } from './live'
import { S } from '../store/db'

/* Blog posts: live mode reads the API; demo mode reads S.posts (editable in the demo admin, saved in the browser). */
export const CATS = [
  { slug: 'news', t: 'News & updates' },
  { slug: 'guides', t: 'Buying guides' },
  { slug: 'tips', t: 'Tips & how-to' },
  { slug: 'offers', t: 'Offers & new arrivals' },
]
export const catOf = (slug) => CATS.find((c) => c.slug === slug) || { slug, t: slug || 'Blog' }
const strip = ({ body, ...rest }) => rest
const live = (p) => p.published !== false && (p.at || 0) <= Date.now() + 60000

export async function fetchPosts({ cat = '', q = '' } = {}) {
  if (LIVE) return (await liveApi(`posts?${new URLSearchParams({ ...(cat ? { cat } : {}), ...(q ? { q } : {}) })}`)).posts
  const t = q.trim().toLowerCase()
  return (S.posts || []).filter((p) => live(p) && (!cat || p.cat === cat) && (!t || JSON.stringify([p.title, p.excerpt, p.tags]).toLowerCase().includes(t))).sort((a, b) => b.at - a.at).map(strip)
}
export async function fetchPost(slug) {
  if (LIVE) return liveApi(`posts/${encodeURIComponent(slug)}`)
  const post = (S.posts || []).find((p) => p.slug === slug && live(p))
  if (!post) throw Object.assign(new Error('Not found'), { status: 404 })
  return { post, related: (S.posts || []).filter((p) => live(p) && p.cat === post.cat && p.id !== post.id).slice(0, 3).map(strip) }
}
export const readMin = (text) => Math.max(1, Math.round((text || '').trim().split(/\s+/).length / 200))
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
