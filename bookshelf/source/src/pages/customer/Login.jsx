import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, AuthCard } from '../../components/common/ui'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/customer/account'
  const [form, setForm] = useState({ phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await login(form); navigate(from, { replace: true }) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <AuthCard title="কাস্টমার লগিন" subtitle="মোবাইল নাম্বার ও পাসওয়ার্ড দিয়ে আপনার একাউন্টে প্রবেশ করুন">
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label className="field-label" htmlFor="phone">মোবাইল নাম্বার</label>
          <input id="phone" required inputMode="tel" autoComplete="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="password">পাসওয়ার্ড</label>
          <input id="password" type="password" required autoComplete="current-password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="text-right text-sm"><Link to="/customer/forgot-password" className="text-brand hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link></div>
        <button disabled={busy} className="btn-accent w-full py-2.5">{busy ? 'অপেক্ষা করুন...' : 'লগিন'}</button>
        <p className="text-center text-sm">একাউন্ট না থাকলে? <Link to="/customer/register" className="font-semibold text-brand hover:underline">রেজিস্ট্রেশন করুন</Link></p>
      </form>
    </AuthCard>
  )
}
