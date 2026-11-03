import api from '../config/api'
import { USE_MOCK } from '../config/env'
import { putImage, resizeImage } from '../lib/imageStore'

export const MAX_UPLOAD_MB = 10
const SIZES = { product: 1200, page: 1600, banner: 1920, category: 600 }

/**
 * Upload one image and return the reference to store on the product/banner/category.
 * kind: 'product' | 'page' (look-inside) | 'banner' | 'category'
 * Mock: resized in the browser → IndexedDB → "idb:<id>"
 * Live: POST /admin/uploads (multipart) → Laravel stores it and returns e.g. "product/1789…-cambridge-19.webp"
 */
export async function uploadImage(file, kind = 'product') {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name}: শুধু ছবি (JPG, PNG, WebP) আপলোড করা যাবে`)
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`${file.name}: ছবির সাইজ ${MAX_UPLOAD_MB}MB এর কম হতে হবে`)
  const { blob, width, height } = await resizeImage(file, SIZES[kind] || 1200)
  if (!USE_MOCK) {
    const body = new FormData()
    body.append('file', blob, file.name.replace(/\.\w+$/, '.webp'))
    body.append('kind', kind)
    const res = await api.post('/admin/uploads', body)
    return { ref: res.path, width, height }
  }
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  await putImage(id, blob)
  return { ref: `idb:${id}`, width, height, size: blob.size }
}
