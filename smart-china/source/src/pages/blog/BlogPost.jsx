import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import Img from '../../components/common/Img'
import { useSeo } from '../../lib/seo'
import { fetchPost, catOf, fmtDate, readMin } from '../../lib/blog'
import Md from '../../lib/md'
import { PostCard } from './BlogHome'
import NotFound from '../NotFound'

export default function BlogPost() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => { setData(null); setMissing(false); window.scrollTo(0, 0); fetchPost(slug).then(setData).catch(() => setMissing(true)) }, [slug])
  const post = data?.post
  useSeo({
    title: post?.title, description: post?.excerpt, image: post?.cover,
    jsonLd: post ? { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, datePublished: new Date(post.at).toISOString(), dateModified: new Date(post.updated || post.at).toISOString(), description: post.excerpt } : undefined,
  })
  if (missing) return <NotFound />
  if (!post) return <Spinner className="py-24" />
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted"><Link to="/" className="hover:text-brand">Home</Link> › <Link to="/blog" className="hover:text-brand">Blog</Link> › <Link to={`/blog/category/${post.cat}`} className="hover:text-brand">{catOf(post.cat).t}</Link></nav>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{post.title}</h1>
      <p className="mt-2 text-sm text-muted">{fmtDate(post.at)} · {readMin(post.body)} min read</p>
      {post.cover && <Img folder="blog" src={post.cover} alt={post.title} className="mt-5 w-full rounded-xl object-cover" />}
      <div className="mt-6"><Md text={post.body} /></div>
      {post.tags?.length > 0 && <p className="mt-6 flex flex-wrap gap-2 text-xs">{post.tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-2 py-1">#{t}</span>)}</p>}
      {data.related?.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="mb-3 text-lg font-bold">Related articles</h2>
          <div className="grid gap-4 sm:grid-cols-3">{data.related.map((p) => <PostCard key={p.id} p={p} />)}</div>
        </section>
      )}
    </article>
  )
}
