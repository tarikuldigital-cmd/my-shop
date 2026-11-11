import { useState } from 'react'
import { S, save, useDb } from '../store/db'
import { Chips, Empty, Field, Panel, Pill, fdate, toast } from './ui'
import { PRESETS, ask, buildContext, serverEndpoint } from '../lib/chat'
import { LIVE } from '../config/env'
import { adminHeaders } from '../lib/live'
import { getSmsSecret, setSmsSecret } from '../lib/sms'

const MODES = [
  ['off', 'Off', 'No live-chat button on the website'],
  ['local', 'Auto (no AI)', 'Free — answers product names, prices and delivery questions from your catalogue. No API key needed'],
  ['relay', 'AI — through your server (recommended)', 'The API key stays on the server; visitors never see it'],
  ['direct', 'AI — straight from the browser (testing only)', 'The key stays in this browser. Do not use on the live site'],
]

export default function LiveChat() {
  useDb()
  const [tab, setTab] = useState('setup')
  const [cfg, setCfg] = useState(() => ({ ...structuredClone(S.settings.chat), suggestionsText: (S.settings.chat.suggestions || []).join('\n') }))
  const [secret, setSecret] = useState(getSmsSecret())
  const [server, setServer] = useState(null) // { keySet, keyHint, model, … } from the AI server
  const [q, setQ] = useState('Smart watch price?')
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
    if (!url) throw new Error('Enter the AI server URL (or the SMS server URL in SMS settings — same server)')
    if (!LIVE && !secret.trim()) throw new Error('Enter the admin secret')
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(LIVE ? adminHeaders() : { 'X-Admin-Secret': secret.trim() }) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) throw new Error(j.error || j.message || `HTTP ${r.status}`)
    return j
  }
  const run = (name, fn) => async () => { setBusy(name); try { await fn() } catch (e) { toast(e.message) } finally { setBusy('') } }

  const checkServer = run('check', async () => { setSmsSecret(secret.trim()); const j = await serverCall('GET'); setServer(j); toast(j.keySet ? `Key saved on the server (${j.keyHint})` : 'No key on the server yet') })
  const saveServer = run('server', async () => {
    if (!cfg.baseUrl || !cfg.model) throw new Error('Enter the base URL and model')
    setSmsSecret(secret.trim())
    const j = await serverCall('POST', { baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey, instructions: cfg.instructions })
    setServer(j); setCfg((c) => ({ ...c, apiKey: '' })); S.settings.chat = { ...clean(), apiKey: '' }; save()
    toast(`Saved on the server ✓ (key ${j.keyHint})`)
  })
  const test = run('test', async () => {
    setRes(null)
    const r = await ask([{ role: 'user', content: q }], clean(), { test: true, secret: secret.trim() })
    setRes(r)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Live chat <span className="text-base font-normal text-muted">(AI support agent)</span></h1><p className="text-sm text-muted">The "Live chat" button on your website — answers customer questions with names, prices and details from your catalogue</p></div>
        <Chips items={[['setup', 'Setup'], ['chats', 'Conversations', S.chats.length]]} value={tab} onChange={setTab} />
      </div>

      {tab === 'setup' && <>
        <Panel title="1. Choose a mode">
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map(([k, t, d]) => (
              <label key={k} className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 ${cfg.mode === k ? 'border-brand bg-brand/5' : 'border-line'}`}>
                <input type="radio" name="mode" checked={cfg.mode === k} onChange={() => setCfg({ ...cfg, mode: k })} className="mt-1" />
                <span><b className="block text-sm">{t}</b><span className="text-xs text-muted">{d}</span></span>
              </label>
            ))}
          </div>
          {S.settings.chat.mode !== cfg.mode && <p className="mt-2 text-xs text-amber-700">The website changes only after you press "Save settings" below.</p>}
        </Panel>

        {(cfg.mode === 'relay' || cfg.mode === 'direct') && (
          <Panel title="2. AI provider & API key">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([k, p]) => <button key={k} onClick={() => pick(k)} className={`rounded-full border-2 px-3 py-1.5 text-sm ${cfg.provider === k ? 'border-brand bg-brand text-white' : 'border-line'}`}>{p.label}{p.free && <span className="ml-1.5 rounded bg-green-100 px-1 text-[10px] font-bold text-green-700">FREE</span>}</button>)}
            </div>
            <p className="mt-2 text-xs text-muted">{preset.note}{preset.keyUrl && <> · get a key: <a className="text-brand underline" href={preset.keyUrl} target="_blank" rel="noreferrer">{preset.keyUrl.replace('https://', '')}</a></>} · Free limits can change — check the provider's page.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Base URL"><input className="field" value={cfg.baseUrl} onChange={set('baseUrl')} placeholder="https://…/v1" /></Field>
              <Field label="Model"><input className="field" value={cfg.model} onChange={set('model')} /></Field>
              <Field label={cfg.mode === 'relay' ? `API key ${server?.keySet ? `(saved on the server ${server.keyHint} — enter a new one to change it)` : ''}` : 'API key (saved in this browser)'} className="sm:col-span-2"><input type="password" autoComplete="off" className="field" value={cfg.apiKey} onChange={set('apiKey')} placeholder={server?.keySet ? '••••••••' : 'gsk_… / AIza… / sk-…'} /></Field>
            </div>
            {cfg.mode === 'relay' ? (
              <div className="mt-3 space-y-3 rounded-lg border border-line bg-surface p-3">
                <p className="text-sm font-semibold">AI server (on your hosting — <code>server/README.md</code>)</p>
                {LIVE && <p className="rounded-md bg-green-50 p-2 text-xs text-green-800">✓ AI runs through your own backend — no URL or secret needed. Just enter the base URL, model and API key below and press "Save key to server".</p>}
                {!LIVE && <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="AI server URL" hint="Leave empty to use the SMS server URL (same server)"><input className="field" value={cfg.relayUrl} onChange={set('relayUrl')} placeholder={S.settings.sms.relayUrl || 'https://sms.yourdomain.com'} /></Field>
                  <Field label="Admin secret" hint="The server's ADMIN_SECRET — same as for SMS"><input type="password" className="field" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></Field>
                </div>}
                <div className="flex flex-wrap gap-2">
                  <button className="btn-accent" disabled={!!busy} onClick={saveServer}>{busy === 'server' ? 'Saving…' : 'Save key to server'}</button>
                  <button className="btn-outline" disabled={!!busy} onClick={checkServer}>Check server</button>
                </div>
                <p className="text-xs text-muted">"Save key to server" sends the key straight to your server (kept in a file), not to this browser.</p>
              </div>
            ) : <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">⚠ In this mode the key is kept in this browser's localStorage and the browser calls the provider directly. For testing only; on the live site use "AI — through your server". Some providers block browser calls (CORS).</p>}
          </Panel>
        )}

        <Panel title="3. Agent behaviour">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Agent name"><input className="field" value={cfg.agentName} onChange={set('agentName')} /></Field>
            <Field label="First message (greeting)" className="sm:col-span-2"><textarea rows={2} className="field" value={cfg.greeting} onChange={set('greeting')} /></Field>
            <Field label="Quick question buttons (one per line, max 6)" className="sm:col-span-2"><textarea rows={4} className="field" value={cfg.suggestionsText} onChange={set('suggestionsText')} /></Field>
            <Field label="Extra instructions for the agent (optional, AI mode)" hint="e.g. always be polite; mention the free-delivery offer. Prices and details always come from the catalogue." className="sm:col-span-2"><textarea rows={3} className="field" value={cfg.instructions} onChange={set('instructions')} /></Field>
          </div>
        </Panel>

        <Panel title="4. Test it">
          <div className="flex flex-wrap gap-2"><input className="field min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && test()} /><button className="btn-brand" disabled={!!busy || !q.trim()} onClick={test}>{busy === 'test' ? '…' : 'Ask'}</button></div>
          {res && (
            <div className="mt-3 space-y-2 text-sm">
              <p><Pill tone={res.source === 'ai' ? 'green' : 'amber'}>{res.source === 'ai' ? 'AI reply' : 'Auto (no AI) reply'}</Pill></p>
              {res.error && <p className="rounded bg-red-50 p-2 text-red-700">AI error: {res.error} — customers get the automatic answer below meanwhile.</p>}
              <p className="whitespace-pre-wrap rounded-lg bg-surface p-3">{res.text}</p>
              <details><summary className="cursor-pointer text-xs text-muted">Catalogue data given to the AI</summary><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-900 p-3 text-xs text-gray-100">{res.context}</pre></details>
            </div>
          )}
        </Panel>

        <div className="flex gap-2"><button className="btn-accent" onClick={saveAll}>Save settings</button><span className="self-center text-xs text-muted">Takes effect on the website as soon as you save (in the demo: this browser only)</span></div>
      </>}

      {tab === 'chats' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm text-muted">Customer chats (latest 200). See which products and questions come up most.</p>{S.chats.length > 0 && <button className="text-sm text-red-600" onClick={() => { if (confirm('Delete all chat logs?')) { S.chats = []; save() } }}>Clear all</button>}</div>
          {S.chats.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white"><Empty>No chats yet</Empty></div> : S.chats.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-white">
              <button className="flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="min-w-0"><span className="line-clamp-1 text-sm font-medium">{c.messages.find((m) => m.r === 'user')?.t}</span><span className="text-xs text-muted">{c.messages.filter((m) => m.r === 'user').length} question(s) · {c.page}</span></span>
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
