/* Admin → Complain Box: receive complaints, move them step by step, assign a team member per segment,
   message the customer (with SMS), keep internal notes and delete the media once the case is closed. */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { S, save, useDb } from '../store/db'
import { Chips, Empty, Field, Kpi, Modal, Panel, ago, fdate, tk, toast } from './ui'
import Img from '../components/common/Img'
import Icon, { WhatsAppIcon } from '../components/common/Icon'
import { STATUS_STYLE } from '../pages/complain/parts'
import { can } from './roles'
import { storeUrl, LIVE } from '../config/env'
import { CMP_OPEN, CMP_PRIORITY, CMP_SEGMENTS, CMP_SMS_EVENTS, CMP_STATUS, CMP_STATUS_KEYS, CMP_TYPES, CMP_WANTS, cmpDefaults } from '../store/complaintsConfig'
import { cmpAction, cmpCleanup, cmpRender, cmpSettings, cmpStaff, fmtSize, mediaBytes, mediaSrc } from '../lib/complaints'
import { countryName } from './country'

const Tag = ({ className = '', children }) => <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
const StatusTag = ({ s }) => <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[s]}`}><span className={`h-1.5 w-1.5 rounded-full ${CMP_STATUS[s]?.dot}`} />{CMP_STATUS[s]?.short}</span>
const HOUR = 36e5
const ageTone = (c) => { if (!CMP_OPEN.includes(c.status)) return 'text-muted'; const h = (Date.now() - c.createdAt) / HOUR; const lim = cmpSettings().responseHours || 24; return h > lim ? 'font-bold text-red-600' : h > lim / 2 ? 'font-semibold text-amber-600' : 'text-green-700' }
const waLink = (p) => `https://wa.me/${String(p).replace(/\D/g, '').replace(/^0/, '880')}`

const QUICK = {
  received: ['আপনার অভিযোগটি গ্রহণ করা হয়েছে। আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।'],
  reviewing: ['আপনার দেওয়া ছবি/ভিডিও ও অর্ডারের তথ্য মিলিয়ে দেখা হচ্ছে।', 'বিষয়টি নিশ্চিত হতে আমাদের প্রতিনিধি আপনাকে কল করবেন।'],
  processing: ['রিপ্লেসমেন্ট প্রোডাক্ট পাঠানোর প্রস্তুতি চলছে।', 'রিফান্ড প্রসেস করা হচ্ছে, ২৪ ঘণ্টার মধ্যে পেয়ে যাবেন।', 'রিটার্ন পিকআপের জন্য কুরিয়ার পাঠানো হচ্ছে।', 'অনুপস্থিত পার্টস পাঠানো হচ্ছে।'],
  resolved: ['নতুন প্রোডাক্ট পাঠানো হয়েছে। অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।', 'রিফান্ড সম্পন্ন হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ।', 'রিটার্ন সম্পন্ন হয়েছে।'],
  rejected: ['দুঃখিত, প্রমাণ পর্যালোচনা করে অভিযোগটি আমাদের নীতিমালার আওতায় পড়েনি। বিস্তারিত জানতে কল করুন।'],
}

let staffCache = null
function useStaff() {
  const [list, setList] = useState(staffCache)
  useEffect(() => { if (!staffCache) cmpStaff().then((l) => { staffCache = l; setList(l) }).catch(() => setList([])) }, [])
  return list || []
}

