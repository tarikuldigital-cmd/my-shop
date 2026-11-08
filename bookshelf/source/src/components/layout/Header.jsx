import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../common/Icon'
import Img from '../common/Img'
import { useSite } from '../../context/SiteContext'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import CartDrawer from './CartDrawer'
import { suggest } from '../../services/catalogService'

function SearchBox({ onDone, className = '' }) {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('keyword') || '')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const hits = open ? suggest(q) : []
  const go = (path) => { setOpen(false); navigate(path); onDone?.() }
  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    go(`/search?keyword=${encodeURIComponent(q.trim())}`)
  }
  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={submit} className="flex w-full overflow-hidden rounded-md border-2 border-brand bg-white" role="search">
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="বইয়ের নাম বা লেখকের নাম লিখে খুঁজুন..." className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" aria-label="Search products" autoComplete="off" />
        <button className="bg-brand px-4 text-white" aria-label="Search"><Icon name="search" /></button>
      </form>
      {hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-line bg-white shadow-lg">
          {hits.map((p) => (
            <li key={p.slug}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/product/${p.slug}`)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface">
                <Img src={p.images[0]} alt="" className="h-12 w-9 shrink-0 rounded object-cover text-[6px]" />
                <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm">{p.name}</span>{p.author && <span className="block text-xs text-muted">{p.author}</span>}</span>
                <span className="text-sm font-semibold text-accent">৳{p.price}</span>
              </button>
            </li>
          ))}
          <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={submit} className="w-full bg-surface px-3 py-2 text-left text-sm font-semibold text-brand">"{q}" এর সব ফলাফল দেখুন →</button></li>
        </ul>
      )}
    </div>
  )
}

function DesktopNav({ categories }) {
  return (
    <nav className="hidden bg-brand lg:block">
      <ul className="container-x flex flex-wrap items-center">
        {categories.map((c) => (
          <li key={c.slug} className="group relative">
            <NavLink to={`/category/${c.slug}`} className={({ isActive }) => `flex items-center gap-1 px-3 py-3 text-sm font-medium text-white hover:bg-brand-dark ${isActive ? 'bg-brand-dark' : ''}`}>
              {c.name}
              {c.subcategories?.length > 0 && <Icon name="chevronDown" className="h-3.5 w-3.5" />}
            </NavLink>
            {c.subcategories?.length > 0 && (
              <ul className="invisible absolute left-0 top-full z-30 min-w-48 rounded-b-md bg-white py-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                {c.subcategories.map((s) => (
                  <li key={s.slug}><Link to={`/subcategory/${s.slug}`} className="block px-4 py-2 text-sm hover:bg-surface hover:text-brand">{s.name}</Link></li>
                ))}
              </ul>
            )}
          </li>
        ))}
        <li className="ml-auto">
          <NavLink to="/blog" className={({ isActive }) => `flex items-center gap-1 px-3 py-3 text-sm font-semibold text-white hover:bg-accent ${isActive ? 'bg-accent' : 'bg-accent/85'}`}>IELTS জ্ঞানকেন্দ্র</NavLink>
        </li>
      </ul>
    </nav>
  )
}

function MobileMenu({ open, onClose, categories }) {
  const [expanded, setExpanded] = useState(null)
  const { user } = useAuth()
  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white shadow-xl transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
          <span className="font-semibold">Categories</span>
          <button onClick={onClose} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <ul className="divide-y divide-line">
          {categories.map((c) => (
            <li key={c.slug}>
              <div className="flex items-center">
                <Link to={`/category/${c.slug}`} onClick={onClose} className="flex-1 px-4 py-3 text-sm font-medium">{c.name}</Link>
                {c.subcategories?.length > 0 && (
                  <button className="px-4 py-3" onClick={() => setExpanded(expanded === c.slug ? null : c.slug)} aria-label={`Show ${c.name} subcategories`}>
                    <Icon name="chevronDown" className={`h-4 w-4 transition ${expanded === c.slug ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              {expanded === c.slug && (
                <ul className="bg-surface">
                  {c.subcategories.map((s) => (
                    <li key={s.slug}><Link to={`/subcategory/${s.slug}`} onClick={onClose} className="block px-8 py-2.5 text-sm">{s.name}</Link></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line p-4 text-sm">
          <Link to="/blog" onClick={onClose} className="block py-1.5 font-bold text-accent">IELTS জ্ঞানকেন্দ্র</Link>
          <Link to="/ielts-guide" onClick={onClose} className="block py-1.5">আইইএলটিএস রোডম্যাপ</Link>
          <Link to="/customer/order-track" onClick={onClose} className="block py-1.5">Track Order</Link>
          {user
            ? <Link to="/customer/account" onClick={onClose} className="block py-1.5">My Account</Link>
            : <Link to="/customer/login" onClick={onClose} className="block py-1.5">Login / Sign Up</Link>}
        </div>
      </aside>
    </div>
  )
}

export default function Header() {
  const { settings, categories } = useSite()
  const { count } = useCart()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false); setCartOpen(false) }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-brand-dark text-xs text-white">
        <div className="container-x flex items-center justify-between gap-3 py-1.5">
          <p className="line-clamp-1">{settings.topBarText}</p>
          <a href={`tel:${settings.phone}`} className="hidden shrink-0 items-center gap-1 font-semibold sm:flex">
            <Icon name="phone" className="h-3.5 w-3.5" /> {settings.phone}
          </a>
        </div>
      </div>

      {/* Main header */}
      <div className="container-x flex items-center gap-3 py-3">
        <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" className="h-6 w-6" /></button>
        <Link to="/" className="shrink-0" aria-label="Bookshelf home">
          <Img src={settings.logoDark} alt="Bookshelf" className="h-11 w-auto sm:h-14" />
        </Link>
        <SearchBox className="mx-auto hidden max-w-xl md:block" />
        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <Link to="/customer/order-track" className="hidden text-sm font-medium hover:text-brand lg:block">Track Order</Link>
          <Link to={user ? '/customer/account' : '/customer/login'} className="flex items-center gap-1 text-sm font-medium hover:text-brand">
            <Icon name="user" />
            <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Login / Sign Up'}</span>
          </Link>
          <button onClick={() => setCartOpen(true)} className="relative" aria-label={`Cart, ${count} items`}>
            <Icon name="cart" className="h-7 w-7" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{count}</span>
          </button>
        </div>
      </div>
      <div className="container-x pb-3 md:hidden"><SearchBox /></div>

      <DesktopNav categories={categories} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}
