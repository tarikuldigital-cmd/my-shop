/*
 * Complain Box service — one API for the customer pages and the admin panel.
 *  LIVE: talks to api/lib/complaints.php (uploads, SMS and file deletion happen on the server).
 *  Demo: the same rules run in this browser (S.complaints in localStorage, SMS only logged).
 */
import { LIVE, API_BASE_URL } from '../config/env'
import { S, save, normPhone, validPhone, meName, refresh } from '../store/db'
import { liveApi, liveComplaintAction, liveComplaintStaff, liveComplaintCleanup } from './live'
import { CMP_STATUS, CMP_TYPES, CMP_SEGMENTS, cmpDefaults } from '../store/complaintsConfig'

export const cmpSettings = () => {
  const d = cmpDefaults(); const c = S.settings?.complaints || {}
  return { ...d, ...c, events: { ...d.events, ...c.events }, templates: { ...d.templates, ...c.templates }, routing: { ...d.routing, ...c.routing } }
}

/** media URL → something the browser can open (demo samples live in /img) */
export const mediaSrc = (u) => (!u ? '' : /^(https?:|data:|blob:|\/)/.test(u) ? u : `${import.meta.env.BASE_URL || '/'}${u}`)
export const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
export const mediaBytes = (c) => (c.files || []).filter((f) => !f.deleted).reduce((s, f) => s + (f.size || 0), 0)

/* ---------------- image compression (saves upload time and hosting space) ---------------- */
export async function compressImage(file, max = 1600, q = 0.82) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 350 * 1024) return file
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k)
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q))
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch { return file }
}
const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob) })

/* ---------------- customer ---------------- */
/** the customer's recent orders (by phone) so they can pick the one with the problem */
export async function cmpFindOrders(phone) {
  const p = normPhone(phone)
  if (!validPhone(p)) throw new Error('Enter a valid 11-digit mobile number')
  if (LIVE) {
    try { return await liveApi('orders/track', { method: 'POST', body: { phone: p } }) } catch (e) { if (e.status === 404) return []; throw e }
  }
  return S.orders.filter((o) => o.phone === p).slice(0, 20)
}

