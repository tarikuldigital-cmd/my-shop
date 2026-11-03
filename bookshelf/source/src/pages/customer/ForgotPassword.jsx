import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AuthCard } from '../../components/common/ui'
import { requestPasswordOtp, resetPassword } from '../../services/authService'

export default function ForgotPassword() {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState({ type: 'error', text: '' })
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true); setMsg({ type: 'error', text: '' })
    try { await fn() } catch (e) { setMsg({ type: 'error', text: e.message }) } finally { setBusy(false) }
  }

  const sendOtp = (e) => { e.preventDefault(); run(async () => { const r = await requestPasswordOtp(phone); setMsg({ type: 'success', text: r.message }); setStep('otp') }) }
  const reset = (e) => { e.preventDefault(); run(async () => { const r = await resetPassword({ phone, otp, password }); setMsg({ type: 'success', text: r.message }); setStep('done') }) }

  return (
    <AuthCard title="Forgot Password" subtitle="একাউন্টের মোবাইল নাম্বারটি দিন, আমরা সেখানে একটি OTP কোড পাঠাবো">
      <div className="space-y-4">
        <Alert type={msg.type}>{msg.text}</Alert>
        {step === 'phone' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div><label className="field-label" htmlFor="phone">Phone</label><input id="phone" required inputMode="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <button disabled={busy} className="btn-accent w-full py-2.5">submit</button>
          </form>
        )}
        {step === 'otp' && (
          <form onSubmit={reset} className="space-y-4">
            <div><label className="field-label" htmlFor="otp">OTP কোড</label><input id="otp" required inputMode="numeric" className="field" value={otp} onChange={(e) => setOtp(e.target.value)} /></div>
            <div><label className="field-label" htmlFor="np">নতুন পাসওয়ার্ড</label><input id="np" type="password" required minLength={6} className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <button disabled={busy} className="btn-accent w-full py-2.5">submit</button>
          </form>
        )}
        <p className="text-center text-sm">পাসওয়ার্ড মনে পড়েছে? <Link to="/customer/login" className="font-semibold text-brand hover:underline">লগিন করুন</Link></p>
      </div>
    </AuthCard>
  )
}
