import { useEffect, useRef, useState } from 'react'

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

export default function VoiceFill({ onFill, className = '' }) {
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
      <button type="button" onClick={() => listen(0)} className={`inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/15 ${className}`}>
        <MicIcon className="h-4 w-4" />ভয়েসে নাম, ফোন ও ঠিকানা দিন
      </button>
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
