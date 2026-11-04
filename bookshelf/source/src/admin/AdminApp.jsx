import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { S, save, useDb } from '../store/db'
import { Toasts } from './ui'
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
import Sms from './Sms'
import Landings from './Landings'
import LiveChat from './LiveChat'
import { storeUrl } from '../config/env'

/* Demo login only — the Laravel phase replaces this with a server session (Sanctum) + roles. */
const DEMO = { email: 'admin@bookshelf.com.bd', pass: '123456' }
const AUTH_KEY = 'bookshelf_admin'

function Login({ onOk }) {
  const [email, setEmail] = useState(DEMO.email)
  const [pass, setPass] = useState(DEMO.pass)
  const [err, setErr] = useState('')
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form className="card w-full max-w-sm space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault()
        if (email.trim() === DEMO.email && pass === DEMO.pass) { sessionStorage.setItem(AUTH_KEY, '1'); onOk() } else setErr('Wrong email or password')
      }}>
        <Img src={S.settings.logoDark} alt="Bookshelf" className="mx-auto h-10" />
        <h1 className="text-center text-xl font-bold">Admin login</h1>
        <label className="block"><span className="field-label">Email</span><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="block"><span className="field-label">Password</span><input className="field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-brand w-full py-2.5">Log in</button>
        <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Demo login: {DEMO.email} / {DEMO.pass}. Not real security — the live site gets a server-side login.</p>
        <Link to="/" className="block text-center text-sm text-brand">← Back to the store</Link>
      </form>
    </div>
  )
}

const NAV = [
  ['Orders', [['', 'Dashboard'], ['orders', 'Orders', () => S.orders.filter((o) => o.status === 'pending').length], ['incomplete', 'Incomplete orders', () => S.incomplete.filter((x) => x.status === 'new').length]]],
  ['Customers', [['customers', 'Customers'], ['chat', 'Live chat', () => S.chats.filter((c) => Date.now() - (c.updated || c.at) < 864e5).length], ['sms', 'SMS', () => S.smsLog.filter((x) => x.status !== 'sent' && Date.now() - x.at < 864e5).length], ['messages', 'Messages', () => S.messages.filter((m) => !m.read).length], ['reviews', 'Reviews', () => S.reviews.filter((r) => !r.approved).length]]],
  ['Catalogue', [['products', 'Books / Products'], ['categories', 'Categories'], ['landing-pages', 'Landing pages'], ['homepage', 'Homepage & banners'], ['coupons', 'Coupons'], ['pages', 'Info pages']]],
  ['Store', [['settings', 'Settings, Pixel & SEO']]],
]

export default function AdminApp() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useDb()
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); document.title = 'Admin | Bookshelf' }, [loc.pathname])
  if (!ok) return <Login onOk={() => setOk(true)} />

  const link = ({ isActive }) => `flex items-center justify-between rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10'}`
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto bg-brand-dark p-3 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/admin" className="mb-4 block rounded bg-white p-2"><Img src={S.settings.logoDark} alt="Bookshelf" className="mx-auto h-8" /></Link>
        {NAV.map(([group, items]) => (
          <div key={group} className="mb-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">{group}</p>
            {items.map(([to, label, badge]) => {
              const n = badge?.()
              return <NavLink key={to} end to={`/admin${to ? '/' + to : ''}`} className={link}>{label}{n ? <span className="rounded-full bg-accent px-1.5 text-xs text-white">{n}</span> : null}</NavLink>
            })}
          </div>
        ))}
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <label className="block px-3 text-xs text-white/60">Working as
            <select className="mt-1 w-full rounded bg-white/10 px-2 py-1.5 text-sm text-white" value={S.me ?? 0} onChange={(e) => { S.me = +e.target.value; save() }}>
              {S.settings.staff.map((s, i) => <option key={s} value={i} className="text-ink">{s}</option>)}
            </select>
          </label>
          <a href={storeUrl('/')} target="_blank" rel="noreferrer" className="block px-3 text-sm text-white/80 hover:text-white">View store ↗</a>
          <button onClick={() => { sessionStorage.removeItem(AUTH_KEY); setOk(false) }} className="block px-3 text-sm text-white/80 hover:text-white">Log out</button>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMenu(true)} aria-label="Open admin menu"><Icon name="menu" /></button>
          <span className="font-bold">Bookshelf Admin</span>
        </header>
        <main className="p-4 sm:p-6">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="incomplete" element={<Incomplete />} />
            <Route path="customers" element={<Customers />} />
            <Route path="messages" element={<Messages />} />
            <Route path="sms" element={<Sms />} />
            <Route path="chat" element={<LiveChat />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="landing-pages" element={<Landings />} />
            <Route path="homepage" element={<HomeEditor />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="pages" element={<Pages />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
      <Toasts />
    </div>
  )
}

