// "Recently viewed" products, per visitor (this browser only).
const KEY = 'scg_recent'
export const getRecent = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
export function addRecent(slug) {
  try { localStorage.setItem(KEY, JSON.stringify([slug, ...getRecent().filter((s) => s !== slug)].slice(0, 12))) } catch { /* ignore */ }
}
