import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BannerSlider from '../components/common/BannerSlider'
import Img from '../components/common/Img'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { Spinner } from '../components/common/ui'
import { ProductSection, ProductRow } from '../components/product/ProductGrid'
import useAsync from '../hooks/useAsync'
import { getHome, productsBySlugs } from '../services/catalogService'
import { useSite } from '../context/SiteContext'
import { useSeo } from '../lib/seo'
import { getRecent } from '../lib/recent'
import { S, inStock } from '../store/db'
import { formatPrice } from '../utils/format'

const BASE = import.meta.env.BASE_URL

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const left = Math.max(0, endsAt - now)
  if (!left) return null
  const parts = [[Math.floor(left / 864e5), 'দিন'], [Math.floor(left / 36e5) % 24, 'ঘণ্টা'], [Math.floor(left / 6e4) % 60, 'মিনিট'], [Math.floor(left / 1e3) % 60, 'সেকেন্ড']]
  return (
    <div className="flex items-center gap-1.5" aria-label="Offer ends in">
      <span className="hidden text-xs text-muted sm:inline">শেষ হবে</span>
      {parts.map(([v, l]) => <span key={l} className="flex min-w-11 flex-col items-center rounded bg-sale px-1.5 py-0.5 text-white"><b className="text-sm leading-tight tabular-nums">{String(v).padStart(2, '0')}</b><span className="text-[9px] leading-tight">{l}</span></span>)}
    </div>
  )
}

const TRUST = [['🚚', 'সারাদেশে হোম ডেলিভারি', 'অর্ডারের ২-৩ দিনের মধ্যে'], ['💵', 'ক্যাশ অন ডেলিভারি', 'পণ্য হাতে পেয়ে টাকা দিন'], ['🔍', 'চেক করে নিন', 'ডেলিভারিম্যানের সামনে'], ['📞', 'সরাসরি সাপোর্ট', 'কল / WhatsApp']]

const FEATURES = [
  ['🪑', 'ভাঁজ করা যায়', 'ব্যবহার শেষে ভাঁজ করে রাখুন, সহজে বহনযোগ্য — মসজিদ বা আত্মীয়ের বাসায়ও নিয়ে যেতে পারবেন।'],
  ['🛋️', 'নরম ও আরামদায়ক কুশন', 'বসার জায়গা, পিঠ ও হাতলে নরম কুশন — দীর্ঘক্ষণ বসে ইবাদতেও আরাম।'],
  ['🛡️', 'মজবুত মেটাল ফ্রেম', 'সোনালি রঙের শক্ত পাইপের ফ্রেম, দীর্ঘস্থায়ী ব্যবহারের জন্য তৈরি।'],
  ['📖', 'সামনে রেহাল/ডেস্ক', 'কুরআন শরীফ বা দোয়ার বই রেখে আরামে তিলাওয়াত করুন।'],
  ['👜', 'সাইড পকেট', 'তাসবিহ, চশমা, টুপি — ছোট জিনিস সবসময় হাতের কাছে।'],
  ['🕌', 'নামাজের জন্য পারফেক্ট ডিজাইন', 'মেহরাব নকশার প্রিমিয়াম কাপড় — ঘরের সৌন্দর্যও বাড়ায়।'],
]

const FAQ = [
  ['সালাহ চেয়ারের দাম কত?', 'প্রতিটি ডিজাইনের দাম প্রোডাক্ট পেজে দেওয়া আছে। ডেলিভারি চার্জ ঢাকার ভিতরে ৳২৫০, ঢাকার বাইরে ৳৩০০।'],
  ['কিভাবে অর্ডার করব?', 'পছন্দের কালারে "অর্ডার করুন" চাপুন, নাম-মোবাইল-ঠিকানা দিন। আমাদের প্রতিনিধি কল করে কনফার্ম করবেন। চাইলে সরাসরি কল বা WhatsApp-এও অর্ডার করতে পারেন।'],
  ['পেমেন্ট কিভাবে করব?', 'ক্যাশ অন ডেলিভারি — চেয়ার হাতে পেয়ে, চেক করে টাকা দিন।'],
  ['কতদিনে ডেলিভারি পাব?', 'অর্ডার কনফার্মের পর সাধারণত ২-৩ দিনের মধ্যে সারাদেশে হোম ডেলিভারি দেওয়া হয়।'],
  ['চেয়ারটি কি ভাঁজ করা যায়?', 'হ্যাঁ, চেয়ারটি ভাঁজ করে রাখা ও বহন করা যায়।'],
]

