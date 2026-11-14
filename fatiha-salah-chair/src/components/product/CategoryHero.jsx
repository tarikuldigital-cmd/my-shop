import Img from '../common/Img'
import Icon, { WhatsAppIcon } from '../common/Icon'

const TRUST = [['🚚', 'সারাদেশে হোম ডেলিভারি'], ['💵', 'ক্যাশ অন ডেলিভারি'], ['🔍', 'ডেলিভারিম্যানের সামনে চেক করে নিন'], ['📞', 'কল / WhatsApp সাপোর্ট']]

/** Campaign header for a category page (/category/:slug) — banner, headline, intro, trust points, contact. All set in Admin → Categories. */
export default function CategoryHero({ category, settings, count }) {
  const hasCopy = category.headline || category.intro
  if (!category.banner && !hasCopy) return null
  const wa = settings.phoneIntl?.replace('+', '')
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-line bg-white">
      {category.banner && <Img src={category.banner} alt={category.headline || category.name} className="w-full object-cover" folder="banner" />}
      {hasCopy && (
        <div className="fa-hero relative text-white">
          <div className="fa-pattern absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative p-5 sm:p-8">
            {category.kicker && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold sm:text-sm">{category.kicker}</p>}
            {category.headline && <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">{category.headline}</h1>}
            {category.intro && <p className="mt-3 max-w-3xl whitespace-pre-line leading-7 text-white/85">{category.intro}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#products" className="btn bg-gold px-5 py-2.5 text-brand-dark">{count ? `${count}টি পণ্য দেখুন` : 'পণ্য দেখুন'} ↓</a>
              {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`${category.name} সম্পর্কে জানতে চাই`)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] px-5 py-2.5 text-white"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>}
              {settings.phone && <a href={`tel:${settings.phone}`} className="btn border border-white/40 px-5 py-2.5 text-white hover:bg-white/10"><Icon name="phone" className="h-4 w-4" />{settings.phone}</a>}
            </div>
          </div>
        </div>
      )}
      {category.showTrust !== false && (
        <ul className="grid grid-cols-2 gap-px bg-line text-xs sm:grid-cols-4 sm:text-sm">
          {TRUST.map(([i, t]) => <li key={t} className="flex items-center gap-2 bg-white p-3"><span aria-hidden="true">{i}</span>{t}</li>)}
        </ul>
      )}
    </section>
  )
}
