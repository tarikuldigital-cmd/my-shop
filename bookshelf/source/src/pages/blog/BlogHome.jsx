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
    title: c ? `${c.bn} — IELTS জ্ঞানকেন্দ্র` : 'IELTS জ্ঞানকেন্দ্র — পূর্ণাঙ্গ নির্দেশিকা, বৃত্তি, বিশ্ববিদ্যালয় ও প্রস্তাবিত বই',
    description: c ? c.dBn : 'IELTS প্রস্তুতি, পরীক্ষা সম্পর্কিত তথ্য, বৃত্তি, বিশ্ববিদ্যালয়ে আবেদন ও স্টুডেন্ট ভিসা বিষয়ে বাংলা ও ইংরেজিতে নির্ভরযোগ্য নির্দেশিকা — Bookshelf BD।',
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
          <h1 className="text-2xl font-serif font-bold text-brand sm:text-3xl">{c ? (lang === 'en' ? c.en : c.bn) : lang === 'en' ? 'IELTS Knowledge Centre' : 'IELTS জ্ঞানকেন্দ্র'}</h1>
          <p className="mt-1 text-sm text-muted">{c ? (lang === 'en' ? c.dEn : c.dBn) : lang === 'en' ? 'Comprehensive IELTS guidance, scholarship information, university admissions and recommended study materials, in Bangla and English.' : 'আইইএলটিএস প্রস্তুতি, বৃত্তির তথ্য, বিশ্ববিদ্যালয়ে ভর্তি এবং প্রস্তাবিত পাঠ্যসামগ্রী সম্পর্কিত পূর্ণাঙ্গ নির্দেশিকা — বাংলা ও ইংরেজিতে।'}</p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <CatBar lang={lang} />
      <WhyBuyStrip lang={lang} />
      <input value={q} onChange={(e) => setQ(e.target.value)} className="field" placeholder={lang === 'en' ? 'Search articles (e.g. scholarship, writing task 2)' : 'নিবন্ধ অনুসন্ধান করুন (যেমন: স্কলারশিপ, Writing Task 2)'} aria-label="Search" />

      {!cat && !q && (
        <Link to="/ielts-guide" className="block rounded-lg border border-line bg-white p-4 transition hover:border-brand hover:shadow-md sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-accent">{lang === 'en' ? 'Start here' : 'এখান থেকে শুরু করুন'}</p>
          <p className="mt-1 font-serif text-lg font-bold text-brand">{lang === 'en' ? 'The Complete IELTS Roadmap' : 'আইইএলটিএস পূর্ণাঙ্গ রোডম্যাপ'}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{lang === 'en' ? 'A structured pathway from the first day of preparation to commencing study abroad, with recommended study materials at every stage.' : 'প্রস্তুতির প্রথম দিন থেকে বিদেশে উচ্চশিক্ষা শুরু পর্যন্ত একটি সুসংগঠিত পথনির্দেশ, প্রতিটি ধাপের উপযোগী পাঠ্যসামগ্রীসহ।'}</p>
        </Link>
      )}

      {posts === null ? <Spinner className="py-16" /> : (
        <>
          {featured && <PostCard post={featured} lang={lang} big />}
          {rest.length === 0 && !featured ? <p className="py-10 text-center text-muted">{lang === 'en' ? 'No articles have been published yet.' : 'এখনো কোনো নিবন্ধ প্রকাশিত হয়নি।'}</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <PostCard key={p.id} post={p} lang={lang} />
              ))}
            </div>
          )}
        </>
      )}
      <BookMarquee books={books} title={lang === 'en' ? 'Study materials for IELTS preparation' : 'আইইএলটিএস প্রস্তুতির জন্য প্রস্তাবিত পাঠ্যসামগ্রী'} />
      <StickyCta books={books} lang={lang} />
    </div>
  )
}
