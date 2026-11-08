import { Link, NavLink } from 'react-router-dom'
import Img from '../../components/common/Img'
import { CATS, catOf } from '../../lib/blogCats'
import { tr, fmtDate, readMin } from '../../lib/blog'

export function LangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line text-sm" role="group" aria-label="Language">
      {[['bn', 'বাংলা'], ['en', 'English']].map(([k, t]) => (
        <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={`px-3 py-1 font-semibold ${lang === k ? 'bg-brand text-white' : 'bg-white text-ink'}`}>{t}</button>
      ))}
    </div>
  )
}

/** Category menu bar shown at the top of every blog page. */
export function CatBar({ lang }) {
  const cls = ({ isActive }) => `whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand hover:text-brand'}`
  return (
    <nav aria-label="Blog categories" className="sticky top-0 z-20 -mx-3 overflow-x-auto border-b border-line bg-white/95 px-3 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
      <div className="flex gap-2">
        <NavLink to="/blog" end className={cls}>🏠 {lang === 'en' ? 'All' : 'সব পোস্ট'}</NavLink>
        <NavLink to="/ielts-guide" className={cls}>🗺️ {lang === 'en' ? 'A–Z Roadmap' : 'A–Z রোডম্যাপ'}</NavLink>
        {CATS.map((c) => <NavLink key={c.slug} to={`/blog/category/${c.slug}`} className={cls}>{c.icon} {lang === 'en' ? c.en : c.bn}</NavLink>)}
      </div>
    </nav>
  )
}

export function PostCard({ post, lang, big = false }) {
  const c = catOf(post.cat)
  const to = `/blog/${post.slug}`
  return (
    <article className={`card group flex overflow-hidden transition hover:shadow-md ${big ? 'flex-col md:flex-row' : 'flex-col'}`}>
      <Link to={to} className={`block overflow-hidden bg-green-50 ${big ? 'md:w-1/2' : ''}`}>
        {post.cover
          ? <Img folder="blog" src={post.cover} alt={tr(post.title, lang)} className={`w-full object-cover transition duration-300 group-hover:scale-105 ${big ? 'h-full min-h-48' : 'aspect-[16/9]'}`} />
          : <div className={`flex items-center justify-center text-5xl ${big ? 'h-full min-h-48' : 'aspect-[16/9]'}`}>{c.icon}</div>}
      </Link>
      <div className={`flex flex-1 flex-col gap-2 p-4 ${big ? 'md:w-1/2 md:p-6' : ''}`}>
        <Link to={`/blog/category/${c.slug}`} className="w-fit rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-brand">{c.icon} {lang === 'en' ? c.en : c.bn}</Link>
        <h3 className={`font-bold leading-snug ${big ? 'text-xl md:text-2xl' : 'text-base'}`}><Link to={to} className="hover:text-brand">{tr(post.title, lang)}</Link></h3>
        <p className="line-clamp-3 text-sm text-muted">{tr(post.excerpt, lang)}</p>
        <p className="mt-auto text-xs text-muted">{post.at ? fmtDate(post.at, lang) : ''}{post.readMin ? ` · ${post.readMin} ${lang === 'en' ? 'min read' : 'মিনিট'}` : ''}</p>
      </div>
    </article>
  )
}
export { readMin }
