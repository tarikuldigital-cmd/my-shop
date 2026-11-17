/* Shared pieces for the customer Complain Center: page shell, media uploader, status stepper, media viewer. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Img from '../../components/common/Img'
import Icon, { WhatsAppIcon } from '../../components/common/Icon'
import { S, useDb } from '../../store/db'
import { CMP_STATUS, CMP_STEPS } from '../../store/complaintsConfig'
import { cmpSettings, cmpUpload, fmtSize, mediaSrc } from '../../lib/complaints'

export const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])
export const bnDate = (t, time = true) => (t ? new Date(t).toLocaleString('bn-BD', { day: 'numeric', month: 'short', ...(time ? { hour: 'numeric', minute: '2-digit' } : { year: 'numeric' }) }) : '')
const LAST_PHONE = 'fatiha_cmp_phone'
export const rememberPhone = (p) => { try { localStorage.setItem(LAST_PHONE, p) } catch { /* private mode */ } }
export const lastPhone = () => { try { return localStorage.getItem(LAST_PHONE) || '' } catch { return '' } }

export const STATUS_STYLE = {
  submitted: 'bg-sky-50 text-sky-800 ring-sky-200', received: 'bg-indigo-50 text-indigo-800 ring-indigo-200', reviewing: 'bg-amber-50 text-amber-800 ring-amber-200',
  processing: 'bg-violet-50 text-violet-800 ring-violet-200', resolved: 'bg-emerald-50 text-emerald-800 ring-emerald-200', rejected: 'bg-red-50 text-red-800 ring-red-200',
}
export function StatusBadge({ s, long = false, className = '' }) {
  const st = CMP_STATUS[s]
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[s]} ${className}`}><span className={`h-1.5 w-1.5 rounded-full ${st?.dot}`} />{long ? st?.bn : s === 'submitted' ? 'জমা হয়েছে' : st?.short}</span>
}

/* ---------------- shell ---------------- */
export function Shell({ children, tab }) {
  useDb()
  const st = S.settings
  const hours = cmpSettings().responseHours || 24
  return (
    <div className="min-h-screen bg-[#f4f5f3] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Img src={st.logoDark} alt={st.siteName} className="h-10 w-10 shrink-0 rounded-full object-contain ring-1 ring-line" />
            <span className="min-w-0 leading-tight"><span className="block truncate text-sm font-bold text-brand">{st.siteName}</span><span className="block text-xs text-muted">Customer Care</span></span>
          </Link>
          <span className="flex-1" />
          <a href={`tel:${st.phone}`} className="hidden items-center gap-2 text-sm font-semibold text-ink hover:text-brand sm:flex"><Icon name="phone" className="h-4 w-4" />{st.phone}</a>
          {st.whatsappUrl && <a href={st.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-[#128c4a] hover:border-[#128c4a]"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>}
        </div>
      </header>
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Complaint & Resolution Center</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">অভিযোগ ও সমাধান কেন্দ্র</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">প্রোডাক্ট ক্ষতিগ্রস্ত, ভুল প্রোডাক্ট, পার্টস কম, রিটার্ন বা রিফান্ড — ছবি বা ভিডিওসহ জানান। প্রতিটি ধাপের আপডেট এখানে ও SMS-এ পাবেন।</p>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[['clock', `${bnNum(hours)} ঘণ্টার মধ্যে সাড়া`], ['chat', 'প্রতিটি ধাপে SMS আপডেট'], ['lock', 'আপনার তথ্য সুরক্ষিত']].map(([i, t]) => <li key={t} className="flex items-center gap-2 text-white/90"><Icon name={i} className="h-4 w-4 text-gold" />{t}</li>)}
          </ul>
        </div>
      </section>
      <main className="mx-auto -mt-8 max-w-5xl px-3 pb-16 sm:px-4">
        <nav className="mb-4 grid grid-cols-2 rounded-xl border border-line bg-white p-1 shadow-sm sm:max-w-sm" aria-label="Complain center">
          <Link to="/complain" className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${tab === 'new' ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}>নতুন অভিযোগ</Link>
          <Link to="/complain/track" className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${tab === 'track' ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}>অভিযোগের অবস্থা</Link>
        </nav>
        {children}
      </main>
      <footer className="border-t border-line bg-white py-6 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} {st.siteName} · <Link to="/" className="text-brand">শপে ফিরে যান</Link> · হেল্পলাইন <a href={`tel:${st.phone}`} className="text-brand">{st.phone}</a></p>
      </footer>
    </div>
  )
}

export const Card = ({ children, className = '' }) => <div className={`rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6 ${className}`}>{children}</div>
export const SectionTitle = ({ title, sub }) => <div className="mb-4"><h2 className="text-lg font-bold text-ink">{title}</h2>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}</div>
export const ErrorNote = ({ children }) => children ? <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{children}</p> : null

/* ---------------- status stepper ---------------- */
export function Stepper({ c }) {
  const rejected = c.status === 'rejected'
  const steps = rejected ? [...CMP_STEPS.filter((s) => c.steps?.[s] && s !== 'resolved'), 'rejected'] : CMP_STEPS
  const cur = steps.indexOf(c.status)
  const label = (s) => (s === 'submitted' ? 'জমা হয়েছে' : CMP_STATUS[s].short)
  return (
    <ol className="grid gap-0 sm:grid-cols-5" aria-label="অভিযোগের ধাপ">
      {steps.map((s, i) => {
        const done = i <= cur, now = i === cur, bad = s === 'rejected'
        return (
          <li key={s} className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < steps.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-px sm:left-[calc(50%+16px)] sm:top-[13px] sm:h-px sm:w-[calc(100%-32px)] ${i < cur ? 'bg-brand' : 'bg-line'}`} />}
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? (bad ? 'bg-red-600 text-white' : 'bg-brand text-white') : 'border border-line bg-white text-muted'} ${now && !bad && s !== 'resolved' ? 'ring-4 ring-brand/15' : ''}`}>
              {done && !now ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> : bad ? <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.5} /> : bnNum(i + 1)}
            </span>
            <span className="min-w-0 sm:pt-2">
              <span className={`block text-sm font-semibold ${done ? (bad ? 'text-red-700' : 'text-ink') : 'text-muted'}`}>{label(s)}</span>
              <span className="block text-xs text-muted">{c.steps?.[s] ? bnDate(c.steps[s]) : 'অপেক্ষমাণ'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------- media viewer ---------------- */
export function MediaThumb({ f, onOpen, className = 'h-24 w-24' }) {
  if (f.deleted || !f.url) return <div className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface p-2 text-center text-[10px] text-muted ${className}`}><Icon name="doc" className="h-4 w-4" />সংরক্ষণ শেষে মুছে ফেলা হয়েছে</div>
  return (
    <button type="button" onClick={() => onOpen?.(f)} className={`group relative overflow-hidden rounded-lg bg-gray-900 ring-1 ring-line ${className}`}>
      {f.type === 'video' ? <video src={mediaSrc(f.url)} className="h-full w-full object-cover opacity-90" muted preload="metadata" /> : <img src={mediaSrc(f.url)} alt="" className="h-full w-full object-cover transition group-hover:opacity-90" loading="lazy" />}
      {f.type === 'video' && <span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/60 p-2 text-white"><Icon name="play" className="h-4 w-4" /></span></span>}
    </button>
  )
}
export function Lightbox({ f, onClose }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  if (!f) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3" onClick={onClose} role="dialog" aria-modal="true">
      <button className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" onClick={onClose} aria-label="বন্ধ করুন"><Icon name="close" className="h-5 w-5" /></button>
      <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-4xl">
        {f.type === 'video' ? <video src={mediaSrc(f.url)} controls autoPlay playsInline className="max-h-[85vh] w-full rounded-lg" /> : <img src={mediaSrc(f.url)} alt="" className="max-h-[85vh] rounded-lg object-contain" />}
      </div>
    </div>
  )
}

