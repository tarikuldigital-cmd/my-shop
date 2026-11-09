import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Img from '../components/common/Img'
import { S, save, useDb, validPhone, shippingFor, inStock } from '../store/db'
import { placeOrder, saveCheckoutDraft, discardCheckoutDraft } from '../services/orderService'
import { track, customerData } from '../lib/tracking'
import { useSeo, bookJsonLd } from '../lib/seo'
import { THEMES, embedUrl } from '../lib/landing'
import { LIVE } from '../config/env'
import { liveLandingView } from '../lib/live'
import { formatPrice } from '../utils/format'
import NotFound from './NotFound'

function useCountdown(endsAt) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (!endsAt) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [endsAt])
  if (!endsAt) return null
  const left = endsAt - now
  if (left <= 0) return null
  const p = (n) => String(Math.floor(n)).padStart(2, '0')
  return { d: Math.floor(left / 864e5), h: p((left / 36e5) % 24), m: p((left / 6e4) % 60), s: p((left / 1e3) % 60) }
}

function Countdown({ cd, text }) {
  if (!cd) return null
  const Box = ({ v, l }) => <div className="min-w-[3.4rem] rounded-lg bg-white/15 px-2 py-1.5 text-center"><div className="text-xl font-extrabold tabular-nums leading-none">{v}</div><div className="mt-0.5 text-[10px] opacity-80">{l}</div></div>
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className="text-sm font-semibold">⏰ {text}</span>
      <div className="flex gap-1.5">{cd.d > 0 && <Box v={cd.d} l="দিন" />}<Box v={cd.h} l="ঘণ্টা" /><Box v={cd.m} l="মিনিট" /><Box v={cd.s} l="সেকেন্ড" /></div>
    </div>
  )
}

