/* Shared pieces for the customer Complain Center: page shell, media uploader, status stepper, media viewer. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Img from '../../components/common/Img'
import { S, useDb } from '../../store/db'
import { CMP_STATUS, CMP_STEPS } from '../../store/complaintsConfig'
import { cmpSettings, cmpUpload, fmtSize, mediaSrc } from '../../lib/complaints'

export const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])
export const bnDate = (t, time = true) => (t ? new Date(t).toLocaleString('bn-BD', { day: 'numeric', month: 'short', ...(time ? { hour: 'numeric', minute: '2-digit' } : { year: 'numeric' }) }) : '')
export const LAST_KEY = 'fatiha_cmp_last'
export const rememberComplaint = (id, sig, phone) => { try { const l = JSON.parse(localStorage.getItem(LAST_KEY) || '[]').filter((x) => x.id !== id); localStorage.setItem(LAST_KEY, JSON.stringify([{ id, sig, phone, at: Date.now() }, ...l].slice(0, 5))) } catch { /* private mode */ } }
export const recentComplaints = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '[]') } catch { return [] } }

/* ---------------- shell ---------------- */
export function Shell({ children, tab }) {
  useDb()
  const st = S.settings
  const hours = cmpSettings().responseHours || 24
  return (
    <div className="min-h-screen bg-[#f5f3ec]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-dark/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="rounded-full bg-white p-0.5"><Img src={st.logoDark} alt={st.siteName} className="h-9 w-9 rounded-full object-contain" /></span>
            <span className="leading-tight"><span className="block text-sm font-bold">{st.siteName}</span><span className="block text-[11px] text-gold">কাস্টমার কেয়ার সেন্টার</span></span>
          </Link>
          <span className="flex-1" />
          <a href={`tel:${st.phone}`} className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 sm:flex">📞 {st.phone}</a>
          {st.whatsappUrl && <a href={st.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#25d366] px-3 py-1.5 text-xs font-bold text-white">WhatsApp</a>}
        </div>
      </header>
      <section className="fa-hero relative overflow-hidden text-white">
        <div className="fa-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 sm:pt-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-3 py-1 text-xs text-gold">🛡️ আপনার সন্তুষ্টিই আমাদের অঙ্গীকার</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-snug sm:text-4xl">সমস্যা হয়েছে? <span className="fa-gold-text">আমরা সমাধান করব।</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">প্রোডাক্ট ভাঙা, ভুল কালার, পার্টস কম, রিটার্ন বা রিফান্ড — ছবি/ভিডিওসহ জানান। অভিযোগ আইডি SMS-এ পাবেন, আর প্রতিটি ধাপ এখান থেকেই দেখতে পারবেন।</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[`⏱️ ${bnNum(hours)} ঘণ্টার মধ্যে সাড়া`, '📱 SMS-এ আপডেট', '🔒 তথ্য সুরক্ষিত'].map((t) => <span key={t} className="rounded-full bg-white/10 px-3 py-1">{t}</span>)}
          </div>
        </div>
      </section>
      <main className="relative z-10 mx-auto -mt-14 max-w-5xl px-3 pb-16 sm:px-4">
        <nav className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/90 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur sm:mx-auto sm:max-w-md" aria-label="Complain center">
          <Link to="/complain" className={`rounded-xl px-3 py-2.5 text-center text-sm font-bold transition ${tab === 'new' ? 'bg-brand text-white shadow' : 'text-brand hover:bg-brand/5'}`}>📝 নতুন অভিযোগ</Link>
          <Link to="/complain/track" className={`rounded-xl px-3 py-2.5 text-center text-sm font-bold transition ${tab === 'track' ? 'bg-brand text-white shadow' : 'text-brand hover:bg-brand/5'}`}>🔎 অভিযোগের অবস্থা</Link>
        </nav>
        {children}
      </main>
      <footer className="border-t border-line bg-white py-6 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} {st.siteName} · <Link to="/" className="text-brand">শপে ফিরে যান</Link> · হেল্পলাইন <a href={`tel:${st.phone}`} className="text-brand">{st.phone}</a></p>
      </footer>
    </div>
  )
}

export const Card = ({ children, className = '' }) => <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 ${className}`}>{children}</div>

/* ---------------- status stepper ---------------- */
export function Stepper({ c }) {
  const rejected = c.status === 'rejected'
  const steps = rejected ? [...CMP_STEPS.filter((s) => c.steps?.[s] && s !== 'resolved'), 'rejected'] : CMP_STEPS
  const cur = steps.indexOf(c.status)
  return (
    <ol className="relative grid gap-0 sm:grid-cols-5 sm:gap-2" aria-label="অভিযোগের ধাপ">
      {steps.map((s, i) => {
        const done = i <= cur, now = i === cur, st = CMP_STATUS[s]
        return (
          <li key={s} className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < steps.length - 1 && <span className={`absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5 sm:left-[calc(50%+22px)] sm:top-[17px] sm:h-0.5 sm:w-[calc(100%-44px)] ${i < cur ? 'bg-brand' : 'bg-line'}`} />}
            <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition ${done ? (s === 'rejected' ? 'bg-red-600 text-white' : 'bg-brand text-white') : 'bg-white text-muted ring-2 ring-line'} ${now ? 'ring-4 ring-gold/50' : ''}`}>
              {done && !now ? '✓' : st.icon}
              {now && s !== 'resolved' && s !== 'rejected' && <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />}
            </span>
            <span className="min-w-0 pt-1 sm:pt-2">
              <span className={`block text-sm font-bold ${done ? (s === 'rejected' ? 'text-red-700' : 'text-brand') : 'text-muted'}`}>{st.short === 'নতুন' ? 'জমা হয়েছে' : st.short}</span>
              <span className="block text-[11px] text-muted">{c.steps?.[s] ? bnDate(c.steps[s]) : now ? '' : 'অপেক্ষমাণ'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------- media viewer ---------------- */
export function MediaThumb({ f, onOpen, className = 'h-24 w-24' }) {
  if (f.deleted || !f.url) return <div className={`flex flex-col items-center justify-center rounded-xl bg-surface p-2 text-center text-[10px] text-muted ring-1 ring-line ${className}`}>🗂️<span>সংরক্ষণ শেষে মুছে ফেলা হয়েছে</span></div>
  return (
    <button type="button" onClick={() => onOpen?.(f)} className={`group relative overflow-hidden rounded-xl bg-black ring-1 ring-line ${className}`}>
      {f.type === 'video' ? <video src={mediaSrc(f.url)} className="h-full w-full object-cover opacity-90" muted preload="metadata" /> : <img src={mediaSrc(f.url)} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />}
      {f.type === 'video' && <span className="absolute inset-0 flex items-center justify-center text-2xl text-white drop-shadow">▶</span>}
    </button>
  )
}
export function Lightbox({ f, onClose }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  if (!f) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3" onClick={onClose} role="dialog" aria-modal="true">
      <button className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-lg text-white" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
      <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-4xl">
        {f.type === 'video' ? <video src={mediaSrc(f.url)} controls autoPlay playsInline className="max-h-[85vh] w-full rounded-lg" /> : <img src={mediaSrc(f.url)} alt="" className="max-h-[85vh] rounded-lg object-contain" />}
      </div>
    </div>
  )
}

