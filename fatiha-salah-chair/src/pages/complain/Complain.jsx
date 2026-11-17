/* Customer Complain Center — /complain (new complaint wizard) and /complain/track (status + updates). */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Img from '../../components/common/Img'
import { S, normPhone, validPhone, useDb } from '../../store/db'
import { useSeo } from '../../lib/seo'
import { CMP_STATUS, CMP_TYPES, CMP_WANTS } from '../../store/complaintsConfig'
import { cmpCreate, cmpFindOrders, cmpRate, cmpReply, cmpSettings, cmpTrack } from '../../lib/complaints'
import { Card, Lightbox, MediaThumb, Shell, Stepper, Uploader, bnDate, bnNum, recentComplaints, rememberComplaint, uploadedMeta, uploadedTokens, uploadsBusy } from './parts'

const ORDER_ST = { pending: 'অপেক্ষমাণ', confirmed: 'কনফার্মড', ready: 'প্যাকিং', transit: 'কুরিয়ারে', delivered: 'ডেলিভারি হয়েছে', cancelled: 'বাতিল', returned: 'ফেরত', hold: 'হোল্ড' }
const productImg = (it) => it.image || S.products.find((p) => p.id === it.productId || p.slug === it.slug)?.images?.[0] || ''
const itemKey = (it) => String(it.productId || it.slug || it.name)
const PROMPTS = ['কখন সমস্যাটি খেয়াল করেছেন?', 'পার্সেল খোলার সময় বাক্স কেমন ছিল?', 'কোন অংশে সমস্যা?', 'আপনি কীভাবে সমাধান চান?']

/* ======================= new complaint ======================= */
const STEPS = ['অর্ডার', 'সমস্যা', 'বিস্তারিত', 'জমা দিন']

