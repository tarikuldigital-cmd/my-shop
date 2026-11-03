// Single place where environment variables are read.
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL || 'https://bookshelf.com.bd/public/uploads').replace(/\/$/, '')

/** Resolve a stored relative upload path (e.g. "product/123.jpg") to a full URL. */
export function assetUrl(path) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${ASSET_BASE_URL}/${path.replace(/^\//, '')}`
}
