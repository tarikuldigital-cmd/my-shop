import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import './lib/sms' // automatic order SMS
import App from './App'
import { SiteProvider } from './context/SiteContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { hydratePublic } from './lib/live'

// Static hosts without server rewrites (GitHub Pages sub-folder) build with VITE_ROUTER=hash
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter
const routerProps = Router === BrowserRouter ? { basename: import.meta.env.BASE_URL.replace(/\/$/, '') } : {}

const start = () => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router {...routerProps}>
      <SiteProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </SiteProvider>
    </Router>
  </StrictMode>,
)

// live mode: load books/settings from the server first so the first paint already has real data
hydratePublic().finally(start)
