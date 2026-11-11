import { useState } from 'react'
import Icon from '../../components/common/Icon'
import { Alert, Breadcrumb } from '../../components/common/ui'
import { useSite } from '../../context/SiteContext'
import { sendContactMessage } from '../../services/catalogService'

const EMPTY = { name: '', phone: '', email: '', subject: '', message: '' }

export default function Contact() {
  const { settings } = useSite()
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try { const r = await sendContactMessage(form); setMsg({ type: 'success', text: r.message }); setForm(EMPTY) } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setBusy(false) }
  }

  return (
    <div className="container-x py-5">
      <Breadcrumb items={[{ label: 'Contact Us' }]} />
      <h1 className="mt-4 text-2xl font-bold text-brand">Contact us</h1>
      <p className="mt-1 text-muted">Questions about a product, your order or delivery? We are happy to help.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <div className="card flex gap-3 p-4"><Icon name="location" className="h-6 w-6 shrink-0 text-accent" /><div><p className="font-semibold">Address</p><p className="text-sm text-muted">{settings.address}</p></div></div>
          <div className="card flex gap-3 p-4"><Icon name="phone" className="h-6 w-6 shrink-0 text-accent" /><div><p className="font-semibold">Hotline</p><a href={`tel:${settings.phone}`} className="text-sm text-muted hover:text-brand">{settings.phone}</a></div></div>
          {settings.email && <div className="card flex gap-3 p-4"><Icon name="mail" className="h-6 w-6 shrink-0 text-accent" /><div><p className="font-semibold">Email</p><a href={`mailto:${settings.email}`} className="text-sm text-muted hover:text-brand">{settings.email}</a></div></div>}
        </div>
        <form onSubmit={submit} className="card space-y-4 p-5">
          <h2 className="font-bold">Or send us a message</h2>
          {msg && <Alert type={msg.type}>{msg.text}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="c-name">Full name *</label><input id="c-name" required className="field" value={form.name} onChange={set('name')} /></div>
            <div><label className="field-label" htmlFor="c-phone">Mobile number *</label><input id="c-phone" required inputMode="tel" className="field" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="field-label" htmlFor="c-email">Email *</label><input id="c-email" type="email" required className="field" value={form.email} onChange={set('email')} /></div>
            <div><label className="field-label" htmlFor="c-sub">Subject *</label><input id="c-sub" required className="field" value={form.subject} onChange={set('subject')} /></div>
          </div>
          <div><label className="field-label" htmlFor="c-msg">Message *</label><textarea id="c-msg" rows={5} required className="field" value={form.message} onChange={set('message')} /></div>
          <button disabled={busy} className="btn-accent">Send message</button>
        </form>
      </div>
    </div>
  )
}