/* ---------------- uploader ---------------- */
let seq = 0
/** items: [{ key, file, preview, type, progress, token, error, meta }] */
export function Uploader({ items, setItems, max = 8, maxVideos = 2 }) {
  const pick = useRef(null), cam = useRef(null), vid = useRef(null)
  const [drag, setDrag] = useState(false)
  const [note, setNote] = useState('')
  const maxV = cmpSettings().maxVideoMB || 60
  const live = useRef(items); live.current = items
  const patch = (key, p) => setItems(live.current.map((x) => (x.key === key ? { ...x, ...p } : x)))
  const start = (it) => cmpUpload(it.file, (p) => patch(it.key, { progress: p })).then((r) => patch(it.key, { token: r.token, progress: 1, meta: r })).catch((e) => patch(it.key, { error: e.message }))
  const add = (files) => {
    setNote('')
    let list = [...live.current]
    for (const file of [...files]) {
      if (list.length >= max) { setNote(`সর্বোচ্চ ${bnNum(max)}টি ফাইল দেওয়া যাবে`); break }
      const isV = file.type.startsWith('video/')
      if (!isV && !file.type.startsWith('image/')) { setNote('শুধু ছবি বা ভিডিও দেওয়া যাবে'); continue }
      if (isV && list.filter((x) => x.type === 'video').length >= maxVideos) { setNote(`সর্বোচ্চ ${bnNum(maxVideos)}টি ভিডিও দেওয়া যাবে`); continue }
      const it = { key: `u${++seq}`, file, type: isV ? 'video' : 'image', preview: URL.createObjectURL(file), progress: 0, token: '', error: '' }
      list = [...list, it]
      setItems(list)
      start(it)
    }
  }
  const remove = (key) => { const it = live.current.find((x) => x.key === key); if (it) URL.revokeObjectURL(it.preview); setItems(live.current.filter((x) => x.key !== key)) }
  const btn = 'inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand'
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition ${drag ? 'border-brand bg-brand/5' : 'border-line bg-surface/50'}`}>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand ring-1 ring-line"><Icon name="upload" className="h-5 w-5" /></span>
        <p className="mt-2 text-sm font-semibold text-ink">ছবি বা ভিডিও যোগ করুন</p>
        <p className="mt-0.5 text-xs text-muted">সর্বোচ্চ {bnNum(max)}টি ফাইল · ভিডিও {bnNum(maxV)}MB পর্যন্ত · JPG, PNG, MP4, MOV</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className={btn} onClick={() => cam.current.click()}><Icon name="camera" className="h-4 w-4" />ছবি তুলুন</button>
          <button type="button" className={btn} onClick={() => vid.current.click()}><Icon name="video" className="h-4 w-4" />ভিডিও</button>
          <button type="button" className={btn} onClick={() => pick.current.click()}><Icon name="image" className="h-4 w-4" />গ্যালারি থেকে</button>
        </div>
        <input ref={pick} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <input ref={vid} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      </div>
      {note && <p className="mt-2 text-xs font-medium text-amber-700">{note}</p>}
      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((it) => (
            <li key={it.key} className="relative aspect-square overflow-hidden rounded-lg bg-gray-900 ring-1 ring-line">
              {it.type === 'video' ? <video src={it.preview} className="h-full w-full object-cover" muted /> : <img src={it.preview} alt="" className="h-full w-full object-cover" />}
              {it.type === 'video' && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white"><Icon name="video" className="h-3 w-3" />{fmtSize(it.file.size)}</span>}
              {!it.token && !it.error && (
                <span className="absolute inset-x-0 bottom-0 bg-black/55 p-1.5"><span className="block h-1 overflow-hidden rounded-full bg-white/30"><span className="block h-full rounded-full bg-white transition-all" style={{ width: `${Math.round(it.progress * 100)}%` }} /></span><span className="mt-0.5 block text-center text-[10px] text-white">{bnNum(Math.round(it.progress * 100))}%</span></span>
              )}
              {it.token && <span className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white" title="আপলোড হয়েছে"><Icon name="check" className="h-3 w-3" strokeWidth={3} /></span>}
              {it.error && <button type="button" onClick={() => { patch(it.key, { error: '', progress: 0 }); start(it) }} className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 p-1 text-center text-[10px] font-semibold text-white">{it.error}<span className="mt-1 rounded bg-white/20 px-1.5 py-0.5">আবার চেষ্টা</span></button>}
              <button type="button" onClick={() => remove(it.key)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" aria-label="সরিয়ে দিন"><Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export const uploadsBusy = (items) => items.some((x) => !x.token && !x.error)
export const uploadedTokens = (items) => items.filter((x) => x.token).map((x) => x.token)
export const uploadedMeta = (items) => Object.fromEntries(items.filter((x) => x.token).map((x) => [x.token, x.meta]))
