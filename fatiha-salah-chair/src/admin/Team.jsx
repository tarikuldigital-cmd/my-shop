import { useCallback, useEffect, useMemo, useState } from 'react'
import { LIVE } from '../config/env'
import { S, save, useDb } from '../store/db'
import { liveTeamList, liveTeamAdd, liveTeamUpdate, liveTeamDelete } from '../lib/live'
import { Field, Modal, toast, fdate, ago } from './ui'
import { ROLES, ROLE_KEYS, PERM_LABELS, initials } from './roles'

/* ---------- data layer: the live site talks to the server, the demo keeps the team in this browser ---------- */
const publicOf = (m) => { const { pass, ...rest } = m; return { ...rest, perms: ROLES[m.role].perms } } // eslint-disable-line no-unused-vars
const supers = () => S.team.filter((m) => m.role === 'super_admin' && m.active).length
const demoApi = {
  list: async () => S.team.map(publicOf),
  add: async (m) => {
    if (S.team.some((x) => x.email === m.email.toLowerCase())) throw new Error('এই ইমেইলে আগেই একটি অ্যাকাউন্ট আছে')
    const rec = { id: Math.max(0, ...S.team.map((x) => x.id)) + 1, name: m.name, email: m.email.toLowerCase(), pass: m.password, role: m.role, active: true, created: Date.now(), lastLogin: 0 }
    S.team.push(rec); save(); return publicOf(rec)
  },
  update: async (id, p) => {
    const m = S.team.find((x) => x.id === id); if (!m) throw new Error('সদস্য পাওয়া যায়নি')
    const role = p.role ?? m.role, active = p.active ?? m.active
    if (m.role === 'super_admin' && m.active && (role !== 'super_admin' || !active) && supers() <= 1) throw new Error('কমপক্ষে একজন সক্রিয় Super Admin থাকতে হবে')
    if (id === S.account?.id && !active) throw new Error('নিজের অ্যাকাউন্ট বন্ধ করা যাবে না')
    Object.assign(m, { role, active, name: p.name?.trim() || m.name }, p.password ? { pass: p.password } : {})
    if (id === S.account?.id) S.account = publicOf(m)
    save(); return publicOf(m)
  },
  del: async (id) => {
    const m = S.team.find((x) => x.id === id); if (!m) return
    if (id === S.account?.id) throw new Error('নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না')
    if (m.role === 'super_admin' && m.active && supers() <= 1) throw new Error('কমপক্ষে একজন সক্রিয় Super Admin থাকতে হবে')
    S.team = S.team.filter((x) => x.id !== id); save()
  },
}
const api = LIVE ? { list: liveTeamList, add: liveTeamAdd, update: liveTeamUpdate, del: liveTeamDelete } : demoApi

const genPass = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a = new Uint32Array(10); crypto.getRandomValues(a); return Array.from(a, (n) => c[n % c.length]).join('') }

