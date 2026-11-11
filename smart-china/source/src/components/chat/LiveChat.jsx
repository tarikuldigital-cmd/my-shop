import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Img from '../common/Img'
import { S, useDb } from '../../store/db'
import { ask, logChat, productUrl } from '../../lib/chat'
import { WhatsAppIcon } from '../common/Icon'
import { formatPrice } from '../../utils/format'

const KEY = 'scg_chat_v1'
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null } catch { return null } }

/** **bold** and links → React nodes (no HTML injection). */
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} className="underline" target="_blank" rel="noreferrer">{part.replace(/^https?:\/\/[^/]+/, '') || part}</a>
    return part
  })
}

function Card({ p, onGo }) {
  return (
    <Link to={`/product/${p.slug}`} onClick={onGo} className="flex gap-3 rounded-xl border border-line bg-white p-2 text-left shadow-sm hover:border-brand">
      <Img src={p.images[0]} alt="" className="h-16 w-12 shrink-0 rounded object-cover" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-xs font-semibold leading-snug">{p.name}</span>
        <span className="mt-1 flex items-center gap-2 text-sm"><b className="text-accent">{formatPrice(p.price)}</b>{p.oldPrice > p.price && <s className="text-xs text-muted">{formatPrice(p.oldPrice)}</s>}</span>
      </span>
      <span className="self-center rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">View</span>
    </Link>
  )
}

export default function LiveChat() {
  useDb()
  const cfg = S.settings.chat
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [state, setState] = useState(() => load() || { id: `c${Date.now()}${Math.floor(Math.random() * 999)}`, msgs: [] })
  const endRef = useRef(null)
  const inputRef = useRef(null)
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ } }, [state])
  useEffect(() => { if (open) { endRef.current?.scrollIntoView({ behavior: 'smooth' }); inputRef.current?.focus() } }, [open, state.msgs.length, busy])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!cfg || cfg.mode === 'off') return null
  const products = new Map(S.products.map((p) => [p.id, p]))

  const send = async (text) => {
    text = text.trim().slice(0, 500)
    if (!text || busy) return
    const user = { role: 'user', content: text }
    const history = [...state.msgs, user]
    setState((s) => ({ ...s, msgs: history })); setInput(''); setBusy(true)
    const r = await ask(history.map(({ role, content }) => ({ role, content })), cfg)
    const bot = { role: 'assistant', content: r.text, ids: r.ids, src: r.source }
    setState((s) => ({ ...s, msgs: [...s.msgs, bot] })); setBusy(false)
    logChat(state.id, location.pathname + location.hash, { r: 'user', t: text }, { r: 'bot', t: r.text, src: r.source, err: r.error })
  }

  const phone = S.settings.phone
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open live chat" className="fixed bottom-[12.5rem] right-4 z-30 flex items-center gap-2 rounded-full bg-brand py-3 pl-4 pr-5 text-sm font-bold text-white shadow-xl transition hover:scale-105 hover:bg-brand-dark md:bottom-[9.5rem]">
          <span className="relative text-lg leading-none">💬<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-brand bg-green-400" /></span>
          Live chat
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[600px] sm:max-h-[88vh] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-black/10" role="dialog" aria-label="Live chat">
          <div className="flex items-center gap-3 bg-brand px-4 py-3 text-white sm:rounded-t-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">🤖</span>
            <div className="min-w-0 flex-1"><p className="truncate font-bold leading-tight">{cfg.agentName}</p><p className="flex items-center gap-1 text-xs text-white/80"><span className="h-2 w-2 rounded-full bg-green-400" />Online · {S.settings.siteName} support</p></div>
            {state.msgs.length > 0 && <button onClick={() => setState((s) => ({ id: `c${Date.now()}`, msgs: [] }))} className="rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10" title="New chat">New</button>}
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 text-2xl leading-none hover:bg-white/10">×</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-3" aria-live="polite">
            <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white p-3 text-sm shadow-sm">{cfg.greeting}</div>
            {state.msgs.length === 0 && cfg.suggestions?.length > 0 && (
              <div className="flex flex-wrap gap-2">{cfg.suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-brand bg-white px-3 py-1.5 text-left text-xs text-brand hover:bg-brand hover:text-white">{s}</button>)}</div>
            )}
            {state.msgs.map((m, i) => m.role === 'user'
              ? <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand p-3 text-sm text-white">{m.content}</div>
              : (
                <div key={i} className="space-y-2">
                  <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white p-3 text-sm shadow-sm"><Rich text={m.content} /></div>
                  {m.ids?.map((id) => products.get(id)).filter(Boolean).map((p) => <Card key={p.id} p={p} onGo={() => setOpen(window.innerWidth >= 640)} />)}
                </div>
              ))}
            {busy && <div className="flex w-16 gap-1 rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm" aria-label="Typing">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="border-t border-line bg-white p-2">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} rows={1} maxLength={500} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} placeholder="Type your question…" className="field max-h-28 min-h-[42px] flex-1 resize-none" />
              <button disabled={busy || !input.trim()} className="h-[42px] rounded-lg bg-accent px-4 font-bold text-white disabled:opacity-50" aria-label="Send">➤</button>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-muted">
              <span>{cfg.mode === 'local' ? 'Automatic shop assistant' : 'AI assistant — may make mistakes'}</span>
              <span className="flex items-center gap-3"><a href={`tel:${phone}`} className="font-semibold text-brand">📞 {phone}</a><a href={S.settings.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#128c4a]"><WhatsAppIcon className="h-3.5 w-3.5" />Talk to a person</a></span>
            </p>
          </form>
        </div>
      )}
    </>
  )
}