/* Islamic 8-point star tile used as the hero background */
const STAR_TILE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="#d9b45a" stroke-width="1"><path d="M40 8l9 23 23 9-23 9-9 23-9-23-23-9 23-9z"/><path d="M17.4 17.4h45.2v45.2H17.4z" transform="rotate(45 40 40)"/><circle cx="40" cy="40" r="6"/><path d="M0 0l8 8M80 0l-8 8M0 80l8-8M80 80l-8-8"/></g></svg>')}")`

function Lantern({ className = '', delay = '0s' }) {
  return (
    <svg viewBox="0 0 60 150" className={`fa-lantern ${className}`} style={{ animationDelay: delay }} aria-hidden="true">
      <line x1="30" y1="0" x2="30" y2="46" stroke="#c9962f" strokeWidth="1.5" />
      <path d="M22 46h16l-3 8H25z" fill="#c9962f" />
      <path d="M18 54h24l6 22-6 34H18l-6-34z" fill="url(#lg)" stroke="#e8c76e" strokeWidth="1.5" />
      <path d="M30 56v52M18 76h24M21 98h18" stroke="#e8c76e" strokeWidth="1" opacity=".6" />
      <ellipse className="fa-flame" cx="30" cy="84" rx="5" ry="9" fill="#ffd77a" />
      <path d="M18 110h24l-4 8H22z" fill="#c9962f" />
      <circle cx="30" cy="124" r="3" fill="#c9962f" />
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d77f" stopOpacity=".55" /><stop offset="1" stopColor="#b8862a" stopOpacity=".25" /></linearGradient></defs>
    </svg>
  )
}

const STARS = [[8, 18, 0], [16, 70, 1.2], [26, 34, 2.1], [44, 12, .6], [58, 82, 1.7], [70, 22, 2.6], [84, 60, .9], [92, 30, 1.9], [36, 88, 2.9], [50, 48, 3.4]]

function Hero({ settings, first }) {
  return (
    <section className="fa-hero relative overflow-hidden text-white">
      <div className="fa-geo absolute inset-0" style={{ backgroundImage: STAR_TILE }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_75%_45%,rgba(217,180,90,.18),transparent_70%)]" aria-hidden="true" />
      {STARS.map(([x, y, d], i) => <span key={i} className="fa-star absolute" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} aria-hidden="true" />)}
      <Lantern className="absolute left-[50%] top-0 hidden h-28 w-11 lg:block" />
      <Lantern className="absolute right-[3%] top-0 hidden h-32 w-12 md:block" delay="1.4s" />

      <div className="container-x relative grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-16">
        <div>
          <p className="fa-up font-['Amiri',serif] text-left text-3xl leading-relaxed text-gold sm:text-4xl" dir="rtl" lang="ar" style={{ animationDelay: '.05s' }}>حَافِظُوا عَلَى الصَّلَوَاتِ</p>
          <p className="fa-up mt-1 text-sm text-white/70" style={{ animationDelay: '.2s' }}>“তোমরা নামাজের প্রতি যত্নবান হও” — সূরা আল-বাকারা ২:২৩৮</p>
          <div className="fa-up mt-5 flex items-center gap-3" style={{ animationDelay: '.3s' }}><span className="h-px w-10 bg-gold/70" /><p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Sit for Salah • Feel the Peace</p></div>
          <h1 className="fa-up mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={{ animationDelay: '.45s' }}>নামাজ হবে আরামে,<br /><span className="fa-gold-text fa-shimmer">ইবাদতে আসবে মনোযোগ ও প্রশান্তি</span></h1>
          <p className="fa-up mt-4 max-w-xl text-base leading-7 text-white/85" style={{ animationDelay: '.6s' }}>বয়স, ব্যথা বা অসুস্থতা যেন কখনো আল্লাহর সামনে দাঁড়ানোর পথে বাধা না হয়। বাবা-মা, দাদা-দাদি বা আপনি নিজে — ভাঁজযোগ্য, নরম কুশন ও রেহালসহ <b className="text-white">Fatiha Ayat Salah Chair</b>-এ প্রতিটি ওয়াক্ত হোক প্রশান্তিময়।</p>
          <div className="fa-up mt-7 flex flex-wrap gap-3" style={{ animationDelay: '.75s' }}>
            <a href="#colors" className="btn fa-cta bg-gold px-6 py-3 text-base font-semibold text-brand-dark hover:brightness-105">কালার বেছে নিন</a>
            {first && <Link to={`/product/${first.slug}`} className="btn border border-gold/60 px-6 py-3 text-base text-white hover:bg-white/10">এখনই অর্ডার করুন</Link>}
            <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] px-5 py-3 text-base text-white"><WhatsAppIcon className="h-5 w-5" />WhatsApp</a>
          </div>
          <ul className="fa-up mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80" style={{ animationDelay: '.9s' }}>
            {['ক্যাশ অন ডেলিভারি', 'সারাদেশে হোম ডেলিভারি', 'চেক করে নেওয়ার সুযোগ'].map((t) => <li key={t} className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-gold" strokeWidth={2.5} />{t}</li>)}
          </ul>
        </div>

        <div className="fa-up relative mx-auto w-full max-w-sm" style={{ animationDelay: '.35s' }}>
          <div className="fa-ring absolute -inset-6 rounded-[999px_999px_28px_28px] border border-dashed border-gold/40" aria-hidden="true" />
          <div className="absolute -inset-3 rounded-[999px_999px_22px_22px] bg-gold/10 blur-2xl" aria-hidden="true" />
          <svg viewBox="0 0 100 100" className="fa-moon absolute -right-5 -top-6 z-10 h-16 w-16 drop-shadow-[0_0_12px_rgba(243,220,147,.6)]" aria-hidden="true"><path d="M62 10a40 40 0 1 0 28 62A32 32 0 1 1 62 10z" fill="#f3dc93" /><path d="M78 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#f3dc93" /></svg>
          <div className="fa-arch fa-float relative overflow-hidden border-4 border-gold/70 shadow-2xl">
            <Img src="local:img/green-poster.webp" alt="Fatiha Ayat Salah Chair" className="aspect-[3/4] w-full object-cover" />
            <span className="fa-sheen absolute inset-0" aria-hidden="true" />
          </div>
        </div>
      </div>
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="relative block h-6 w-full text-surface md:h-10" aria-hidden="true"><path d="M0 40V20Q360 0 720 20T1440 20V40z" fill="currentColor" /></svg>
    </section>
  )
}

