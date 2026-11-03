/*
 * Uploaded images for the demo (no server yet): resized in the browser and kept in IndexedDB
 * (much more space than localStorage). Stored references look like "idb:<id>".
 * With the Laravel backend, uploadService sends the file to the server instead and stores its path.
 */
const DB = 'bookshelf_images'
const STORE = 'images'
let dbp
const open = () => (dbp ||= new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
}))
const tx = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => res(req?.result)
    t.onerror = () => rej(t.error)
  })
}

export const putImage = (id, blob) => tx('readwrite', (s) => s.put(blob, id))
export const getImage = (id) => tx('readonly', (s) => s.get(id))
export const deleteImage = (id) => tx('readwrite', (s) => s.delete(id))
export async function allImages() {
  const db = await open()
  return new Promise((res, rej) => {
    const out = {}
    const t = db.transaction(STORE, 'readonly')
    const c = t.objectStore(STORE).openCursor()
    c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue() } }
    t.oncomplete = () => res(out)
    t.onerror = () => rej(t.error)
  })
}

const urlCache = new Map()
/** Object URL for an "idb:" reference (cached for the page's lifetime). */
export async function idbUrl(ref) {
  if (urlCache.has(ref)) return urlCache.get(ref)
  const blob = await getImage(ref.slice(4))
  const url = blob ? URL.createObjectURL(blob) : null
  urlCache.set(ref, url)
  return url
}

/** Shrink a photo before saving: max side in px, WebP (JPEG fallback). Keeps transparency for PNG/WebP sources. */
export async function resizeImage(file, maxSide = 1200, quality = 0.85) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const toBlob = (type) => new Promise((r) => canvas.toBlob(r, type, quality))
  const blob = (await toBlob('image/webp')) || (await toBlob('image/jpeg'))
  return { blob, width: w, height: h }
}
