// "Recently viewed" books, per visitor (this browser only).
const KEY = 'bookshelf_recent'
export const getRecent = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
export function addRecent(slug) {
  try { localStorage.setItem(KEY, JSON.stringify([slug, ...getRecent().filter((s) => s !== slug)].slice(0, 12))) } catch { /* ignore */ }
}
