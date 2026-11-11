import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Img from './Img'
import Icon from './Icon'

export default function BannerSlider({ banners = [], interval = 5000 }) {
  const [i, setI] = useState(0)
  const n = banners.length
  useEffect(() => {
    if (n < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % n), interval)
    return () => clearInterval(t)
  }, [n, interval])
  if (!n) return null

  return (
    <div className="relative overflow-hidden rounded-lg bg-white" aria-roledescription="carousel">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, k) => {
          // an uploaded image wins; otherwise a text banner (title / subtitle / button) on a green → light-red gradient
          const img = b.image
            ? <Img src={b.image} alt={b.title || `Offer ${k + 1}`} className="aspect-[21/9] w-full object-cover" />
            : (
              <div className="relative flex aspect-[21/9] w-full items-center overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-accent px-6 text-white sm:px-14">
                <span className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" aria-hidden="true" />
                <span className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
                <div className="relative max-w-xl">
                  <p className="text-xl font-extrabold leading-tight sm:text-4xl">{b.title || 'Smart China Gallery'}</p>
                  {b.sub && <p className="mt-2 text-sm text-white/90 sm:text-lg">{b.sub}</p>}
                  {b.cta && <span className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-accent shadow sm:text-base">{b.cta} →</span>}
                </div>
              </div>
            )
          return (
            <div key={k} className="w-full shrink-0" aria-hidden={k !== i}>
              {b.link ? <Link to={b.link}>{img}</Link> : img}
            </div>
          )
        })}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => setI((i - 1 + n) % n)} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow sm:block" aria-label="Previous banner"><Icon name="chevronLeft" /></button>
          <button onClick={() => setI((i + 1) % n)} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow sm:block" aria-label="Next banner"><Icon name="chevronRight" /></button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, k) => (
              <button key={k} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-2 bg-white/80'}`} aria-label={`Go to banner ${k + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