export default function Complaints() {
  useDb()
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState('box')
  const [status, setStatus] = useState('open')
  const [seg, setSeg] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const openId = sp.get('open')
  const staff = useStaff()
  const all = S.complaints || []
  const me = S.account?.id

  const counts = useMemo(() => Object.fromEntries([['open', all.filter((c) => CMP_OPEN.includes(c.status)).length], ['all', all.length], ...CMP_STATUS_KEYS.map((k) => [k, all.filter((c) => c.status === k).length])]), [all, all.length, S.complaints?.map((c) => c.status).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const term = q.trim().toLowerCase()
  const list = all.filter((c) =>
    (status === 'all' || (status === 'open' ? CMP_OPEN.includes(c.status) : c.status === status)) &&
    (!seg || c.segment === seg) &&
    (!who || (who === 'me' ? c.assignee?.id === me : who === 'none' ? !c.assignee : String(c.assignee?.id) === who)) &&
    (!term || `${c.id} ${c.name} ${c.phone} ${c.invoice} ${c.description}`.toLowerCase().includes(term)),
  ).sort((a, b) => (b.unread - a.unread) || ((CMP_PRIORITY_RANK[b.priority] || 0) - (CMP_PRIORITY_RANK[a.priority] || 0)) || b.createdAt - a.createdAt)

  const open = all.find((c) => c.id === openId)
  const resolvedList = all.filter((c) => c.steps?.resolved)
  const avgH = resolvedList.length ? resolvedList.reduce((s, c) => s + (c.steps.resolved - c.createdAt), 0) / resolvedList.length / HOUR : 0
  const rated = all.filter((c) => c.rating)
  const storage = all.reduce((s, c) => s + mediaBytes(c), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Complain Box</h1>
          <p className="text-sm text-muted">কাস্টমারদের অভিযোগ · পাবলিক লিংক <a href={storeUrl('/complain')} target="_blank" rel="noreferrer" className="font-semibold text-brand">{storeUrl('/complain').replace(/^https?:\/\//, '')} ↗</a></p>
        </div>
        <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
          {[['box', 'অভিযোগ'], ...(can(S.account, 'settings') ? [['settings', 'সেটিংস ও SMS']] : [])].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === k ? 'bg-brand text-white' : 'text-ink hover:bg-surface'}`}>{l}</button>)}
        </div>
      </div>

      {tab === 'settings' ? <CmpSettings staff={staff} storage={storage} /> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="নতুন" value={counts.submitted} sub={`${all.filter((c) => c.unread).length} অপঠিত আপডেট`} tone="border-sky-500" />
          <Kpi label="চলমান" value={counts.open} sub="গৃহীত + পর্যালোচনা + প্রক্রিয়াধীন" tone="border-amber-500" />
          <Kpi label="সমাধান হয়েছে" value={counts.resolved} sub={avgH ? `গড়ে ${avgH < 48 ? `${avgH.toFixed(1)} ঘণ্টা` : `${(avgH / 24).toFixed(1)} দিন`}` : '—'} tone="border-green-600" />
          <Kpi label="কাস্টমার রেটিং" value={rated.length ? `${(rated.reduce((s, c) => s + c.rating.stars, 0) / rated.length).toFixed(1)} ★` : '—'} sub={`${rated.length}টি মতামত`} tone="border-gold" />
          <Kpi label="মিডিয়া স্টোরেজ" value={fmtSize(storage)} sub="সমাধান শেষে মুছে ফেলুন" tone="border-violet-500" />
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-white p-3">
          <Chips items={[['open', 'চলমান', counts.open], ...CMP_STATUS_KEYS.map((k) => [k, CMP_STATUS[k].short, counts[k]]), ['all', 'সব', counts.all]]} value={status} onChange={setStatus} />
          <div className="flex flex-wrap gap-2">
            <input type="search" className="field max-w-xs" placeholder="আইডি, নাম, ফোন, ইনভয়েস…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="field w-auto" value={seg} onChange={(e) => setSeg(e.target.value)}><option value="">সব সেগমেন্ট</option>{Object.entries(CMP_SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v.bn}</option>)}</select>
            <select className="field w-auto" value={who} onChange={(e) => setWho(e.target.value)}><option value="">সবার অভিযোগ</option><option value="me">আমার দায়িত্বে</option><option value="none">কাউকে দেওয়া হয়নি</option>{staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          </div>
        </div>

        {list.length ? (
          <ul className="grid gap-2">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSp({ open: c.id })} className={`flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition hover:border-brand hover:shadow-sm ${c.unread ? 'border-sky-300 ring-2 ring-sky-100' : 'border-line'}`}>
                  <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface sm:block">
                    {c.files?.find((f) => !f.deleted && f.type === 'image') ? <img src={mediaSrc(c.files.find((f) => !f.deleted && f.type === 'image').url)} alt="" className="h-full w-full object-cover" /> : c.items?.[0] ? <Img src={c.items[0].image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted"><Icon name="doc" className="h-6 w-6" /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {c.unread && <span className="h-2 w-2 rounded-full bg-sky-500" title="নতুন আপডেট" />}
                      <b className="font-mono text-sm">{c.id}</b><StatusTag s={c.status} />
                      <Tag className="bg-surface text-muted ring-1 ring-inset ring-line">{CMP_SEGMENTS[c.segment]?.bn}</Tag>
                      {['high', 'urgent'].includes(c.priority) && <Tag className={CMP_PRIORITY[c.priority].tone}>{CMP_PRIORITY[c.priority].bn}</Tag>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm"><b>{c.name}</b> · {c.phone}{c.invoice && <> · {c.invoice}</>} — {CMP_TYPES[c.type]?.bn}</span>
                    <span className="block truncate text-xs text-muted">{c.description}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className={`block ${ageTone(c)}`}>{ago(c.createdAt)}</span>
                    <span className="mt-0.5 flex items-center justify-end gap-1 text-muted"><Icon name="user" className="h-3 w-3" />{c.assignee ? c.assignee.name.split(' ')[0] : 'অনির্ধারিত'}</span>
                    {c.files?.length > 0 && <span className="inline-flex items-center gap-1 text-muted"><Icon name="clip" className="h-3 w-3" />{c.files.filter((f) => !f.deleted).length}/{c.files.length}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <div className="rounded-lg border border-line bg-white"><Empty>{all.length ? 'এই ফিল্টারে কোনো অভিযোগ নেই' : 'এখনো কোনো অভিযোগ আসেনি'}</Empty></div>}
      </>}

      <Modal open={!!open} onClose={() => setSp({})} drawer title={open ? <><span className="font-mono">{open.id}</span> <StatusTag s={open.status} /></> : ''}>{open && <Detail c={open} staff={staff} />}</Modal>
    </div>
  )
}
const CMP_PRIORITY_RANK = { low: 0, normal: 1, high: 2, urgent: 3 }

/* ---------------- one complaint ---------------- */
function Detail({ c, staff }) {
  useDb()
  const [view, setView] = useState(null)
  const [busy, setBusy] = useState('')
  useEffect(() => { if (c.unread) cmpAction(c, { action: 'read' }).catch(() => {}) }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (key, body, okMsg) => {
    setBusy(key)
    try { const r = await cmpAction(c, body); toast(okMsg + (r?.sms?.length ? ` · SMS ${r.sms.map((x) => (x.status === 'sent' ? '✓' : x.status === 'demo' ? '(ডেমো)' : '✗')).join(' ')}` : '')); return true } catch (e) { toast(e.message); return false } finally { setBusy('') }
  }
  const live = c.files?.filter((f) => !f.deleted) || []
  const order = c.orderId ? S.orders.find((o) => o.id === c.orderId) : null
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Tag className={CMP_SEGMENTS[c.segment]?.tone}>{CMP_SEGMENTS[c.segment]?.bn}</Tag>
        <Tag className={CMP_PRIORITY[c.priority || 'normal'].tone}>প্রায়োরিটি: {CMP_PRIORITY[c.priority || 'normal'].bn}</Tag>
        <Tag className="bg-surface text-ink"><Icon name="clock" className="h-3 w-3" />{fdate(c.createdAt)} · <span className={ageTone(c)}>{ago(c.createdAt)}</span></Tag>
        {c.assignee && <Tag className="bg-brand/10 text-brand"><Icon name="user" className="h-3 w-3" />{c.assignee.name}</Tag>}
      </div>

      {/* customer + order */}
      <section className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-center gap-3 bg-brand p-3 text-white">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-lg font-bold text-brand-dark">{(c.name || '?').charAt(0)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-base font-bold">{c.name}</span><span className="block text-xs text-white/80">{c.phone}{c.country && <> · {countryName(c.country)}</>}</span></span>
          <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-brand"><Icon name="phone" className="h-3.5 w-3.5" />Call</a>
          <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-md bg-[#25d366] px-3 py-1.5 text-xs font-bold text-white"><WhatsAppIcon className="h-3.5 w-3.5" />WhatsApp</a>
        </div>
        <dl className="grid gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
          {c.altPhone && <div><dt className="text-xs text-muted">বিকল্প নাম্বার</dt><dd className="font-semibold">{c.altPhone} <a className="text-[#128c4a]" href={waLink(c.altPhone)} target="_blank" rel="noreferrer">WA</a></dd></div>}
          {c.contactTime && <div><dt className="text-xs text-muted">কল করার সময়</dt><dd className="font-semibold">{c.contactTime}</dd></div>}
          <div><dt className="text-xs text-muted">অর্ডার</dt><dd className="font-semibold">{c.invoice ? <>{c.orderId ? <Link className="text-brand underline" to={`/admin/orders?open=${c.invoice}`}>{c.invoice}</Link> : c.invoice} {c.orderVerified ? <Tag className="bg-green-100 text-green-800">✓ ফোন মিলেছে</Tag> : <Tag className="bg-amber-100 text-amber-800">যাচাই হয়নি</Tag>}</> : '—'}</dd></div>
          {c.orderVerified && <div><dt className="text-xs text-muted">অর্ডারের মূল্য · অবস্থা</dt><dd className="font-semibold">{tk(c.orderTotal)} · {order?.status || c.orderStatus}{c.orderDate ? ` · ${fdate(c.orderDate)}` : ''}</dd></div>}
        </dl>
        {c.items?.length > 0 && <ul className="flex flex-wrap gap-2 border-t border-line p-3">{c.items.map((it) => <li key={it.key} className="flex items-center gap-2 rounded-lg bg-surface p-1.5 pr-3"><Img src={it.image} alt="" className="h-10 w-10 rounded object-cover" /><span><b>{it.name}</b><span className="block text-xs text-muted">× {it.quantity} · {tk(it.price)}</span></span></li>)}</ul>}
      </section>

      {/* the problem */}
      <section className="rounded-xl border border-line p-3">
        <p className="text-xs text-muted">সমস্যা · চাওয়া সমাধান</p>
        <p className="font-bold">{CMP_TYPES[c.type]?.bn} → {CMP_WANTS[c.want] || '—'}</p>
        <p className="mt-2 whitespace-pre-line rounded-lg bg-surface/70 p-3 leading-6">{c.description}</p>
        {c.refundAmount ? <p className="mt-2 font-semibold text-green-700">রিফান্ড: {tk(c.refundAmount)}</p> : null}
      </section>

      {/* media */}
      {c.files?.length > 0 && (
        <section className="rounded-xl border border-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">ছবি / ভিডিও <span className="font-normal text-muted">({live.length} রাখা আছে · {fmtSize(mediaBytes(c))})</span></p>
            {live.length > 0 && <button className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-50" disabled={busy === 'del'} onClick={() => confirm(`${live.length}টি ফাইল (${fmtSize(mediaBytes(c))}) সার্ভার থেকে স্থায়ীভাবে মুছে যাবে। আগে দরকার হলে ডাউনলোড করে নিন। মুছবেন?`) && run('del', { action: 'files_delete', names: 'all' }, 'ফাইল মুছে ফেলা হয়েছে')}><Icon name="trash" className="h-3.5 w-3.5" />সব ফাইল মুছুন</button>}
          </div>
          {['resolved', 'rejected'].includes(c.status) && live.length > 0 && <p className="mb-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">অভিযোগটি বন্ধ — স্টোরেজ বাঁচাতে ফাইলগুলো এখন মুছে ফেলতে পারেন।</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {c.files.map((f) => (
              <div key={f.name} className="overflow-hidden rounded-lg border border-line">
                {f.deleted ? <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-surface p-1 text-center text-[10px] text-muted"><Icon name="doc" className="h-4 w-4" />মুছে ফেলা হয়েছে<span>{f.deletedAt ? fdate(f.deletedAt) : ''}</span></div>
                  : <button className="relative block aspect-square w-full bg-black" onClick={() => setView(f)}>{f.type === 'video' ? <><video src={mediaSrc(f.url)} className="h-full w-full object-cover" muted preload="metadata" /><span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/60 p-1.5 text-white"><Icon name="play" className="h-4 w-4" /></span></span></> : <img src={mediaSrc(f.url)} alt="" className="h-full w-full object-cover" />}</button>}
                <div className="flex items-center justify-between gap-1 px-1.5 py-1 text-[10px]">
                  <span className="text-muted">{f.type === 'video' ? 'ভিডিও' : 'ছবি'} · {fmtSize(f.size || 0)}{f.by === 'customer' ? '' : ' · টিম'}</span>
                  {!f.deleted && <span className="flex gap-1.5"><a href={mediaSrc(f.url)} download target="_blank" rel="noreferrer" className="text-brand" title="ডাউনলোড"><Icon name="download" className="h-3.5 w-3.5" /></a><button className="text-red-600" title="মুছুন" aria-label="মুছুন" onClick={() => confirm('এই ফাইলটি স্থায়ীভাবে মুছে যাবে। মুছবেন?') && run('del', { action: 'files_delete', names: [f.name] }, 'ফাইল মুছে ফেলা হয়েছে')}><Icon name="trash" className="h-3.5 w-3.5" /></button></span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <StatusBox c={c} run={run} busy={busy} />
      <AssignBox c={c} run={run} busy={busy} staff={staff} />
      <MessageBox c={c} run={run} busy={busy} />

      {/* timeline */}
      <section className="rounded-xl border border-line p-3">
        <p className="mb-2 font-semibold">টাইমলাইন</p>
        <ol className="space-y-2 border-l-2 border-line pl-4">
          {[...c.history].sort((a, b) => b.at - a.at).map((h, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${h.type === 'status' ? CMP_STATUS[h.s]?.dot : h.by === 'customer' ? 'bg-sky-500' : h.public ? 'bg-brand' : 'bg-gray-400'}`} />
              <p className="text-xs text-muted">{fdate(h.at)} · {h.by === 'customer' ? 'কাস্টমার' : h.by === 'system' ? 'সিস্টেম' : h.by}{!h.public && <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">ইন্টারনাল</span>}</p>
              <p>{h.type === 'status' && <b>{CMP_STATUS[h.s]?.bn}{h.text ? ' — ' : ''}</b>}{h.type === 'reply' && <b>কাস্টমারের মেসেজ: </b>}{h.type === 'message' && <b>কাস্টমারকে: </b>}{h.type === 'rating' && <b>রেটিং: </b>}<span className="whitespace-pre-line">{h.type === 'status' && h.s === 'submitted' ? '' : h.text}</span>{h.files?.length ? <span className="text-muted"> · {h.files.length}টি ফাইল</span> : null}</p>
            </li>
          ))}
        </ol>
      </section>
      <Lightbox f={view} onClose={() => setView(null)} />
    </div>
  )
}

function SmsToggle({ on, set, text, to, disabledWhy }) {
  return (
    <div className="rounded-lg bg-surface/70 p-2">
      <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="h-4 w-4" checked={on && !disabledWhy} disabled={!!disabledWhy} onChange={(e) => set(e.target.checked)} />SMS পাঠান {to && <span className="text-xs text-muted">→ {to}</span>}</label>
      {disabledWhy && <p className="mt-1 text-xs text-amber-700">{disabledWhy}</p>}
      {on && !disabledWhy && text && <p className="mt-1.5 rounded border border-line bg-white p-2 text-xs leading-5 text-ink">{text}<span className="ml-1 text-muted">({text.length} অক্ষর · {Math.ceil(text.length / 67)} SMS)</span></p>}
      {!LIVE && on && !disabledWhy && <p className="mt-1 text-[11px] text-muted">ডেমো: SMS আসলে যাবে না, শুধু SMS লগে লেখা থাকবে।</p>}
    </div>
  )
}

function StatusBox({ c, run, busy }) {
  const cs = cmpSettings()
  const order = ['received', 'reviewing', 'processing', 'resolved', 'rejected']
  const nextDefault = order.find((s) => order.indexOf(s) > order.indexOf(c.status)) || c.status
  const [s, setS] = useState(nextDefault)
  const [msg, setMsg] = useState('')
  const [sms, setSms] = useState(!!cs.events[nextDefault])
  const [refund, setRefund] = useState('')
  useEffect(() => { setS(nextDefault); setSms(!!cmpSettings().events[nextDefault]); setMsg('') }, [c.status]) // eslint-disable-line react-hooks/exhaustive-deps
  const preview = cs.templates[s] ? cmpRender(cs.templates[s], { ...c, status: s }) : ''
  return (
    <section className="rounded-xl border-2 border-brand/30 bg-brand/[.03] p-3">
      <p className="mb-2 font-semibold">ধাপ আপডেট করুন <span className="text-xs font-normal text-muted">(কাস্টমার ট্র্যাকিং পেজে দেখবেন)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {order.map((k) => <button key={k} onClick={() => { setS(k); setSms(!!cs.events[k]) }} className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${s === k ? 'border-brand bg-brand text-white' : c.steps?.[k] ? 'border-green-200 bg-green-50 text-green-800' : 'border-line bg-white'}`}>{c.steps?.[k] ? '✓ ' : ''}{CMP_STATUS[k].short}</button>)}
      </div>
      <textarea className="field mt-2 min-h-[70px]" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="কাস্টমারকে কী জানাবেন (ঐচ্ছিক, ট্র্যাকিং পেজে দেখাবে)" />
      {QUICK[s] && <div className="mt-1.5 flex flex-wrap gap-1">{QUICK[s].map((t) => <button key={t} onClick={() => setMsg(t)} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-brand ring-1 ring-line hover:bg-brand/5">{t.slice(0, 38)}…</button>)}</div>}
      {s === 'resolved' && c.segment === 'refund' && <Field label="রিফান্ডের পরিমাণ (৳)" className="mt-2"><input className="field w-40" type="number" min={0} value={refund} onChange={(e) => setRefund(e.target.value)} /></Field>}
      <div className="mt-2"><SmsToggle on={sms} set={setSms} text={preview} to={c.phone} disabledWhy={!cs.templates[s] ? 'এই ধাপের SMS টেক্সট নেই (সেটিংস)' : ''} /></div>
      <button className="btn-brand mt-2 w-full" disabled={busy === 'status'} onClick={() => run('status', { action: 'status', status: s, message: msg.trim(), sms, refundAmount: refund }, `স্ট্যাটাস: ${CMP_STATUS[s].bn}`).then((ok) => ok && setMsg(''))}>{busy === 'status' ? 'সেভ হচ্ছে…' : `“${CMP_STATUS[s].bn}” করুন`}</button>
    </section>
  )
}

function AssignBox({ c, run, busy, staff }) {
  const [seg, setSeg] = useState(c.segment)
  const [aid, setAid] = useState(c.assignee?.id ? String(c.assignee.id) : '')
  const [note, setNote] = useState('')
  const [sms, setSms] = useState(true)
  useEffect(() => { setSeg(c.segment); setAid(c.assignee?.id ? String(c.assignee.id) : '') }, [c.segment, c.assignee?.id])
  const m = staff.find((x) => String(x.id) === aid)
  const tpl = cmpSettings().templates.assigned
  const preview = m && tpl ? cmpRender(tpl, { ...c, segment: seg, assignee: m }) : ''
  return (
    <section className="rounded-xl border border-line p-3">
      <p className="mb-2 font-semibold">সেগমেন্ট ও দায়িত্ব</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="সেগমেন্ট"><select className="field" value={seg} onChange={(e) => { setSeg(e.target.value); const r = cmpSettings().routing[e.target.value]; if (r) setAid(String(r)) }}>{Object.entries(CMP_SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v.bn}</option>)}</select></Field>
        <Field label="টিম মেম্বার"><select className="field" value={aid} onChange={(e) => setAid(e.target.value)}><option value="">— কাউকে না —</option>{staff.map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ' · (ফোন নেই)'}</option>)}</select></Field>
      </div>
      <input className="field mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="মেম্বারের জন্য নোট (ঐচ্ছিক)" />
      {m && <div className="mt-2"><SmsToggle on={sms} set={setSms} text={preview} to={m.phone} disabledWhy={!m.phone ? 'এই মেম্বারের ফোন নাম্বার নেই — Team & roles পেজে যোগ করুন' : ''} /></div>}
      <button className="btn-outline mt-2 w-full" disabled={busy === 'assign' || (seg === c.segment && aid === String(c.assignee?.id || '') && !note)} onClick={() => run('assign', { action: 'assign', segment: seg, assigneeId: aid ? +aid : 0, message: note.trim(), sms: sms && !!m?.phone }, m ? `${m.name}-কে দেওয়া হয়েছে` : 'সেগমেন্ট আপডেট হয়েছে').then((ok) => ok && setNote(''))}>{busy === 'assign' ? 'সেভ হচ্ছে…' : 'দায়িত্ব দিন'}</button>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">প্রায়োরিটি</span>
        {Object.entries(CMP_PRIORITY).map(([k, v]) => <button key={k} disabled={busy === 'prio'} onClick={() => k !== (c.priority || 'normal') && run('prio', { action: 'priority', priority: k }, `প্রায়োরিটি: ${v.bn}`)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${(c.priority || 'normal') === k ? v.tone + ' ring-2 ring-brand/40' : 'bg-white ring-1 ring-line'}`}>{v.bn}</button>)}
      </div>
    </section>
  )
}