/** upload one photo/video; onProgress(0‥1). Returns { token, type, size, url } */
export async function cmpUpload(file, onProgress = () => {}) {
  const isVideo = file.type.startsWith('video/')
  const maxV = cmpSettings().maxVideoMB || 60
  if (!isVideo && !file.type.startsWith('image/')) throw new Error('Only photos or videos are allowed')
  if (isVideo && file.size > maxV * 1048576) throw new Error(`Video max ${maxV}MB — please use a shorter video`)
  const f = isVideo ? file : await compressImage(file)
  if (!isVideo && f.size > 12 * 1048576) throw new Error('Photos can be up to 12MB')
  if (!LIVE) {
    // demo: keep a small copy in the browser
    for (let i = 1; i <= 5; i++) { await new Promise((r) => setTimeout(r, 70)); onProgress(i / 5) }
    const url = isVideo ? URL.createObjectURL(f) : await toDataUrl(await compressImage(f, 900, 0.7))
    return { token: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: isVideo ? 'video' : 'image', size: f.size, url, demo: true }
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL.replace(/\/$/, '')}/complaints/upload`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let j = {}; try { j = JSON.parse(xhr.responseText) } catch { /* not json */ }
      if (xhr.status >= 200 && xhr.status < 300 && j.token) resolve(j)
      else reject(new Error(j.message || (xhr.status === 413 ? 'The file is too large' : 'Upload failed — please try again')))
    }
    xhr.onerror = () => reject(new Error('Check your internet connection and try again'))
    const fd = new FormData(); fd.append('file', f, f.name); xhr.send(fd)
  })
}

const NEW_ID = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = 'FC'; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return S.complaints.some((c) => c.id === s) ? NEW_ID() : s }

/** customer-visible copy (mirrors cmp_public in PHP) */
export function cmpPublic(c) {
  return {
    ...c, statusText: CMP_STATUS[c.status]?.bn, typeText: CMP_TYPES[c.type]?.bn,
    history: (c.history || []).filter((h) => h.public).map((h) => ({ ...h, by: h.by === 'customer' ? 'customer' : 'shop' })),
    files: (c.files || []).map((f) => ({ ...f, url: f.deleted ? '' : f.url })),
    assigned: !!c.assignee, canReply: !['resolved', 'rejected'].includes(c.status), sig: 'demo', assignee: undefined, altPhone: undefined,
  }
}

/* demo SMS: same templates, written to the SMS log instead of being sent */
export function cmpRender(tpl, c, extra = {}) {
  const st = S.settings || {}
  const first = String(c.name || '').trim().split(/\s+/)[0]
  const link = `${location.origin}${import.meta.env.VITE_ROUTER === 'hash' ? `${location.pathname}#` : ''}/c/${c.id}-${LIVE ? 'xxxxxxxxxx' : 'demo'}`
  const map = { '{name}': first || 'গ্রাহক', '{id}': c.id, '{link}': link, '{status}': CMP_STATUS[c.status]?.bn || '', '{type}': CMP_TYPES[c.type]?.bn || '', '{customer}': c.name || '', '{phone}': c.phone || '', '{invoice}': c.invoice || '', '{hotline}': st.phone || '', '{shop}': st.siteName || 'Fatiha Ayat Salah Chair', '{segment}': CMP_SEGMENTS[c.segment]?.bn || '', '{assignee}': c.assignee?.name || '', '{admin}': `${location.origin}/admin/complaints?open=${c.id}`, ...extra }
  return String(tpl || '').replace(/\{\w+\}/g, (k) => map[k] ?? k).replace(/[ \t]{2,}/g, ' ').trim()
}
function demoSms(c, event, to = '', extra = {}, force = false) {
  const cs = cmpSettings()
  if (!force && (!cs.smsEnabled || !cs.events[event])) return null
  const tpl = cs.templates[event]; if (!tpl) return null
  const text = cmpRender(tpl, c, extra)
  const e = { id: `s${Date.now()}${Math.floor(Math.random() * 999)}`, at: Date.now(), to: normPhone(to || c.phone), event: `complaint_${event}`, invoice: c.id, text, status: 'demo', info: 'Demo — SMS not sent', chars: text.length, unicode: true, parts: Math.ceil(text.length / 67) }
  S.smsLog.unshift(e)
  return e
}

export async function cmpCreate(d) {
  if (LIVE) {
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch { /* old browser */ }
    const { fileMeta, ...rest } = d // eslint-disable-line no-unused-vars
    return liveApi('complaints', { method: 'POST', body: { ...rest, tz } })
  }
  const phone = normPhone(d.phone)
  if (!d.name?.trim()) throw new Error('Enter your name')
  if (!validPhone(phone)) throw new Error('Enter a valid 11-digit mobile number')
  if (!CMP_TYPES[d.type]) throw new Error('Select the type of problem')
  if ((d.description || '').trim().length < 10) throw new Error('Please describe the problem (at least 10 characters)')
  const ord = d.invoice ? S.orders.find((o) => o.invoice === d.invoice.toUpperCase() && o.phone === phone) : null
  const now = Date.now()
  let segment = CMP_TYPES[d.type].seg
  if (d.want === 'refund') segment = 'refund'; else if (d.want === 'return' && segment === 'replace') segment = 'return'
  const items = ord ? ord.items.filter((it) => !d.items?.length || d.items.includes(String(it.productId || it.slug || it.name))).map((it) => ({ key: String(it.productId || it.slug || it.name), name: it.name, quantity: it.quantity, price: it.price, image: S.products.find((p) => p.id === it.productId || p.slug === it.slug)?.images?.[0] || '' })) : []
  const files = (d.files || []).map((t) => d.fileMeta?.[t]).filter(Boolean).map((f) => ({ name: f.token, url: f.url, type: f.type, size: f.size, at: now, by: 'customer' }))
  const c = {
    id: NEW_ID(), createdAt: now, updated: now, status: 'submitted', steps: { submitted: now }, type: d.type, want: d.want || 'other', segment,
    priority: ['damaged', 'wrong', 'missing'].includes(d.type) ? 'high' : 'normal', name: d.name.trim(), phone, altPhone: d.altPhone || '', contactTime: d.contactTime || '',
    invoice: ord?.invoice || (d.invoice || '').toUpperCase(), orderId: ord?.id || '', orderVerified: !!ord, orderTotal: ord?.total || 0, orderDate: ord?.createdAt || 0, orderStatus: ord?.status || '',
    items, description: d.description.trim(), files, assignee: null, unread: true, rating: null, country: 'BD',
    history: [{ at: now, type: 'status', s: 'submitted', by: 'customer', public: true, text: 'Complaint submitted' + (files.length ? ` · ${files.length} files attached` : '') }],
  }
  const aid = +cmpSettings().routing[segment] || 0
  const who = aid && (S.team || []).find((m) => m.id === aid && m.active)
  if (who) { c.assignee = { id: who.id, name: who.name, phone: who.phone || '' }; c.history.push({ at: now + 1, type: 'assign', by: 'system', public: false, text: `Auto-assigned to ${who.name} (${CMP_SEGMENTS[segment].bn})` }) }
  S.complaints.unshift(c)
  demoSms(c, 'submitted')
  if (who?.phone) demoSms(c, 'assigned', who.phone)
  save()
  return { id: c.id, sig: 'demo', complaint: cmpPublic(c) }
}

const findDemo = ({ id, phone, sig }) => {
  const c = S.complaints.find((x) => x.id === String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
  if (!c || !((phone && normPhone(phone) === c.phone) || sig === 'demo')) throw new Error('No complaint found for this ID and mobile number')
  return c
}
export async function cmpTrack(q) {
  if (LIVE) return (await liveApi('complaints/track', { method: 'POST', body: q })).complaint
  return cmpPublic(findDemo(q))
}
/** all complaints made with this phone (customer types only the phone) */
export async function cmpByPhone(phone) {
  const p = normPhone(phone)
  if (!validPhone(p)) throw new Error('Enter a valid 11-digit mobile number')
  if (LIVE) return (await liveApi('complaints/by-phone', { method: 'POST', body: { phone: p } })).complaints
  const list = S.complaints.filter((c) => c.phone === p).sort((a, b) => b.createdAt - a.createdAt).map(cmpPublic)
  if (!list.length) throw new Error('No complaints found for this number')
  return list
}
export async function cmpReply(q, text, files = [], fileMeta = {}) {
  if (LIVE) return (await liveApi('complaints/reply', { method: 'POST', body: { ...q, text, files } })).complaint // fileMeta is demo-only
  const c = findDemo(q)
  if (!cmpPublic(c).canReply) throw new Error('This complaint is closed')
  if (!text.trim() && !files.length) throw new Error('Write something or add a file')
  const nf = files.map((t) => fileMeta[t]).filter(Boolean).map((f) => ({ name: f.token, url: f.url, type: f.type, size: f.size, at: Date.now(), by: 'customer' }))
  c.files.push(...nf)
  c.history.push({ at: Date.now(), type: 'reply', by: 'customer', public: true, text: text.trim(), files: nf.map((f) => f.name) })
  c.updated = Date.now(); c.unread = true; save()
  return cmpPublic(c)
}
export async function cmpRate(q, stars, text) {
  if (LIVE) return (await liveApi('complaints/rate', { method: 'POST', body: { ...q, stars, text } })).complaint
  const c = findDemo(q)
  c.rating = { stars, text: text.trim(), at: Date.now() }
  c.history.push({ at: Date.now(), type: 'rating', by: 'customer', public: true, text: '★'.repeat(stars) + (text.trim() ? ` — ${text.trim()}` : '') })
  c.updated = Date.now(); c.unread = true; save()
  return cmpPublic(c)
}

/* ---------------- admin ---------------- */
export async function cmpStaff() {
  if (LIVE) return (await liveComplaintStaff()).staff
  return (S.team || []).filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, role: m.role, phone: m.phone || '' }))
}

/** same actions as h_cmp_action in PHP */
export async function cmpAction(c, body) {
  if (LIVE) return liveComplaintAction(c, body)
  const now = Date.now(), by = meName(), msg = (body.message || '').trim()
  const sms = []
  switch (body.action) {
    case 'status':
      if (body.status === c.status && !msg) throw new Error('Status is unchanged')
      c.status = body.status; c.steps = { ...c.steps, [body.status]: now }
      if (body.status === 'resolved' && body.refundAmount !== undefined && body.refundAmount !== '') c.refundAmount = Math.max(0, +body.refundAmount || 0)
      c.history.push({ at: now, type: 'status', s: body.status, by, public: true, text: msg })
      if (body.sms) sms.push(() => demoSms(c, body.status, '', {}, true))
      break
    case 'message':
      if (!msg) throw new Error('Write a message')
      c.history.push({ at: now, type: 'message', by, public: true, text: msg })
      if (body.sms) sms.push(() => demoSms(c, 'message', '', { '{message}': msg }, true))
      break
    case 'note':
      if (!msg) throw new Error('Write a note')
      c.history.push({ at: now, type: 'note', by, public: false, text: msg })
      break
    case 'assign': {
      if (CMP_SEGMENTS[body.segment]) c.segment = body.segment
      const u = body.assigneeId ? (S.team || []).find((m) => m.id === +body.assigneeId) : null
      if (body.assigneeId && !u) throw new Error('Team member not found')
      c.assignee = u ? { id: u.id, name: u.name, phone: u.phone || '' } : null
      c.history.push({ at: now, type: 'assign', by, public: false, text: u ? `${CMP_SEGMENTS[c.segment].bn} → ${u.name}${msg ? ` · ${msg}` : ''}` : `Segment: ${CMP_SEGMENTS[c.segment].bn} · unassigned` })
      if (u && body.sms && u.phone) sms.push(() => demoSms(c, 'assigned', u.phone, {}, true))
      break
    }
    case 'priority':
      c.priority = body.priority
      c.history.push({ at: now, type: 'note', by, public: false, text: `Priority: ${body.priority}` })
      break
    case 'files_delete': {
      let n = 0, freed = 0
      for (const f of c.files) { if (f.deleted || (body.names !== 'all' && !body.names.includes(f.name))) continue; if (f.url?.startsWith('blob:')) URL.revokeObjectURL(f.url); Object.assign(f, { deleted: true, deletedAt: now, url: '' }); n++; freed += f.size || 0 }
      if (!n) throw new Error('No files to delete')
      c.history.push({ at: now, type: 'files', by, public: false, text: `${n} files deleted from the server (${(freed / 1048576).toFixed(1)} MB)` })
      break
    }
    case 'read': c.unread = false; save(); return { complaint: c }
    default: throw new Error('Unknown action')
  }
  c.updated = now; c.unread = false
  const log = sms.map((f) => f()).filter(Boolean)
  for (const l of log) c.history.push({ at: Date.now(), type: 'sms', by: 'system', public: false, text: `SMS → ${l.to} · demo (not sent)` })
  save(); refresh()
  return { complaint: c, sms: log }
}

export async function cmpCleanup(days = 0) {
  if (LIVE) return liveComplaintCleanup(days)
  let files = 0, cases = 0, freed = 0
  for (const c of S.complaints) {
    if (!['resolved', 'rejected'].includes(c.status)) continue
    if ((c.steps?.[c.status] || c.updated) > Date.now() - days * 864e5) continue
    let k = 0
    for (const f of c.files) { if (f.deleted) continue; Object.assign(f, { deleted: true, deletedAt: Date.now(), url: '' }); k++; freed += f.size || 0 }
    if (k) { c.history.push({ at: Date.now(), type: 'files', by: meName(), public: false, text: `${k} files deleted (bulk cleanup)` }); files += k; cases++ }
  }
  save()
  return { files, cases, freedMB: +(freed / 1048576).toFixed(1) }
}
