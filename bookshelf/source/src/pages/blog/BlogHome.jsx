import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import { useSeo } from '../../lib/seo'
import { fetchPosts, useLang } from '../../lib/blog'
import { CATS, catOf } from '../../lib/blogCats'
import { CatBar, LangToggle, PostCard } from './parts'
import { WhyBuyStrip, BookMarquee, StickyCta, usePromoBooks } from '../../components/blog/BlogPromo'
import NotFound from '../NotFound'

export default function BlogHome() {
  const { cat } = useParams()
  const [lang, setLang] = useLang()
  const [q, setQ] = useState('')
  const [posts, setPosts] = useState(null)
  const valid = !cat || CATS.some((c) => c.slug === cat)
  const c = cat ? catOf(cat) : null
  const books = usePromoBooks({ cat: cat || 'guide', limit: 10 })

  useSeo({
    title: c ? `${c.bn} — IELTS ব্লগ` : 'IELTS ব্লগ — A–Z গাইডলাইন, স্কলারশিপ, ইউনিভার্সিটি ও বই সাজেশন',
    description: c ? c.dBn : 'IELTS প্রস্তুতি, পরীক্ষার তথ্য, স্কলারশিপ, বিশ্ববিদ্যালয় আবেদন ও স্টুডেন্ট ভিসা নিয়ে বাংলা ও ইংরেজিতে সহজ গাইড — Bookshelf BD।',
  })

  useEffect(() => {
    if (!valid) return
    let alive = true
    setPosts(null)
    const t = setTimeout(() => fetchPosts({ cat: cat || '', q }).then((p) => alive && setPosts(p)).catch(() => alive && setPosts([])), q ? 250 : 0)
    return () => { alive = false; clearTimeout(t) }
  }, [cat, q, valid])

  if (!valid) return <NotFound />
  const featured = !cat && !q ? posts?.find((p) => p.featured) : null
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts

  return (
    <div className="container-x space-y-5 py-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">{c ? `${c.icon} ${lang === 'en' ? c.en : c.bn}` : lang === 'en' ? 'IELTS Helpful Blog' : 'IELTS হেল্পফুল ব্লগ'}</h1>
          <p className="mt-1 text-sm text-muted">{c ? (lang === 'en' ? c.dEn : c.dBn) : lang === 'en' ? 'A–Z IELTS guidance, scholarships, universities and book suggestions — in Bangla and English.' : 'IELTS-এর A–Z গাইডলাইন, স্কলারশিপ, ইউনিভার্সিটি ও বই সাজেশন — বাংলা ও ইংরেজিতে।'}</p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <CatBar lang={lang} />
      <WhyBuyStrip lang={lang} />
      <input value={q} onChange={(e) => setQ(e.target.value)} className="field" placeholder={lang === 'en' ? 'Search the blog… (e.g. scholarship, writing task 2)' : 'ব্লগে খুঁজুন… (যেমন: স্কলারশিপ, রাইটিং টাস্ক ২)'} aria-label="Search" />

      {!cat && !q && (
        <Link to="/ielts-guide" className="bk-shine block rounded-xl p-[2px]">
          <span className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3">
            <span className="text-3xl bk-float" aria-hidden="true">🗺️</span>
            <span><b className="block">{lang === 'en' ? 'New here? Start with the A–Z IELTS roadmap' : 'নতুন? শুরু করুন A–Z IELTS রোডম্যাপ দিয়ে'}</b><span className="text-sm text-muted">{lang === 'en' ? 'From your first day of preparation to landing abroad — with the right book for every step.' : 'প্রস্তুতির প্রথম দিন থেকে বিদেশে পৌঁছানো পর্যন্ত — প্রতিটি ধাপে কোন বই পড়বেন।'}</span></span>
          </span>
        </Link>
      )}

      {posts === null ? <Spinner className="py-16" /> : (
        <>
          {featured && <PostCard post={featured} lang={lang} big />}
          {rest.length === 0 && !featured ? <p className="py-10 text-center text-muted">{lang === 'en' ? 'No posts yet.' : 'এখনো কোনো পোস্ট নেই।'}</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <PostCard key={p.id} post={p} lang={lang} />
              ))}
            </div>
          )}
        </>
      )}
      <BookMarquee books={books} title={lang === 'en' ? '📚 Books our students use for IELTS' : '📚 IELTS প্রস্তুতিতে আমাদের শিক্ষার্থীদের পছন্দের বই'} />
      <StickyCta books={books} lang={lang} />
    </div>
  )
}