/** Every colour of the chair as a big swatch card. */
function ColorGallery() {
  const list = S.products.filter((p) => p.active !== false && p.group === 'salah-chair')
  if (!list.length) return null
  return (
    <section id="colors" className="container-x mt-10 scroll-mt-28">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Our Collection</p>
        <h2 className="mt-1 text-2xl font-bold text-brand sm:text-3xl">আপনার পছন্দের কালার ও ডিজাইন বেছে নিন</h2>
        <p className="mt-2 text-muted">{list.length}টি ডিজাইন — প্রতিটি একই আরামদায়ক গঠন ও মজবুত ফ্রেমে</p>
      </div>
      <div className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {list.map((p) => (
          <Link key={p.slug} to={`/product/${p.slug}`} className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:border-gold hover:shadow-lg">
            <div className="relative aspect-[3/4] overflow-hidden bg-cream">
              <Img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              {!inStock(p) && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold text-white">স্টকে নেই</span>}
              {typeof p.stock === 'number' && p.stock > 0 && p.stock <= 5 && <span className="absolute right-2 top-2 rounded-full bg-sale px-2 py-0.5 text-[11px] font-semibold text-white">মাত্র {p.stock}টি বাকি</span>}
            </div>
            <div className="flex items-center gap-2 p-3">
              <span className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-black/10" style={{ background: p.colorHex || '#ccc' }} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.color || p.name}</p><p className="text-sm font-bold text-accent">{formatPrice(p.price)} {p.oldPrice > p.price && <span className="text-xs font-normal text-muted line-through">{formatPrice(p.oldPrice)}</span>}</p></div>
              <Icon name="chevronRight" className="h-4 w-4 text-muted group-hover:text-accent" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="mt-12 bg-white py-10">
      <div className="container-x grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Why Fatiha Ayat</p>
          <h2 className="mt-1 text-2xl font-bold text-brand sm:text-3xl">কেন এই সালাহ চেয়ার?</h2>
          <p className="mt-2 text-muted">ফ্লোরে বসে নামাজের কষ্ট আর নয় — চেয়ারে বসে স্থির হয়ে নামাজ ও তিলাওয়াত।</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(([icon, t, d]) => (
              <div key={t} className="flex gap-3 rounded-xl border border-line bg-surface/60 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-xl" aria-hidden="true">{icon}</span>
                <div><p className="font-semibold">{t}</p><p className="mt-0.5 text-sm leading-6 text-muted">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-xs">
          <div className="overflow-hidden rounded-3xl border-4 border-gold/60 bg-black shadow-2xl">
            <video src={`${BASE}img/salah-chair.mp4`} poster={`${BASE}img/video-poster.jpg`} controls muted playsInline preload="none" className="aspect-[9/16] w-full object-cover" />
          </div>
          <p className="mt-2 text-center text-sm text-muted">▶ ভিডিওতে দেখুন চেয়ারটি কিভাবে ব্যবহার হয়</p>
        </div>
      </div>
    </section>
  )
}

function Gift({ first }) {
  return (
    <section className="container-x mt-10">
      <div className="grid overflow-hidden rounded-2xl bg-brand text-white md:grid-cols-2">
        <div className="relative h-64 md:h-auto"><Img src="local:img/chair-green-3.webp" alt="কুরআন তিলাওয়াত — সালাহ চেয়ার" className="absolute inset-0 h-full w-full object-cover" /></div>
        <div className="fa-pattern p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">The perfect gift</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">বাবা-মায়ের জন্য এমন উপহার, যা কাজে লাগবে প্রতিদিন পাঁচ ওয়াক্ত</h2>
          <p className="mt-3 leading-7 text-white/85">বয়সের সাথে মাটিতে বসে নামাজ পড়া কঠিন হয়ে যায়। একটি সালাহ চেয়ার তাদের ইবাদতকে করবে স্বস্তির — আর আপনার জন্য থাকবে তাদের দোয়া।</p>
          {first && <Link to={`/product/${first.slug}`} className="btn mt-5 bg-gold px-6 py-3 text-brand-dark">উপহার হিসেবে অর্ডার করুন</Link>}
        </div>
      </div>
    </section>
  )
}

function Faq({ settings }) {
  const [open, setOpen] = useState(0)
  return (
    <section className="container-x mt-12 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="text-2xl font-bold text-brand sm:text-3xl">সাধারণ প্রশ্ন ও উত্তর</h2>
        <p className="mt-2 text-muted">আর কিছু জানার থাকলে সরাসরি কল বা WhatsApp করুন।</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`tel:${settings.phone}`} className="btn-brand py-2.5"><Icon name="phone" className="h-4 w-4" />{settings.phone}</a>
          <a href={`https://wa.me/${settings.phoneIntl.replace('+', '')}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] py-2.5 text-white"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
        </div>
      </div>
      <ul className="space-y-2">
        {FAQ.map(([q, a], i) => (
          <li key={q} className="card overflow-hidden">
            <button className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Icon name="chevronDown" className={`h-4 w-4 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} /></button>
            {open === i && <p className="px-4 pb-4 text-sm leading-6 text-muted">{a}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Home() {
  const { settings } = useSite()
  const { data, loading } = useAsync(getHome, [])
  useSeo({})
  const recent = data?.showRecent ? productsBySlugs(getRecent()) : []
  const first = S.products.find((p) => p.active !== false && p.group === 'salah-chair' && inStock(p))

  return (
    <div className="pb-6">
      <Hero settings={settings} first={first} />

      <section className="container-x -mt-5 relative grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TRUST.map(([icon, t, sub]) => (
          <div key={t} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <div><p className="text-sm font-semibold leading-tight">{t}</p><p className="text-xs text-muted">{sub}</p></div>
          </div>
        ))}
      </section>

      <ColorGallery />

      {loading && <Spinner />}
      {data?.banners?.length > 0 && <div className="container-x mt-10"><BannerSlider banners={data.banners} /></div>}

      <Features />

      {data && (
        <>
          <ProductSection title={data.flash?.title || 'স্পেশাল অফার'} badge="⚡" products={data.flashSale} extra={data.flash && <Countdown endsAt={data.flash.endsAt} />} />
          {data.categorySections.filter(({ category }) => category.slug !== 'salah-chair').map(({ category, products }) => (
            <ProductSection key={category.slug} title={category.name} products={products} viewMore={`/category/${category.slug}`} />
          ))}
        </>
      )}

      <Gift first={first} />

      {recent.length > 0 && (
        <section className="container-x mt-10">
          <div className="mb-4 border-b-2 border-line"><h2 className="section-title -mb-0.5 inline-block border-b-2 border-accent pb-2">সম্প্রতি দেখেছেন</h2></div>
          <ProductRow products={recent} />
        </section>
      )}

      {data?.reviewBanner && (
        <section className="container-x mt-10">
          <h2 className="section-title mb-4">আমাদের সম্মানিত গ্রাহকদের রিভিউ</h2>
          <Img src={data.reviewBanner} alt="Customer reviews" className="w-full rounded-lg" />
        </section>
      )}

      <Faq settings={settings} />
    </div>
  )
}