/* ---------------- uploader ---------------- */
let seq = 0
/** items: [{ key, file, preview, type, progress, token, error, meta }] — onChange(items) */
export function Uploader({ items, setItems, max = 8, maxVideos = 2 }) {
  const pick = useRef(null), cam = useRef(null), vid = useRef(null)
  const [drag, setDrag] = useState(false)
  const maxV = cmpSettings().maxVideoMB || 60
  const live = useRef(items); live.current = items
  const patch = (key, p) => setItems(live.current.map((x) => (x.key === key ? { ...x, ...p } : x)))
  const add = (files) => {
    let list = [...live.current]
    for (const file of [...files]) {
      if (list.length >= max) break
      const isV = file.type.startsWith('video/')
      if (!isV && !file.type.startsWith('image/')) continue
      if (isV && list.filter((x) => x.type === 'video').length >= maxVideos) { alert(`সর্বোচ্চ ${bnNum(maxVideos)}টি ভিডিও দেওয়া যাবে`); continue }
      const key = `u${++seq}`
      const it = { key, file, type: isV ? 'video' : 'image', preview: URL.createObjectURL(file), progress: 0, token: '', error: '' }
      list = [...list, it]
      setItems(list)
      cmpUpload(file, (p) => patch(key, { progress: p }))
        .then((r) => patch(key, { token: r.token, progress: 1, meta: r }))
        .catch((e) => patch(key, { error: e.message }))
    }
  }
  const remove = (key) => { const it = live.current.find((x) => x.key === key); if (it) URL.revokeObjectURL(it.preview); setItems(live.current.filter((x) => x.key !== key)) }
  const retry = (it) => { patch(it.key, { error: '', progress: 0 }); cmpUpload(it.file, (p) => patch(it.key, { progress: p })).then((r) => patch(it.key, { token: r.token, progress: 1, meta: r })).catch((e) => patch(it.key, { error: e.message })) }
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        className={`rounded-2xl border-2 border-dashed p-4 text-center transition ${drag ? 'border-brand bg-brand/5' : 'border-[#c9d6cf] bg-[#fbfaf6]'}`}>
        <p className="text-3xl">📸</p>
        <p className="mt-1 text-sm font-bold text-ink">সমস্যার ছবি বা ভিডিও দিন</p>
        <p className="text-xs text-muted">প্রমাণ থাকলে আমরা দ্রুত সমাধান করতে পারি · সর্বোচ্চ {bnNum(max)}টি ফাইল · ভিডিও {bnNum(maxV)}MB পর্যন্ত</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-brand rounded-full px-4" onClick={() => cam.current.click()}>📷 ছবি তুলুন</button>
          <button type="button" className="btn-outline rounded-full px-4" onClick={() => vid.current.click()}>🎥 ভিডিও</button>
          <button type="button" className="btn-outline rounded-full px-4" onClick={() => pick.current.click()}>🖼️ গ্যালারি থেকে</button>
        </div>
        <input ref={pick} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <input ref={vid} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      </div>
      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((it) => (
            <li key={it.key} className="relative aspect-square overflow-hidden rounded-xl bg-black ring-1 ring-line">
              {it.type === 'video' ? <video src={it.preview} className="h-full w-full object-cover" muted /> : <img src={it.preview} alt="" className="h-full w-full object-cover" />}
              {it.type === 'video' && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">🎥 {fmtSize(it.file.size)}</span>}
              {!it.token && !it.error && (
                <span className="absolute inset-x-0 bottom-0 bg-black/55 p-1.5"><span className="block h-1.5 overflow-hidden rounded-full bg-white/30"><span className="block h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(it.progress * 100)}%` }} /></span><span className="mt-0.5 block text-center text-[10px] text-white">{bnNum(Math.round(it.progress * 100))}%</span></span>
              )}
              {it.token && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-green-600 px-1.5 text-[10px] font-bold text-white">✓ আপলোড</span>}
              {it.error && <button type="button" onClick={() => retry(it)} className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/75 p-1 text-center text-[10px] font-semibold text-white">⚠ {it.error}<span className="mt-1 rounded bg-white/20 px-1.5">আবার চেষ্টা</span></button>}
              <button type="button" onClick={() => remove(it.key)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white" aria-label="সরিয়ে দিন">✕</button>
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
