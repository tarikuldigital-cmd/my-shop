import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import Img from '../../components/common/Img'
import { useSeo } from '../../lib/seo'
import { fetchPosts, CATS, catOf, fmtDate } from '../../lib/blog'

export function PostCard({ p }) {
  return (
    <Link to={`/blog/${p.slug}`} className="group overflow-hidden rounded-xl border border-line bg-white transition hover:shadow-md">
      {p.cover ? <Img folder="blog" src={p.cover} alt={p.title} className="aspect-[16/9] w-full object-cover" /> : <div className="aspect-[16/9] w-full bg-green-50" />}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{catOf(p.cat).t}</p>
        <h3 className="mt-1 font-bold leading-snug group-hover:text-brand">{p.title}</h3>
        {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>}
        <p className="mt-2 text-xs text-muted">{fmtDate(p.at)}</p>
      </div>
    </Link>
  )
}

export default function BlogHome() {
  const { cat = '' } = useParams()
  const [posts, setPosts] = useState(null)
  const [q, setQ] = useState('')
  const c = cat ? catOf(cat) : null
  useSeo({ title: c ? `${c.t} — Blog` : 'Blog', description: 'Buying guides, tips and news from Smart China Gallery.' })
  useEffect(() => { setPosts(null); fetchPosts({ cat, q }).then(setPosts).catch(() => setPosts([])) }, [cat, q])
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">{c ? c.t : 'Blog'}</h1>
        <p className="text-sm text-muted">Buying guides, tips and news from Smart China Gallery.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/blog" className={`rounded-full border px-3 py-1 text-sm ${!cat ? 'bg-brand text-white' : 'bg-white'}`}>All</Link>
        {CATS.map((x) => <Link key={x.slug} to={`/blog/category/${x.slug}`} className={`rounded-full border px-3 py-1 text-sm ${cat === x.slug ? 'bg-brand text-white' : 'bg-white'}`}>{x.t}</Link>)}
        <input className="field ml-auto w-56" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {posts === null ? <Spinner /> : posts.length === 0 ? <p className="py-16 text-center text-muted">No articles yet.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
      )}
    </div>
  )
}
