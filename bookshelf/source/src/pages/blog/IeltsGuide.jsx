import { Link } from 'react-router-dom'
import { useSeo } from '../../lib/seo'
import { useLang, tr } from '../../lib/blog'
import { STAGES } from '../../lib/blogCats'
import { postTitles } from '../../lib/blogTitles'
const postTitle = (slug, lang) => postTitles[slug]?.[lang] || slug.replace(/-/g, ' ')
import { CatBar, LangToggle } from './parts'
import PackagePromo from '../../components/blog/BlogPromo'

function Stage({ s, lang }) {
  return (
    <section className="relative pl-12 sm:pl-16">
      <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand font-serif text-base font-bold text-white sm:h-12 sm:w-12 sm:text-xl" aria-hidden="true">{s.n}</span>
      <p className="text-xs font-bold uppercase tracking-wide text-accent">{lang === 'en' ? `Stage ${s.n}` : `ধাপ ${s.n}`} · {tr(s.when, lang)}</p>
      <h2 className="font-serif text-xl font-bold">{tr(s.title, lang)}</h2>
      <p className="mt-1 text-[15px] leading-7 text-ink/85">{tr(s.text, lang)}</p>
      {s.posts.length > 0 && <p className="mt-2 flex flex-wrap gap-2 text-xs">{s.posts.map((p) => <Link key={p} to={`/blog/${p}`} className="rounded-full bg-green-50 px-2.5 py-1 font-semibold text-brand hover:bg-green-100"> {p.replace(/-/g, ' ')}</Link>)}</p>}
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
  return (
    <div className="container-x space-y-5 py-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand sm:text-3xl"> {lang === 'en' ? 'IELTS A–Z Roadmap' : 'IELTS A–Z গাইডলাইন'}</h1>
          <p className="mt-1 text-sm text-muted">{lang === 'en' ? 'A structured pathway from the first day of preparation to commencing study abroad: what to do, which study materials to use, and when.' : 'প্রস্তুতির প্রথম দিন থেকে বিদেশে উচ্চশিক্ষা শুরু পর্যন্ত একটি সুসংগঠিত পথনির্দেশ: কখন কী করণীয় এবং কোন পাঠ্যসামগ্রী অনুসরণ করবেন।'}</p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <CatBar lang={lang} />
      <div className="space-y-8 border-l-2 border-dashed border-brand/30 pl-0 ml-4 sm:ml-6">
        {STAGES.map((s) => <Stage key={s.n} s={s} lang={lang} />)}
      </div>
      <section className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-serif text-xl font-bold text-brand">{lang === 'en' ? 'Why choose a combo package?' : 'কম্বো প্যাকেজ কেন উপযোগী?'}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {(lang === 'en'
            ? ['Every module is covered in a single order: grammar, vocabulary, the four skills and mock tests', 'The combined price is lower than purchasing each title separately', 'The set is organised stage by stage, removing uncertainty about which title to choose', 'A single delivery, with cash on delivery available across Bangladesh']
            : ['এক অর্ডারেই সব মডিউল: ব্যাকরণ, শব্দভান্ডার, চারটি দক্ষতা ও মক টেস্ট', 'আলাদাভাবে কেনার তুলনায় মোট মূল্য কম', 'সেটটি ধাপ অনুযায়ী সাজানো, তাই কোন বই নেবেন সেই দ্বিধা থাকে না', 'একবারে ডেলিভারি; সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা']
          ).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
      <PackagePromo lang={lang} />
    </div>
  )
}
