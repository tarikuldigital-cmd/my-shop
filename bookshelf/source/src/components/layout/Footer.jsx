import { Link } from 'react-router-dom'
import Img from '../common/Img'
import Icon from '../common/Icon'
import { useSite } from '../../context/SiteContext'

export default function Footer() {
  const { settings } = useSite()
  return (
    <footer className="mt-12 bg-brand-dark text-white/85">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/"><Img src={settings.logoWhite} alt="Bookshelf" className="h-11 w-auto" /></Link>
          <p className="mt-4 flex gap-2 text-sm leading-6"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0" />{settings.address}</p>
          <p className="mt-2 flex items-center gap-2 text-sm"><Icon name="phone" className="h-4 w-4" />Cell: <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a></p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Useful Links</h3>
          <ul className="space-y-2 text-sm">{settings.footerUsefulLinks.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-white">{l.label}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Links</h3>
          <ul className="space-y-2 text-sm">{settings.footerLinks.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-white">{l.label}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Follow Us</h3>
          <ul className="flex flex-wrap gap-2">
            {settings.socials.map((s) => (
              <li key={s.name}>
                <a href={s.url} aria-label={s.name} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold hover:bg-accent">{s.name.slice(0, 2)}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-1 py-4 text-xs sm:flex-row">
          <p>{settings.copyright}</p>
          <p>Developed by <a href={settings.developer.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-white">{settings.developer.name}</a></p>
        </div>
      </div>
    </footer>
  )
}