/* ---------- small pieces ---------- */
function RoleBadge({ role, className = '' }) {
  const r = ROLES[role] || ROLES.admin
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.tone} ${className}`}><span aria-hidden>{r.icon}</span>{r.label}</span>
}
function Avatar({ m, size = 'h-12 w-12 text-lg' }) {
  const r = ROLES[m.role] || ROLES.admin
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white shadow ${r.dot} ${size} ${m.active ? '' : 'opacity-40 grayscale'}`}>{initials(m.name)}</span>
}
function RoleCards({ value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Role">
      {ROLE_KEYS.map((k) => {
        const r = ROLES[k]; const on = value === k
        return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onChange(k)} className={`rounded-xl border-2 p-3 text-left transition ${on ? 'border-brand bg-brand/5 shadow-sm' : 'border-line bg-white hover:border-brand/40'}`}>
            <span className="flex items-center justify-between"><span className="font-semibold">{r.icon} {r.label}</span><span className={`h-4 w-4 rounded-full border-2 ${on ? 'border-brand bg-brand ring-2 ring-inset ring-white' : 'border-line'}`} /></span>
            <span className="mt-1 block text-xs leading-snug text-muted">{r.desc}</span>
          </button>
        )
      })}
    </div>
  )
}
function Switch({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-green-600' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
const copy = (text, msg = 'Copied ✓') => { navigator.clipboard?.writeText(text); toast(msg) }

/* ---------- add / edit dialog ---------- */
function MemberDialog({ member, onClose, onDone, meId }) {
  const editing = !!member
  const [f, setF] = useState({ name: member?.name || '', email: member?.email || '', password: editing ? '' : genPass(), role: member?.role || 'order_manager', active: member?.active ?? true })
  const [show, setShow] = useState(!editing)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const isMe = editing && member.id === meId
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return toast('নাম লিখুন')
    if (!editing && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast('সঠিক ইমেইল দিন')
    if ((!editing || f.password) && f.password.length < 8) return toast('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে')
    setBusy(true)
    try {
      if (editing) {
        await api.update(member.id, { name: f.name.trim(), role: f.role, active: f.active, ...(f.password ? { password: f.password } : {}) })
        toast('সেভ হয়েছে ✓'); onDone(); onClose()
      } else {
        const m = await api.add({ name: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password, role: f.role })
        setCreated({ ...m, password: f.password }); onDone()
      }
    } catch (x) { toast(x.message) } finally { setBusy(false) }
  }
  const loginUrl = `${location.origin}/admin`
  if (created) {
    const text = `Fatiha Ayat Salah Chair — Admin login\nLink: ${loginUrl}\nEmail: ${created.email}\nPassword: ${created.password}\nRole: ${ROLES[created.role].label}`
    return (
      <Modal open onClose={onClose} title="✅ Member যোগ হয়েছে">
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3"><Avatar m={created} /><div><p className="font-semibold">{created.name}</p><RoleBadge role={created.role} /></div></div>
          <p className="text-muted">এই লগইন তথ্য তাকে পাঠিয়ে দিন। পাসওয়ার্ড এখানেই একবার দেখা যাচ্ছে — পরে Edit থেকে নতুন পাসওয়ার্ড সেট করতে পারবেন।</p>
          <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 font-mono text-xs">{text}</pre>
          <div className="flex flex-wrap gap-2">
            <button className="btn-brand" onClick={() => copy(text, 'লগইন তথ্য কপি হয়েছে ✓')}>📋 Copy login details</button>
            <a className="btn-outline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>WhatsApp-এ পাঠান</a>
            <button className="btn-outline" onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    )
  }
  return (
    <Modal open onClose={onClose} wide title={editing ? `Edit — ${member.name}` : 'নতুন টিম মেম্বার যোগ করুন'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="নাম"><input className="field" value={f.name} onChange={set('name')} placeholder="যেমন: Rafi Ahmed" autoFocus /></Field>
          <Field label="ইমেইল (লগইনের জন্য)"><input className="field disabled:bg-surface" type="email" value={f.email} onChange={set('email')} disabled={editing} placeholder="name@example.com" autoComplete="off" /></Field>
        </div>
        <Field label={editing ? 'নতুন পাসওয়ার্ড (বদলাতে চাইলে লিখুন, না চাইলে ফাঁকা রাখুন)' : 'পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)'}>
          <div className="flex gap-2">
            <input className="field font-mono" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <button type="button" className="btn-outline shrink-0 px-3" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            <button type="button" className="btn-outline shrink-0 px-3" onClick={() => { setF({ ...f, password: genPass() }); setShow(true) }}>🎲 Generate</button>
          </div>
        </Field>
        <div>
          <p className="field-label">রোল</p>
          <RoleCards value={f.role} onChange={(role) => setF({ ...f, role })} />
          {isMe && f.role !== 'super_admin' && <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">⚠ নিজের রোল নামিয়ে দিলে আপনি আর Team পেজ খুলতে পারবেন না।</p>}
        </div>
        {editing && (
          <div className="flex items-center justify-between rounded-xl border border-line p-3">
            <div><p className="font-semibold">অ্যাকাউন্ট চালু</p><p className="text-xs text-muted">বন্ধ করলে সে আর লগইন করতে পারবে না এবং চালু সেশন শেষ হয়ে যাবে।</p></div>
            <Switch on={f.active} onChange={(active) => setF({ ...f, active })} disabled={isMe} label="Account active" />
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-brand" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : '+ Add member'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- page ---------- */
export default function Team() {
  useDb()
  const meId = S.account?.id
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)   // null | 'new' | member
  const [del, setDel] = useState(null)
  const [q, setQ] = useState('')
  const load = useCallback(() => api.list().then((m) => { setMembers(m); setError('') }).catch((e) => setError(e.message)), [])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => Object.fromEntries(ROLE_KEYS.map((k) => [k, (members || []).filter((m) => m.role === k).length])), [members])
  const shown = (members || []).filter((m) => !q.trim() || `${m.name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase()))

  const changeRole = async (m, role) => {
    if (role === m.role) return
    try { await api.update(m.id, { role }); toast(`${m.name} → ${ROLES[role].label} ✓`); await load() } catch (e) { toast(e.message); load() }
  }
  const toggle = async (m, active) => { try { await api.update(m.id, { active }); toast(active ? `${m.name} চালু হয়েছে` : `${m.name} বন্ধ করা হয়েছে`); await load() } catch (e) { toast(e.message) } }
  const remove = async () => { try { await api.del(del.id); toast('মুছে ফেলা হয়েছে'); setDel(null); await load() } catch (e) { toast(e.message); setDel(null) } }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Team & roles</h1>
          <p className="text-sm text-muted">কে কী দেখতে ও করতে পারবে — শুধু Super Admin এখান থেকে ঠিক করেন।</p>
        </div>
        <button className="btn-accent" onClick={() => setDialog('new')}>+ Add member</button>
      </div>

      {!LIVE && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo mode: টিম এই ব্রাউজারেই সেভ হয়। লাইভ সাইটে এটি ডাটাবেসে থাকে। ডেমো পাসওয়ার্ড সবার ১২৩৪৫৬ — বের হয়ে ওই ইমেইল দিয়ে লগইন করে রোলের পার্থক্য দেখতে পারেন।</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">⚠ {error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ROLE_KEYS.map((k) => (
          <div key={k} className="rounded-xl border border-line bg-white p-3 shadow-sm">
            <p className="text-xl">{ROLES[k].icon}</p>
            <p className="mt-1 text-2xl font-bold leading-none">{counts[k]}</p>
            <p className="mt-1 text-xs font-medium text-muted">{ROLES[k].label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Members {members && <span className="text-sm font-normal text-muted">({members.length})</span>}</h2>
          <input className="field max-w-[220px]" placeholder="Search name / email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!members ? <p className="py-8 text-center text-sm text-muted">Loading…</p> : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {shown.map((m) => {
              const me = m.id === meId
              return (
                <li key={m.id} className={`rounded-xl border p-3.5 transition ${m.active ? 'border-line bg-white' : 'border-dashed border-line bg-surface/70'}`}>
                  <div className="flex items-start gap-3">
                    <Avatar m={m} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold leading-tight">{m.name}{me && <span className="rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-dark">You</span>}{!m.active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">Disabled</span>}</p>
                      <p className="truncate text-sm text-muted">{m.email}</p>
                      <p className="mt-0.5 text-xs text-muted">{m.lastLogin ? `Last login ${ago(m.lastLogin)}` : 'এখনো লগইন করেনি'} · added {fdate(m.created)}</p>
                    </div>
                    <Switch on={m.active} onChange={(v) => toggle(m, v)} disabled={me} label={`${m.name} active`} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <label className="flex items-center gap-2 text-xs text-muted">Role
                      <select className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none focus:border-brand" value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role of ${m.name}`}>
                        {ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLES[k].icon} {ROLES[k].label}</option>)}
                      </select>
                    </label>
                    <span className="flex-1" />
                    <button className="btn-outline px-3 py-1.5 text-sm" onClick={() => setDialog(m)}>Edit</button>
                    {!me && <button className="btn-outline px-3 py-1.5 text-sm text-red-600" onClick={() => setDel(m)}>Delete</button>}
                  </div>
                </li>
              )
            })}
            {!shown.length && <li className="py-8 text-center text-sm text-muted lg:col-span-2">কাউকে পাওয়া যায়নি</li>}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3"><h2 className="font-semibold">কোন রোল কী পারে</h2><p className="text-xs text-muted">মেনু ও সার্ভার — দুই জায়গাতেই এই অনুমতি কার্যকর হয়।</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr><th className="p-3">Section</th>{ROLE_KEYS.map((k) => <th key={k} className="p-3 text-center"><RoleBadge role={k} className="!px-2 !text-[11px]" /></th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(PERM_LABELS).map(([perm, label]) => (
                <tr key={perm} className="border-t border-line">
                  <td className="p-3 font-medium">{label}</td>
                  {ROLE_KEYS.map((k) => { const ok = ROLES[k].perms.includes('*') || ROLES[k].perms.includes(perm); return <td key={k} className="p-3 text-center">{ok ? <span className="font-bold text-green-600" aria-label="allowed">✓</span> : <span className="text-gray-300" aria-label="not allowed">—</span>}</td> })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialog && <MemberDialog member={dialog === 'new' ? null : dialog} meId={meId} onClose={() => setDialog(null)} onDone={load} />}
      <Modal open={!!del} onClose={() => setDel(null)} title="Member মুছে ফেলবেন?">
        {del && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3"><Avatar m={del} /><div><p className="font-semibold">{del.name}</p><p className="text-muted">{del.email}</p></div></div>
            <p>এই অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে এবং সে আর লগইন করতে পারবে না। শুধু সাময়িক বন্ধ করতে চাইলে Edit থেকে “অ্যাকাউন্ট চালু” অফ করুন।</p>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setDel(null)}>Cancel</button><button className="btn bg-red-600 text-white hover:bg-red-700" onClick={remove}>হ্যাঁ, মুছে দিন</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
