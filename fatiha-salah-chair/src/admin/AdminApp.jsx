import { useEffect, useState } from 'react'
import { fraudCheck } from './fraud'
import { liveCourierRefreshAll } from '../lib/live'
import CourierBell from './CourierBell'
import { LiveBadge } from './LiveVisitors'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { S, save, useDb } from '../store/db'
import { Toasts, toast } from './ui'
import Img from '../components/common/Img'
import Icon from '../components/common/Icon'
import Dashboard from './Dashboard'
import Orders from './Orders'
import Incomplete from './Incomplete'
import Products from './Products'
import Categories from './Categories'
import HomeEditor from './HomeEditor'
import { Coupons, Customers, Messages, Reviews, Pages } from './Misc'
import Settings from './Settings'
import Team from './Team'
import Complaints from './Complaints'
import { ROLES, ROUTE_PERM, can, homePath, initials, permsOf } from './roles'
import Sms from './Sms'
import Landings from './Landings'
import LiveChat from './LiveChat'
import { storeUrl, LIVE } from '../config/env'
import { adminLogin, adminLogout, resumeAdmin, syncState, onSyncState, flush } from '../lib/live'

/* Demo login only (browser storage). The live site logs in against the server — see lib/live.js. */
const DEMO = { email: 'admin@fatihaayatsalahchair.com', pass: '123456' }
const AUTH_KEY = 'fatiha_admin'
const demoAccount = (m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, active: m.active, created: m.created, lastLogin: m.lastLogin, perms: ROLES[m.role].perms })
/** demo: restore the member who logged in earlier in this browser tab */
const demoResume = () => {
  const id = Number(sessionStorage.getItem(AUTH_KEY))
  const m = id && (S.team || []).find((x) => x.id === id && x.active)
  if (!m) return false
  S.account = demoAccount(m); return true
}

function Login({ onOk }) {
  const [email, setEmail] = useState(LIVE ? '' : DEMO.email)
  const [pass, setPass] = useState(LIVE ? '' : DEMO.pass)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form className="card w-full max-w-sm space-y-4 p-6" onSubmit={async (e) => {
        e.preventDefault()
        if (LIVE) { setBusy(true); setErr(''); try { await adminLogin(email.trim(), pass); onOk() } catch (x) { setErr(x.message) } finally { setBusy(false) } return }
        const m = (S.team || []).find((x) => x.email === email.trim().toLowerCase() && x.pass === pass)
        if (!m) return setErr('Wrong email or password')
        if (!m.active) return setErr('এই অ্যাকাউন্টটি বন্ধ করা আছে — Super Admin এর সাথে যোগাযোগ করুন')
        m.lastLogin = Date.now(); S.account = demoAccount(m); save(); sessionStorage.setItem(AUTH_KEY, String(m.id)); onOk()
      }}>
        <Img src={S.settings.logoDark} alt="Fatiha Ayat Salah Chair" className="mx-auto h-24" />
        <h1 className="text-center text-xl font-bold">Admin login</h1>
        <label className="block"><span className="field-label">Email</span><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="block"><span className="field-label">Password</span><input className="field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-brand w-full py-2.5" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        {!LIVE && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Demo login: {DEMO.email} / {DEMO.pass} (Super Admin). Other demo roles: rafi@… (Order Manager), lina@… (Content) — same password. Not real security — the live site has a server-side login.</p>}
        <Link to="/" className="block text-center text-sm text-brand">← Back to the store</Link>
      </form>
    </div>
  )
}

