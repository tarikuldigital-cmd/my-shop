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
    if (!validatePhone(form.phone)) return setError('Enter a valid 11-digit mobile number')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setBusy(true); setError('')
    try { await register(form); navigate('/customer/account', { replace: true }) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <AuthCard title="Create an account" subtitle="Order faster and see all your orders in one place">
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <div><label className="field-label" htmlFor="name">Name</label><input id="name" required autoComplete="name" className="field" value={form.name} onChange={set('name')} /></div>
        <div><label className="field-label" htmlFor="phone">Mobile number</label><input id="phone" required inputMode="tel" autoComplete="tel" className="field" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="field-label" htmlFor="password">Password</label><input id="password" type="password" required autoComplete="new-password" className="field" value={form.password} onChange={set('password')} /></div>
        <button disabled={busy} className="btn-accent w-full py-2.5">{busy ? 'Please wait...' : 'Sign up'}</button>
        <p className="text-center text-sm">Already have an account? <Link to="/customer/login" className="font-semibold text-brand hover:underline">Log in</Link></p>
      </form>
    </AuthCard>
  )
}
