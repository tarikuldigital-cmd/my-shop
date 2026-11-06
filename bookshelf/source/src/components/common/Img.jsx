import { useEffect, useState } from 'react'
import { assetUrl } from '../../config/env'

// "local:logo.webp" = a file shipped with the site (public/), not the upload folder
const localUrl = (p) => `${import.meta.env.BASE_URL}${p.slice(6)}`
import { idbUrl } from '../../lib/imageStore'

/**
 * Image from the upload folder, an https:// link, or a demo upload ("idb:…"),
 * with an honest placeholder when the source is missing or broken.
 */
export default function Img({ src, alt = '', className = '', folder = 'product', ...rest }) {
  const [failed, setFailed] = useState(false)
  const [idb, setIdb] = useState(null)
  const isIdb = typeof src === 'string' && src.startsWith('idb:')

  useEffect(() => {
    setFailed(false)
    if (!isIdb) return
    let alive = true
    idbUrl(src).then((u) => { if (!alive) return; u ? setIdb(u) : setFailed(true) }).catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [src, isIdb])

  const url = isIdb ? idb : src?.startsWith?.('local:') ? localUrl(src) : src ? assetUrl(src.includes('/') ? src : `${folder}/${src}`) : null
  if (!src || failed || (!url && !isIdb)) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-center text-xs text-muted ${className}`} role="img" aria-label={alt}>
        ছবি পাওয়া যায়নি
      </div>
    )
  }
  if (!url) return <div className={`animate-pulse bg-gray-100 ${className}`} aria-hidden="true" />
  return <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} {...rest} />
}
