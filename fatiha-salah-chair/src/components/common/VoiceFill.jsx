import { useEffect, useRef, useState } from 'react'
import { S } from '../../store/db'
import { startVoiceAgent } from '../../lib/voiceAgent'

/*
 * Voice fill for checkout forms: the customer taps once, then says name → mobile → address,
 * one after another. Uses the browser's own speech recognition (Chrome / Android / Safari),
 * so nothing is recorded or sent to our server. Hidden when the browser can't do it.
 */
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const STEPS = [
  { key: 'name', ask: 'আপনার নাম বলুন', hint: 'যেমন: মোঃ রহিম উদ্দিন' },
  { key: 'phone', ask: 'মোবাইল নাম্বার বলুন', hint: 'একটা একটা করে সংখ্যা বলুন: শূন্য এক সাত…' },
  { key: 'address', ask: 'পুরো ঠিকানা বলুন', hint: 'বাসা/রোড, এলাকা, থানা, জেলা' },
]

const WORDS = {
  'শূন্য': '0', 'শুন্য': '0', 'জিরো': '0', 'zero': '0', 'o': '0',
  'এক': '1', 'ওয়ান': '1', 'one': '1', 'দুই': '2', 'দু': '2', 'টু': '2', 'two': '2', 'to': '2', 'too': '2',
  'তিন': '3', 'থ্রি': '3', 'three': '3', 'চার': '4', 'ফোর': '4', 'four': '4', 'for': '4',
  'পাঁচ': '5', 'পাচ': '5', 'ফাইভ': '5', 'five': '5', 'ছয়': '6', 'ছয়': '6', 'ছয়': '6', 'সিক্স': '6', 'six': '6',
  'সাত': '7', 'সেভেন': '7', 'seven': '7', 'আট': '8', 'এইট': '8', 'eight': '8', 'নয়': '9', 'নয়': '9', 'নাইন': '9', 'nine': '9',
}

/** "শূন্য এক সাত ১১ 222…" → "017…"; keeps the last 11 digits when the number starts with +88. */
export function speechToPhone(text) {
  let t = String(text).replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
  const out = []
  const tokens = t.toLowerCase().split(/[\s,.-]+/)
  for (let k = 0; k < tokens.length; k++) {
    const w = tokens[k]
    if (/\d/.test(w)) { out.push(w.replace(/\D/g, '')); continue }
    if ((w === 'ডাবল' || w === 'double') && WORDS[tokens[k + 1]]) { out.push(WORDS[tokens[k + 1]].repeat(2)); k++; continue }
    if ((w === 'ট্রিপল' || w === 'triple') && WORDS[tokens[k + 1]]) { out.push(WORDS[tokens[k + 1]].repeat(3)); k++; continue }
    if (WORDS[w]) out.push(WORDS[w])
  }
  let d = out.join('')
  if (d.startsWith('8801')) d = d.slice(2)
  return d.slice(0, 11)
}

const clean = (s) => String(s).replace(/\s+/g, ' ').trim()

