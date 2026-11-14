export const formatPrice = (n) => `৳ ${Number(n || 0).toLocaleString('en-IN')}`

/** Discount % rounded the way the live site does (e.g. 650→150 = 77%). */
export const discountPercent = (price, oldPrice) =>
  oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0

const bnDigits = '০১২৩৪৫৬৭৮৯'
export const toBnDigits = (v) => String(v).replace(/\d/g, (d) => bnDigits[d])

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
