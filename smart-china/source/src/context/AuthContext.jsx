import { createContext, useContext, useEffect, useState } from 'react'
import * as auth from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])

  const value = {
    user,
    ready,
    login: async (data) => { const u = await auth.login(data); setUser(u); return u },
    register: async (data) => { const u = await auth.register(data); setUser(u); return u },
    updateProfile: async (data) => { const u = await auth.updateProfile(data); setUser(u); return u },
    logout: async () => { await auth.logout(); setUser(null) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
