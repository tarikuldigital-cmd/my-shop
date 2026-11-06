// Single place where environment variables are read.
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'
/** Live mode = the real PHP + MySQL backend (api/). */
export const LIVE = !USE_MOCK
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL || 'https://bookshelf.com.bd/public/uploads').replace(/\/$/, '')

/** Resolve a stored relative upload path (e.g. "product/123.jpg") to a full URL. */
export function assetUrl(path) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  if (path.startsWith('/')) return `${location.origin}${path}` // files stored on this same site, e.g. /uploads/product/x.webp
  return `${ASSET_BASE_URL}/${path.replace(/^\//, '')}`
}

/** Absolute link to a storefront route that works in both router modes and any sub-folder
 *  (admin panel, SMS tracking links, chat). Always a full https://… URL. */
export function storeUrl(path = '/') {
  const root = new URL(import.meta.env.BASE_URL || '/', `${location.origin}${location.pathname}`).href
  return import.meta.env.VITE_ROUTER === 'hash' ? `${root}#${path}` : `${root.replace(/\/$/, '')}${path}`
}
