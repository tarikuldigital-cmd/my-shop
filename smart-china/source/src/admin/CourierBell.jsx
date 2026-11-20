import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { courierFeed, courierSeen, markCourierSeen, COURIER_ST } from './courierLog'
import { showTestCourierPopup } from './CourierPopup'
import { showTestPendingReminder } from './PendingReminder'
import { getSound, setSound, hasBanglaVoice, sayText } from './courierSound'

const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }

/**
 * Notification bell: every Steadfast update that arrives by webhook / refresh — rider notes (🛵), delivered, returned, hold…
 * New ones also pop up as a toast + browser notification while the admin is open.
 */
export default function CourierBell({ className = '' }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(courierSeen)
  const [snd, setSnd] = useState(getSound)
  const upd = (p) => setSnd(setSound(p))
  const pickFile = (f) => { if (!f) return; if (f.size > 600 * 1024) return alert('The file must be under 600 KB (a short mp3/wav)'); const r = new FileReader(); r.onload = () => upd({ custom: String(r.result), customName: f.name, mode: 'custom' }); r.readAsDataURL(f) }
  const feed = courierFeed()
  const unread = feed.filter((e) => e.at > seen).length
  const shown = useRef(null)
  useEffect(() => {
    const newest = feed[0]?.at || 0
    if (shown.current === null) { shown.current = newest; return }
    const fresh = feed.filter((e) => e.at > shown.current)
    if (!fresh.length) return
    shown.current = newest
    fresh.slice(0, 3).forEach((e) => {
      const text = `${e.rider ? '🛵 Rider note' : '🚚 Courier'} · ${e.invoice}: ${e.message}`
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`Smart China · ${e.invoice}`, { body: e.message, icon: '/admin-icon-192.png' }) } catch { /* not allowed */ }
    })
  })
  const toggle = () => {
    if (!open) { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch { /* ignore */ } }
    if (open) { markCourierSeen(); setSeen(Date.now()) }
    setOpen(!open)
  }
  return (
    <div className={`relative ${className}`}>
      <button onClick={toggle} className="relative rounded-full p-2 hover:bg-black/5" aria-label={`Courier notifications, ${unread} new`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={toggle} />
          <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[90vw] overflow-hidden rounded-xl border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5"><p className="font-semibold">Courier updates & rider notes</p><button className="text-xs text-brand" onClick={toggle}>Mark all as read</button></div>
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {feed.length ? feed.map((e, i) => (
                <li key={i}>
                  <button className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface ${e.at > seen ? 'bg-amber-50' : ''}`} onClick={() => { toggle(); nav(`/admin/orders?open=${e.invoice}`) }}>
                    <p className="flex justify-between gap-2 text-xs text-muted"><span><b className="text-ink">{e.invoice}</b> · {e.name}</span><span className="shrink-0">{ago(e.at)}</span></p>
                    <p className="mt-0.5">{e.rider ? '🛵 ' : '🚚 '}{e.message}</p>
                    {!e.rider && COURIER_ST[e.status] && COURIER_ST[e.status] !== e.message && <p className="text-xs text-muted">{COURIER_ST[e.status]}</p>}
                  </button>
                </li>
              )) : <li className="px-4 py-6 text-center text-sm text-muted">No courier updates yet. Once parcels are sent to Steadfast, rider notes and statuses will show up here.</li>}
            </ul>
            <div className="space-y-1.5 border-t border-line bg-surface px-4 py-2.5 text-xs">
              <label className="flex items-center justify-between gap-2 font-semibold"><span>🔊 Alert sound</span><input type="checkbox" checked={snd.on} onChange={(e) => upd({ on: e.target.checked })} /></label>
              {snd.on && (
                <>
                  <label className="flex items-center justify-between gap-2"><span>⏰ Pending-order reminder (every 30 minutes)</span><input type="checkbox" checked={snd.pending} onChange={(e) => upd({ pending: e.target.checked })} /></label>
                  <select className="field !py-1 text-xs" value={snd.mode} onChange={(e) => upd({ mode: e.target.value })}>
                    <option value="pro">Professional voice (recorded)</option>
                    <option value="voice">Browser voice — says your name</option>
                    <option value="beep">Beep only</option>
                    <option value="custom">My own audio file</option>
                  </select>
                  {snd.mode === 'voice' && <p className="text-muted">“{sayText('note')}”{hasBanglaVoice() ? '' : ' — this device has no Bangla voice, so a beep will play.'}</p>}
                  {snd.mode === 'custom' && <label className="block text-muted">{snd.customName || 'No file chosen'} <input type="file" accept="audio/*" className="mt-1 block w-full text-xs" onChange={(e) => pickFile(e.target.files?.[0])} /></label>}
                </>
              )}
            </div>
            <button className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-brand hover:bg-surface" onClick={() => { toggle(); showTestCourierPopup() }}>🔔 Show a test notification</button>
            <button className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-brand hover:bg-surface" onClick={() => { toggle(); showTestPendingReminder() }}>⏰ Test: pending reminder</button>
          </div>
        </>
      )}
    </div>
  )
}
