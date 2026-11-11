import api, { ENDPOINTS, TOKEN_KEY } from '../config/api'
import { USE_MOCK } from '../config/env'
import { delay, local, ApiError } from './mockStore'

const unwrap = (d) => (d && 'data' in d ? d.data : d)
const normalizePhone = (p = '') => p.replace(/[^\d]/g, '').replace(/^88/, '')

export function validatePhone(phone) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(phone))
}

export async function login({ phone, password }) {
  if (!USE_MOCK) {
    const res = await api.post(ENDPOINTS.login, { phone, password })
    localStorage.setItem(TOKEN_KEY, res.token)
    return res.user
  }
  await delay(300)
  const user = local.users().find((u) => u.phone === normalizePhone(phone))
  if (!user || user.password !== password) throw new ApiError('Wrong mobile number or password')
  localStorage.setItem(TOKEN_KEY, `mock-${user.phone}`)
  const { password: _pw, ...safe } = user
  return safe
}

export async function register({ name, phone, password }) {
  if (!USE_MOCK) {
    const res = await api.post(ENDPOINTS.register, { name, phone, password })
    localStorage.setItem(TOKEN_KEY, res.token)
    return res.user
  }
  await delay(300)
  const users = local.users()
  const p = normalizePhone(phone)
  if (users.some((u) => u.phone === p)) throw new ApiError('An account with this mobile number already exists')
  const user = { id: Date.now(), name, phone: p, password, address: '', email: '' }
  local.saveUsers([...users, user])
  localStorage.setItem(TOKEN_KEY, `mock-${p}`)
  const { password: _pw, ...safe } = user
  return safe
}

export async function me() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  if (!USE_MOCK) return unwrap(await api.get(ENDPOINTS.me))
  const user = local.users().find((u) => `mock-${u.phone}` === token)
  if (!user) return null
  const { password: _pw, ...safe } = user
  return safe
}

export async function updateProfile(data) {
  if (!USE_MOCK) return unwrap(await api.put(ENDPOINTS.me, data))
  await delay(200)
  const token = localStorage.getItem(TOKEN_KEY)
  const users = local.users().map((u) => (`mock-${u.phone}` === token ? { ...u, ...data, phone: u.phone } : u))
  local.saveUsers(users)
  return me()
}

export async function logout() {
  if (!USE_MOCK) await api.post(ENDPOINTS.logout).catch(() => {})
  localStorage.removeItem(TOKEN_KEY)
}

export async function requestPasswordOtp(phone) {
  if (!USE_MOCK) return api.post(ENDPOINTS.forgotPassword, { phone })
  await delay(300)
  if (!local.users().some((u) => u.phone === normalizePhone(phone))) throw new ApiError('No account found for this number')
  return { message: 'OTP sent (demo OTP: 123456)' }
}

export async function resetPassword({ phone, otp, password }) {
  if (!USE_MOCK) return api.post(ENDPOINTS.verifyOtp, { phone, otp, password })
  await delay(300)
  if (otp !== '123456') throw new ApiError('Wrong OTP')
  local.saveUsers(local.users().map((u) => (u.phone === normalizePhone(phone) ? { ...u, password } : u)))
  return { message: 'Password changed. Please log in.' }
}
