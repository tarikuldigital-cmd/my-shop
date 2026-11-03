import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { formatPrice, discountPercent } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link to="/" className="hover:text-brand">Home</Link></li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            <span>/</span>
            {it.to ? <Link to={it.to} className="hover:text-brand">{it.label}</Link> : <span className="font-semibold text-ink">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function DiscountBadge({ price, oldPrice, className = '' }) {
  const pct = discountPercent(price, oldPrice)
  if (!pct) return null
  return <span className={`rounded bg-sale px-2 py-0.5 text-xs font-bold text-white ${className}`}>{pct}% ছাড়</span>
}

export function Price({ price, oldPrice, size = 'sm' }) {
  const big = size === 'lg'
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`font-bold text-accent ${big ? 'text-2xl' : 'text-base'}`}>{formatPrice(price)}</span>
      {oldPrice > price && <del className={`text-muted ${big ? 'text-base' : 'text-xs'}`}>{formatPrice(oldPrice)}</del>}
    </div>
  )
}

export function Spinner({ className = 'py-16' }) {
  return (
    <div className={`flex justify-center ${className}`} role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    </div>
  )
}

export function EmptyState({ title, children, icon = 'box' }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-4 py-14 text-center">
      <Icon name={icon} className="h-12 w-12 text-muted" />
      <p className="text-lg font-semibold">{title}</p>
      {children}
    </div>
  )
}

export function Alert({ type = 'error', children }) {
  if (!children) return null
  const tone = type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`rounded-md border px-3 py-2 text-sm ${tone}`} role="alert">{children}</div>
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null
  const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1)
  const cls = (active) => `flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm ${active ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`
  return (
    <nav className="flex flex-wrap justify-center gap-1.5" aria-label="Pagination">
      <button className={cls(false)} disabled={meta.current_page === 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Previous">‹</button>
      {pages.map((p) => (
        <button key={p} className={cls(p === meta.current_page)} onClick={() => onPage(p)} aria-current={p === meta.current_page ? 'page' : undefined}>{p}</button>
      ))}
      <button className={cls(false)} disabled={meta.current_page === meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Next">›</button>
    </nav>
  )
}

export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="container-x py-10">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="text-center text-2xl font-bold text-brand">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

export function RequireAuthOutlet() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/customer/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
