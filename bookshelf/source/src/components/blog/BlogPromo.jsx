import { Link } from 'react-router-dom'
import Img from '../common/Img'
import { Price } from '../common/ui'
import { useDb } from '../../store/db'
import { productsBySlugs } from '../../services/catalogService'

/* One discreet placement per page: complete-preparation combo packages, split by level. */
const LEVELS = {
  beginner: {
    slugs: ['ielts-budget-friendly-17-books-combo', 'ielts-beginner-combo-package-26-books'],
    label: { bn: 'নবীন পরীক্ষার্থীদের জন্য', en: 'For beginners' },
    note: { bn: 'ব্যাকরণ, শব্দভান্ডার ও চার মডিউলের ভিত্তি গঠনে সাশ্রয়ী কম্বো।', en: 'Economical combos to build grammar, vocabulary and the four modules.' },
  },
  advanced: {
    slugs: ['ielts-special-combo-package-52-books', 'computer-based-ielts-55-combo'],
    label: { bn: 'উচ্চ স্কোরপ্রত্যাশীদের জন্য', en: 'For high-score candidates' },
    note: { bn: 'মক টেস্ট, সাম্প্রতিক প্রশ্ন ও পূর্ণাঙ্গ অনুশীলনসহ বিস্তৃত কম্বো।', en: 'Extensive combos with mock tests, recent questions and full practice.' },
  },
}

function Row({ p }) {
  return (
    <Link to={`/product/${p.slug}`} className="group flex items-center gap-3 rounded-md border border-line bg-white p-2.5 transition hover:border-brand hover:shadow-sm">
      <Img src={p.images?.[0]} alt={p.name} className="h-20 w-14 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-5 group-hover:text-brand">{p.name}</p>
        <div className="mt-1"><Price price={p.price} oldPrice={p.oldPrice} /></div>
      </div>
    </Link>
  )
}

export default function PackagePromo({ lang = 'bn', level = '' }) {
  useDb()
  const order = level === 'advanced' ? ['advanced', 'beginner'] : ['beginner', 'advanced']
  const cols = order.map((k) => ({ k, ...LEVELS[k], books: productsBySlugs(LEVELS[k].slugs) })).filter((c) => c.books.length)
  if (!cols.length) return null
  return (
    <aside className="bk-fade my-10 rounded-lg border border-line bg-surface p-4 sm:p-6" aria-label="Recommended preparation packages">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-accent">{lang === 'en' ? 'Recommended preparation' : 'প্রস্তাবিত প্রস্তুতি'}</p>
      <h2 className="mt-1 font-serif text-xl font-bold text-brand">{lang === 'en' ? 'Complete IELTS preparation packages' : 'আইইএলটিএস পূর্ণাঙ্গ প্রস্তুতির কম্বো প্যাকেজ'}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{lang === 'en' ? 'Reading from reliable books is the most dependable way to build a high band score. A combo covers every module in one order, at a lower combined price than buying titles separately.' : 'নির্ভরযোগ্য বই থেকে নিয়মিত অনুশীলনই উচ্চ ব্যান্ড স্কোরের সবচেয়ে নির্ভরযোগ্য পথ। কম্বো প্যাকেজে সব মডিউলের বই একসঙ্গে, আলাদাভাবে কেনার তুলনায় কম মূল্যে পাওয়া যায়।'}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {cols.map((c) => (
          <div key={c.k}>
            <p className="text-sm font-bold">{c.label[lang]}</p>
            <p className="mb-2 text-xs text-muted">{c.note[lang]}</p>
            <div className="space-y-2">{c.books.map((p) => <Row key={p.id} p={p} />)}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}