function GuidedVoice({ onFill, className = '', note = '' }) {
  const [step, setStep] = useState(-1) // -1 = closed
  const [live, setLive] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const rec = useRef(null)

  useEffect(() => () => rec.current?.abort?.(), [])
  if (!SR) return null

  const listen = (i) => {
    rec.current?.abort?.()
    setStep(i); setLive(''); setError('')
    if (i >= STEPS.length) return
    const r = new SR()
    r.lang = 'bn-BD'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1
    let finalText = ''
    r.onresult = (e) => {
      let txt = ''
      for (const res of e.results) { txt += res[0].transcript; if (res.isFinal) finalText = txt }
      setLive(txt)
    }
    r.onerror = (e) => {
      setListening(false)
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'মাইক্রোফোনের অনুমতি দিন (ব্রাউজারের উপরে Allow চাপুন)' : e.error === 'no-speech' ? 'কিছু শোনা যায়নি — আবার বলুন' : 'শুনতে সমস্যা হয়েছে — আবার চেষ্টা করুন')
    }
    r.onend = () => {
      setListening(false)
      const said = clean(finalText)
      if (!said) return
      const key = STEPS[i].key
      if (key === 'phone') {
        const p = speechToPhone(said)
        if (p.length < 11) { setLive(said); setError(`নাম্বার পুরো বোঝা যায়নি (${p || '—'}) — আবার বলুন`); if (p) onFill(key, p); return }
        onFill(key, p)
      } else onFill(key, said)
      setTimeout(() => listen(i + 1), 500)
    }
    rec.current = r
    try { r.start(); setListening(true) } catch { setError('আবার চাপুন') }
  }

  const close = () => { rec.current?.abort?.(); setStep(-1); setListening(false) }
  const cur = STEPS[step]

  if (step < 0) {
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-gradient-to-r from-accent/5 to-transparent p-3 sm:flex-nowrap ${className}`}>
        <button type="button" onClick={() => listen(0)} aria-label="Start talking" className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white ring-4 ring-accent/15">
          <MicIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold">শুধু বলুন, ফর্ম নিজেই পূরণ হবে</p>
          <p className="text-xs text-muted">টাইপ করতে হবে না — আপনার <b className="text-ink">নাম, মোবাইল নাম্বার ও ঠিকানা</b> মুখে বলুন।</p>
          {note && <p className="mt-1 text-xs text-amber-700">{note}</p>}
        </div>
        <button type="button" onClick={() => listen(0)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto">
          <MicIcon className="h-4 w-4" />বলা শুরু করুন
        </button>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-accent/40 bg-accent/5 p-3 ${className}`} role="status" aria-live="polite">
      {cur ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted">ধাপ {step + 1}/{STEPS.length}</p>
            <button type="button" onClick={close} className="text-xs text-muted underline">বন্ধ করুন</button>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <button type="button" onClick={() => listen(step)} aria-label="Listen again" className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${listening ? 'bg-red-600' : 'bg-accent'}`}>
              {listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
              <MicIcon className="relative h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="font-semibold">{listening ? `${cur.ask}…` : cur.ask}</p>
              <p className="truncate text-xs text-muted">{live || cur.hint}</p>
            </div>
          </div>
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-2 flex gap-3 text-xs">
            {!listening && <button type="button" onClick={() => listen(step)} className="font-semibold text-accent underline">আবার বলুন</button>}
            <button type="button" onClick={() => listen(step + 1)} className="text-muted underline">এই ধাপ বাদ দিন</button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-green-700">✓ তথ্য বসানো হয়েছে — একবার দেখে নিয়ে অর্ডার করুন</p>
          <button type="button" onClick={close} className="text-xs text-muted underline">ঠিক আছে</button>
        </div>
      )}
    </div>
  )
}

function MicIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" />
    </svg>
  )
}

/* ---------------- live AI conversation (Gemini Live) ---------------- */
const AI_OK = typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia && window.AudioWorkletNode && window.WebSocket)

const STATE_TEXT = { connecting: 'সংযোগ হচ্ছে…', listening: 'শুনছি — বলুন', speaking: 'AI বলছে…' }

function rules(summary) {
  const st = S.settings
  const ship = (st.shipping || []).map((x) => `${x.label} (${x.id}): ৳${x.charge}`).join(', ')
  const catalog = (S.products || []).filter((p) => p.active !== false).slice(0, 40)
    .map((p) => `- ${p.name}: ৳${p.price}${p.stock === 0 ? ' (স্টকে নেই)' : ''}`).join('\n')
  return `You are the voice order assistant of ${st.siteName || 'our shop'}, an online shop in Bangladesh. Speak Bangla (Bangladeshi, polite "আপনি"), short and calm — many customers are elderly.

YOUR ONLY JOB: collect three things for this order — 1) name, 2) mobile number, 3) full delivery address — then confirm the order.
Ask ONLY these three questions. Do not ask anything else (no email, age, payment details, preferences, feedback, small talk).

Flow:
1. One short greeting, then ask the name.
2. Ask the mobile number. Read it back digit by digit and ask if it is right. It must be 11 digits starting with 01.
3. Ask the full address (house/road, area, thana/upazila, district). Decide inside_dhaka or outside_dhaka from it yourself — do not ask.
4. After each answer call fill_checkout with what you are sure of.
5. Call read_order, read back name, number, address, products and total in taka, and ask "অর্ডারটি কনফার্ম করবো?"
6. Only if the customer clearly says yes, call confirm_order, thank them in one line and stop.

STAY ON TOPIC: talk only about this order and our products listed below. If the customer asks anything else (news, religion debate, jokes, other shops, personal questions, coding, anything not about our products or this order), do not answer it — say politely in one line "দুঃখিত, আমি শুধু অর্ডার ও আমাদের পণ্য নিয়ে সাহায্য করতে পারি" and go back to the next missing detail.
Product questions: answer only from the list below (name and price). Never invent features, discounts, stock counts or delivery dates. If unsure, say our team will call to confirm, or give the hotline ${st.phone || ''}.
Payment is cash on delivery. Never ask for card, bank, bKash PIN or OTP. Keep every reply under 2 short sentences.