const NAV = [
  ['Orders', [['', 'Dashboard'], ['orders', 'Orders', () => S.orders.filter((o) => o.status === 'pending').length], ['incomplete', 'Incomplete orders', () => S.incomplete.filter((x) => x.status === 'new').length]]],
  ['Customers', [['customers', 'Customers'], ['complaints', 'Complain Box', () => (S.complaints || []).filter((c) => c.unread || c.status === 'submitted').length], ['chat', 'Live chat', () => S.chats.filter((c) => Date.now() - (c.updated || c.at) < 864e5).length], ['sms', 'SMS', () => S.smsLog.filter((x) => x.status !== 'sent' && Date.now() - x.at < 864e5).length], ['messages', 'Messages', () => S.messages.filter((m) => !m.read).length], ['reviews', 'Reviews', () => S.reviews.filter((r) => !r.approved).length]]],
  ['Catalogue', [['products', 'Products'], ['categories', 'Categories'], ['landing-pages', 'Landing pages'], ['homepage', 'Homepage & banners'], ['coupons', 'Coupons'], ['pages', 'Info pages']]],
  ['Store', [['settings', 'Settings, Pixel & SEO'], ['team', 'Team & roles']]],
]

export default function AdminApp() {
  const [ok, setOk] = useState(() => !LIVE && demoResume())
  const [checking, setChecking] = useState(LIVE)
  useEffect(() => { if (LIVE) resumeAdmin().then(setOk).finally(() => setChecking(false)) }, [])
  const [, setTick] = useState(0)
  useEffect(() => onSyncState(() => setTick((n) => n + 1)), [])
  // a customer just ordered → toast + short beep + tab title
  useEffect(() => {
    const on = (e) => {
      toast(`🛒 নতুন অর্ডার ${e.detail.invoice} — ${e.detail.name} · ৳${e.detail.total}`)
      if (LIVE && e.detail.phone) fraudCheck(e.detail.phone).catch(() => {}) // Steadfast courier history for every new order
      document.title = `🛒 নতুন অর্ডার! | Admin`
      try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close() }, 250) } catch { /* no audio */ }
    }
    const onCmp = (e) => { toast(`📮 নতুন অভিযোগ ${e.detail.id} — ${e.detail.name}`); document.title = '📮 নতুন অভিযোগ! | Admin' }
    window.addEventListener('fatiha:new-order', on)
    window.addEventListener('fatiha:new-complaint', onCmp)
    return () => { window.removeEventListener('fatiha:new-order', on); window.removeEventListener('fatiha:new-complaint', onCmp) }
  }, [])
  // No webhook on this Steadfast account → while the admin is open, pull courier status + rider notes every 15 minutes
  useEffect(() => {
    if (!LIVE || !ok) return
    const run = () => {
      const open = S.orders.some((o) => o.courier === 'steadfast' && o.tracking && ['ready', 'transit', 'hold'].includes(o.status))
      if (open && !document.hidden) liveCourierRefreshAll().catch(() => {})
    }
    const first = setTimeout(run, 20000)
    const t = setInterval(run, 15 * 60000)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [ok])
  const [menu, setMenu] = useState(false)
  // installable admin app (PWA): manifest + service worker + "Install" button
  const [installEv, setInstallEv] = useState(null)
  useEffect(() => {
    const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); el.dataset.adminPwa = '1'; document.head.appendChild(el); return el }
    add('link', { rel: 'manifest', href: '/admin-manifest.json' })
    add('link', { rel: 'apple-touch-icon', href: '/admin-icon-192.png' })
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' })
    add('meta', { name: 'apple-mobile-web-app-title', content: 'Fatiha Admin' })
    if (LIVE && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {})
    const onPrompt = (e) => { e.preventDefault(); setInstallEv(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); document.querySelectorAll('[data-admin-pwa]').forEach((n) => n.remove()) }
  }, [])
  const loc = useLocation()
  useDb()
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); document.title = 'Admin | Fatiha Ayat Salah Chair' }, [loc.pathname])
  if (checking) return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
  if (!ok) return <Login onOk={() => setOk(true)} />

  const link = ({ isActive }) => `flex items-center justify-between rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10'}`
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto bg-brand-dark p-3 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/admin" className="mb-4 block rounded bg-white p-2"><Img src={S.settings.logoDark} alt="Fatiha Ayat Salah Chair" className="mx-auto h-12" /></Link>
        {NAV.map(([group, allItems]) => {
          const items = allItems.filter(([to]) => can(S.account, ROUTE_PERM[to]))
          if (!items.length) return null
          return (
          <div key={group} className="mb-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">{group}</p>
            {items.map(([to, label, badge]) => {
              const n = badge?.()
              return <NavLink key={to} end to={`/admin${to ? '/' + to : ''}`} className={link}>{label}{n ? <span className="rounded-full bg-accent px-1.5 text-xs text-white">{n}</span> : null}</NavLink>
            })}
          </div>
          )
        })}
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          {S.account && (
            <div className="mx-3 flex items-center gap-2.5 rounded-lg bg-white/10 p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/90 text-sm font-bold text-brand-dark">{initials(S.account.name)}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{S.account.name}</span><span className="block truncate text-[11px] text-white/70">{ROLES[S.account.role]?.icon} {ROLES[S.account.role]?.label}</span></span>
            </div>
          )}
          {LIVE && <p className={`mx-3 rounded px-2 py-1 text-xs ${syncState.status === 'error' ? 'bg-red-500/30 text-red-100' : 'bg-white/10 text-white/70'}`}>{syncState.status === 'saving' ? '⏳ Saving…' : syncState.status === 'error' ? `⚠ Not saved: ${syncState.error} — retrying` : '✓ All changes saved'}</p>}
          {installEv && <button onClick={async () => { installEv.prompt(); await installEv.userChoice; setInstallEv(null) }} className="mx-3 block rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white">📲 ফোনে অ্যাপ ইনস্টল করুন</button>}
          <a href={storeUrl('/')} target="_blank" rel="noreferrer" className="block px-3 text-sm text-white/80 hover:text-white">View store ↗</a>
          <button onClick={async () => { if (LIVE) { await flush(); await adminLogout() } else { sessionStorage.removeItem(AUTH_KEY); S.account = null } setOk(false) }} className="block px-3 text-sm text-white/80 hover:text-white">Log out</button>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMenu(true)} aria-label="Open admin menu"><Icon name="menu" /></button>
          <span className="flex-1 font-bold">Fatiha Admin</span>
          <LiveBadge />
          <CourierBell />
        </header>
        <div className="sticky top-0 z-20 hidden justify-end border-b border-line bg-white/90 px-6 py-1.5 backdrop-blur lg:flex lg:items-center lg:gap-3"><LiveBadge /><CourierBell /></div>
        <main className="p-4 sm:p-6">
          <Routes>
            {[
              [undefined, '', <Dashboard />], ['orders', 'orders', <Orders />], ['incomplete', 'incomplete', <Incomplete />], ['customers', 'customers', <Customers />], ['complaints', 'complaints', <Complaints />], ['messages', 'messages', <Messages />],
              ['sms', 'sms', <Sms />], ['chat', 'chat', <LiveChat />], ['reviews', 'reviews', <Reviews />], ['products', 'products', <Products />], ['categories', 'categories', <Categories />],
              ['landing-pages', 'landing-pages', <Landings />], ['homepage', 'homepage', <HomeEditor />], ['coupons', 'coupons', <Coupons />], ['pages', 'pages', <Pages />], ['settings', 'settings', <Settings />], ['team', 'team', <Team />],
            ].map(([path, key, el]) => {
              const ok = can(S.account, ROUTE_PERM[key])
              const view = ok ? el : permsOf(S.account).length ? <Navigate to={homePath(S.account)} replace /> : <p className="p-10 text-center text-muted">এই অ্যাকাউন্টে কোনো সেকশনের অনুমতি নেই — Super Admin-এর সাথে যোগাযোগ করুন।</p>
              return path === undefined ? <Route key="index" index element={view} /> : <Route key={path} path={path} element={view} />
            })}
            <Route path="*" element={permsOf(S.account).length ? <Navigate to={homePath(S.account)} replace /> : null} />
          </Routes>
        </main>
      </div>
      <Toasts />
    </div>
  )
}