function Faq({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            {f.q}<span className="text-xl text-[var(--lp)]">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">{f.a}</p>}
        </div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const { slug } = useParams()
  useDb()
  const lp = S.landings.find((l) => l.slug === slug)
  const product = lp && S.products.find((p) => p.id === lp.productId)
  const navigate = useNavigate()
  const formRef = useRef(null)
  const draftId = useRef(`lp${Date.now()}`)
  const done = useRef(false)
  const settings = S.settings
  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({ name: '', phone: '', address: '', shippingArea: settings.shipping[0].id })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const [formSeen, setFormSeen] = useState(false)
  const cd = useCountdown(lp?.endsAt)
  const th = THEMES[lp?.theme] || THEMES.green

  useSeo({
    title: lp?.headline, description: lp?.subheadline, image: product?.images?.[0], noindex: !lp || lp.active === false || undefined,
    jsonLd: product ? bookJsonLd(product, location.href) : undefined,
  })

  // analytics: PageView + ViewContent, and a view counter (once per browser session)
  useEffect(() => {
    if (!lp || !product || lp.active === false) return
    window.scrollTo(0, 0)
    const t = setTimeout(() => { track('PageView', { path: `/lp/${lp.slug}`, title: lp.headline }); track('ViewContent', { items: [{ ...product, productId: product.id, quantity: 1 }], value: product.price }) }, 60)
    const k = `lp_seen_${lp.id}`
    if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); if (LIVE) liveLandingView(lp.slug); else { lp.views = (lp.views || 0) + 1; save() } }
    return () => clearTimeout(t)
  }, [lp?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = product && { productId: product.id, slug: product.slug, name: product.name, price: product.price, quantity: qty }
  const subtotal = product ? product.price * qty : 0
  const shipping = product ? shippingFor(form.shippingArea, subtotal) : 0
  const total = subtotal + shipping

  // incomplete-order capture, same as the normal checkout
  useEffect(() => {
    if (done.current || !item || !validPhone(form.phone)) return
    const t = setTimeout(() => saveCheckoutDraft(draftId.current, { name: form.name.trim(), phone: form.phone, address: form.address.trim(), shippingArea: form.shippingArea, items: [item], subtotal, source: 'Landing page' }), 800)
    return () => clearTimeout(t)
  }, [form.name, form.phone, form.address, form.shippingArea, qty]) // eslint-disable-line react-hooks/exhaustive-deps

  // sticky bar hides while the form is on screen
  useEffect(() => {
    const el = formRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setFormSeen(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [lp?.id])

  if (!lp || !product || lp.active === false) return <NotFound />

  const toForm = () => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); track('Lead', { items: [item], value: subtotal }) }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const available = inStock(product)
  const video = embedUrl(lp.videoUrl)
  const specs = [['লেখক', product.author], ['প্রকাশনী', product.publisher], ['ভাষা', product.language], ['পৃষ্ঠা', product.pages], ['সংস্করণ', product.edition], ['বাঁধাই', product.coverType], ['ISBN', product.isbn], ['প্রোডাক্ট কোড', product.sku]].filter(([, v]) => v)
  const pct = product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'আপনার নাম লিখুন'
    if (!validPhone(form.phone)) errs.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন'
    if (form.address.trim().length < 10) errs.address = 'সম্পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setServerError('')
    try {
      done.current = true
      track('InitiateCheckout', { items: [item], value: subtotal })
      const eventId = `${Date.now()}.${Math.random().toString(36).slice(2, 9)}`
      const order = await placeOrder({ ...form, paymentMethod: 'cod', eventId, source: 'Landing page', landing: lp.slug, note: `Landing page: /lp/${lp.slug}`, items: [item] })
      await discardCheckoutDraft(draftId.current)
      if (!LIVE) { lp.orders = (lp.orders || 0) + 1; save() }
      track('Purchase', { items: order.items, value: order.total, orderId: order.invoice, eventId, customer: customerData(form, settings.shipping.find((x) => x.id === form.shippingArea)?.label) })
      navigate(`/customer/order-success/${order.invoice}`, { state: { order } })
    } catch (err) { done.current = false; setServerError(err.message) } finally { setBusy(false) }
  }

  const Cta = ({ className = '' }) => (
    <button onClick={toForm} className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:scale-[1.03] active:scale-95 ${className}`}>
      🛒 {lp.ctaText}
    </button>
  )
  const H = ({ children, sub }) => (
    <div className="mb-7 text-center"><h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{children}</h2><div className="mx-auto mt-2 h-1 w-14 rounded-full" style={{ background: th.c }} />{sub && <p className="mt-3 text-gray-500">{sub}</p>}</div>
  )
  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>

  return (
    <div className="bg-white text-gray-800" style={{ '--lp': th.c, '--lp-d': th.d, '--lp-soft': th.soft }}>
      {/* top bar */}
      <div className="py-2.5 text-center text-white" style={{ background: th.d }}>
        {cd ? <Countdown cd={cd} text={lp.urgencyText} /> : <p className="px-3 text-sm font-semibold">{lp.urgencyText}</p>}
      </div>
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/"><Img src={settings.logoDark} alt="Bookshelf" className="h-11" /></Link>
          <a href={`tel:${settings.phone}`} className="text-sm font-semibold" style={{ color: th.c }}>📞 {settings.phone}</a>
        </div>
      </header>

      {/* hero */}
      <section style={{ background: `linear-gradient(180deg, ${th.soft}, #fff)` }}>
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
          <div className="order-2 text-center md:order-1 md:text-left">
            {lp.badge && <span className="inline-block rounded-full px-4 py-1 text-sm font-bold text-white" style={{ background: th.c }}>{lp.badge}</span>}
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl">{lp.headline}</h1>
            {lp.subheadline && <p className="mt-3 text-lg leading-relaxed text-gray-600">{lp.subheadline}</p>}
            <div className="mt-5 flex items-end justify-center gap-3 md:justify-start">
              <span className="text-4xl font-extrabold" style={{ color: th.c }}>{formatPrice(product.price)}</span>
              {product.oldPrice > product.price && <span className="pb-1 text-lg text-gray-400 line-through">{formatPrice(product.oldPrice)}</span>}
              {pct > 0 && <span className="mb-1.5 rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{pct}% ছাড়</span>}
            </div>
            <div className="mt-6"><Cta /></div>
            <p className="mt-3 text-sm text-gray-500">💵 ক্যাশ অন ডেলিভারি · 🚚 সারাদেশে ডেলিভারি</p>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative mx-auto max-w-sm">
              <div className="absolute -inset-4 rounded-[2rem] opacity-20 blur-2xl" style={{ background: th.c }} />
              <Img src={product.images[0]} alt={product.name} className="relative mx-auto max-h-[420px] w-full rounded-2xl bg-white object-contain p-3 shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      {lp.features?.length > 0 && (
        <section className="border-y border-gray-100 bg-white">
          <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 sm:grid-cols-3">
            {lp.features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: th.soft }}>
                <span className="text-3xl">{f.icon}</span>
                <div><p className="font-bold leading-snug">{f.title}</p><p className="text-sm text-gray-600">{f.text}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* benefits */}
      {lp.bullets?.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <H>এই বইয়ে যা পাচ্ছেন</H>
          <ul className="grid gap-3 sm:grid-cols-2">
            {lp.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: th.c }}>✓</span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center"><Cta /></div>
        </section>
      )}

      {/* video */}
      {video && (
        <section className="bg-gray-50 px-4 py-12">
          <div className="mx-auto max-w-3xl"><H>ভিডিওতে দেখুন</H>
            <div className="aspect-video overflow-hidden rounded-2xl shadow-lg"><iframe src={video} title="Video" className="h-full w-full" loading="lazy" allowFullScreen /></div>
          </div>
        </section>
      )}

      {/* combo + specs */}
      {((lp.showCombo && product.comboItems?.length > 0) || (lp.showSpecs && specs.length > 0)) && (
        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-2">
          {lp.showCombo && product.comboItems?.length > 0 && (
            <div className="rounded-2xl border border-gray-200 p-5">
              <h3 className="mb-3 text-lg font-extrabold">প্যাকেজে যা যা থাকছে ({product.comboItems.length}টি)</h3>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1 text-sm">{product.comboItems.map((b, i) => <li key={i} className="flex gap-2"><span style={{ color: th.c }}>✔</span>{b}</li>)}</ul>
            </div>
          )}
          {lp.showSpecs && specs.length > 0 && (
            <div className="rounded-2xl border border-gray-200 p-5">
              <h3 className="mb-3 text-lg font-extrabold">বইয়ের তথ্য</h3>
              <dl className="divide-y divide-gray-100 text-sm">{specs.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-gray-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}</dl>
            </div>
          )}
        </section>
      )}

      {/* testimonials */}
      {lp.testimonials?.length > 0 && (
        <section className="px-4 py-12" style={{ background: th.soft }}>
          <div className="mx-auto max-w-5xl"><H>পাঠকরা কী বলছেন</H>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lp.testimonials.map((t, i) => (
                <figure key={i} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="text-amber-400">★★★★★</div>
                  <blockquote className="mt-2 leading-relaxed text-gray-700">“{t.text}”</blockquote>
                  <figcaption className="mt-3 text-sm font-bold">{t.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* order form */}
      <section id="order" ref={formRef} className="px-4 py-12" style={{ background: `linear-gradient(180deg, #fff, ${th.soft})` }}>
        <div className="mx-auto max-w-4xl"><H sub={available ? 'ফর্ম পূরণ করুন — আমরা ফোন করে অর্ডার কনফার্ম করবো' : undefined}>{lp.formTitle}</H>
          {!available ? <p className="rounded-xl bg-red-50 p-6 text-center font-semibold text-red-600">দুঃখিত, বইটি এখন স্টকে নেই। বিস্তারিত জানতে কল করুন: {settings.phone}</p> : (
            <form onSubmit={submit} noValidate className="grid gap-6 rounded-2xl bg-white p-5 shadow-xl md:grid-cols-[1.2fr_1fr] md:p-8">
              <div className="space-y-4">
                <label className="block"><span className="mb-1 block text-sm font-semibold">আপনার নাম *</span><input className="field" value={form.name} onChange={set('name')} autoComplete="name" placeholder="পুরো নাম" />{err('name')}</label>
                <label className="block"><span className="mb-1 block text-sm font-semibold">মোবাইল নাম্বার *</span><input className="field" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="01XXXXXXXXX" />{err('phone')}</label>
                <label className="block"><span className="mb-1 block text-sm font-semibold">সম্পূর্ণ ঠিকানা *</span><textarea rows={3} className="field" value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="বাসা/রোড, এলাকা, থানা, জেলা" />{err('address')}</label>
                <fieldset><legend className="mb-1 text-sm font-semibold">ডেলিভারি এলাকা</legend>
                  <div className="grid gap-2 sm:grid-cols-2">{settings.shipping.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 text-sm ${form.shippingArea === a.id ? 'bg-[var(--lp-soft)]' : 'border-gray-200'}`} style={form.shippingArea === a.id ? { borderColor: th.c } : undefined}>
                      <input type="radio" name="area" checked={form.shippingArea === a.id} onChange={() => setForm((f) => ({ ...f, shippingArea: a.id }))} />
                      <span className="flex-1">{a.label}<small className="block text-xs text-gray-500">{a.eta}</small></span><b>{formatPrice(shippingFor(a.id, subtotal))}</b>
                    </label>))}</div>
                </fieldset>
              </div>
              <aside className="h-fit rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex gap-3"><Img src={product.images[0]} alt="" className="h-20 w-16 shrink-0 rounded border bg-white object-cover" /><div className="min-w-0"><p className="line-clamp-2 text-sm font-bold">{product.name}</p><p className="text-sm" style={{ color: th.c }}>{formatPrice(product.price)}</p></div></div>
                <div className="mt-3 flex items-center justify-between text-sm"><span>পরিমাণ</span>
                  <div className="flex items-center rounded-full border border-gray-300 bg-white">
                    <button type="button" className="h-8 w-8 text-lg" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="কমান">−</button><span className="w-8 text-center font-bold">{qty}</span><button type="button" className="h-8 w-8 text-lg" onClick={() => setQty(Math.min(10, qty + 1))} aria-label="বাড়ান">+</button>
                  </div></div>
                <dl className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 text-sm">
                  <div className="flex justify-between"><dt>সাবটোটাল</dt><dd>{formatPrice(subtotal)}</dd></div>
                  <div className="flex justify-between"><dt>ডেলিভারি চার্জ</dt><dd>{shipping ? formatPrice(shipping) : 'ফ্রি'}</dd></div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-extrabold"><dt>সর্বমোট</dt><dd style={{ color: th.c }}>{formatPrice(total)}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-gray-500">💵 ক্যাশ অন ডেলিভারি — বই হাতে পেয়ে টাকা দিন</p>
                {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
                <button disabled={busy} className="mt-4 w-full rounded-full bg-accent py-3.5 text-base font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">{busy ? 'অর্ডার হচ্ছে…' : `✅ অর্ডার কনফার্ম করুন — ${formatPrice(total)}`}</button>
              </aside>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      {lp.faq?.length > 0 && <section className="mx-auto max-w-3xl px-4 py-12"><H>সাধারণ জিজ্ঞাসা</H><Faq items={lp.faq} /></section>}

      <footer className="px-4 pb-24 pt-8 text-center text-sm text-white md:pb-8" style={{ background: th.d }}>
        <p className="font-bold">Bookshelf</p>
        <p className="mt-1 opacity-80">কল করুন: <a href={`tel:${settings.phone}`} className="underline">{settings.phone}</a>{settings.whatsappUrl && <> · <a href={settings.whatsappUrl} className="underline" target="_blank" rel="noreferrer">WhatsApp</a></>}</p>
        <Link to="/" className="mt-2 inline-block underline opacity-80">সব বই দেখুন</Link>
      </footer>

      {/* sticky mobile CTA */}
      {lp.stickyCta && available && !formSeen && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,.1)] backdrop-blur md:hidden">
          <div><p className="text-xs text-gray-500">মাত্র</p><p className="text-lg font-extrabold leading-none" style={{ color: th.c }}>{formatPrice(product.price)}</p></div>
          <Cta className="!px-6 !py-2.5 !text-sm" />
        </div>
      )}
    </div>
  )
}
