import { useEffect, useSyncExternalStore } from 'react'
import { STATUS } from '../store/db'

/* ---------- toast ---------- */
let toasts = []
const tsubs = new Set()
export function toast(text) {
  const id = Math.random()
  toasts = [...toasts, { id, text }]
  tsubs.forEach((f) => f())
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); tsubs.forEach((f) => f()) }, 3200)
}
export function Toasts() {
  const list = useSyncExternalStore((f) => { tsubs.add(f); return () => tsubs.delete(f) }, () => toasts)
  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {list.map((t) => <div key={t.id} className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{t.text}</div>)}
    </div>
  )
}

/* ---------- formatting ---------- */
export const tk = (n) => `৳${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
export const fdate = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}
export const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/* ---------- small components ---------- */
const TONES = {
  amber: 'bg-amber-100 text-amber-800', sky: 'bg-sky-100 text-sky-800', violet: 'bg-violet-100 text-violet-800', indigo: 'bg-indigo-100 text-indigo-800',
  orange: 'bg-orange-100 text-orange-800', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-700', rose: 'bg-rose-100 text-rose-700', gray: 'bg-gray-100 text-gray-700',
}
export function Pill({ s, tone, children }) {
  const st = STATUS[s]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone || st?.c || 'gray']}`}>{children || st?.t || s}</span>
}

export function Kpi({ label, value, sub, tone = 'border-brand' }) {
  return (
    <div className={`rounded-lg border border-line border-l-4 bg-white p-4 ${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function Panel({ title, sub, children, className = '', action }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-white p-4 ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{title} {sub && <span className="text-xs font-normal text-muted">{sub}</span>}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Modal({ open, onClose, title, children, wide = false, drawer = false }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={drawer
        ? 'relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-xl'
        : `relative m-auto flex max-h-[92vh] w-[94%] flex-col rounded-lg bg-white shadow-xl ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 font-bold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-xl leading-none hover:bg-surface" aria-label="Close">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Empty({ children = 'Nothing here' }) {
  return <div className="py-10 text-center text-sm text-muted">{children}</div>
}

export function Chips({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([k, label, count]) => (
        <button key={k} onClick={() => onChange(k)} className={`rounded-full border px-3 py-1 text-sm ${value === k ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}>
          {label}{count !== undefined && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${value === k ? 'bg-white/20' : 'bg-surface'}`}>{count}</span>}
        </button>
      ))}
    </div>
  )
}

export function HBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  if (!rows.length) return <p className="text-sm text-muted">No data for this period</p>
  return (
    <div className="space-y-2">
      {rows.map(([label, v, display]) => (
        <div key={label} className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-2 text-sm">
          <span className="truncate" title={label}>{label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface"><i className="block h-full rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="tabular-nums text-muted">{display ?? v}</span>
        </div>
      ))}
    </div>
  )
}
