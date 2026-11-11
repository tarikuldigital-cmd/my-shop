import { useEffect } from 'react'
import { S } from '../store/db'
import { assetUrl } from '../config/env'

const setMeta = (attr, key, content) => {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m) }
  m.setAttribute('content', content || '')
}

/**
 * Per-page SEO. Defaults come from Admin → Settings → SEO.
 * SPA note: Google renders JavaScript, but Facebook/WhatsApp previews read raw HTML —
 * in the Laravel phase render these tags server-side (see docs/BACKEND_API_SPEC.md).
 */
export function useSeo({ title, description, image, jsonLd, noindex } = {}) {
  useEffect(() => {
    const seo = S.settings.seo
    const fullTitle = title ? `${title}${seo.titleSuffix || ''}` : seo.title
    const desc = (description || seo.description || '').replace(/<[^>]+>/g, '').slice(0, 160)
    const img = assetUrl(image && !image.includes('idb:') ? image : seo.ogImage)
    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('name', 'keywords', seo.keywords)
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:type', [].concat(jsonLd?.['@type'] || []).includes('Product') ? 'product' : 'website')
    setMeta('name', 'twitter:card', 'summary_large_image')
    let canon = document.head.querySelector('link[rel=canonical]')
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon) }
    canon.href = location.href.split('#')[0].split('?')[0]
    let ld = document.getElementById('jsonld')
    if (jsonLd) {
      if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'jsonld'; document.head.appendChild(ld) }
      ld.textContent = JSON.stringify(jsonLd)
    } else ld?.remove()
  }, [title, description, image, noindex, JSON.stringify(jsonLd)])
}

export function productJsonLd(p, url) {
  const vs = p.variants?.length ? p.variants : null
  const prices = vs ? vs.map((v) => v.price) : [p.price]
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: p.images.filter((i) => !i.startsWith('idb:')).map((i) => assetUrl(i.includes('/') ? i : `product/${i}`)),
    ...(p.shortDescription ? { description: p.shortDescription } : {}),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    sku: p.sku || String(p.id),
    offers: vs && vs.length > 1 ? {
      '@type': 'AggregateOffer', url, priceCurrency: 'BDT', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: vs.length,
      availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    } : {
      '@type': 'Offer', url, priceCurrency: 'BDT', price: p.price,
      availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Smart China Gallery' },
    },
  }
}
