import { useState } from 'react'
import { Alert } from '../../components/common/ui'
import { useAuth } from '../../context/AuthContext'
import AccountShell from './AccountShell'

export default function Account() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', address: user.address || '' })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try { await updateProfile(form); setMsg({ type: 'success', text: 'Profile updated' }) } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setBusy(false) }
  }

  return (
    <AccountShell title="My Profile">
      <form onSubmit={submit} className="card max-w-xl space-y-4 p-5">
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <div><label className="field-label" htmlFor="name">Name</label><input id="name" className="field" value={form.name} onChange={set('name')} required /></div>
        <div><label className="field-label">Mobile number</label><input className="field bg-surface" value={user.phone} disabled /></div>
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" className="field" value={form.email} onChange={set('email')} /></div>
        <div><label className="field-label" htmlFor="address">Address</label><textarea id="address" rows={3} className="field" value={form.address} onChange={set('address')} /></div>
        <button disabled={busy} className="btn-accent">Save</button>
      </form>
    </AccountShell>
  )
}
