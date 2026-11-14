import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, AuthCard } from '../../components/common/ui'
import { useAuth } from '../../context/AuthContext'
import { validatePhone } from '../../services/authService'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!validatePhone(form.phone)) return setError('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন')
    if (form.password.length < 6) return setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
    setBusy(true); setError('')
    try { await register(form); navigate('/customer/account', { replace: true }) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <AuthCard title="কাস্টমার রেজিস্ট্রেশন" subtitle="একাউন্ট খুলে সহজে অর্ডার করুন আর আপনার সব অর্ডার এক জায়গায় দেখুন">
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <div><label className="field-label" htmlFor="name">নাম</label><input id="name" required autoComplete="name" className="field" value={form.name} onChange={set('name')} /></div>
        <div><label className="field-label" htmlFor="phone">মোবাইল নাম্বার</label><input id="phone" required inputMode="tel" autoComplete="tel" className="field" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="field-label" htmlFor="password">পাসওয়ার্ড</label><input id="password" type="password" required autoComplete="new-password" className="field" value={form.password} onChange={set('password')} /></div>
        <button disabled={busy} className="btn-accent w-full py-2.5">{busy ? 'অপেক্ষা করুন...' : 'রেজিস্ট্রেশন'}</button>
        <p className="text-center text-sm">রেজিস্ট্রেশন করা থাকলে? <Link to="/customer/login" className="font-semibold text-brand hover:underline">লগিন করুন</Link></p>
      </form>
    </AuthCard>
  )
}
