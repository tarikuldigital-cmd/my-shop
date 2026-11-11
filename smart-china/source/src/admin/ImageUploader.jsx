import { useRef, useState } from 'react'
import Img from '../components/common/Img'
import { uploadImage, MAX_UPLOAD_MB } from '../services/uploadService'
import { deleteImage } from '../lib/imageStore'
import { toast } from './ui'

/**
 * Upload / reorder / remove images.
 * value: array of image refs (file name, "folder/file", https link or "idb:…")
 * multiple=false → single image (banner, category); value is still an array of 0–1 items.
 */
export default function ImageUploader({ value, onChange, kind = 'product', multiple = true, max = 10, aspect = 'aspect-[3/4]', label }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(0)
  const [drag, setDrag] = useState(false)
  const [url, setUrl] = useState('')

  const add = async (files) => {
    const list = [...files].slice(0, multiple ? max - value.length : 1)
    if (!list.length) return toast(`You can add up to ${max} images`)
    setBusy(list.length)
    const refs = []
    for (const f of list) {
      try { refs.push((await uploadImage(f, kind)).ref) } catch (e) { toast(e.message) }
      setBusy((n) => n - 1)
    }
    if (refs.length) {
      onChange(multiple ? [...value, ...refs] : refs.slice(0, 1))
      toast(`${refs.length} image(s) uploaded`)
    }
  }
  const remove = (i) => {
    const ref = value[i]
    if (ref?.startsWith('idb:')) deleteImage(ref.slice(4)).catch(() => {})
    onChange(value.filter((_, k) => k !== i))
  }
  const move = (i, d) => { const v = [...value]; const j = i + d; if (j < 0 || j >= v.length) return;[v[i], v[j]] = [v[j], v[i]]; onChange(v) }
  const addUrl = () => {
    const u = url.trim()
    if (!/^https?:\/\/\S+$/.test(u) && !/^[\w./%-]+\.(jpe?g|png|webp|gif|svg)$/i.test(u)) return toast('Enter a valid image link or file name')
    onChange(multiple ? [...value, u] : [u]); setUrl('')
  }

  const canAdd = multiple ? value.length < max : true
  return (
    <div>
      {label && <p className="field-label">{label}</p>}
      <div className={`grid gap-3 ${multiple ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1 sm:max-w-sm'}`}>
        {value.map((ref, i) => (
          <figure key={ref + i} className="group relative overflow-hidden rounded-md border border-line bg-white">
            <Img src={ref} alt={`Image ${i + 1}`} className={`${aspect} w-full object-contain p-1 text-[9px]`} />
            {multiple && i === 0 && kind === 'product' && <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>}
            {multiple && kind === 'page' && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Page {i + 1}</span>}
            <figcaption className="flex items-center justify-between gap-1 border-t border-line bg-surface px-1 py-0.5 text-xs">
              {multiple ? <span className="flex gap-1"><button type="button" onClick={() => move(i, -1)} disabled={!i} className="px-1 disabled:opacity-30" aria-label="Move left">←</button><button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="px-1 disabled:opacity-30" aria-label="Move right">→</button></span> : <span className="truncate text-muted">{ref.startsWith('idb:') ? 'Uploaded' : ref.split('/').pop()}</span>}
              <button type="button" onClick={() => remove(i)} className="px-1 text-red-600" aria-label="Remove image">Remove</button>
            </figcaption>
          </figure>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
            className={`flex ${multiple ? aspect : 'min-h-28'} flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-2 text-center text-xs transition ${drag ? 'border-accent bg-accent/5' : 'border-line bg-white hover:border-brand'}`}
          >
            {busy ? <><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" /><span>Uploading… ({busy})</span></> : <>
              <span className="text-2xl leading-none text-brand">＋</span>
              <span className="font-semibold text-brand">{value.length && !multiple ? 'Change image' : 'Upload images'}</span>
              <span className="text-muted">Click or drag & drop</span>
            </>}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <div className="mt-2 flex gap-2">
        <input className="field py-1.5 text-xs" placeholder="Or paste an image link / file name (https://… or product/abc.jpg)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())} aria-label="Image link" />
        <button type="button" className="btn-outline shrink-0 py-1.5 text-xs" onClick={addUrl}>Add</button>
      </div>
      <p className="mt-1 text-xs text-muted">JPG, PNG or WebP · up to {MAX_UPLOAD_MB}MB each · automatically compressed to WebP{multiple && ` · max ${max}`}</p>
    </div>
  )
}
