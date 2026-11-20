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
    if (S.team.some((x) => x.email === m.email.toLowerCase())) throw new Error('An account with this email already exists')
    const rec = { id: Math.max(0, ...S.team.map((x) => x.id)) + 1, name: m.name, email: m.email.toLowerCase(), phone: m.phone || '', pass: m.password, role: m.role, active: true, created: Date.now(), lastLogin: 0 }
    S.team.push(rec); save(); return publicOf(rec)
  },
  update: async (id, p) => {
    const m = S.team.find((x) => x.id === id); if (!m) throw new Error('Member not found')
    const role = p.role ?? m.role, active = p.active ?? m.active
    if (m.role === 'super_admin' && m.active && (role !== 'super_admin' || !active) && supers() <= 1) throw new Error('There must be at least one active Super Admin')
    if (id === S.account?.id && !active) throw new Error('You cannot disable your own account')
    Object.assign(m, { role, active, name: p.name?.trim() || m.name }, p.phone !== undefined ? { phone: p.phone } : {}, p.password ? { pass: p.password } : {})
    if (id === S.account?.id) S.account = publicOf(m)
    save(); return publicOf(m)
  },
  del: async (id) => {
    const m = S.team.find((x) => x.id === id); if (!m) return
    if (id === S.account?.id) throw new Error('You cannot delete your own account')
    if (m.role === 'super_admin' && m.active && supers() <= 1) throw new Error('There must be at least one active Super Admin')
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
  const [f, setF] = useState({ name: member?.name || '', email: member?.email || '', phone: member?.phone || '', password: editing ? '' : genPass(), role: member?.role || 'order_manager', active: member?.active ?? true })
  const [show, setShow] = useState(!editing)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const isMe = editing && member.id === meId
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return toast('Please enter a name')
    if (!editing && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast('Enter a valid email address')
    if ((!editing || f.password) && f.password.length < 8) return toast('Password must be at least 8 characters')
    const phone = f.phone.replace(/[^\d]/g, '').replace(/^88/, '')
    if (phone && !/^01[3-9]\d{8}$/.test(phone)) return toast('Enter a valid 11-digit mobile number')
    setBusy(true)
    try {
      if (editing) {
        await api.update(member.id, { name: f.name.trim(), phone, role: f.role, active: f.active, ...(f.password ? { password: f.password } : {}) })
        toast('Saved ✓'); onDone(); onClose()
      } else {
        const m = await api.add({ name: f.name.trim(), email: f.email.trim().toLowerCase(), phone, password: f.password, role: f.role })
        setCreated({ ...m, password: f.password }); onDone()
      }
    } catch (x) { toast(x.message) } finally { setBusy(false) }
  }
  const loginUrl = `${location.origin}/admin`
  if (created) {
    const text = `Smart China Gallery — Admin login\nLink: ${loginUrl}\nEmail: ${created.email}\nPassword: ${created.password}\nRole: ${ROLES[created.role].label}`
    return (
      <Modal open onClose={onClose} title="✅ Member added">
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3"><Avatar m={created} /><div><p className="font-semibold">{created.name}</p><RoleBadge role={created.role} /></div></div>
          <p className="text-muted">Send these login details to the new member. The password is shown only here, once — you can set a new one later from Edit.</p>
          <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 font-mono text-xs">{text}</pre>
          <div className="flex flex-wrap gap-2">
            <button className="btn-brand" onClick={() => copy(text, 'Login details copied ✓')}>📋 Copy login details</button>
            <a className="btn-outline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Send on WhatsApp</a>
            <button className="btn-outline" onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    )
  }
  return (
    <Modal open onClose={onClose} wide title={editing ? `Edit — ${member.name}` : 'Add a new team member'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className="field" value={f.name} onChange={set('name')} placeholder="e.g. Rafi Ahmed" autoFocus /></Field>
          <Field label="Email (used to log in)"><input className="field disabled:bg-surface" type="email" value={f.email} onChange={set('email')} disabled={editing} placeholder="name@example.com" autoComplete="off" /></Field>
          <Field label="Mobile number (Complain Box SMS are sent here)" className="sm:col-span-2"><input className="field" type="tel" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" /></Field>
        </div>
        <Field label={editing ? 'New password (type one to change it, leave empty to keep the current one)' : 'Password (at least 8 characters)'}>
          <div className="flex gap-2">
            <input className="field font-mono" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <button type="button" className="btn-outline shrink-0 px-3" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            <button type="button" className="btn-outline shrink-0 px-3" onClick={() => { setF({ ...f, password: genPass() }); setShow(true) }}>🎲 Generate</button>
          </div>
        </Field>
        <div>
          <p className="field-label">Role</p>
          <RoleCards value={f.role} onChange={(role) => setF({ ...f, role })} />
          {isMe && f.role !== 'super_admin' && <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">⚠ If you lower your own role you will no longer be able to open the Team page.</p>}
        </div>
        {editing && (
          <div className="flex items-center justify-between rounded-xl border border-line p-3">
            <div><p className="font-semibold">Account active</p><p className="text-xs text-muted">When switched off, this person cannot log in and any open session ends.</p></div>
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
  const toggle = async (m, active) => { try { await api.update(m.id, { active }); toast(active ? `${m.name} is active again` : `${m.name} has been disabled`); await load() } catch (e) { toast(e.message) } }
  const remove = async () => { try { await api.del(del.id); toast('Removed'); setDel(null); await load() } catch (e) { toast(e.message); setDel(null) } }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Team & roles</h1>
          <p className="text-sm text-muted">Who can see and do what — only the Super Admin sets this here.</p>
        </div>
        <button className="btn-accent" onClick={() => setDialog('new')}>+ Add member</button>
      </div>

      {!LIVE && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo mode: the team is saved in this browser only. On the live site it lives in the database. Every demo password is 123456 — log out and sign in with another email to see how roles differ.</p>}
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
                      <p className="truncate text-sm text-muted">{m.email}{m.phone && <> · 📱 {m.phone}</>}</p>
                      <p className="mt-0.5 text-xs text-muted">{m.lastLogin ? `Last login ${ago(m.lastLogin)}` : 'Has not logged in yet'} · added {fdate(m.created)}</p>
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
            {!shown.length && <li className="py-8 text-center text-sm text-muted lg:col-span-2">No one found</li>}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3"><h2 className="font-semibold">What each role can do</h2><p className="text-xs text-muted">These permissions are enforced both in the menu and on the server.</p></div>
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
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove this member?">
        {del && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3"><Avatar m={del} /><div><p className="font-semibold">{del.name}</p><p className="text-muted">{del.email}</p></div></div>
            <p>This account will be deleted permanently and the person can no longer log in. To block them only for a while, switch off “Account active” in Edit instead.</p>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setDel(null)}>Cancel</button><button className="btn bg-red-600 text-white hover:bg-red-700" onClick={remove}>Yes, delete</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