export function ComplainNew() {
  useSeo({ title: 'অভিযোগ জানান — কাস্টমার কেয়ার', description: 'প্রোডাক্ট ভাঙা, ভুল প্রোডাক্ট, রিটার্ন বা রিফান্ড — ছবি/ভিডিওসহ অভিযোগ জানান এবং অভিযোগ আইডি দিয়ে প্রতিটি ধাপ দেখুন।' })
  useDb()
  const [sp] = useSearchParams()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ phone: sp.get('phone') || '', name: '', invoice: (sp.get('invoice') || '').toUpperCase(), type: '', want: '', items: [], description: '', altPhone: '', contactTime: '', agree: true })
  const [orders, setOrders] = useState(null)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [media, setMedia] = useState([])
  const [done, setDone] = useState(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const order = orders?.find((o) => o.invoice === f.invoice) || null
  const recent = useMemo(() => recentComplaints(), [])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step, done])

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
  const chooseOrder = (o) => setF((x) => ({ ...x, invoice: o.invoice, name: x.name || o.name || '', items: o.items.length === 1 ? [itemKey(o.items[0])] : [] }))
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
      rememberComplaint(r.id, r.sig, normPhone(f.phone))
      setDone(r)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  if (done) return <Shell tab="new"><Success r={done} /></Shell>

  return (
    <Shell tab="new">
      {recent.length > 0 && step === 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 p-3 text-sm shadow-sm ring-1 ring-black/5">
          <span className="text-muted">আপনার আগের অভিযোগ:</span>
          {recent.map((x) => <Link key={x.id} to={`/complain/track/${x.id}-${x.sig}`} className="rounded-full bg-brand/10 px-3 py-1 font-mono text-xs font-bold text-brand">{x.id} →</Link>)}
        </div>
      )}
      <Card>
        {/* progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, i) => (
              <button key={s} type="button" disabled={i > step} onClick={() => i < step && setStep(i)} className="flex flex-1 flex-col items-center gap-1 disabled:cursor-default">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${i < step ? 'bg-brand text-white' : i === step ? 'bg-gold text-brand-dark ring-4 ring-gold/30' : 'bg-surface text-muted'}`}>{i < step ? '✓' : bnNum(i + 1)}</span>
                <span className={`text-[11px] font-semibold sm:text-xs ${i <= step ? 'text-brand' : 'text-muted'}`}>{s}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
        </div>

        {step === 0 && (
          <section className="checkout-form space-y-4 bk-fade">
            <div><h2 className="text-lg font-extrabold text-brand">কোন অর্ডারে সমস্যা হয়েছে?</h2><p className="text-sm text-muted">যে নাম্বার দিয়ে অর্ডার করেছিলেন সেটি দিন — আপনার অর্ডারগুলো দেখাবে।</p></div>
            <form onSubmit={find} className="flex gap-2">
              <input className="field text-base" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => { set('phone', e.target.value); setOrders(null); setManual(false) }} aria-label="মোবাইল নাম্বার" />
              <button className="btn-brand shrink-0 rounded-md px-5" disabled={busy}>{busy && orders === null ? '…' : '🔎 খুঁজুন'}</button>
            </form>
            {orders && orders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">আপনার অর্ডার ({bnNum(orders.length)}টি) — একটি বেছে নিন</p>
                {orders.map((o) => {
                  const on = f.invoice === o.invoice && !manual
                  return (
                    <button key={o.invoice} type="button" onClick={() => { setManual(false); chooseOrder(o) }} className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${on ? 'border-brand bg-brand/5 shadow-sm' : 'border-line hover:border-brand/40'}`}>
                      <Img src={productImg(o.items[0])} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{o.items[0]?.name}{o.items.length > 1 && <span className="font-normal text-muted"> +{bnNum(o.items.length - 1)}</span>}</span>
                        <span className="block text-xs text-muted">{o.invoice} · {bnDate(o.createdAt, false)} · ৳{o.total?.toLocaleString('en-IN')}</span>
                        <span className="mt-0.5 inline-block rounded-full bg-surface px-2 text-[11px] font-semibold text-brand">{ORDER_ST[o.status] || o.status}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-brand bg-brand text-white' : 'border-line'}`}>{on && '✓'}</span>
                    </button>
                  )
                })}
                <button type="button" onClick={() => { setManual(true); set('invoice', '') }} className={`w-full rounded-xl border-2 border-dashed p-3 text-sm font-semibold ${manual ? 'border-brand bg-brand/5 text-brand' : 'border-line text-muted'}`}>➕ অর্ডারটি তালিকায় নেই / অন্য নাম্বারে অর্ডার করেছিলাম</button>
              </div>
            )}
            {orders && !orders.length && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি। নিচে অর্ডার নম্বর (জানা থাকলে) দিয়ে অভিযোগ করতে পারবেন।</p>}
            {orders && (manual || !orders.length) && (
              <div><label className="field-label">অর্ডার / ইনভয়েস নম্বর (জানা থাকলে)</label><input className="field" value={f.invoice} onChange={(e) => set('invoice', e.target.value.toUpperCase())} placeholder="যেমন FA100105" /></div>
            )}
            {orders && (
              <div><label className="field-label">আপনার নাম *</label><input className="field" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="পুরো নাম" /></div>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5 bk-fade">
            <div><h2 className="text-lg font-extrabold text-brand">কী ধরনের সমস্যা?</h2><p className="text-sm text-muted">সবচেয়ে কাছাকাছি যেটি, সেটি বেছে নিন।</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(CMP_TYPES).map(([k, t]) => {
                const on = f.type === k
                return (
                  <button key={k} type="button" onClick={() => setF((x) => ({ ...x, type: k, want: x.want || (k === 'refund' ? 'refund' : k === 'return' ? 'return' : k === 'missing' ? 'repair' : ['damaged', 'wrong', 'quality'].includes(k) ? 'replace' : '') }))}
                    className={`relative rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${on ? 'border-brand bg-brand/5 shadow-md' : 'border-line bg-white hover:border-brand/40'}`}>
                    <span className="text-2xl">{t.icon}</span>
                    <span className="mt-1 block text-sm font-bold leading-snug">{t.bn}</span>
                    <span className="block text-[11px] leading-snug text-muted">{t.hint}</span>
                    {on && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] text-white">✓</span>}
                  </button>
                )
              })}
            </div>
            {order && order.items.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-bold">কোন প্রোডাক্টে সমস্যা?</p>
                <div className="space-y-2">
                  {order.items.map((it) => {
                    const k = itemKey(it), on = f.items.includes(k)
                    return (
                      <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 ${on ? 'border-brand bg-brand/5' : 'border-line'}`}>
                        <input type="checkbox" className="h-4 w-4 accent-[#0b4a32]" checked={on} onChange={() => set('items', on ? f.items.filter((x) => x !== k) : [...f.items, k])} />
                        <Img src={productImg(it)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        <span className="text-sm font-medium">{it.name} <span className="text-muted">× {bnNum(it.quantity)}</span></span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-bold">আপনি কীভাবে সমাধান চান?</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CMP_WANTS).map(([k, v]) => <button key={k} type="button" onClick={() => set('want', k)} className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${f.want === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-brand/50'}`}>{v}</button>)}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="checkout-form space-y-4 bk-fade">
            <div><h2 className="text-lg font-extrabold text-brand">সমস্যাটি বিস্তারিত জানান</h2><p className="text-sm text-muted">যত পরিষ্কার লিখবেন ও ছবি/ভিডিও দেবেন, তত দ্রুত সমাধান হবে।</p></div>
            <div>
              <label className="field-label">সমস্যার বিবরণ *</label>
              <textarea className="field min-h-[130px] text-base" maxLength={3000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="যেমন: পার্সেল খুলে দেখি চেয়ারের ডান পায়া বাঁকা, কুশনের সেলাই ছেঁড়া…" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">{PROMPTS.map((p) => <button key={p} type="button" onClick={() => set('description', `${f.description}${f.description && !f.description.endsWith('\n') ? '\n' : ''}${p} `)} className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-brand hover:bg-brand/10">+ {p}</button>)}</div>
              <p className="mt-1 text-right text-[11px] text-muted">{bnNum(f.description.length)}/৩০০০</p>
            </div>
            <div><label className="field-label">ছবি / ভিডিও প্রমাণ</label><Uploader items={media} setItems={setMedia} /><p className="mt-1.5 text-xs text-muted">💡 আনবক্সিং ভিডিও থাকলে অবশ্যই দিন — রিপ্লেসমেন্ট/রিফান্ড দ্রুত হয়।</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="field-label">বিকল্প নাম্বার / WhatsApp (ঐচ্ছিক)</label><input className="field" type="tel" value={f.altPhone} onChange={(e) => set('altPhone', e.target.value)} placeholder="+966… বা 01…" /></div>
              <div><label className="field-label">কখন কল করলে সুবিধা (ঐচ্ছিক)</label>
                <select className="field" value={f.contactTime} onChange={(e) => set('contactTime', e.target.value)}><option value="">যেকোনো সময়</option><option>সকাল (৯টা–১২টা)</option><option>দুপুর (১২টা–৩টা)</option><option>বিকেল (৩টা–৬টা)</option><option>সন্ধ্যা (৬টা–৯টা)</option></select>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4 bk-fade">
            <div><h2 className="text-lg font-extrabold text-brand">একবার মিলিয়ে নিন</h2><p className="text-sm text-muted">সব ঠিক থাকলে জমা দিন — সাথে সাথে অভিযোগ আইডি পাবেন।</p></div>
            <dl className="divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line text-sm">
              {[
                ['নাম', f.name], ['মোবাইল', normPhone(f.phone)], ['অর্ডার', f.invoice || 'উল্লেখ নেই'],
                ['প্রোডাক্ট', order ? order.items.filter((it) => !f.items.length || f.items.includes(itemKey(it))).map((it) => it.name).join(', ') : '—'],
                ['সমস্যা', `${CMP_TYPES[f.type]?.icon} ${CMP_TYPES[f.type]?.bn}`], ['চাওয়া সমাধান', CMP_WANTS[f.want]], ['প্রমাণ', `${bnNum(uploadedTokens(media).length)}টি ফাইল`],
              ].map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2 bg-white px-3 py-2"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              <div className="bg-white px-3 py-2"><dt className="text-muted">বিবরণ</dt><dd className="mt-1 whitespace-pre-line">{f.description}</dd></div>
            </dl>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0b4a32]" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} />আমি নিশ্চিত করছি যে দেওয়া তথ্য সঠিক এবং সমাধানের জন্য আমার সাথে যোগাযোগ করা যাবে।</label>
          </section>
        )}

        {err && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">⚠ {err}</p>}
        <div className="mt-6 flex gap-2">
          {step > 0 && <button type="button" className="btn-outline rounded-xl px-5 py-3" onClick={() => { setErr(''); setStep(step - 1) }}>← আগে</button>}
          {step < 3 && <button type="button" className="btn-brand flex-1 rounded-xl py-3 text-base" onClick={next} disabled={busy}>{busy ? 'একটু অপেক্ষা…' : step === 0 && orders === null ? '🔎 অর্ডার খুঁজুন' : 'পরের ধাপ →'}</button>}
          {step === 3 && <button type="button" className="btn-accent flex-1 rounded-xl py-3 text-base shadow-lg" onClick={submit} disabled={busy}>{busy ? 'জমা হচ্ছে…' : '✅ অভিযোগ জমা দিন'}</button>}
        </div>
      </Card>
      <HowItWorks />
    </Shell>
  )
}

function HowItWorks() {
  const hours = cmpSettings().responseHours || 24
  const items = [['📝', 'অভিযোগ জমা দিন', 'ছবি/ভিডিওসহ ২ মিনিটে'], ['📱', 'আইডি পাবেন SMS-এ', 'সাথে ট্র্যাকিং লিংক'], ['🔍', `${bnNum(hours)} ঘণ্টায় সাড়া`, 'টিম পর্যালোচনা করবে'], ['🎉', 'সমাধান', 'রিপ্লেসমেন্ট / রিফান্ড / রিটার্ন']]
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-center text-base font-extrabold text-brand">যেভাবে কাজ করে</h2>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map(([i, t, d], k) => <li key={t} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-black/5"><span className="text-2xl">{i}</span><p className="mt-1 text-sm font-bold"><span className="text-gold">{bnNum(k + 1)}.</span> {t}</p><p className="text-[11px] text-muted">{d}</p></li>)}
      </ol>
    </section>
  )
}

function Success({ r }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(r.id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {}) }
  const hours = cmpSettings().responseHours || 24
  const link = `/complain/track/${r.id}-${r.sig}`
  const share = `আমার অভিযোগ আইডি: ${r.id}\n${location.origin}${link}`
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl bk-fade">✅</div>
      <h2 className="mt-3 text-xl font-extrabold text-brand sm:text-2xl">আপনার অভিযোগ জমা হয়েছে</h2>
      <p className="mt-1 text-sm text-muted">ধন্যবাদ, {r.complaint?.name?.split(' ')[0] || 'প্রিয় গ্রাহক'}। আমাদের টিম {bnNum(hours)} ঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করবে।</p>
      <div className="mx-auto mt-5 max-w-sm rounded-2xl border-2 border-dashed border-gold bg-[#fffaf0] p-4">
        <p className="text-xs font-semibold text-muted">আপনার অভিযোগ আইডি</p>
        <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-brand">{r.id}</p>
        <button type="button" onClick={copy} className="mt-2 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white">{copied ? '✓ কপি হয়েছে' : '📋 কপি করুন'}</button>
        <p className="mt-2 text-[11px] text-muted">📱 আইডি ও ট্র্যাকিং লিংক আপনার মোবাইলে SMS করা হয়েছে</p>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to={link} className="btn-brand rounded-xl px-6 py-3">🔎 অভিযোগের অবস্থা দেখুন</Link>
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" className="btn rounded-xl bg-[#25d366] px-6 py-3 text-white">WhatsApp-এ সেভ করুন</a>
        <Link to="/" className="btn-outline rounded-xl px-6 py-3">শপে ফিরুন</Link>
      </div>
    </Card>
  )
}

/* ======================= tracking ======================= */
export function ComplainTrack() {
  useSeo({ title: 'অভিযোগের অবস্থা', noindex: true })
  useDb()
  const { ref } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [q, setQ] = useState(() => { const [id, sig] = String(ref || '').split('-'); return { id: (id || sp.get('id') || '').toUpperCase(), phone: '', sig: sig || '' } })
  const [c, setC] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)

  const load = async (query = q, quiet = false) => {
    if (!quiet) { setErr(''); setBusy(true) }
    try { const r = await cmpTrack(query); setC(r); rememberComplaint(r.id, r.sig || query.sig, r.phone) } catch (e) { if (!quiet) setErr(e.message) } finally { if (!quiet) setBusy(false) }
  }
  useEffect(() => { if (q.id && q.sig) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!c) return; const t = setInterval(() => load({ id: c.id, sig: c.sig, phone: c.phone }, true), 60000); return () => clearInterval(t) }, [c?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault()
    if (!/^FC[A-Z0-9]{6}$/.test(q.id.replace(/[^A-Z0-9]/g, ''))) return setErr('সঠিক অভিযোগ আইডি দিন (যেমন FCK7M3QD)')
    if (!validPhone(q.phone)) return setErr('যে নাম্বার দিয়ে অভিযোগ করেছিলেন সেটি দিন')
    load({ ...q, id: q.id.replace(/[^A-Z0-9]/g, ''), sig: '' })
  }

  if (!c) {
    const recent = recentComplaints()
    return (
      <Shell tab="track">
        <Card className="mx-auto max-w-lg">
          <h2 className="text-lg font-extrabold text-brand">🔎 অভিযোগের অবস্থা দেখুন</h2>
          <p className="text-sm text-muted">SMS-এ পাওয়া অভিযোগ আইডি ও আপনার মোবাইল নাম্বার দিন।</p>
          <form onSubmit={submit} className="checkout-form mt-4 space-y-3">
            <div><label className="field-label">অভিযোগ আইডি</label><input className="field font-mono text-lg uppercase tracking-widest" value={q.id} onChange={(e) => setQ({ ...q, id: e.target.value.toUpperCase() })} placeholder="FCXXXXXX" /></div>
            <div><label className="field-label">মোবাইল নাম্বার</label><input className="field text-base" type="tel" inputMode="numeric" value={q.phone} onChange={(e) => setQ({ ...q, phone: e.target.value })} placeholder="01XXXXXXXXX" /></div>
            {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠ {err}</p>}
            <button className="btn-brand w-full rounded-xl py-3 text-base" disabled={busy}>{busy ? 'খোঁজা হচ্ছে…' : 'অবস্থা দেখুন'}</button>
          </form>
          {recent.length > 0 && <div className="mt-4 border-t border-line pt-3"><p className="mb-2 text-xs text-muted">এই ডিভাইসে আপনার অভিযোগ</p><div className="flex flex-wrap gap-2">{recent.map((x) => <button key={x.id} type="button" onClick={() => { nav(`/complain/track/${x.id}-${x.sig}`); load({ id: x.id, sig: x.sig, phone: x.phone }) }} className="rounded-full bg-brand/10 px-3 py-1 font-mono text-xs font-bold text-brand">{x.id}</button>)}</div></div>}
          <p className="mt-4 text-center text-xs text-muted">আইডি হারিয়ে গেছে? কল করুন <a className="font-semibold text-brand" href={`tel:${S.settings.phone}`}>{S.settings.phone}</a></p>
        </Card>
      </Shell>
    )
  }

  const st = CMP_STATUS[c.status]
  const hist = [...(c.history || [])].sort((a, b) => b.at - a.at)
  return (
    <Shell tab="track">
      <div className="space-y-3">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">অভিযোগ আইডি</p>
              <p className="font-mono text-2xl font-extrabold tracking-widest text-brand">{c.id}</p>
              <p className="mt-0.5 text-xs text-muted">জমা: {bnDate(c.createdAt)}{c.invoice && <> · অর্ডার {c.invoice}</>}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${st.tone}`}>{st.icon} {st.bn}</span>
          </div>
          <p className="mt-3 rounded-xl bg-surface/70 p-3 text-sm">{st.desc}{c.status !== 'resolved' && c.status !== 'rejected' && <span className="text-muted"> · প্রতিটি ধাপে SMS পাবেন</span>}</p>
          <div className="mt-5"><Stepper c={c} /></div>
        </Card>

        <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {c.status === 'resolved' && <Rating c={c} onDone={setC} />}
            <Card>
              <h3 className="mb-3 font-extrabold text-brand">আপডেট ও মেসেজ</h3>
              <ol className="space-y-3">
                {hist.map((h, i) => {
                  const mine = h.by === 'customer'
                  return (
                    <li key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-surface text-ink'}`}>
                        {h.type === 'status' && <p className={`text-xs font-bold ${mine ? 'text-gold' : 'text-brand'}`}>{CMP_STATUS[h.s]?.icon} {h.s === 'submitted' ? 'অভিযোগ জমা হয়েছে' : CMP_STATUS[h.s]?.bn}</p>}
                        {h.type === 'rating' && <p className="text-xs font-bold text-gold">আপনার মতামত</p>}
                        {h.text && !(h.type === 'status' && h.s === 'submitted') && <p className="mt-0.5 whitespace-pre-line">{h.text}</p>}
                        {h.files?.length > 0 && <p className="mt-1 text-xs opacity-80">📎 {bnNum(h.files.length)}টি ফাইল যোগ করেছেন</p>}
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{mine ? 'আপনি' : S.settings.siteName} · {bnDate(h.at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
              {c.canReply && <Reply c={c} onDone={setC} />}
            </Card>
          </div>
          <aside className="space-y-3">
            <Card>
              <h3 className="mb-2 font-extrabold text-brand">অভিযোগের তথ্য</h3>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-muted">সমস্যা</dt><dd className="text-right font-semibold">{CMP_TYPES[c.type]?.icon} {CMP_TYPES[c.type]?.bn}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">চাওয়া সমাধান</dt><dd className="font-semibold">{CMP_WANTS[c.want] || '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">দায়িত্বপ্রাপ্ত টিম</dt><dd className="font-semibold">{c.assigned ? '✓ নির্ধারিত' : 'শীঘ্রই'}</dd></div>
              </dl>
              {c.items?.length > 0 && <ul className="mt-3 space-y-2 border-t border-line pt-3">{c.items.map((it) => <li key={it.key} className="flex items-center gap-2 text-sm"><Img src={it.image || productImg(it)} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="min-w-0 truncate">{it.name}</span></li>)}</ul>}
              <details className="mt-3 border-t border-line pt-2 text-sm"><summary className="cursor-pointer font-semibold text-brand">আপনার লেখা বিবরণ</summary><p className="mt-1 whitespace-pre-line text-muted">{c.description}</p></details>
            </Card>
            {c.files?.length > 0 && (
              <Card>
                <h3 className="mb-2 font-extrabold text-brand">আপনার দেওয়া প্রমাণ ({bnNum(c.files.length)})</h3>
                <div className="grid grid-cols-3 gap-2">{c.files.map((f) => <MediaThumb key={f.name} f={f} onOpen={setOpen} className="aspect-square w-full" />)}</div>
              </Card>
            )}
            <Card className="text-center">
              <p className="text-sm font-bold">জরুরি প্রয়োজনে</p>
              <div className="mt-2 flex justify-center gap-2"><a href={`tel:${S.settings.phone}`} className="btn-brand rounded-full px-4">📞 কল করুন</a>{S.settings.whatsappUrl && <a href={`${S.settings.whatsappUrl}?text=${encodeURIComponent(`অভিযোগ আইডি: ${c.id}`)}`} target="_blank" rel="noreferrer" className="btn rounded-full bg-[#25d366] px-4 text-white">WhatsApp</a>}</div>
            </Card>
          </aside>
        </div>
      </div>
      <Lightbox f={open} onClose={() => setOpen(null)} />
    </Shell>
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
    <div className="mt-4 border-t border-line pt-4">
      <textarea className="field min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="আরও কিছু জানাতে চান? এখানে লিখুন…" />
      {show ? <div className="mt-2"><Uploader items={media} setItems={setMedia} max={6} /></div> : <button type="button" className="mt-2 text-sm font-semibold text-brand" onClick={() => setShow(true)}>📎 আরও ছবি/ভিডিও যোগ করুন</button>}
      {err && <p className="mt-2 text-sm text-red-700">⚠ {err}</p>}
      <button type="button" className="btn-brand mt-3 w-full rounded-xl py-2.5" onClick={send} disabled={busy || (!text.trim() && !uploadedTokens(media).length)}>{busy ? 'পাঠানো হচ্ছে…' : 'পাঠান'}</button>
    </div>
  )
}

function Rating({ c, onDone }) {
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (c.rating) return <Card className="bg-green-50 text-center"><p className="text-2xl text-gold">{'★'.repeat(c.rating.stars)}<span className="text-line">{'★'.repeat(5 - c.rating.stars)}</span></p><p className="mt-1 text-sm font-semibold text-green-800">মতামত দেওয়ার জন্য ধন্যবাদ!</p></Card>
  return (
    <Card className="border-2 border-gold/40 text-center">
      <p className="text-lg font-extrabold text-brand">🎉 আপনার সমস্যার সমাধান হয়েছে</p>
      <p className="text-sm text-muted">আমাদের সেবা কেমন লাগল? আপনার মতামত আমাদের আরও ভালো করবে।</p>
      <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="রেটিং">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} onClick={() => setStars(n)} className={`text-4xl transition hover:scale-110 ${n <= stars ? 'text-gold' : 'text-line'}`}>★</button>)}
      </div>
      {stars > 0 && <>
        <textarea className="field mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="কিছু বলতে চাইলে লিখুন (ঐচ্ছিক)" />
        <button type="button" className="btn-accent mt-2 w-full rounded-xl py-2.5" disabled={busy} onClick={async () => { setBusy(true); try { onDone(await cmpRate({ id: c.id, sig: c.sig, phone: c.phone }, stars, text)) } catch (e) { alert(e.message) } finally { setBusy(false) } }}>মতামত পাঠান</button>
      </>}
    </Card>
  )
}
