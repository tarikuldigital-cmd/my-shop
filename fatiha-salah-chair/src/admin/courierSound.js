import { S } from '../store/db'

/** Sound for courier pop-ups: beep, spoken message with the logged-in admin's name, or the admin's own audio file. Saved per device. */
const KEY = 'fatiha_courier_sound'
const DEF = { on: true, mode: 'pro', custom: '', customName: '' }
export const getSound = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEF } } }
export const setSound = (patch) => { const v = { ...getSound(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* quota / private mode */ } return v }

let ctx
function beep() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    ;[0, 0.28, 0.56].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + d)
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + d + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.24)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.26)
    })
  } catch { /* audio blocked */ }
}

const bnVoice = () => { try { return (window.speechSynthesis?.getVoices() || []).find((v) => /^bn/i.test(v.lang)) || null } catch { return null } }
export const hasBanglaVoice = () => !!bnVoice()

/** the sentence read out loud, e.g. "রাহিম, একটি রাইডার নোট এসেছে। অনুগ্রহ করে ফলোআপ দিন।" */
export function sayText(kind) {
  const name = (S.account?.name || '').trim().split(/\s+/)[0]
  const what = spoken[kind] || spoken.note
  return `${name ? name + ', ' : ''}${what}। অনুগ্রহ করে ফলোআপ দিন।`
}

/** recorded professional voice per event (files in /public/sounds) */
export const SOUND_FILES = { note: 'rider-note', cancel: 'cancel', return: 'parcel-return', order: 'new-order', complaint: 'new-complaint', chat: 'live-chat' }
const spoken = { note: 'একটি রাইডার নোট এসেছে', cancel: 'একটি ডেলিভারি ক্যান্সেল হয়েছে', return: 'একটি পার্সেল ফেরত আসছে', order: 'একটি নতুন অর্ডার এসেছে', complaint: 'একটি নতুন কমপ্লেইন জমা হয়েছে', chat: 'একজন কাস্টমার মেসেজ দিয়েছেন' }

/** kind: 'note' | 'cancel' | 'return' | 'order' | 'complaint' | 'chat' */
export function playAlert(kind = 'note') {
  const s = getSound()
  if (!s.on) return
  if (s.mode === 'pro' && SOUND_FILES[kind]) {
    try { const a = new Audio(`${import.meta.env.BASE_URL}sounds/${SOUND_FILES[kind]}.mp3`); a.play().catch(() => playAlert2(kind, { ...s, mode: 'voice' })); return } catch { /* fall through */ }
  }
  playAlert2(kind, s)
}
function playAlert2(kind, s) {
  if (s.mode === 'custom' && s.custom) {
    try { const a = new Audio(s.custom); a.play().catch(beep); return } catch { /* fall through */ }
  }
  if (s.mode === 'voice' && 'speechSynthesis' in window) {
    const v = bnVoice()
    if (v) {
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(sayText(kind)); u.voice = v; u.lang = v.lang; u.rate = 0.95
        beep(); setTimeout(() => window.speechSynthesis.speak(u), 900)
        return
      } catch { /* fall through */ }
    }
  }
  beep()
}
