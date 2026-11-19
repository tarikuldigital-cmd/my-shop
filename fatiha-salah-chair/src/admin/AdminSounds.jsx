import { useEffect, useRef } from 'react'
import { S, useDb } from '../store/db'
import { playAlert } from './courierSound'

/** Voice alerts for new customer orders and new complaints while any admin page is open (courier alerts live in CourierPopup). */
export default function AdminSounds() {
  useDb()
  const base = useRef(null)
  const t0 = useRef(Date.now())
  useEffect(() => {
    const mx = (l) => Math.max(0, ...(l || []).filter((x) => !x.demo).map((x) => x.createdAt || 0))
    const cur = { order: mx(S.orders), complaint: mx(S.complaints) }
    const warm = Date.now() - t0.current < 20000   // first 20 s: data is still loading from the server — learn the baseline silently
    if (base.current === null) base.current = { order: 0, complaint: 0 }
    for (const k of ['order', 'complaint']) {
      if (cur[k] > base.current[k]) { base.current[k] = cur[k]; if (!warm) playAlert(k) }
    }
  })
  return null
}
