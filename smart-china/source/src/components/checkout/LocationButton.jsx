import { useState } from 'react'
import { LIVE, API_BASE_URL } from '../../config/env'
import { S } from '../../store/db'

/**
 * "Share my location": reads the phone's GPS and fills the address box.
 * 1. Live site: asks our server (api geo/reverse), which uses Barikoi or Google (Admin → Settings → Courier → Address finder)
 *    → house / holding number, road, area, thana, district.
 * 2. Demo preview with a Google key saved in the admin: calls Google from the browser.
 * 3. Otherwise / on failure: OpenStreetMap (free; usually area level only).
 * The exact pin (lat/lng) is always kept with the order so the rider can open it in Google Maps.
 * onPick({ address, location: { lat, lng, accuracy }, insideDhaka })
 */
const first = (a, keys) => keys.map((k) => a[k]).find(Boolean)
const OUTER = /savar|keraniganj|dohar|nawabganj|dhamrai|ashulia|gazipur|narayanganj/i

export function addressFromOsm(j) {
  const a = j.address || {}
  const parts = [
    first(a, ['amenity', 'building', 'shop', 'office', 'tourism', 'leisure']),
    [a.house_number, a.road].filter(Boolean).join(' '),
    first(a, ['neighbourhood', 'quarter', 'hamlet', 'residential', 'allotments']),
    first(a, ['suburb', 'village', 'city_district']),
    first(a, ['town', 'city', 'municipality', 'county']),
    first(a, ['state_district', 'district']),
  ].map((x) => (x || '').replace(/\s+(District|Division|Zila|Upazila|Thana)$/i, '').trim()).filter(Boolean)
  const uniq = parts.filter((x, i) => parts.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i)
  const text = uniq.length >= 2 ? uniq.join(', ') : String(j.display_name || '').replace(/,\s*\d{4}\b/, '').replace(/,\s*Bangladesh$/i, '')
  const district = (a.state_district || a.district || a.city || '').replace(/\s+District$/i, '')
  const thana = first(a, ['city_district', 'suburb', 'town', 'village']) || ''
  const city = `${a.city || ''} ${a.town || ''} ${a.city_district || ''}`
  return { address: text, thana, district, insideDhaka: /dhaka/i.test(city) && !OUTER.test(`${text} ${a.county || ''}`) }
}

async function fromServer(lat, lng) {
  const r = await fetch(`${API_BASE_URL}/geo/reverse?lat=${lat}&lng=${lng}`, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('no server finder')
  const j = await r.json()
  const d = j.data || j
  if (!d.address) throw new Error('empty')
  return d
}
async function fromGoogleBrowser(lat, lng, key) {
  const j = await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}&language=en&region=bd`)).json()
  if (j.status !== 'OK' || !j.results?.length) throw new Error(j.error_message || j.status)
  const best = j.results.find((r) => r.types.some((t) => ['premise', 'subpremise', 'street_address'].includes(t))) || j.results.find((r) => !r.types.includes('plus_code')) || j.results[0]
  const comp = (types) => { for (const r of j.results) for (const c of r.address_components) if (c.types.some((t) => types.includes(t))) return c.long_name; return '' }
  const address = best.formatted_address.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/, '').replace(/,?\s*Bangladesh$/i, '').replace(/\s+\d{4}\b/, '').trim()
  const district = (comp(['administrative_area_level_2']) || comp(['locality'])).replace(/ District$/i, '')
  return { address, thana: comp(['sublocality_level_1', 'administrative_area_level_3']), district, insideDhaka: /dhaka/i.test(comp(['locality']) || district) && !OUTER.test(address) }
}
async function fromOsm(lat, lng) {
  const j = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`, { headers: { Accept: 'application/json' } })).json()
  return addressFromOsm(j)
}

export default function LocationButton({ onPick, className = '' }) {
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [msg, setMsg] = useState('')
  const [found, setFound] = useState(null)

  const share = () => {
    if (!navigator.geolocation) { setState('error'); setMsg('Your browser cannot share location — please type the address.'); return }
    setState('busy'); setMsg('')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      const lat = +latitude.toFixed(6), lng = +longitude.toFixed(6)
      const location = { lat, lng, accuracy: Math.round(accuracy || 0) }
      const c = S.settings?.courier || {}
      const tries = [
        ...(LIVE ? [() => fromServer(lat, lng)] : c.geoProvider === 'google' && c.geoKey ? [() => fromGoogleBrowser(lat, lng, c.geoKey)] : []),
        () => fromOsm(lat, lng),
      ]
      let d = null
      for (const t of tries) { try { d = await t(); if (d?.address) break } catch { d = null } }
      if (d?.address) {
        onPick({ address: d.address, location, insideDhaka: typeof d.insideDhaka === 'boolean' ? d.insideDhaka : null })
        setFound(d); setState('done')
        setMsg(/\d/.test(d.address.split(',')[0]) ? 'Address filled in ✓ Check it and add your flat / floor if needed.' : 'Address filled in ✓ Please add your house / road number and a landmark.')
      } else {
        onPick({ address: '', location, insideDhaka: null })
        setFound(null); setState('done'); setMsg('Location pin saved ✓ We could not read the address here — please type it too.')
      }
    }, (e) => {
      setState('error')
      setMsg(e.code === 1 ? 'Location permission was blocked. Allow location for this site, or type your address.' : 'Could not get your location. Turn on GPS / location and try again, or type your address.')
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  }

  return (
    <div className={className}>
      {found && (found.district || found.thana) && (
        <p className="mb-2 flex flex-wrap items-center gap-x-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
          <span>✓ {[found.district && `District: ${found.district}`, found.thana && found.thana !== found.district && `Thana / area: ${found.thana}`].filter(Boolean).join(' · ')}</span>
          {typeof found.insideDhaka === 'boolean' && <span className="text-green-700">— {found.insideDhaka ? 'Inside Dhaka' : 'Outside Dhaka'}</span>}
        </p>
      )}
      <button type="button" onClick={share} disabled={state === 'busy'}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition ${state === 'done' ? 'border-brand bg-brand/5' : 'border-line bg-white hover:border-brand'}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" /></svg>
        <span className="font-semibold">{state === 'busy' ? 'Finding your exact location…' : state === 'done' ? 'Location added ✓ · Update' : 'Share my location'}</span>
        {state === 'idle' && <span className="text-xs text-muted">(optional)</span>}
      </button>
      {msg && <p className={`mt-1 text-xs ${state === 'error' ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>}
    </div>
  )
}
