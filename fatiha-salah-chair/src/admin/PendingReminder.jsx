import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { S, useDb } from '../store/db'
import { playPending } from './courierSound'

const EVERY_MS = 30 * 60 * 1000
const SHOW_MS = 25000
const TEST_EVENT = 'fatiha-pending-test'
export const showTestPendingReminder = () => window.dispatchEvent(new CustomEvent(TEST_EVENT))
const pendingCount = () => S.orders.filter((o) => o.status === 'pending' && !o.demo).length

/** Every 30 minutes (while the admin is open): voice + card "N orders pending — call and confirm quickly". Silent when nothing is pending. */
export default function PendingReminder() {
  useDb()
  const nav = useNavigate()
  const [card, setCard] = useState(null)
  const fire = (n) => { if (n < 1) return; playPending(n); setCard({ n, at: Date.now() }) }
  useEffect(() => {
    const t = setInterval(() => fire(pendingCount()), EVERY_MS)
    const test = () => fire(Math.max(1, Math.min(10, pendingCount() || 5)))
    window.addEventListener(TEST_EVENT, test)
    return () => { clearInterval(t); window.removeEventListener(TEST_EVENT, test) }
  }, [])
  useEffect(() => {
    if (!card) return
    const t = setTimeout(() => setCard(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [card])
  if (!card) return null
  return (
    <div className="fixed inset-x-0 bottom-4 z-[120] flex justify-center px-3">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-2xl" role="alert">
        <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-amber-800"><p className="font-bold">⏰ পেন্ডিং অর্ডার রিমাইন্ডার</p><button onClick={() => setCard(null)} className="rounded-full bg-white/80 px-3 py-0.5 text-xs font-semibold text-gray-700">✕ ইগনোর</button></div>
        <div className="space-y-2 px-4 py-3 text-sm">
          <p className="text-base font-semibold">এখনো {card.n}টি অর্ডার পেন্ডিং আছে।</p>
          <p className="text-muted">অনুগ্রহ করে দ্রুত কাস্টমারকে কল দিয়ে অর্ডার কনফার্ম করুন।</p>
          <button onClick={() => { setCard(null); nav('/admin/orders') }} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">অর্ডার দেখুন →</button>
        </div>
        <div className="h-1.5 bg-gray-100"><div className="h-full bg-amber-500" style={{ animation: `courierShrink ${SHOW_MS}ms linear forwards` }} /></div>
      </div>
    </div>
  )
}
