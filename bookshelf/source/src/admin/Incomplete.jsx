import { useState } from 'react'
import { S, INC_ST, save, useDb, meName, waNum } from '../store/db'
import { Chips, Empty, Kpi, Modal, Pill, ago, fdate, tk, toast } from './ui'
import { NewOrderForm } from './Orders'

const TONE = { new: 'amber', contacted: 'sky', converted: 'green', dropped: 'gray' }

export default function Incomplete() {
  useDb()
  const [filter, setFilter] = useState('new')
  const [convert, setConvert] = useState(null)
  const L = S.incomplete
  const cnt = (k) => (k === 'all' ? L.length : L.filter((x) => x.status === k).length)
  const open = L.filter((x) => ['new', 'contacted'].includes(x.status))
  const conv = cnt('converted')
  const closed = conv + cnt('dropped')
  const list = L.filter((x) => filter === 'all' || x.status === filter).sort((a, b) => b.updated - a.updated)

  const setSt = (x, s) => { x.status = s; x.updated = Date.now(); x.log.push({ t: { contacted: 'Called', dropped: 'Dropped', new: 'Reopened' }[s], by: meName(), at: Date.now() }); save() }
  const message = (x) => `আসসালামু আলাইকুম${x.name ? ' ' + x.name : ''}, ${S.settings.siteName} থেকে বলছি। আপনি আমাদের ওয়েবসাইটে ${x.items.map((i) => i.name).join(', ')} অর্ডার করতে গিয়ে শেষ করেননি। কোনো সমস্যা হলে জানান, আমরা এখনই অর্ডারটি করে দিতে পারি। ক্যাশ অন ডেলিভারি সুবিধা আছে।`

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Incomplete orders</h1>
      <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Checkout-এ কাস্টমার সঠিক মোবাইল নাম্বার লিখে অর্ডার না করে চলে গেলে তার নাম, ফোন, ঠিকানা আর কার্টের বই এখানে জমা হয়। কল বা WhatsApp করে অর্ডারটি ফিরিয়ে আনুন। একই নাম্বার থেকে ৩ দিনের মধ্যে অর্ডার এলে এটি নিজে থেকেই "Converted" হয়ে যায়।
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Follow-up pending" value={cnt('new')} sub={`${cnt('contacted')} contacted`} tone="border-amber-500" />
        <Kpi label="Potential sales" value={tk(open.reduce((s, x) => s + x.subtotal, 0))} sub={`${open.length} open carts`} tone="border-accent" />
        <Kpi label="Recovered" value={conv} sub={tk(L.filter((x) => x.status === 'converted').reduce((s, x) => s + x.subtotal, 0))} tone="border-green-500" />
        <Kpi label="Recovery rate" value={`${closed ? Math.round((conv / closed) * 100) : 0}%`} sub="of closed leads" tone="border-sky-500" />
      </div>
      <Chips items={[['new', 'New', cnt('new')], ['contacted', 'Contacted', cnt('contacted')], ['converted', 'Converted', conv], ['dropped', 'Dropped', cnt('dropped')], ['all', 'All', L.length]]} value={filter} onChange={setFilter} />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Time</th><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Address</th><th className="p-3">Cart</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.length ? list.map((x) => {
              const earlier = S.orders.filter((o) => o.phone === x.phone).length
              const last = x.log[x.log.length - 1]
              return (
                <tr key={x.id}>
                  <td className="whitespace-nowrap p-3">{ago(x.updated)}<div className="text-xs text-muted">{fdate(x.at)}</div></td>
                  <td className="p-3">{x.name || <span className="text-muted">No name</span>}{x.demo && <> <Pill tone="gray">sample</Pill></>}{earlier > 0 && <div className="text-xs text-muted">{earlier} earlier order(s)</div>}</td>
                  <td className="whitespace-nowrap p-3">{x.phone}</td>
                  <td className="max-w-48 p-3 text-xs">{x.address || <span className="text-muted">Not given</span>}</td>
                  <td className="max-w-60 p-3 text-xs">{x.items.map((i) => <div key={i.slug} className="truncate">{i.name} ×{i.quantity}</div>)}</td>
                  <td className="p-3 font-semibold">{tk(x.subtotal)}</td>
                  <td className="p-3"><Pill tone={TONE[x.status]}>{INC_ST[x.status]}</Pill>{x.orderInvoice && <div className="text-xs text-muted">{x.orderInvoice}</div>}{last && <div className="text-xs text-muted">{last.t} · {last.by}</div>}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {['new', 'contacted'].includes(x.status) && <>
                        <button className="btn-accent px-2 py-1 text-xs" onClick={() => setConvert(x)}>Create order</button>
                        <a className="btn-outline px-2 py-1 text-xs" href={`tel:${x.phone}`}>Call</a>
                        <a className="btn-outline px-2 py-1 text-xs" href={`https://wa.me/${waNum(x.phone)}?text=${encodeURIComponent(message(x))}`} target="_blank" rel="noreferrer" onClick={() => x.status === 'new' && setSt(x, 'contacted')}>WhatsApp</a>
                        {x.status === 'new' && <button className="btn-outline px-2 py-1 text-xs" onClick={() => setSt(x, 'contacted')}>Mark contacted</button>}
                        <button className="btn-outline px-2 py-1 text-xs text-red-600" onClick={() => setSt(x, 'dropped')}>Drop</button>
                      </>}
                      {x.status === 'dropped' && <button className="btn-outline px-2 py-1 text-xs" onClick={() => setSt(x, 'new')}>Reopen</button>}
                    </div>
                  </td>
                </tr>
              )
            }) : <tr><td colSpan={8}><Empty /></td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={!!convert} onClose={() => setConvert(null)} title="Create order from incomplete checkout">
        {convert && <NewOrderForm initial={convert} onDone={(o) => {
          convert.status = 'converted'; convert.orderInvoice = o.invoice; convert.updated = Date.now()
          convert.log.push({ t: `Converted (${o.invoice})`, by: meName(), at: Date.now() }); save(); setConvert(null); toast(`${o.invoice} created from incomplete checkout`)
        }} />}
      </Modal>
    </div>
  )
}
