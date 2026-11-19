import { S } from '../store/db'

/** Sound for courier pop-ups: beep, spoken message with the logged-in admin's name, or the admin's own audio file. Saved per device. */
const KEY = 'fatiha_courier_sound'
const DEF = { on: true, mode: 'voice', custom: '', customName: '' }
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
  const what = kind === 'cancel' ? 'একটি ডেলিভারি ক্যান্সেল হয়েছে' : 'একটি রাইডার নোট এসেছে'
  return `${name ? name + ', ' : ''}${what}। অনুগ্রহ করে ফলোআপ দিন।`
}

/** kind: 'cancel' | 'note' */
export function playAlert(kind = 'note') {
  const s = getSound()
  if (!s.on) return
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
