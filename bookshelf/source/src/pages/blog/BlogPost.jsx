import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import Img from '../../components/common/Img'
import { useSeo } from '../../lib/seo'
import { fetchPost, useLang, tr, fmtDate, readMin } from '../../lib/blog'
import { catOf, topicSlugs } from '../../lib/blogCats'
import Md, { headings, slugH } from '../../lib/md'
import { CatBar, LangToggle, PostCard } from './parts'
import { WhyBuyStrip, BookMarquee, StickyCta, EndPromo, usePromoBooks } from '../../components/blog/BlogPromo'
import { assetUrl } from '../../config/env'
import NotFound from '../NotFound'

export default function BlogPost() {
  const { slug } = useParams()
  const [lang, setLang] = useLang()
  const [data, setData] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => { setData(null); setMissing(false); window.scrollTo(0, 0); fetchPost(slug).then(setData).catch(() => setMissing(true)) }, [slug])

  const post = data?.post
  const c = catOf(post?.cat)
  const body = post ? tr(post.body, lang) : ''
  const books = usePromoBooks({ slugs: post?.books || [], cat: post?.cat, limit: 8 })
  const toc = useMemo(() => headings(body), [body])
  const url = `${location.origin}/blog/${slug}`

  useSeo(post ? {
    title: tr(post.title, lang),
    description: tr(post.excerpt, lang),
    image: post.cover,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Article', headline: tr(post.title, lang), description: tr(post.excerpt, lang),
      image: post.cover ? assetUrl(post.cover.includes('/') ? post.cover : `blog/${post.cover}`) : undefined,
      datePublished: post.at ? new Date(post.at).toISOString() : undefined, dateModified: post.updated ? new Date(post.updated).toISOString() : undefined,
      inLanguage: lang, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Bookshelf BD' },
      publisher: { '@type': 'Organization', name: 'Bookshelf BD' },
    },
  } : { noindex: true })

  if (missing) return <NotFound />
  if (!post) return <div className="container-x py-16"><Spinner /></div>

  // {{books:topic}} / {{combo}} slots inside the article become auto-scrolling book strips
  const slot = (b) => {
    const sl = b.kind === 'combo' ? topicSlugs(['combo']) : topicSlugs(b.topics.length ? b.topics : [])
    return <InlineBooks slugs={sl.length ? sl : post.books || []} cat={post.cat} lang={lang} combo={b.kind === 'combo'} />
  }

  return (
    <div className="container-x space-y-5 py-4 pb-24">
      <CatBar lang={lang} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <nav aria-label="breadcrumb" className="text-muted"><Link to="/" className="hover:text-brand">{lang === 'en' ? 'Home' : 'হোম'}</Link> › <Link to="/blog" className="hover:text-brand">{lang === 'en' ? 'Knowledge Centre' : 'জ্ঞানকেন্দ্র'}</Link> › <Link to={`/blog/category/${c.slug}`} className="hover:text-brand">{lang === 'en' ? c.en : c.bn}</Link></nav>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <h1 className="font-serif text-2xl font-bold leading-snug sm:text-3xl">{tr(post.title, lang)}</h1>
          <p className="mt-2 text-sm text-muted">{post.at ? fmtDate(post.at, lang) : ''} · {readMin(body)} {lang === 'en' ? 'min read' : 'মিনিটের পাঠ'}{post.source ? ` · ${lang === 'en' ? 'Source' : 'সূত্র'}: ${post.source}` : ''}</p>
          {post.cover && <Img folder="blog" src={post.cover} alt={tr(post.title, lang)} className="my-4 w-full rounded-xl object-cover" />}
          <div className="my-4"><WhyBuyStrip lang={lang} /></div>
          {toc.length > 2 && (
            <details open className="my-4 rounded-lg border border-line bg-surface p-3 text-sm">
              <summary className="cursor-pointer font-bold">{lang === 'en' ? 'Contents' : 'সূচিপত্র'}</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">{toc.map((t) => <li key={t}><a href={`#${slugH(t)}`} className="text-brand hover:underline">{t}</a></li>)}</ol>
            </details>
          )}
          <Md text={body} renderSlot={slot} />
          {!/\{\{/.test(body) && <BookMarquee books={books} title={lang === 'en' ? 'Recommended reading for this topic' : 'এই বিষয়ে প্রস্তাবিত বই'} />}
          {post.tags?.length > 0 && <p className="mt-4 flex flex-wrap gap-1.5">{post.tags.map((t) => <Link key={t} to={`/blog?q=${encodeURIComponent(t)}`} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-muted">#{t}</Link>)}</p>}
          <p className="mt-6 rounded-md border border-line bg-surface p-3 text-xs leading-5 text-muted">{lang === 'en' ? 'This article provides general guidance only. Fees, score requirements, dates and regulations change; please verify all details on the official website of the examination body, university or embassy.' : 'এই নিবন্ধ কেবল সাধারণ দিকনির্দেশনা প্রদান করে। ফি, স্কোর, সময়সীমা ও বিধিমালা পরিবর্তনশীল; তাই পরীক্ষা পরিচালনাকারী সংস্থা, বিশ্ববিদ্যালয় বা দূতাবাসের অফিসিয়াল ওয়েবসাইটে সব তথ্য যাচাই করে নিন।'}</p>
          <EndPromo books={books} lang={lang} />
        </article>
        <aside className="space-y-4 lg:sticky lg:top-16 lg:self-start">
          <Link to="/ielts-guide" className="card block p-4 transition hover:border-brand hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-accent">{lang === 'en' ? 'Roadmap' : 'রোডম্যাপ'}</p>
            <p className="mt-1 font-serif font-bold text-brand">{lang === 'en' ? 'The Complete IELTS Roadmap' : 'আইইএলটিএস পূর্ণাঙ্গ রোডম্যাপ'}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{lang === 'en' ? 'From first-day preparation to commencing study abroad, stage by stage.' : 'প্রস্তুতির সূচনা থেকে বিদেশে উচ্চশিক্ষা শুরু পর্যন্ত ধাপভিত্তিক নির্দেশিকা।'}</p>
          </Link>
          {data.related?.length > 0 && <div><p className="mb-2 font-bold">{lang === 'en' ? 'Related articles' : 'সম্পর্কিত নিবন্ধ'}</p><div className="space-y-3">{data.related.map((p) => <PostCard key={p.id} post={p} lang={lang} />)}</div></div>}
        </aside>
      </div>
      <StickyCta books={books} lang={lang} />
    </div>
  )
}

function InlineBooks({ slugs, cat, lang, combo }) {
  const books = usePromoBooks({ slugs, cat, limit: 8 })
  return <BookMarquee books={books} title={combo ? (lang === 'en' ? 'Combo packages' : 'কম্বো প্যাকেজ') : (lang === 'en' ? 'Recommended books' : 'প্রস্তাবিত বই')} />
}
