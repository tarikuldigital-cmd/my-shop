import { useState } from 'react'

/**
 * "Share my location": reads the phone's GPS, turns it into a written address (OpenStreetMap / Nominatim, free)
 * and fills the address box. The exact pin (lat/lng) is kept with the order so the rider can open it in Google Maps.
 * onPick({ address, location: { lat, lng, accuracy }, insideDhaka })
 */
const pick = (a, keys) => keys.map((k) => a[k]).find(Boolean)

export function addressFromOsm(j) {
  const a = j.address || {}
  const parts = [
    [a.house_number, a.road].filter(Boolean).join(' '),
    pick(a, ['neighbourhood', 'quarter', 'hamlet', 'residential']),
    pick(a, ['suburb', 'village', 'city_district']),
    pick(a, ['town', 'city', 'municipality', 'county']),
    pick(a, ['state_district', 'district']),
  ].map((x) => (x || '').replace(/\s+(District|Division|Zila|Upazila|Thana)$/i, '').trim()).filter(Boolean)
  const uniq = parts.filter((x, i) => parts.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i)
  const text = uniq.length >= 2 ? uniq.join(', ') : String(j.display_name || '').replace(/,\s*\d{4}\b/, '').replace(/,\s*Bangladesh$/i, '')
  const city = `${a.city || ''} ${a.town || ''} ${a.city_district || ''}`.toLowerCase()
  return { text, insideDhaka: /dhaka/.test(city) && !/savar|keraniganj|gazipur|narayanganj/i.test(`${text} ${a.county || ''}`) }
}

export default function LocationButton({ onPick, className = '' }) {
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [msg, setMsg] = useState('')

  const share = () => {
    if (!navigator.geolocation) { setState('error'); setMsg('Your browser cannot share location — please type the address.'); return }
    setState('busy'); setMsg('')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords
      const location = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), accuracy: Math.round(accuracy || 0) }
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`, { headers: { Accept: 'application/json' } })
        const j = await r.json()
        const { text, insideDhaka } = addressFromOsm(j)
        onPick({ address: text, location, insideDhaka })
        setState('done'); setMsg('Location added ✓ Please add your house / flat number and a landmark.')
      } catch {
        onPick({ address: '', location, insideDhaka: null })
        setState('done'); setMsg('Location pin saved ✓ We could not read the area name — please type your address too.')
      }
    }, (e) => {
      setState('error')
      setMsg(e.code === 1 ? 'Location permission was blocked. Allow location for this site, or type your address.' : 'Could not get your location. Please turn on GPS / location, or type your address.')
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  }

  return (
    <div className={className}>
      <button type="button" onClick={share} disabled={state === 'busy'}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition ${state === 'done' ? 'border-brand bg-brand/5' : 'border-line bg-white hover:border-brand'}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" /></svg>
        <span className="font-semibold">{state === 'busy' ? 'Finding your location…' : state === 'done' ? 'Location shared' : 'Share my location'}</span>
        <span className="text-xs text-muted">{state === 'done' ? '(tap to update)' : '(optional)'}</span>
      </button>
      {msg && <p className={`mt-1 text-xs ${state === 'error' ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>}
    </div>
  )
}
