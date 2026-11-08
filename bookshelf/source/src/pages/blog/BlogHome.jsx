import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Spinner } from '../../components/common/ui'
import { useSeo } from '../../lib/seo'
import { fetchPosts, useLang } from '../../lib/blog'
import { CATS, catOf } from '../../lib/blogCats'
import { CatBar, Masthead, LeadStory, CompactStory, StoryCard, SectionHead } from './parts'
import PackagePromo from '../../components/blog/BlogPromo'
import NotFound from '../NotFound'

export default function BlogHome() {
  const { cat } = useParams()
  const [sp] = useSearchParams()
  const [lang, setLang] = useLang()
  const [q, setQ] = useState(sp.get('q') || '')
  const [posts, setPosts] = useState(null)
  const valid = !cat || CATS.some((c) => c.slug === cat)
  const c = cat ? catOf(cat) : null

  useSeo({
    title: c ? `${c.bn} — IELTS Knowledge Centre` : 'IELTS Knowledge Centre — পূর্ণাঙ্গ নির্দেশিকা, বৃত্তি, বিশ্ববিদ্যালয় ও সাম্প্রতিক সংবাদ',
    description: c ? c.dBn : 'IELTS প্রস্তুতি, পরীক্ষা সম্পর্কিত তথ্য, বৃত্তি, বিশ্ববিদ্যালয়ে আবেদন, স্টুডেন্ট ভিসা ও আন্তর্জাতিক শিক্ষার সাম্প্রতিক সংবাদ — বাংলা ও ইংরেজিতে নির্ভরযোগ্য নির্দেশিকা।',
  })

  useEffect(() => {
    if (!valid) return
    let alive = true
    setPosts(null)
    const t = setTimeout(() => fetchPosts({ cat: cat || '', q }).then((p) => alive && setPosts(p)).catch(() => alive && setPosts([])), q ? 250 : 0)
    return () => { alive = false; clearTimeout(t) }
  }, [cat, q, valid])

  const home = useMemo(() => {
    if (!posts || cat || q) return null
    const own = posts.filter((p) => !p.external)
    const news = posts.filter((p) => p.external).slice(0, 4)
    const lead = own.find((p) => p.featured) || own[0]
    const side = own.filter((p) => p.id !== lead?.id).slice(0, 4)
    const used = new Set([lead?.id, ...side.map((p) => p.id)])
    const sections = CATS.filter((x) => x.slug !== 'news').map((x) => ({ cat: x, items: own.filter((p) => p.cat === x.slug && !used.has(p.id)).slice(0, 3) })).filter((x) => x.items.length)
    return { lead, side, news, sections }
  }, [posts, cat, q])

  if (!valid) return <NotFound />
  const title = c ? (lang === 'en' ? c.en : c.bn) : 'IELTS Knowledge Centre'
  const sub = c ? (lang === 'en' ? c.dEn : c.dBn) : lang === 'en' ? 'Comprehensive IELTS guidance, scholarship information, university admissions and the latest news in international education — in Bangla and English.' : 'আইইএলটিএস প্রস্তুতি, বৃত্তির তথ্য, বিশ্ববিদ্যালয়ে ভর্তি এবং আন্তর্জাতিক শিক্ষার সাম্প্রতিক সংবাদ সম্পর্কিত পূর্ণাঙ্গ নির্দেশিকা — বাংলা ও ইংরেজিতে।'

  return (
    <div className="container-x space-y-6 py-4 pb-14">
      <Masthead lang={lang} setLang={setLang} title={title} sub={sub} />
      <CatBar lang={lang} />
      <input value={q} onChange={(e) => setQ(e.target.value)} className="field" placeholder={lang === 'en' ? 'Search articles (e.g. scholarship, writing task 2)' : 'নিবন্ধ অনুসন্ধান করুন (যেমন: স্কলারশিপ, Writing Task 2)'} aria-label="Search" />

      {posts === null ? <Spinner className="py-16" /> : home ? (
        <>
          {home.lead && (
            <section className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2"><LeadStory post={home.lead} lang={lang} /></div>
              <div className="space-y-4 lg:border-l lg:border-line lg:pl-5">
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">{lang === 'en' ? 'Also in this edition' : 'এই সংখ্যায় আরও'}</p>
                {home.side.map((p) => <CompactStory key={p.id} post={p} lang={lang} />)}
              </div>
            </section>
          )}

          {home.news.length > 0 && (
            <section>
              <SectionHead title={lang === 'en' ? 'Latest News' : 'সাম্প্রতিক সংবাদ'} to="/blog/category/news" lang={lang} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{home.news.map((p) => <StoryCard key={p.id} post={p} lang={lang} />)}</div>
              <p className="mt-2 text-xs text-muted">{lang === 'en' ? 'Headlines are aggregated from the publishers named on each item; selecting one opens the original article.' : 'শিরোনামগুলো প্রতিটি আইটেমে উল্লিখিত প্রকাশকের কাছ থেকে সংগৃহীত; নির্বাচন করলে মূল নিবন্ধ খুলবে।'}</p>
            </section>
          )}

          {home.sections.slice(0, 3).map((s) => (
            <section key={s.cat.slug}>
              <SectionHead title={lang === 'en' ? s.cat.en : s.cat.bn} to={`/blog/category/${s.cat.slug}`} lang={lang} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{s.items.map((p) => <StoryCard key={p.id} post={p} lang={lang} />)}</div>
            </section>
          ))}

          <PackagePromo lang={lang} />

          {home.sections.slice(3).map((s) => (
            <section key={s.cat.slug}>
              <SectionHead title={lang === 'en' ? s.cat.en : s.cat.bn} to={`/blog/category/${s.cat.slug}`} lang={lang} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{s.items.map((p) => <StoryCard key={p.id} post={p} lang={lang} />)}</div>
            </section>
          ))}
        </>
      ) : posts.length === 0 ? (
        <p className="py-12 text-center text-muted">{cat === 'news' ? (lang === 'en' ? 'News will appear here shortly.' : 'সংবাদ শীঘ্রই এখানে প্রদর্শিত হবে।') : lang === 'en' ? 'No articles found.' : 'কোনো নিবন্ধ পাওয়া যায়নি।'}</p>
      ) : (
        <>
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <StoryCard key={p.id} post={p} lang={lang} />)}</div>
          {cat !== 'news' && <PackagePromo lang={lang} />}
        </>
      )}
      <p className="text-center text-xs text-muted"><Link to="/ielts-guide" className="text-brand hover:underline">{lang === 'en' ? 'Read the complete IELTS roadmap' : 'আইইএলটিএস পূর্ণাঙ্গ রোডম্যাপ পড়ুন'}</Link></p>
    </div>
  )
}
