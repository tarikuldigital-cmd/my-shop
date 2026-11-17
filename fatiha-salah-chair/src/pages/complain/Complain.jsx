/* Customer Complain Center — /complain (new complaint) and /complain/track (status by phone number). */
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Img from '../../components/common/Img'
import Icon, { WhatsAppIcon } from '../../components/common/Icon'
import { S, normPhone, validPhone, useDb } from '../../store/db'
import { useSeo } from '../../lib/seo'
import { CMP_STATUS, CMP_TYPES, CMP_WANTS } from '../../store/complaintsConfig'
import { cmpByPhone, cmpCreate, cmpFindOrders, cmpRate, cmpReply, cmpSettings, cmpTrack } from '../../lib/complaints'
import { Card, ErrorNote, Lightbox, MediaThumb, SectionTitle, Shell, StatusBadge, Stepper, Uploader, bnDate, bnNum, lastPhone, rememberPhone, uploadedMeta, uploadedTokens, uploadsBusy } from './parts'

const ORDER_ST = { pending: 'অপেক্ষমাণ', confirmed: 'কনফার্মড', ready: 'প্যাকিং', transit: 'কুরিয়ারে', delivered: 'ডেলিভারি হয়েছে', cancelled: 'বাতিল', returned: 'ফেরত', hold: 'হোল্ড' }
const productImg = (it) => it.image || S.products.find((p) => p.id === it.productId || p.slug === it.slug)?.images?.[0] || ''
const itemKey = (it) => String(it.productId || it.slug || it.name)
const PROMPTS = ['কখন সমস্যাটি খেয়াল করেছেন?', 'পার্সেল খোলার সময় বাক্স কেমন ছিল?', 'কোন অংশে সমস্যা?']
const tk = (n) => `৳${Math.round(n || 0).toLocaleString('en-IN')}`

/* ======================= new complaint ======================= */
const STEPS = ['অর্ডার', 'সমস্যা', 'বিস্তারিত', 'নিশ্চিত করুন']

