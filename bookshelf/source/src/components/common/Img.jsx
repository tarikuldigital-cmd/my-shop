import { useState } from 'react'
import { assetUrl } from '../../config/env'

/** Image from the upload folder, with an honest placeholder when the source is missing or broken. */
export default function Img({ src, alt = '', className = '', folder = 'product', ...rest }) {
  const [failed, setFailed] = useState(false)
  const url = src ? assetUrl(src.includes('/') ? src : `${folder}/${src}`) : null
  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-center text-xs text-muted ${className}`} role="img" aria-label={alt}>
        ছবি পাওয়া যায়নি
      </div>
    )
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} {...rest} />
}
