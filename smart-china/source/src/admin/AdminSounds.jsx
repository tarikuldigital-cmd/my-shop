import { useEffect, useRef } from 'react'
import { S, useDb } from '../store/db'
import { playAlert } from './courierSound'
import { toast } from './ui'

/** Instant voice + toast for new customer orders, orders the customer cancels, and new complaints, on any admin page (courier alerts live in CourierPopup). */
export default function AdminSounds() {
  useDb()
  const base = useRef({ order: 0, complaint: 0, cancel: 0 })
  const t0 = useRef(Date.now())
  useEffect(() => {
    const mx = (l) => Math.max(0, ...(l || []).filter((x) => !x.demo).map((x) => x.createdAt || 0))
    const cancelAt = Math.max(0, ...S.orders.filter((o) => !o.demo && o.status === 'cancelled').map((o) => { const h = [...(o.history || [])].reverse().find((x) => x.s === 'cancelled'); return h && h.by === 'Customer' ? h.at || 0 : 0 }))
    const cur = { order: mx(S.orders), complaint: mx(S.complaints), cancel: cancelAt }
    const warm = Date.now() - t0.current < 20000   // first 20 s: data is still loading from the server — learn the baseline silently
    const label = { order: '🛒 New order received', complaint: '📣 New complaint submitted', cancel: '❌ Customer cancelled an order' }
    for (const k of ['order', 'complaint', 'cancel']) {
      if (cur[k] > base.current[k]) { base.current[k] = cur[k]; if (!warm) { playAlert(k); toast(label[k]) } }
    }
  })
  return null
}