Delivery charges: ${ship}.
Our products:
${catalog}
This order (cart): ${JSON.stringify(summary.items)}`
}

export default function VoiceFill(props) {
  const [mode, setMode] = useState(S.voiceAiOn && AI_OK ? 'ai' : 'guided')
  const [note, setNote] = useState('')
  if (mode === 'guided') return <GuidedVoice {...props} note={note} />
  return <AiVoice {...props} onFail={(msg) => { setNote(msg); setMode('guided') }} />
}

function AiVoice({ onFill, getSummary, onConfirm, className = '', onFail }) {
  const [state, setState] = useState('idle')
  const [caps, setCaps] = useState([])
  const sess = useRef(null)
  const latest = useRef({})
  latest.current = { onFill, getSummary, onConfirm }
  useEffect(() => () => sess.current?.stop(), [])

  const onTool = async (name, a) => {
    const L = latest.current
    if (name === 'fill_checkout') {
      const done = []
      if (a.name) { L.onFill('name', String(a.name).trim()); done.push('name') }
      if (a.phone) { const p = speechToPhone(a.phone); if (p.length === 11 && p.startsWith('01')) { L.onFill('phone', p); done.push('phone') } else return { ok: false, error: `phone "${a.phone}" is not 11 digits starting 01 — ask again` } }
      if (a.address) { L.onFill('address', String(a.address).trim()); done.push('address') }
      if (a.area && (S.settings.shipping || []).some((x) => x.id === a.area)) { L.onFill('shippingArea', a.area); done.push('area') }
      return { ok: true, filled: done }
    }
    if (name === 'read_order') { await new Promise((r) => setTimeout(r, 150)); return L.getSummary() }
    if (name === 'confirm_order') {
      await new Promise((r) => setTimeout(r, 150))
      const sm = L.getSummary()
      if (sm.missing.length) return { ok: false, error: `missing: ${sm.missing.join(', ')}` }
      setTimeout(() => { sess.current?.stop(); L.onConfirm() }, 2500) // let the AI say thank you first
      return { ok: true, placed: true }
    }
    return { ok: false, error: 'unknown tool' }
  }

  const start = async () => {
    setCaps([]); setState('connecting')
    try {
      sess.current = await startVoiceAgent({
        context: rules(latest.current.getSummary()),
        onTool,
        onCaption: (who, text) => setCaps((c) => { const last = c[c.length - 1]; if (last && last.who === who) return [...c.slice(0, -1), { who, text: last.text + text }]; return [...c.slice(-5), { who, text }] }),
        onState: (st, info) => {
          if (st === 'error') { sess.current = null; setState('idle'); onFail(info === 'limit' ? 'এই মুহূর্তে AI ব্যস্ত — নিচের সাধারণ ভয়েস দিয়ে বলুন' : 'AI-এর সাথে সংযোগ হয়নি — নিচের সাধারণ ভয়েস দিয়ে বলুন'); return }
          if (st === 'ended') { sess.current = null; setState('done'); return }
          setState(st)
        },
      })
    } catch (e) {
      sess.current = null; setState('idle')
      onFail(/denied|not allowed|permission/i.test(e.message) ? 'মাইক্রোফোনের অনুমতি দিন, তারপর আবার চাপুন' : e.message === 'limit' ? 'এই মুহূর্তে AI ব্যস্ত — নিচের সাধারণ ভয়েস দিয়ে বলুন' : 'AI-এর সাথে সংযোগ হয়নি — সাধারণ ভয়েস দিয়ে বলুন')
    }
  }
  const stop = () => { sess.current?.stop(); sess.current = null; setState('done') }
  const live = ['connecting', 'listening', 'speaking'].includes(state)

  return (
    <div className={`rounded-xl border p-3 ${live ? 'border-accent/50 bg-accent/5' : 'border-line bg-gradient-to-r from-accent/5 to-transparent'} ${className}`}>
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <button type="button" onClick={live ? stop : start} aria-label={live ? 'Stop' : 'Start talking'} className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ring-4 ${live ? (state === 'speaking' ? 'bg-accent ring-accent/25' : 'bg-red-600 ring-red-200') : 'bg-ink ring-accent/15'}`}>
          {state === 'listening' && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />}
          <MicIcon className="relative h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{live ? STATE_TEXT[state] : state === 'done' ? '✓ কথা শেষ — তথ্য দেখে নিন' : 'শুধু কথা বলুন, অর্ডার হয়ে যাবে'}</p>
          <p className="text-xs text-muted">{live ? 'আমাদের AI সহকারী আপনার নাম, মোবাইল নাম্বার ও ঠিকানা জেনে নেবে' : <>টাইপ করতে হবে না — AI আপনার সাথে কথা বলে <b className="text-ink">নাম, ফোন, ঠিকানা</b> নিয়ে ফর্ম পূরণ করবে।</>}</p>
        </div>
        <button type="button" onClick={live ? stop : start} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto ${live ? 'bg-red-600' : 'bg-ink'}`}>
          <MicIcon className="h-4 w-4" />{live ? 'শেষ করুন' : state === 'done' ? 'আবার কথা বলুন' : 'কথা বলা শুরু করুন'}
        </button>
      </div>
      {caps.length > 0 && (
        <div className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-lg bg-white/70 p-2 text-sm">
          {caps.map((c, i) => <p key={i} className={c.who === 'ai' ? 'text-ink' : 'text-right text-accent'}><span className="text-[10px] uppercase text-muted">{c.who === 'ai' ? 'AI' : 'আপনি'}</span> {c.text}</p>)}
        </div>
      )}
    </div>
  )
}