function MessageBox({ c, run, busy }) {
  const [mode, setMode] = useState('message')
  const [text, setText] = useState('')
  const [sms, setSms] = useState(false)
  const tpl = cmpSettings().templates.message
  const preview = tpl && text.trim() ? cmpRender(tpl, c, { '{message}': text.trim() }) : ''
  return (
    <section className="rounded-xl border border-line p-3">
      <div className="mb-2 flex gap-1">
        {[['message', 'কাস্টমারকে মেসেজ'], ['note', 'ইন্টারনাল নোট']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === k ? 'bg-brand text-white' : 'bg-surface'}`}>{l}</button>)}
      </div>
      <textarea className="field min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'note' ? 'শুধু টিম দেখবে — কাস্টমার দেখবেন না' : 'কাস্টমার ট্র্যাকিং পেজে দেখবেন'} />
      {mode === 'message' && <div className="mt-2"><SmsToggle on={sms} set={setSms} text={preview} to={c.phone} disabledWhy={!tpl ? 'মেসেজের SMS টেক্সট নেই (সেটিংস)' : ''} /></div>}
      <button className="btn-outline mt-2 w-full" disabled={!text.trim() || busy === 'msg'} onClick={() => run('msg', { action: mode, message: text.trim(), sms: mode === 'message' && sms }, mode === 'note' ? 'নোট যোগ হয়েছে' : 'মেসেজ পাঠানো হয়েছে').then((ok) => ok && setText(''))}>{busy === 'msg' ? 'পাঠানো হচ্ছে…' : mode === 'note' ? 'নোট সেভ করুন' : 'মেসেজ পাঠান'}</button>
    </section>
  )
}

function Lightbox({ f, onClose }) {
  if (!f) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3" onClick={onClose}>
      <button className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" onClick={onClose} aria-label="Close"><Icon name="close" className="h-5 w-5" /></button>
      <div onClick={(e) => e.stopPropagation()}>{f.type === 'video' ? <video src={mediaSrc(f.url)} controls autoPlay className="max-h-[85vh] max-w-full rounded" /> : <img src={mediaSrc(f.url)} alt="" className="max-h-[85vh] max-w-full rounded object-contain" />}</div>
    </div>
  )
}

/* ---------------- settings ---------------- */
const VARS = ['{name}', '{id}', '{link}', '{status}', '{type}', '{segment}', '{invoice}', '{hotline}', '{shop}', '{message}', '{customer}', '{phone}', '{admin}']
function CmpSettings({ staff, storage }) {
  useDb()
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(cmpSettings())))
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)
  const sample = { id: 'FCK7M3QD', name: 'রহিম উদ্দিন', phone: '01711000000', status: 'received', type: 'damaged', segment: 'replace', invoice: 'FA100120', assignee: { name: 'Rafi' } }
  const saveIt = () => { S.settings.complaints = f; save(); toast('Complain Box সেটিংস সেভ হয়েছে') }
  const noPhone = staff.filter((m) => !m.phone)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="SMS (শুধু Complain Box)" sub="আপনার বাল্ক SMS গেটওয়ে দিয়েই যাবে" className="lg:row-span-2">
        <label className="mb-3 flex items-center gap-2 rounded-lg bg-surface p-2 font-semibold"><input type="checkbox" className="h-4 w-4" checked={f.smsEnabled} onChange={(e) => setF({ ...f, smsEnabled: e.target.checked })} />স্বয়ংক্রিয় SMS চালু (জমা হলে কাস্টমার ও দায়িত্বপ্রাপ্ত মেম্বারকে)</label>
        <p className="mb-2 text-xs text-muted">টিম যখন ধাপ বদলায়, তখন “SMS পাঠান” টিক দেওয়া থাকলে নিচের টেক্সট যায়। টিক ডিফল্ট চালু থাকবে যেসব ইভেন্টে টগল অন।</p>
        <div className="space-y-3">
          {Object.entries(CMP_SMS_EVENTS).map(([k, label]) => {
            const t = f.templates[k] || ''
            const pv = cmpRender(t, { ...sample, status: CMP_STATUS[k] ? k : 'received' }, { '{message}': 'আপনার প্রোডাক্ট আগামীকাল পাঠানো হবে।' })
            return (
              <div key={k} className="rounded-lg border border-line p-2.5">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!f.events[k]} onChange={(e) => setF({ ...f, events: { ...f.events, [k]: e.target.checked } })} />{label}</label>
                <textarea className="field mt-1.5 min-h-[60px] text-xs" value={t} onChange={(e) => setF({ ...f, templates: { ...f.templates, [k]: e.target.value } })} />
                <p className="mt-1 text-[11px] text-muted">প্রিভিউ ({pv.length} অক্ষর · {Math.ceil(pv.length / 67)} SMS): {pv}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">ভেরিয়েবল: {VARS.join(' ')}</p>
        <div className="mt-3 flex gap-2"><button className="btn-brand flex-1" onClick={saveIt}>সেভ করুন</button><button className="btn-outline" onClick={() => setF({ ...cmpDefaults(), routing: f.routing })}>ডিফল্ট টেক্সট</button></div>
      </Panel>

      <Panel title="অটো-অ্যাসাইন (সেগমেন্ট → টিম মেম্বার)">
        <p className="mb-2 text-xs text-muted">নতুন অভিযোগ এলে তার সেগমেন্ট অনুযায়ী এই মেম্বারকে দেওয়া হবে এবং তার ফোনে SMS যাবে।</p>
        <div className="space-y-2">
          {Object.entries(CMP_SEGMENTS).map(([k, v]) => (
            <label key={k} className="grid grid-cols-[150px_1fr] items-center gap-2 text-sm"><span className="font-semibold">{v.bn}</span>
              <select className="field" value={f.routing[k] || ''} onChange={(e) => setF({ ...f, routing: { ...f.routing, [k]: +e.target.value || 0 } })}><option value="">— কাউকে না (ম্যানুয়ালি দেব) —</option>{staff.map((m) => <option key={m.id} value={m.id}>{m.name}{m.phone ? ` · ${m.phone}` : ' · ফোন নেই'}</option>)}</select>
            </label>
          ))}
        </div>
        {noPhone.length > 0 && <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">{noPhone.map((m) => m.name).join(', ')} — ফোন নাম্বার নেই, SMS যাবে না। <Link to="/admin/team" className="font-semibold underline">Team & roles</Link>-এ নাম্বার যোগ করুন।</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="সাড়া দেওয়ার সময় (ঘণ্টা)" hint="কাস্টমার পেজে দেখায়"><input className="field" type="number" min={1} value={f.responseHours} onChange={(e) => setF({ ...f, responseHours: +e.target.value || 24 })} /></Field>
          <Field label="ভিডিও সর্বোচ্চ (MB)" hint="হোস্টিংয়ের upload limit-এর কম রাখুন"><input className="field" type="number" min={5} max={200} value={f.maxVideoMB} onChange={(e) => setF({ ...f, maxVideoMB: Math.min(200, Math.max(5, +e.target.value || 60)) })} /></Field>
        </div>
        <button className="btn-brand mt-3 w-full" onClick={saveIt}>সেভ করুন</button>
      </Panel>

      <Panel title="স্টোরেজ পরিষ্কার">
        <p className="text-sm">এখন রাখা আছে: <b>{fmtSize(storage)}</b></p>
        <p className="mt-1 text-xs text-muted">সমাধান/বাতিল হওয়া অভিযোগের ছবি-ভিডিও সার্ভার থেকে স্থায়ীভাবে মুছে ফেলুন। অভিযোগের তথ্য ও টাইমলাইন থেকে যাবে।</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={days} onChange={(e) => setDays(+e.target.value)}><option value={0}>এখনই বন্ধ হওয়া সব</option><option value={7}>৭ দিনের বেশি আগে বন্ধ</option><option value={30}>৩০ দিনের বেশি আগে বন্ধ</option></select>
          <button className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={async () => { if (!confirm('বন্ধ হওয়া অভিযোগের ফাইলগুলো স্থায়ীভাবে মুছে যাবে। চালিয়ে যাবেন?')) return; setBusy(true); try { const r = await cmpCleanup(days); toast(`${r.cases}টি অভিযোগের ${r.files}টি ফাইল মুছেছে · ${r.freedMB} MB খালি হয়েছে`) } catch (e) { toast(e.message) } finally { setBusy(false) } }}>ফাইল মুছুন</button>
        </div>
      </Panel>

      <Panel title="কাস্টমার লিংক">
        <p className="text-sm">ফেসবুক পেজ, অর্ডার SMS বা প্যাকেটের স্টিকারে এই লিংক দিন:</p>
        <div className="mt-2 flex gap-2"><input className="field font-mono text-xs" readOnly value={storeUrl('/complain')} /><button className="btn-outline" onClick={() => navigator.clipboard?.writeText(storeUrl('/complain')).then(() => toast('কপি হয়েছে'))}>Copy</button><a className="btn-outline" href={storeUrl('/complain')} target="_blank" rel="noreferrer">Open</a></div>
        <img alt="QR code" className="mt-3 h-32 w-32 rounded border border-line" src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=6&data=${encodeURIComponent(storeUrl('/complain'))}`} />
        <p className="mt-1 text-[11px] text-muted">QR কোড প্রিন্ট করে প্যাকেটে দিন — স্ক্যান করলেই অভিযোগ পেজ খুলবে।</p>
      </Panel>
    </div>
  )
}
