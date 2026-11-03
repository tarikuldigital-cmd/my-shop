import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { MessengerIcon, WhatsAppIcon } from '../common/Icon'
import { useSite } from '../../context/SiteContext'

function FloatingContact() {
  const { settings } = useSite()
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-3">
      <a href={settings.messengerUrl} target="_blank" rel="noreferrer" aria-label="Messenger" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0084ff] text-white shadow-lg hover:scale-105"><MessengerIcon className="h-6 w-6" /></a>
      <a href={settings.whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg hover:scale-105"><WhatsAppIcon className="h-6 w-6" /></a>
    </div>
  )
}

export default function Layout() {
  const { pathname, search } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname, search])
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <FloatingContact />
    </div>
  )
}
