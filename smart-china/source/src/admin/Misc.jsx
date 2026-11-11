import { useState } from 'react'
import { S, save, useDb, waNum, STATUS } from '../store/db'
import { Chips, Empty, Field, Kpi, Modal, Pill, fdate, tk, toast } from './ui'

/* ---------------- coupons ---------------- */
export function Coupons() {
  useDb()
  const [f, setF] = useState({ code: '', type: 'flat', value: 50, min: 0, expires: '' })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Coupons</h1>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Min. order</th><th className="p-3">Expires</th><th className="p-3">Used</th><th className="p-3">Active</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {S.coupons.length ? S.coupons.map((c, i) => (
              <tr key={c.code}>
                <td className="p-3 font-mono font-bold">{c.code}</td>
                <td className="p-3">{c.type === 'percent' ? `${c.value}%` : tk(c.value)}</td>
                <td className="p-3">{c.min ? tk(c.min) : '—'}</td>
                <td className="p-3">{c.expires || 'Never'}</td>
                <td className="p-3">{c.used || 0}</td>
                <td className="p-3"><input type="checkbox" checked={c.active} onChange={(e) => { c.active = e.target.checked; save() }} aria-label="Active" /></td>
                <td className="p-3 text-right"><button className="text-red-600" onClick={() => { S.coupons.splice(i, 1); save() }}>Delete</button></td>
              </tr>
            )) : <tr><td colSpan={7}><Empty /></td></tr>}
          </tbody>
        </table>
      </div>
      <form className="card grid gap-3 p-4 sm:grid-cols-6" onSubmit={(e) => {
        e.preventDefault()
        const code = f.code.trim().toUpperCase()
        if (!code || !f.value) return toast('Code and value are required')
        if (S.coupons.some((c) => c.code === code)) return toast('Code already exists')
        S.coupons.push({ ...f, code, value: +f.value, min: +f.min || 0, active: true, used: 0 }); save(); setF({ ...f, code: '' }); toast('Coupon added')
      }}>
        <Field label="Code"><input className="field uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Type"><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="flat">৳ off</option><option value="percent">% off</option></select></Field>
        <Field label="Value"><input type="number" className="field" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Min. order ৳"><input type="number" className="field" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></Field>
        <Field label="Expires"><input type="date" className="field" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></Field>
        <div className="flex items-end"><button className="btn-accent w-full">Add coupon</button></div>
      </form>
    </div>
  )
}

/* ---------------- customers (built from orders) ---------------- */
export function Customers() {
  useDb()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const map = {}
  S.orders.forEach((o) => {
    const c = (map[o.phone] ||= { phone: o.phone, name: o.name, address: o.address, orders: [], spent: 0, delivered: 0, cancelled: 0 })
    c.orders.push(o)
    if (!['cancelled', 'returned'].includes(o.status)) c.spent += o.total
    if (o.status === 'delivered') c.delivered++
    if (['cancelled', 'returned'].includes(o.status)) c.cancelled++
  })
  const list = Object.values(map).filter((c) => !q || `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.spent - a.spent)
  const repeat = Object.values(map).filter((c) => c.orders.length > 1).length
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Customers" value={Object.keys(map).length} />
        <Kpi label="Repeat customers" value={repeat} sub={`${Object.keys(map).length ? Math.round((repeat / Object.keys(map).length) * 100) : 0}% buy again`} tone="border-green-500" />
        <Kpi label="Avg. lifetime value" value={tk(list.reduce((s, c) => s + c.spent, 0) / Math.max(1, list.length))} tone="border-accent" />
      </div>
      <input type="search" className="field max-w-sm" placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Orders</th><th className="p-3">Delivered</th><th className="p-3">Cancelled / returned</th><th className="p-3">Spent</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((c) => (
              <tr key={c.phone} className="cursor-pointer hover:bg-surface" onClick={() => setOpen(c)}>
                <td className="p-3 font-medium">{c.name}<div className="truncate text-xs text-muted">{c.address}</div></td>
                <td className="p-3">{c.phone}</td><td className="p-3">{c.orders.length}</td><td className="p-3">{c.delivered}</td>
                <td className="p-3">{c.cancelled ? <Pill tone="red">{c.cancelled}</Pill> : 0}</td><td className="p-3 font-semibold">{tk(c.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && <div className="space-y-2 text-sm">
          <p>{open.phone} · <a className="text-green-600" href={`https://wa.me/${waNum(open.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a></p>
          {open.orders.map((o) => <div key={o.id} className="flex justify-between border-b border-line py-1.5"><span>{o.invoice} · {fdate(o.createdAt)}</span><span>{tk(o.total)} <Pill s={o.status}>{STATUS[o.status].t}</Pill></span></div>)}
        </div>}
      </Modal>
    </div>
  )
}

