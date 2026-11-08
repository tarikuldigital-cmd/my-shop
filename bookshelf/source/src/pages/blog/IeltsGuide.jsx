import { Link } from 'react-router-dom'
import { useSeo } from '../../lib/seo'
import { useLang, tr } from '../../lib/blog'
import { STAGES, topicSlugs } from '../../lib/blogCats'
import { CatBar, LangToggle } from './parts'
import { WhyBuyStrip, BookMarquee, StickyCta, EndPromo, usePromoBooks } from '../../components/blog/BlogPromo'

function Stage({ s, lang }) {
  const books = usePromoBooks({ slugs: topicSlugs(s.topics), limit: 6 })
  return (
    <section className="relative pl-12 sm:pl-16">
      <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg text-white sm:h-12 sm:w-12 sm:text-2xl" aria-hidden="true">{s.icon}</span>
      <p className="text-xs font-bold uppercase tracking-wide text-accent">{lang === 'en' ? `Step ${s.n}` : `ধাপ ${s.n}`} · {tr(s.when, lang)}</p>
      <h2 className="text-xl font-bold">{tr(s.title, lang)}</h2>
      <p className="mt-1 text-sm leading-7 text-ink/80">{tr(s.text, lang)}</p>
      {s.posts.length > 0 && <p className="mt-2 flex flex-wrap gap-2 text-xs">{s.posts.map((p) => <Link key={p} to={`/blog/${p}`} className="rounded-full bg-green-50 px-2.5 py-1 font-semibold text-brand hover:bg-green-100">📖 {p.replace(/-/g, ' ')}</Link>)}</p>}
      {books.length > 0 && <BookMarquee books={books} title={lang === 'en' ? 'Books for this step' : 'এই ধাপের বই'} />}
    </section>
  )
}

export default function IeltsGuide() {
  const [lang, setLang] = useLang()
  useSeo({
    title: 'IELTS A–Z গাইডলাইন: বিগিনার থেকে বিদেশ যাত্রা পর্যন্ত রোডম্যাপ',
    description: 'কীভাবে IELTS প্রস্তুতি শুরু করবেন, কোন বই কখন পড়বেন, কম্বো প্যাকেজের সুবিধা, রেজিস্ট্রেশন, ইউনিভার্সিটি আবেদন ও ভিসা — ধাপে ধাপে বাংলা গাইড।',
    jsonLd: { '@context': 'https://schema.org', '@type': 'HowTo', name: 'IELTS A–Z roadmap', step: STAGES.map((s) => ({ '@type': 'HowToStep', name: s.title.en, text: s.text.en })) },
  })
  const all = usePromoBooks({ slugs: topicSlugs(['combo']), limit: 8 })
  return (
    <div className="container-x space-y-5 py-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">🗺️ {lang === 'en' ? 'IELTS A–Z Roadmap' : 'IELTS A–Z গাইডলাইন'}</h1>
          <p className="mt-1 text-sm text-muted">{lang === 'en' ? 'From an absolute beginner to flying abroad — what to do, which book to read, and when.' : 'একদম বিগিনার থেকে বিদেশে যাওয়া পর্যন্ত — কী করবেন, কোন বই পড়বেন, কখন।'}</p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <CatBar lang={lang} />
      <WhyBuyStrip lang={lang} />
      <div className="space-y-8 border-l-2 border-dashed border-brand/30 pl-0 ml-4 sm:ml-6">
        {STAGES.map((s) => <Stage key={s.n} s={s} lang={lang} />)}
      </div>
      <section className="rounded-2xl bg-green-50 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-brand">🎁 {lang === 'en' ? 'Why a combo package?' : 'কম্বো প্যাকেজ কেন?'}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {(lang === 'en'
            ? ['Every module covered in one order: grammar, vocabulary, four skills, mock tests', 'Lower total price than buying each book separately', 'No guessing which book to pick — the set is built stage by stage', 'One delivery, cash on delivery across Bangladesh']
            : ['এক অর্ডারেই সব মডিউল: গ্রামার, ভোকাবুলারি, চার স্কিল ও মক টেস্ট', 'আলাদা আলাদা কেনার চেয়ে মোট দাম কম', 'কোন বই নেবেন সেই দ্বিধা নেই — সেটটি ধাপ ধরে সাজানো', 'একবারে ডেলিভারি, সারা দেশে ক্যাশ অন ডেলিভারি']
          ).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
      <EndPromo books={all} lang={lang} />
      <StickyCta books={all} lang={lang} />
    </div>
  )
}
