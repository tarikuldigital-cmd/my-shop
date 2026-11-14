import { Link } from 'react-router-dom'
import Img from '../common/Img'
import Icon from '../common/Icon'
import { useSite } from '../../context/SiteContext'

export default function Footer() {
  const { settings } = useSite()
  const socials = settings.socials.filter((s) => /^https?:\/\//.test(s.url || ''))
  return (
    <footer className="mt-12 bg-brand-dark text-white/85">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-3"><Img src={settings.logoWhite} alt="Fatiha Ayat Salah Chair" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/60" /><span className="leading-tight"><span className="block font-serif text-xl font-bold text-white">Fatiha Ayat</span><span className="block text-xs uppercase tracking-[0.3em] text-gold">Salah Chair</span></span></Link>
          <p className="mt-3 text-sm italic text-gold">Sit for Salah • Feel the Peace</p>
          <p className="mt-4 flex gap-2 text-sm leading-6"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0" />{settings.address}</p>
          <p className="mt-2 flex items-center gap-2 text-sm"><Icon name="phone" className="h-4 w-4" />Call / WhatsApp: <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a></p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Useful Links</h3>
          <ul className="space-y-2 text-sm">{settings.footerUsefulLinks.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-white">{l.label}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Links</h3>
          <ul className="space-y-2 text-sm">{settings.footerLinks.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-white">{l.label}</Link></li>)}</ul>
        </div>
        {socials.length > 0 && <div>
          <h3 className="mb-3 font-semibold text-white">Follow Us</h3>
          <ul className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer" aria-label={s.name} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold hover:bg-accent">{s.name.slice(0, 2)}</a>
              </li>
            ))}
          </ul>
        </div>}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-1 py-4 text-xs sm:flex-row">
          <p>{settings.copyright}</p>
          <p>Developed by <span className="font-semibold">Tarikul Islam</span></p>
        </div>
      </div>
    </footer>
  )
}
