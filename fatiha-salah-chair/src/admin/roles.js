/*
 * Admin roles. Must match ADMIN_ROLES in api/lib/team.php (the server is what actually enforces them —
 * this file only decides what the menu and pages show).
 */
export const ROLES = {
  super_admin: { label: 'Super Admin', bn: 'সুপার অ্যাডমিন', tone: 'bg-brand text-white', dot: 'bg-brand', icon: '👑', desc: 'সবকিছু দেখতে ও করতে পারবেন। একমাত্র Super Admin-ই টিম মেম্বার যোগ, রোল পরিবর্তন ও মুছতে পারেন।', perms: ['*'] },
  admin: { label: 'Admin', bn: 'অ্যাডমিন', tone: 'bg-accent text-white', dot: 'bg-accent', icon: '🛡️', desc: 'টিম ম্যানেজমেন্ট ছাড়া সব সেকশন — অর্ডার, প্রোডাক্ট, হোমপেজ, কুপন, সেটিংস।', perms: ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages', 'reviews', 'products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'settings'] },
  order_manager: { label: 'Order Manager', bn: 'অর্ডার ম্যানেজার', tone: 'bg-sky-600 text-white', dot: 'bg-sky-600', icon: '📦', desc: 'অর্ডার, কুরিয়ার, ইনকমপ্লিট অর্ডার, কাস্টমার, চ্যাট ও SMS সামলাবেন। প্রোডাক্ট বা সেটিংস দেখবেন না।', perms: ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages'] },
  support: { label: 'Customer Support', bn: 'কাস্টমার সাপোর্ট', tone: 'bg-violet-600 text-white', dot: 'bg-violet-600', icon: '🎧', desc: 'অর্ডার দেখা/কনফার্ম, কাস্টমার, লাইভ চ্যাট, মেসেজ ও রিভিউ।', perms: ['orders', 'incomplete', 'customers', 'complaints', 'chat', 'messages', 'reviews'] },
  content: { label: 'Content Editor', bn: 'কনটেন্ট এডিটর', tone: 'bg-emerald-600 text-white', dot: 'bg-emerald-600', icon: '✏️', desc: 'প্রোডাক্ট, ক্যাটাগরি, ল্যান্ডিং পেজ, হোমপেজ, কুপন ও ইনফো পেজ। অর্ডার দেখবেন না।', perms: ['products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'reviews'] },
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