export function ComplainNew() {
  useSeo({ title: 'অভিযোগ জানান — কাস্টমার কেয়ার', description: 'প্রোডাক্ট ক্ষতিগ্রস্ত, ভুল প্রোডাক্ট, রিটার্ন বা রিফান্ড — ছবি/ভিডিওসহ অভিযোগ জানান এবং প্রতিটি ধাপের আপডেট দেখুন।' })
  useDb()
  const [sp] = useSearchParams()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ phone: sp.get('phone') || lastPhone(), name: '', invoice: (sp.get('invoice') || '').toUpperCase(), type: '', want: '', items: [], description: '', altPhone: '', contactTime: '', agree: true })
  const [orders, setOrders] = useState(null)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [media, setMedia] = useState([])
  const [done, setDone] = useState(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const order = orders?.find((o) => o.invoice === f.invoice) || null

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step, done])

  const chooseOrder = (o) => setF((x) => ({ ...x, invoice: o.invoice, name: x.name || o.name || '', items: o.items.length === 1 ? [itemKey(o.items[0])] : [] }))
  const find = async (e) => {
    e?.preventDefault(); setErr('')
    if (!validPhone(f.phone)) return setErr('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 01XXXXXXXXX)')
    setBusy(true)
    try {
      const list = await cmpFindOrders(f.phone)
      setOrders(list)
      if (list.length) { const pre = list.find((o) => o.invoice === f.invoice) || (list.length === 1 ? list[0] : null); if (pre) chooseOrder(pre) } else setManual(true)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  const next = () => {
    setErr('')
    if (step === 0) {
      if (!validPhone(f.phone)) return setErr('সঠিক মোবাইল নাম্বার দিন')
      if (orders === null) return find()
      if (!f.invoice && !manual) return setErr('যে অর্ডারে সমস্যা হয়েছে সেটি বেছে নিন')
      if (!f.name.trim()) return setErr('আপনার নাম লিখুন')
    }
    if (step === 1) {
      if (!f.type) return setErr('সমস্যার ধরন বেছে নিন')
      if (order && order.items.length > 1 && !f.items.length) return setErr('কোন প্রোডাক্টে সমস্যা — বেছে নিন')
      if (!f.want) return setErr('আপনি কীভাবে সমাধান চান — বেছে নিন')
    }
    if (step === 2) {
      if (f.description.trim().length < 10) return setErr('সমস্যাটি একটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)')
      if (uploadsBusy(media)) return setErr('ফাইল আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন')
      if (['damaged', 'wrong', 'missing', 'quality'].includes(f.type) && !uploadedTokens(media).length && !confirm('ছবি বা ভিডিও ছাড়া সমাধান করতে দেরি হতে পারে। প্রমাণ ছাড়াই এগোবেন?')) return
    }
    setStep(step + 1)
  }
  const submit = async () => {
    setErr('')
    if (!f.agree) return setErr('তথ্য সঠিক — এই ঘরে টিক দিন')
    setBusy(true)
    try {
      const r = await cmpCreate({ name: f.name, phone: normPhone(f.phone), invoice: f.invoice, type: f.type, want: f.want, items: f.items, description: f.description, altPhone: f.altPhone, contactTime: f.contactTime, files: uploadedTokens(media), fileMeta: uploadedMeta(media) })
      rememberPhone(normPhone(f.phone))
      setDone(r)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  if (done) return <Shell tab="new"><Success r={done} /></Shell>

  const radio = (on) => <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white'}`}>{on && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}</span>
  return (
    <Shell tab="new">
      <Card>
        <ol className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
              <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)} className="flex items-center gap-2 disabled:cursor-default">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-brand text-white' : i === step ? 'bg-brand text-white ring-4 ring-brand/15' : 'border border-line bg-white text-muted'}`}>{i < step ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> : bnNum(i + 1)}</span>
                <span className={`hidden text-sm font-semibold sm:inline ${i <= step ? 'text-ink' : 'text-muted'}`}>{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? 'bg-brand' : 'bg-line'}`} />}
            </li>
          ))}
        </ol>
        <p className="-mt-3 mb-5 text-xs font-medium text-muted sm:hidden">ধাপ {bnNum(step + 1)}/{bnNum(STEPS.length)} · {STEPS[step]}</p>

        {step === 0 && (
          <section className="checkout-form">
            <SectionTitle title="কোন অর্ডারে সমস্যা হয়েছে?" sub="যে নাম্বার দিয়ে অর্ডার করেছিলেন সেটি দিন — আপনার অর্ডারগুলো দেখাবে।" />
            <form onSubmit={find} className="flex gap-2">
              <input className="field text-base" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => { set('phone', e.target.value); setOrders(null); setManual(false) }} aria-label="মোবাইল নাম্বার" />
              <button className="btn-brand shrink-0 px-5" disabled={busy}><Icon name="search" className="h-4 w-4" />খুঁজুন</button>
            </form>
            {orders && orders.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">আপনার অর্ডার ({bnNum(orders.length)}টি)</p>
                {orders.map((o) => {
                  const on = f.invoice === o.invoice && !manual
                  return (
                    <button key={o.invoice} type="button" onClick={() => { setManual(false); chooseOrder(o) }} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${on ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-line hover:border-gray-400'}`}>
                      {radio(on)}
                      <Img src={productImg(o.items[0])} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{o.items[0]?.name}{o.items.length > 1 && <span className="font-normal text-muted"> +{bnNum(o.items.length - 1)}</span>}</span>
                        <span className="block text-xs text-muted">{o.invoice} · {bnDate(o.createdAt, false)} · {tk(o.total)} · {ORDER_ST[o.status] || o.status}</span>
                      </span>
                    </button>
                  )
                })}
                <button type="button" onClick={() => { setManual(true); set('invoice', '') }} className={`flex w-full items-center gap-3 rounded-lg border border-dashed p-3 text-left text-sm ${manual ? 'border-brand bg-brand/5 text-brand' : 'border-line text-muted'}`}>{radio(manual)}অর্ডারটি তালিকায় নেই / অন্য নাম্বারে অর্ডার করেছিলাম</button>
              </div>
            )}
            {orders && !orders.length && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি। অর্ডার নম্বর জানা থাকলে নিচে দিন, না থাকলেও অভিযোগ করতে পারবেন।</p>}
            {orders && (manual || !orders.length) && <div className="mt-4"><label className="field-label">অর্ডার / ইনভয়েস নম্বর (জানা থাকলে)</label><input className="field" value={f.invoice} onChange={(e) => set('invoice', e.target.value.toUpperCase())} placeholder="যেমন FA100105" /></div>}
            {orders && <div className="mt-4"><label className="field-label">আপনার নাম *</label><input className="field" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="পুরো নাম" /></div>}
          </section>
        )}

        {step === 1 && (
          <section>
            <SectionTitle title="সমস্যার ধরন" sub="সবচেয়ে কাছাকাছি যেটি, সেটি বেছে নিন।" />
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(CMP_TYPES).map(([k, t]) => {
                const on = f.type === k
                return (
                  <button key={k} type="button" onClick={() => setF((x) => ({ ...x, type: k, want: x.want || (k === 'refund' ? 'refund' : k === 'return' ? 'return' : k === 'missing' ? 'repair' : ['damaged', 'wrong', 'quality'].includes(k) ? 'replace' : '') }))}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${on ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-line hover:border-gray-400'}`}>
                    <span className="pt-0.5">{radio(on)}</span>
                    <span><span className="block text-sm font-semibold">{t.bn}</span><span className="block text-xs text-muted">{t.hint}</span></span>
                  </button>
                )
              })}
            </div>
            {order && order.items.length > 1 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">কোন প্রোডাক্টে সমস্যা?</p>
                <div className="space-y-2">
                  {order.items.map((it) => {
                    const k = itemKey(it), on = f.items.includes(k)
                    return (
                      <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${on ? 'border-brand bg-brand/5' : 'border-line'}`}>
                        <input type="checkbox" className="h-4 w-4 accent-[#0b4a32]" checked={on} onChange={() => set('items', on ? f.items.filter((x) => x !== k) : [...f.items, k])} />
                        <Img src={productImg(it)} alt="" className="h-10 w-10 rounded-md object-cover" />
                        <span className="text-sm">{it.name} <span className="text-muted">× {bnNum(it.quantity)}</span></span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">আপনি কীভাবে সমাধান চান?</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CMP_WANTS).map(([k, v]) => <button key={k} type="button" onClick={() => set('want', k)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${f.want === k ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-gray-400'}`}>{v}</button>)}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="checkout-form space-y-5">
            <SectionTitle title="বিস্তারিত ও প্রমাণ" sub="পরিষ্কার বিবরণ ও ছবি/ভিডিও দিলে দ্রুত সমাধান করা যায়।" />
            <div>
              <label className="field-label">সমস্যার বিবরণ *</label>
              <textarea className="field min-h-[130px] text-base" maxLength={3000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="যেমন: পার্সেল খুলে দেখি চেয়ারের ডান পায়া বাঁকা, কুশনের সেলাই ছেঁড়া…" />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{PROMPTS.map((p) => <button key={p} type="button" onClick={() => set('description', `${f.description}${f.description && !f.description.endsWith('\n') ? '\n' : ''}${p} `)} className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted hover:border-brand hover:text-brand">+ {p}</button>)}<span className="ml-auto text-[11px] text-muted">{bnNum(f.description.length)}/৩০০০</span></div>
            </div>
            <div>
              <label className="field-label">ছবি / ভিডিও প্রমাণ</label>
              <Uploader items={media} setItems={setMedia} />
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted"><Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />আনবক্সিং ভিডিও থাকলে অবশ্যই দিন — রিপ্লেসমেন্ট বা রিফান্ড দ্রুত হয়।</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label">বিকল্প নাম্বার / WhatsApp (ঐচ্ছিক)</label><input className="field" type="tel" value={f.altPhone} onChange={(e) => set('altPhone', e.target.value)} placeholder="+966… বা 01…" /></div>
              <div><label className="field-label">কখন কল করলে সুবিধা (ঐচ্ছিক)</label>
                <select className="field" value={f.contactTime} onChange={(e) => set('contactTime', e.target.value)}><option value="">যেকোনো সময়</option><option>সকাল (৯টা–১২টা)</option><option>দুপুর (১২টা–৩টা)</option><option>বিকেল (৩টা–৬টা)</option><option>সন্ধ্যা (৬টা–৯টা)</option></select>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <SectionTitle title="তথ্য মিলিয়ে নিন" sub="সব ঠিক থাকলে জমা দিন — সাথে সাথে অভিযোগ নম্বর পাবেন।" />
            <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line text-sm">
              {[
                ['নাম', f.name], ['মোবাইল', normPhone(f.phone)], ['অর্ডার', f.invoice || 'উল্লেখ নেই'],
                ['প্রোডাক্ট', order ? order.items.filter((it) => !f.items.length || f.items.includes(itemKey(it))).map((it) => it.name).join(', ') : '—'],
                ['সমস্যা', CMP_TYPES[f.type]?.bn], ['চাওয়া সমাধান', CMP_WANTS[f.want]], ['প্রমাণ', `${bnNum(uploadedTokens(media).length)}টি ফাইল`],
              ].map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2 px-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
              <div className="px-3 py-2.5"><dt className="text-muted">বিবরণ</dt><dd className="mt-1 whitespace-pre-line">{f.description}</dd></div>
            </dl>
            <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0b4a32]" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} />আমি নিশ্চিত করছি যে দেওয়া তথ্য সঠিক এবং সমাধানের জন্য আমার সাথে যোগাযোগ করা যাবে।</label>
          </section>
        )}

        <ErrorNote>{err}</ErrorNote>
        {!(step === 0 && orders === null) && <div className="mt-6 flex gap-2 border-t border-line pt-5">
          {step > 0 && <button type="button" className="btn-outline px-5 py-2.5" onClick={() => { setErr(''); setStep(step - 1) }}><Icon name="arrowLeft" className="h-4 w-4" />আগে</button>}
          {step < 3 && <button type="button" className="btn-brand flex-1 py-2.5 text-base" onClick={next} disabled={busy}>{busy ? 'একটু অপেক্ষা করুন…' : <>পরের ধাপ<Icon name="arrowRight" className="h-4 w-4" /></>}</button>}
          {step === 3 && <button type="button" className="btn-accent flex-1 py-2.5 text-base" onClick={submit} disabled={busy}>{busy ? 'জমা হচ্ছে…' : 'অভিযোগ জমা দিন'}</button>}
        </div>}
      </Card>
      <HowItWorks />
    </Shell>
  )
}

function HowItWorks() {
  const hours = cmpSettings().responseHours || 24
  const items = [['অভিযোগ জমা দিন', 'ছবি বা ভিডিওসহ মাত্র ২ মিনিটে'], ['SMS-এ অভিযোগ নম্বর', 'সাথে অবস্থা দেখার লিংক'], ['পর্যালোচনা', `${bnNum(hours)} ঘণ্টার মধ্যে আমাদের টিম যোগাযোগ করবে`], ['সমাধান', 'রিপ্লেসমেন্ট, রিফান্ড বা রিটার্ন']]
  return (
    <section className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted">যেভাবে কাজ করে</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-4">
        {items.map(([t, d], k) => <li key={t} className="flex gap-3 sm:block"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">{bnNum(k + 1)}</span><span className="sm:mt-2 sm:block"><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-muted">{d}</span></span></li>)}
      </ol>
    </section>
  )
}

function Success({ r }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(r.id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {}) }
  const hours = cmpSettings().responseHours || 24
  const link = `/complain/track/${r.id}-${r.sig}`
  const share = `অভিযোগ নম্বর: ${r.id}\n${location.origin}${link}`
  return (
    <Card className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50"><Icon name="check" className="h-8 w-8" strokeWidth={2.5} /></span>
      <h2 className="mt-4 text-xl font-bold sm:text-2xl">আপনার অভিযোগ জমা হয়েছে</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">ধন্যবাদ, {r.complaint?.name?.split(' ')[0] || 'প্রিয় গ্রাহক'}। আমাদের টিম {bnNum(hours)} ঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করবে।</p>
      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-line bg-surface/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">অভিযোগ নম্বর</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-brand">{r.id}</p>
        <button type="button" onClick={copy} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand"><Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />{copied ? 'কপি হয়েছে' : 'কপি করুন'}</button>
        <p className="mt-3 text-xs text-muted">অভিযোগ নম্বর ও অবস্থা দেখার লিংক আপনার মোবাইলে SMS করা হয়েছে। পরে শুধু মোবাইল নাম্বার দিয়েই অবস্থা দেখতে পারবেন।</p>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to={link} className="btn-brand px-6 py-2.5">অভিযোগের অবস্থা দেখুন</Link>
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" className="btn-outline px-6 py-2.5"><WhatsAppIcon className="h-4 w-4 text-[#128c4a]" />WhatsApp-এ সেভ করুন</a>
        <Link to="/" className="btn-outline px-6 py-2.5">শপে ফিরুন</Link>
      </div>
    </Card>
  )
}

/* ======================= tracking (phone number only) ======================= */
export function ComplainTrack() {
  useSeo({ title: 'অভিযোগের অবস্থা', noindex: true })
  useDb()
  const { ref } = useParams()
  const [phone, setPhone] = useState(lastPhone())
  const [list, setList] = useState(null)
  const [c, setC] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)

  const openOne = async (q, quiet = false) => {
    if (!quiet) { setErr(''); setBusy(true) }
    try { const r = await cmpTrack(q); setC(r); rememberPhone(r.phone) } catch (e) { if (!quiet) setErr(e.message) } finally { if (!quiet) setBusy(false) }
  }
  // link from the SMS: /complain/track/FCXXXXXX-signature → open straight away
  useEffect(() => { const [id, sig] = String(ref || '').split('-'); if (id && sig) openOne({ id, sig }) }, [ref]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!c) return; const t = setInterval(() => openOne({ id: c.id, sig: c.sig, phone: c.phone }, true), 60000); return () => clearInterval(t) }, [c?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (e) => {
    e?.preventDefault(); setErr('')
    if (!validPhone(phone)) return setErr('যে মোবাইল নাম্বার দিয়ে অভিযোগ করেছিলেন সেটি দিন')
    setBusy(true)
    try {
      const l = await cmpByPhone(phone)
      rememberPhone(normPhone(phone)); setList(l); setC(null)
      if (l.length === 1) setC(l[0])
    } catch (ex) { setErr(ex.message); setList(null) } finally { setBusy(false) }
  }
  const back = async () => {
    if (list && list.length > 1) return setC(null)
    setPhone(c.phone)
    try { setList(await cmpByPhone(c.phone)) } catch { /* nothing else */ }
    setC(null)
  }

  if (c) return <Shell tab="track"><Detail c={c} setC={setC} open={open} setOpen={setOpen} onBack={back} /></Shell>

  return (
    <Shell tab="track">
      <Card className="mx-auto max-w-xl">
        <SectionTitle title="অভিযোগের অবস্থা দেখুন" sub="যে মোবাইল নাম্বার দিয়ে অভিযোগ করেছিলেন সেটি দিন।" />
        <form onSubmit={search} className="checkout-form flex gap-2">
          <input className="field text-base" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" aria-label="মোবাইল নাম্বার" />
          <button className="btn-brand shrink-0 px-5" disabled={busy}><Icon name="search" className="h-4 w-4" />{busy ? 'খোঁজা হচ্ছে…' : 'দেখুন'}</button>
        </form>
        <ErrorNote>{err}</ErrorNote>
        {list && list.length > 1 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">আপনার অভিযোগ ({bnNum(list.length)}টি)</p>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {list.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setC(x)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface/60">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{x.id}</span><StatusBadge s={x.status} /></span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{CMP_TYPES[x.type]?.bn}{x.items?.[0] ? ` · ${x.items[0].name}` : ''} · {bnDate(x.createdAt, false)}</span>
                    </span>
                    <Icon name="chevronRight" className="h-4 w-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-5 border-t border-line pt-4 text-center text-xs text-muted">কোনো সমস্যা হলে কল করুন <a className="font-semibold text-brand" href={`tel:${S.settings.phone}`}>{S.settings.phone}</a></p>
      </Card>
    </Shell>
  )
}

function Detail({ c, setC, open, setOpen, onBack }) {
  const st = CMP_STATUS[c.status]
  const hist = [...(c.history || [])].sort((a, b) => b.at - a.at)
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-brand shadow-sm"><Icon name="arrowLeft" className="h-4 w-4" />সব অভিযোগ</button>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">অভিযোগ নম্বর</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-brand">{c.id}</p>
            <p className="mt-0.5 text-xs text-muted">জমা: {bnDate(c.createdAt)}{c.invoice && <> · অর্ডার {c.invoice}</>}</p>
          </div>
          <StatusBadge s={c.status} long className="!text-sm" />
        </div>
        <p className="mt-4 rounded-lg bg-surface/70 px-3 py-2.5 text-sm text-ink">{st.desc}{!['resolved', 'rejected'].includes(c.status) && <span className="text-muted"> · প্রতিটি ধাপে SMS পাবেন</span>}</p>
        <div className="mt-6"><Stepper c={c} /></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {c.status === 'resolved' && <Rating c={c} onDone={setC} />}
          <Card>
            <h3 className="mb-4 font-bold">আপডেট ও মেসেজ</h3>
            <ol className="space-y-3">
              {hist.map((h, i) => {
                const mine = h.by === 'customer'
                return (
                  <li key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border border-line bg-surface/60'}`}>
                      {h.type === 'status' && <p className={`text-xs font-semibold ${mine ? 'text-white/80' : 'text-brand'}`}>{h.s === 'submitted' ? 'অভিযোগ জমা হয়েছে' : CMP_STATUS[h.s]?.bn}</p>}
                      {h.type === 'rating' && <p className="text-xs font-semibold text-white/80">আপনার মতামত</p>}
                      {h.text && !(h.type === 'status' && h.s === 'submitted') && <p className="mt-0.5 whitespace-pre-line">{h.text}</p>}
                      {h.files?.length > 0 && <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-80"><Icon name="clip" className="h-3 w-3" />{bnNum(h.files.length)}টি ফাইল যোগ করেছেন</p>}
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{mine ? 'আপনি' : S.settings.siteName} · {bnDate(h.at)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            {c.canReply && <Reply c={c} onDone={setC} />}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card>
            <h3 className="mb-3 font-bold">অভিযোগের তথ্য</h3>
            <dl className="space-y-2 text-sm">
              {[['সমস্যা', CMP_TYPES[c.type]?.bn], ['চাওয়া সমাধান', CMP_WANTS[c.want] || '—'], ['দায়িত্বপ্রাপ্ত টিম', c.assigned ? 'নির্ধারিত হয়েছে' : 'শীঘ্রই নির্ধারণ হবে']].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
            </dl>
            {c.items?.length > 0 && <ul className="mt-3 space-y-2 border-t border-line pt-3">{c.items.map((it) => <li key={it.key} className="flex items-center gap-2 text-sm"><Img src={it.image || productImg(it)} alt="" className="h-10 w-10 rounded-md object-cover" /><span className="min-w-0 truncate">{it.name}</span></li>)}</ul>}
            <details className="mt-3 border-t border-line pt-3 text-sm"><summary className="cursor-pointer font-semibold text-brand">আপনার লেখা বিবরণ</summary><p className="mt-1 whitespace-pre-line text-muted">{c.description}</p></details>
          </Card>
          {c.files?.length > 0 && (
            <Card>
              <h3 className="mb-3 font-bold">আপনার দেওয়া প্রমাণ <span className="font-normal text-muted">({bnNum(c.files.length)})</span></h3>
              <div className="grid grid-cols-3 gap-2">{c.files.map((f) => <MediaThumb key={f.name} f={f} onOpen={setOpen} className="aspect-square w-full" />)}</div>
            </Card>
          )}
          <Card>
            <p className="text-sm font-semibold">সরাসরি কথা বলতে চান?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${S.settings.phone}`} className="btn-brand"><Icon name="phone" className="h-4 w-4" />কল করুন</a>
              {S.settings.whatsappUrl && <a href={`${S.settings.whatsappUrl}?text=${encodeURIComponent(`অভিযোগ নম্বর: ${c.id}`)}`} target="_blank" rel="noreferrer" className="btn-outline"><WhatsAppIcon className="h-4 w-4 text-[#128c4a]" />WhatsApp</a>}
            </div>
          </Card>
        </aside>
      </div>
      <Lightbox f={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function Reply({ c, onDone }) {
  const [text, setText] = useState('')
  const [media, setMedia] = useState([])
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const send = async () => {
    setErr('')
    if (uploadsBusy(media)) return setErr('ফাইল আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন')
    setBusy(true)
    try { onDone(await cmpReply({ id: c.id, sig: c.sig, phone: c.phone }, text, uploadedTokens(media), uploadedMeta(media))); setText(''); setMedia([]); setShow(false) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="mt-5 border-t border-line pt-4">
      <label className="field-label">আরও কিছু জানাতে চান?</label>
      <textarea className="field min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="এখানে লিখুন…" />
      {show ? <div className="mt-2"><Uploader items={media} setItems={setMedia} max={6} /></div> : <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand" onClick={() => setShow(true)}><Icon name="clip" className="h-4 w-4" />ছবি/ভিডিও যোগ করুন</button>}
      <ErrorNote>{err}</ErrorNote>
      <button type="button" className="btn-brand mt-3 w-full py-2.5" onClick={send} disabled={busy || (!text.trim() && !uploadedTokens(media).length)}><Icon name="send" className="h-4 w-4" />{busy ? 'পাঠানো হচ্ছে…' : 'পাঠান'}</button>
    </div>
  )
}

function Rating({ c, onDone }) {
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (c.rating) return <Card className="text-center"><p className="text-2xl tracking-wider text-gold">{'★'.repeat(c.rating.stars)}<span className="text-line">{'★'.repeat(5 - c.rating.stars)}</span></p><p className="mt-1 text-sm font-semibold text-emerald-800">মতামত দেওয়ার জন্য ধন্যবাদ</p></Card>
  return (
    <Card className="text-center">
      <p className="text-lg font-bold">আপনার সমস্যার সমাধান হয়েছে</p>
      <p className="text-sm text-muted">আমাদের সেবা কেমন লাগল? আপনার মতামত আমাদের আরও ভালো করবে।</p>
      <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="রেটিং">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star`} onClick={() => setStars(n)} className={`text-4xl transition ${n <= stars ? 'text-gold' : 'text-gray-300 hover:text-gold/60'}`}>★</button>)}
      </div>
      {stars > 0 && <>
        <textarea className="field mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="কিছু বলতে চাইলে লিখুন (ঐচ্ছিক)" />
        <button type="button" className="btn-accent mt-2 w-full py-2.5" disabled={busy} onClick={async () => { setBusy(true); try { onDone(await cmpRate({ id: c.id, sig: c.sig, phone: c.phone }, stars, text)) } catch (e) { alert(e.message) } finally { setBusy(false) } }}>মতামত পাঠান</button>
      </>}
    </Card>
  )
}