/* ---------------- messages (contact form) ---------------- */
export function Messages() {
  useDb()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customer messages</h1>
      {S.messages.length ? S.messages.map((m) => (
        <div key={m.id} className={`card p-4 ${m.read ? '' : 'border-l-4 border-l-accent'}`}>
          <div className="flex flex-wrap justify-between gap-2 text-sm"><b>{m.subject}</b><span className="text-muted">{fdate(m.at)}</span></div>
          <p className="text-sm text-muted">{m.name} · {m.phone} · {m.email}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
          <div className="mt-2 flex gap-3 text-sm">
            <a className="text-green-600" href={`https://wa.me/${waNum(m.phone)}`} target="_blank" rel="noreferrer">Reply on WhatsApp</a>
            <a className="text-brand" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}>Reply by email</a>
            {!m.read && <button className="text-muted" onClick={() => { m.read = true; save() }}>Mark read</button>}
          </div>
        </div>
      )) : <div className="card"><Empty>No messages yet. Messages from the Contact Us form appear here.</Empty></div>}
    </div>
  )
}

/* ---------------- reviews ---------------- */
export function Reviews() {
  useDb()
  const [f, setF] = useState('pending')
  const list = S.reviews.filter((r) => f === 'all' || (f === 'pending' ? !r.approved : r.approved))
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <Chips items={[['pending', 'Waiting', S.reviews.filter((r) => !r.approved).length], ['approved', 'Published', S.reviews.filter((r) => r.approved).length], ['all', 'All', S.reviews.length]]} value={f} onChange={setF} />
      {list.length ? list.map((r) => {
        const p = S.products.find((x) => x.slug === r.slug)
        return (
          <div key={r.id} className="card p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><b>{p?.name || r.slug}</b><span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></div>
            <p className="text-muted">{r.name} · {r.phone} · {fdate(r.at)}</p>
            <p className="mt-2">{r.text}</p>
            <div className="mt-2 flex gap-3">
              {!r.approved && <button className="btn-accent" onClick={() => { r.approved = true; save(); toast('Review published') }}>Approve</button>}
              <button className="btn-outline text-red-600" onClick={() => { S.reviews = S.reviews.filter((x) => x.id !== r.id); save() }}>Delete</button>
            </div>
          </div>
        )
      }) : <div className="card"><Empty>No reviews here</Empty></div>}
    </div>
  )
}

/* ---------------- info pages ---------------- */
export function Pages() {
  useDb()
  const keys = Object.keys(S.pages)
  const [k, setK] = useState(keys[0])
  const page = S.pages[k]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Info pages</h1>
      <Chips items={keys.map((x) => [x, S.pages[x].title])} value={k} onChange={setK} />
      {page && <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <Field label="Title"><input className="field" value={page.title} onChange={(e) => { page.title = e.target.value; save() }} /></Field>
          <Field label="Content (HTML: <h4>, <p>, <ul><li>, <ol>)"><textarea rows={18} className="field font-mono text-xs" value={page.html} onChange={(e) => { page.html = e.target.value; save() }} /></Field>
        </div>
        <div className="card prose-bs p-5 text-sm"><h2 className="mb-3 text-xl font-bold text-brand">{page.title}</h2><div dangerouslySetInnerHTML={{ __html: page.html }} /></div>
      </div>}
      <p className="text-sm text-muted">Product page “Order Policy” tab is edited in Settings → General.</p>
    </div>
  )
}
