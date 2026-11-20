/*
 * Admin roles. Must match ADMIN_ROLES in api/lib/team.php (the server is what actually enforces them —
 * this file only decides what the menu and pages show).
 */
export const ROLES = {
  super_admin: { label: 'Super Admin', bn: 'Super Admin', tone: 'bg-brand text-white', dot: 'bg-brand', icon: '👑', desc: 'Can see and do everything. Only the Super Admin can add team members, change roles and remove people.', perms: ['*'] },
  admin: { label: 'Admin', bn: 'Admin', tone: 'bg-accent text-white', dot: 'bg-accent', icon: '🛡️', desc: 'Every section except Team & roles — orders, products, homepage, coupons, settings.', perms: ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages', 'reviews', 'products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'settings'] },
  order_manager: { label: 'Order Manager', bn: 'Order Manager', tone: 'bg-sky-600 text-white', dot: 'bg-sky-600', icon: '📦', desc: 'Handles orders, courier, incomplete orders, customers, chat and SMS. Cannot see products or settings.', perms: ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages'] },
  support: { label: 'Customer Support', bn: 'Customer Support', tone: 'bg-violet-600 text-white', dot: 'bg-violet-600', icon: '🎧', desc: 'Views / confirms orders, customers, live chat, messages and reviews.', perms: ['orders', 'incomplete', 'customers', 'complaints', 'chat', 'messages', 'reviews'] },
  content: { label: 'Content Editor', bn: 'Content Editor', tone: 'bg-emerald-600 text-white', dot: 'bg-emerald-600', icon: '✏️', desc: 'Products, categories, landing pages, homepage, coupons and info pages. Cannot see orders.', perms: ['products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'reviews'] },
}
export const ROLE_KEYS = Object.keys(ROLES)

export const PERM_LABELS = {
  dashboard: 'Dashboard', orders: 'Orders', incomplete: 'Incomplete orders', customers: 'Customers', complaints: 'Complain Box', chat: 'Live chat', sms: 'SMS', messages: 'Messages', reviews: 'Reviews',
  products: 'Products', categories: 'Categories', landings: 'Landing pages', homepage: 'Homepage & banners', coupons: 'Coupons', pages: 'Info pages', settings: 'Settings & keys', team: 'Team & roles',
}

/** admin menu path → permission */
export const ROUTE_PERM = {
  '': 'dashboard', orders: 'orders', incomplete: 'incomplete', customers: 'customers', complaints: 'complaints', chat: 'chat', sms: 'sms', messages: 'messages', reviews: 'reviews',
  products: 'products', categories: 'categories', 'landing-pages': 'landings', homepage: 'homepage', coupons: 'coupons', pages: 'pages', settings: 'settings', team: 'team',
}

export const permsOf = (acc) => acc?.perms || ROLES[acc?.role]?.perms || []
export const can = (acc, perm) => { const p = permsOf(acc); return p.includes('*') || p.includes(perm) }
/** first admin page this account may open (for redirects) */
export const homePath = (acc) => { const hit = Object.entries(ROUTE_PERM).find(([, perm]) => can(acc, perm)); return hit ? `/admin${hit[0] ? '/' + hit[0] : ''}` : '/admin' }
export const initials = (name = '') => (name.trim().charAt(0) || '?').toUpperCase()
