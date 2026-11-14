import { NavLink, useNavigate } from 'react-router-dom'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../context/AuthContext'

/** Sidebar layout shared by the customer dashboard pages. */
export default function AccountShell({ title, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const link = ({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-brand text-white' : 'hover:bg-surface'}`
  return (
    <div className="container-x py-6">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-4">
          <div className="mb-4 border-b border-line pb-3">
            <p className="font-bold">{user?.name}</p>
            <p className="text-sm text-muted">{user?.phone}</p>
          </div>
          <nav className="space-y-1">
            <NavLink end to="/customer/account" className={link}><Icon name="user" className="h-4 w-4" />My Profile</NavLink>
            <NavLink to="/customer/orders" className={link}><Icon name="box" className="h-4 w-4" />My Orders</NavLink>
            <NavLink to="/customer/order-track" className={link}><Icon name="truck" className="h-4 w-4" />Track Order</NavLink>
            <button onClick={async () => { await logout(); navigate('/') }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Icon name="logout" className="h-4 w-4" />Logout</button>
          </nav>
        </aside>
        <section className="min-w-0">
          <h1 className="mb-4 text-xl font-bold text-brand">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  )
}
