import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import Img from '../../components/common/Img'
import { useSeo } from '../../lib/seo'
import { fetchPost, fetchPosts, useLang, tr, fmtDate, readMin, coverOf, coverUrl } from '../../lib/blog'
import { catOf, CATS } from '../../lib/blogCats'
import Md, { headings, slugH } from '../../lib/md'
import { CatBar, LangToggle, CompactStory, StoryCard, SectionHead } from './parts'
import PackagePromo from '../../components/blog/BlogPromo'
import NotFound from '../NotFound'

export default function BlogPost() {
  const { slug } = useParams()
  const [lang, setLang] = useLang()
  const [data, setData] = useState(null)
  const [latest, setLatest] = useState([])
  const [missing, setMissing] = useState(false)
  useEffect(() => { setData(null); setMissing(false); window.scrollTo(0, 0); fetchPost(slug).then(setData).catch(() => setMissing(true)) }, [slug])
  useEffect(() => { fetchPosts().then((l) => setLatest(l.filter((p) => !p.external))).catch(() => {}) }, [])

  const post = data?.post
  const c = catOf(post?.cat)
  const body = post ? tr(post.body, lang) : ''
  const toc = useMemo(() => headings(body), [body])
  const url = `${location.origin}/blog/${slug}`

  useSeo(post ? {
    title: tr(post.title, lang),
    description: tr(post.excerpt, lang),
    image: coverUrl(post),
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Article', headline: tr(post.title, lang), description: tr(post.excerpt, lang),
      image: coverUrl(post), datePublished: post.at ? new Date(post.at).toISOString() : undefined, dateModified: post.updated ? new Date(post.updated).toISOString() : undefined,
      inLanguage: lang, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Bookshelf BD' }, publisher: { '@type': 'Organization', name: 'Bookshelf BD' },
    },
  } : { noindex: true })

  if (missing) return <NotFound />
  if (!post) return <div className="container-x py-16"><Spinner /></div>
  const more = latest.filter((p) => p.id !== post.id).slice(0, 5)

  return (
    <div className="container-x space-y-5 py-4 pb-14">
      <CatBar lang={lang} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <nav aria-label="breadcrumb" className="text-muted"><Link to="/" className="hover:text-brand">{lang === 'en' ? 'Home' : 'হোম'}</Link> › <Link to="/blog" className="hover:text-brand">IELTS Knowledge Centre</Link> › <Link to={`/blog/category/${c.slug}`} className="hover:text-brand">{lang === 'en' ? c.en : c.bn}</Link></nav>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <header>
            <Link to={`/blog/category/${c.slug}`} className="text-xs font-semibold uppercase tracking-[.16em] text-accent">{lang === 'en' ? c.en : c.bn}</Link>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-[2.6rem] sm:leading-[1.2]">{tr(post.title, lang)}</h1>
            <p className="mt-3 border-l-2 border-accent pl-4 font-serif text-lg leading-8 text-ink/80">{tr(post.excerpt, lang)}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-2.5 text-sm text-muted">
              <span className="font-semibold text-ink">Bookshelf BD {lang === 'en' ? 'Editorial' : 'সম্পাদকীয়'}</span>
              <span>{post.at ? fmtDate(post.at, lang) : ''}</span>
              <span>{readMin(body)} {lang === 'en' ? 'min read' : 'মিনিটের পাঠ'}</span>
              {post.source && post.source !== 'Bookshelf BD' && <span>{lang === 'en' ? 'Source' : 'সূত্র'}: {post.source}</span>}
            </p>
          </header>
          <figure className="my-5 overflow-hidden rounded-lg bg-surface">
            <Img folder="blog" src={coverOf(post)} alt={tr(post.title, lang)} className="aspect-[16/9] w-full object-cover" />
          </figure>
          <div className="mx-auto max-w-[44rem]">
            {toc.length > 2 && (
              <nav aria-label="Contents" className="mb-6 rounded-md border border-line bg-surface p-4 text-sm">
                <p className="font-serif font-bold">{lang === 'en' ? 'Contents' : 'সূচিপত্র'}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">{toc.map((t) => <li key={t}><a href={`#${slugH(t)}`} className="text-brand hover:underline">{t}</a></li>)}</ol>
              </nav>
            )}
            <Md text={body} />
            {post.tags?.length > 0 && <p className="mt-6 flex flex-wrap gap-2 text-xs">{post.tags.map((t) => <Link key={t} to={`/blog?q=${encodeURIComponent(t)}`} className="rounded border border-line px-2 py-0.5 text-muted hover:border-brand hover:text-brand">{t}</Link>)}</p>}
            <p className="mt-6 border-t border-line pt-3 text-xs leading-5 text-muted">{lang === 'en' ? 'This article provides general guidance only. Fees, score requirements, dates and regulations change; please verify all details on the official website of the examination body, university or embassy.' : 'এই নিবন্ধ কেবল সাধারণ দিকনির্দেশনা প্রদান করে। ফি, স্কোর, সময়সীমা ও বিধিমালা পরিবর্তনশীল; তাই পরীক্ষা পরিচালনাকারী সংস্থা, বিশ্ববিদ্যালয় বা দূতাবাসের অফিসিয়াল ওয়েবসাইটে সব তথ্য যাচাই করে নিন।'}</p>
          </div>
          <PackagePromo lang={lang} level={post.level} />
          {data.related?.length > 0 && (
            <section className="mt-8">
              <SectionHead title={lang === 'en' ? 'Related articles' : 'সম্পর্কিত নিবন্ধ'} lang={lang} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.related.map((p) => <StoryCard key={p.id} post={p} lang={lang} />)}</div>
            </section>
          )}
        </article>
        <aside className="space-y-6 lg:sticky lg:top-14 lg:self-start">
          <div>
            <SectionHead title={lang === 'en' ? 'Latest articles' : 'সর্বশেষ নিবন্ধ'} lang={lang} />
            <div className="space-y-4">{more.map((p) => <CompactStory key={p.id} post={p} lang={lang} />)}</div>
          </div>
          <div className="rounded-md border border-line bg-surface p-4">
            <p className="font-serif font-bold">{lang === 'en' ? 'Browse by topic' : 'বিষয় অনুযায়ী দেখুন'}</p>
            <ul className="mt-2 space-y-1.5 text-sm">{CATS.map((x) => <li key={x.slug}><Link to={`/blog/category/${x.slug}`} className="text-brand hover:underline">{lang === 'en' ? x.en : x.bn}</Link></li>)}</ul>
            <Link to="/ielts-guide" className="mt-3 block text-sm font-semibold text-accent hover:underline">{lang === 'en' ? 'The complete IELTS roadmap →' : 'আইইএলটিএস পূর্ণাঙ্গ রোডম্যাপ →'}</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
