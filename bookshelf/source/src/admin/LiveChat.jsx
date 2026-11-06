import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Chips, Empty, Field, Panel, Pill, fdate, toast } from './ui'
import { PRESETS, ask, buildContext, serverEndpoint } from '../lib/chat'
import { LIVE } from '../config/env'
import { adminHeaders } from '../lib/live'
import { getSmsSecret, setSmsSecret } from '../lib/sms'

const MODES = [
  ['off', 'বন্ধ', 'ওয়েবসাইটে লাইভ চ্যাট বাটন দেখাবে না'],
  ['local', 'অটো (AI ছাড়া)', 'ফ্রি — বইয়ের নাম/দাম/ডেলিভারি ক্যাটালগ থেকে খুঁজে উত্তর দেয়। কোনো API key লাগে না'],
  ['relay', 'AI — আপনার সার্ভারের মাধ্যমে (রিকমেন্ডেড)', 'API key সার্ভারে থাকে, ভিজিটর কখনো দেখতে পায় না'],
  ['direct', 'AI — সরাসরি ব্রাউজার থেকে (শুধু টেস্ট)', 'key এই ব্রাউজারেই থাকে। লাইভ সাইটে ব্যবহার করবেন না'],
]

export default function LiveChat() {
  useDb()
  const [tab, setTab] = useState('setup')
  const [cfg, setCfg] = useState(() => ({ ...structuredClone(S.settings.chat), suggestionsText: (S.settings.chat.suggestions || []).join('\n') }))
  const [secret, setSecret] = useState(getSmsSecret())
  const [server, setServer] = useState(null) // { keySet, keyHint, model, … } from the AI server
  const [q, setQ] = useState('Cambridge IELTS 19 এর দাম কত?')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState(null)
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value })
  const preset = PRESETS[cfg.provider]
  const pick = (k) => { const p = PRESETS[k]; setCfg({ ...cfg, provider: k, ...(k !== 'custom' ? { baseUrl: p.baseUrl, model: p.model } : {}) }) }

  const clean = () => {
    const { suggestionsText, ...rest } = cfg
    const out = { ...rest, suggestions: suggestionsText.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 6) }
    if (out.mode !== 'direct') out.apiKey = ''   // the key never stays in the browser unless you chose the test mode
    return out
  }
  const saveAll = () => { S.settings.chat = clean(); save(); setSmsSecret(secret.trim()); toast('Live chat settings saved') }

  const serverCall = async (method, body) => {
    const url = serverEndpoint(cfg, 'chat/config')
    if (!url) throw new Error('AI server URL দিন (অথবা SMS settings-এ SMS server URL দিন — একই server)')
    if (!LIVE && !secret.trim()) throw new Error('Admin secret দিন')
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(LIVE ? adminHeaders() : { 'X-Admin-Secret': secret.trim() }) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) throw new Error(j.error || j.message || `HTTP ${r.status}`)
    return j
  }
  const run = (name, fn) => async () => { setBusy(name); try { await fn() } catch (e) { toast(e.message) } finally { setBusy('') } }

  const checkServer = run('check', async () => { setSmsSecret(secret.trim()); const j = await serverCall('GET'); setServer(j); toast(j.keySet ? `সার্ভারে key আছে (${j.keyHint})` : 'সার্ভারে এখনো key নেই') })
  const saveServer = run('server', async () => {
    if (!cfg.baseUrl || !cfg.model) throw new Error('Base URL ও Model দিন')
    setSmsSecret(secret.trim())
    const j = await serverCall('POST', { baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey, instructions: cfg.instructions })
    setServer(j); setCfg((c) => ({ ...c, apiKey: '' })); S.settings.chat = { ...clean(), apiKey: '' }; save()
    toast(`সার্ভারে সেভ হয়েছে ✓ (key ${j.keyHint})`)
  })
  const test = run('test', async () => {
    setRes(null)
    const r = await ask([{ role: 'user', content: q }], clean(), { test: true, secret: secret.trim() })
    setRes(r)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Live chat <span className="text-base font-normal text-muted">(AI সাপোর্ট এজেন্ট)</span></h1><p className="text-sm text-muted">ওয়েবসাইটের "লাইভ চ্যাট" বাটন — কাস্টমারের প্রশ্নে আপনার বইয়ের ক্যাটালগ দেখে নাম, দাম ও তথ্য বলে</p></div>
        <Chips items={[['setup', 'Setup'], ['chats', 'Conversations', S.chats.length]]} value={tab} onChange={setTab} />
      </div>

      {tab === 'setup' && <>
        <Panel title="১. মোড বাছুন">
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map(([k, t, d]) => (
              <label key={k} className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 ${cfg.mode === k ? 'border-brand bg-brand/5' : 'border-line'}`}>
                <input type="radio" name="mode" checked={cfg.mode === k} onChange={() => setCfg({ ...cfg, mode: k })} className="mt-1" />
                <span><b className="block text-sm">{t}</b><span className="text-xs text-muted">{d}</span></span>
              </label>
            ))}
          </div>
          {S.settings.chat.mode !== cfg.mode && <p className="mt-2 text-xs text-amber-700">নিচে "Save settings" না চাপা পর্যন্ত ওয়েবসাইটে বদলাবে না।</p>}
        </Panel>

        {(cfg.mode === 'relay' || cfg.mode === 'direct') && (
          <Panel title="২. AI provider ও API key">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([k, p]) => <button key={k} onClick={() => pick(k)} className={`rounded-full border-2 px-3 py-1.5 text-sm ${cfg.provider === k ? 'border-brand bg-brand text-white' : 'border-line'}`}>{p.label}{p.free && <span className="ml-1.5 rounded bg-green-100 px-1 text-[10px] font-bold text-green-700">FREE</span>}</button>)}
            </div>
            <p className="mt-2 text-xs text-muted">{preset.note}{preset.keyUrl && <> · key নিন: <a className="text-brand underline" href={preset.keyUrl} target="_blank" rel="noreferrer">{preset.keyUrl.replace('https://', '')}</a></>} · ফ্রি লিমিট প্রোভাইডার বদলাতে পারে, তাদের পেজে দেখে নিন।</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Base URL"><input className="field" value={cfg.baseUrl} onChange={set('baseUrl')} placeholder="https://…/v1" /></Field>
              <Field label="Model"><input className="field" value={cfg.model} onChange={set('model')} /></Field>
              <Field label={cfg.mode === 'relay' ? `API key ${server?.keySet ? `(সার্ভারে সেভ আছে ${server.keyHint} — বদলাতে চাইলে নতুনটি দিন)` : ''}` : 'API key (এই ব্রাউজারে সেভ হবে)'} className="sm:col-span-2"><input type="password" autoComplete="off" className="field" value={cfg.apiKey} onChange={set('apiKey')} placeholder={server?.keySet ? '••••••••' : 'gsk_… / AIza… / sk-…'} /></Field>
            </div>
            {cfg.mode === 'relay' ? (
              <div className="mt-3 space-y-3 rounded-lg border border-line bg-surface p-3">
                <p className="text-sm font-semibold">AI server (আপনার হোস্টিংয়ে — <code>server/README.md</code>)</p>
                {LIVE && <p className="rounded-md bg-green-50 p-2 text-xs text-green-800">✓ AI আপনার ব্যাকএন্ড দিয়েই চলবে — URL বা secret লাগবে না। শুধু নিচে Base URL, Model ও API key দিয়ে "Save key to server" চাপুন।</p>}
                {!LIVE && <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="AI server URL" hint="খালি রাখলে SMS server URL-ই ব্যবহার হবে (একই server)"><input className="field" value={cfg.relayUrl} onChange={set('relayUrl')} placeholder={S.settings.sms.relayUrl || 'https://sms.bookshelf.com.bd'} /></Field>
                  <Field label="Admin secret" hint="server-এর ADMIN_SECRET — SMS-এর মতোই"><input type="password" className="field" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></Field>
                </div>}
                <div className="flex flex-wrap gap-2">
                  <button className="btn-accent" disabled={!!busy} onClick={saveServer}>{busy === 'server' ? 'Saving…' : 'Save key to server'}</button>
                  <button className="btn-outline" disabled={!!busy} onClick={checkServer}>Check server</button>
                </div>
                <p className="text-xs text-muted">"Save key to server" চাপলে key সরাসরি আপনার server-এ যায় (ফাইলে থাকে), এই ব্রাউজারে রাখা হয় না।</p>
              </div>
            ) : <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">⚠ এই মোডে key এই ব্রাউজারের localStorage-এ থাকে এবং ব্রাউজার থেকে সরাসরি provider-কে কল যায়। শুধু টেস্টের জন্য; লাইভ সাইটে "AI — সার্ভারের মাধ্যমে" ব্যবহার করুন। কিছু provider ব্রাউজার থেকে (CORS) ব্লক করতে পারে।</p>}
          </Panel>
        )}

        <Panel title="৩. এজেন্টের আচরণ">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="এজেন্টের নাম"><input className="field" value={cfg.agentName} onChange={set('agentName')} /></Field>
            <Field label="প্রথম বার্তা (greeting)" className="sm:col-span-2"><textarea rows={2} className="field" value={cfg.greeting} onChange={set('greeting')} /></Field>
            <Field label="দ্রুত প্রশ্নের বাটন (প্রতি লাইনে একটি, সর্বোচ্চ ৬)" className="sm:col-span-2"><textarea rows={4} className="field" value={cfg.suggestionsText} onChange={set('suggestionsText')} /></Field>
            <Field label="এজেন্টের জন্য বাড়তি নির্দেশ (ঐচ্ছিক, AI মোডে)" hint="যেমন: সবসময় আপনি করে বলবে; কম্বো কিনলে ছাড়ের কথা জানাবে। দাম/তথ্য সবসময় ক্যাটালগ থেকেই আসবে।" className="sm:col-span-2"><textarea rows={3} className="field" value={cfg.instructions} onChange={set('instructions')} /></Field>
          </div>
        </Panel>

        <Panel title="৪. টেস্ট করুন">
          <div className="flex flex-wrap gap-2"><input className="field min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && test()} /><button className="btn-brand" disabled={!!busy || !q.trim()} onClick={test}>{busy === 'test' ? '…' : 'Ask'}</button></div>
          {res && (
            <div className="mt-3 space-y-2 text-sm">
              <p><Pill tone={res.source === 'ai' ? 'green' : 'amber'}>{res.source === 'ai' ? 'AI reply' : 'Auto (no AI) reply'}</Pill></p>
              {res.error && <p className="rounded bg-red-50 p-2 text-red-700">AI error: {res.error} — গ্রাহক এই সময় নিচের অটো উত্তর পাবে।</p>}
              <p className="whitespace-pre-wrap rounded-lg bg-surface p-3">{res.text}</p>
              <details><summary className="cursor-pointer text-xs text-muted">AI কে যে ক্যাটালগ তথ্য দেওয়া হয়েছে</summary><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-900 p-3 text-xs text-gray-100">{res.context}</pre></details>
            </div>
          )}
        </Panel>

        <div className="flex gap-2"><button className="btn-accent" onClick={saveAll}>Save settings</button><span className="self-center text-xs text-muted">Save করলে ওয়েবসাইটে সাথে সাথে কার্যকর হবে (ডেমোতে এই ব্রাউজারে)</span></div>
      </>}

      {tab === 'chats' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm text-muted">কাস্টমারদের চ্যাট (সর্বশেষ ২০০টি)। প্রশ্ন দেখে বুঝবেন কোন বই/তথ্য নিয়ে বেশি জিজ্ঞেস করছে।</p>{S.chats.length > 0 && <button className="text-sm text-red-600" onClick={() => { if (confirm('Delete all chat logs?')) { S.chats = []; save() } }}>Clear all</button>}</div>
          {S.chats.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white"><Empty>এখনো কোনো চ্যাট হয়নি</Empty></div> : S.chats.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-white">
              <button className="flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="min-w-0"><span className="line-clamp-1 text-sm font-medium">{c.messages.find((m) => m.r === 'user')?.t}</span><span className="text-xs text-muted">{c.messages.filter((m) => m.r === 'user').length} প্রশ্ন · {c.page}</span></span>
                <span className="shrink-0 text-xs text-muted">{fdate(c.updated || c.at)}</span>
              </button>
              {open === c.id && <div className="space-y-2 border-t border-line p-3 text-sm">{c.messages.map((m, i) => <div key={i} className={m.r === 'user' ? 'text-right' : ''}><span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${m.r === 'user' ? 'bg-brand text-white' : 'bg-surface'}`}>{m.t}</span>{m.err && <div className="text-xs text-red-600">AI error → auto reply: {m.err}</div>}</div>)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
