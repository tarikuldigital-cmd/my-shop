import { Link, NavLink } from 'react-router-dom'
import Img from '../../components/common/Img'
import { CATS, catOf } from '../../lib/blogCats'
import { tr, fmtDate, coverOf } from '../../lib/blog'

export function LangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label="Language">
      {[['bn', 'বাংলা'], ['en', 'English']].map(([k, t]) => (
        <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={`px-3 py-1 font-semibold ${lang === k ? 'bg-brand text-white' : 'bg-white text-ink'}`}>{t}</button>
      ))}
    </div>
  )
}

export function Masthead({ lang, setLang, title, sub }) {
  const date = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <header className="border-b-2 border-ink pb-3">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2 text-xs text-muted"><span>{date}</span><LangToggle lang={lang} setLang={setLang} /></div>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">{title}</h1>
      {sub && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted sm:text-base">{sub}</p>}
    </header>
  )
}

/** Category menu bar shown at the top of every blog page. */
export function CatBar({ lang }) {
  const cls = ({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${isActive ? 'border-accent text-brand' : 'border-transparent text-ink hover:text-brand'}`
  return (
    <nav aria-label="Blog categories" className="sticky top-0 z-20 -mx-3 overflow-x-auto border-b border-line bg-white/95 px-3 backdrop-blur sm:mx-0">
      <div className="flex gap-1">
        <NavLink to="/blog" end className={cls}>{lang === 'en' ? 'Home' : 'প্রধান পাতা'}</NavLink>
        <NavLink to="/ielts-guide" className={cls}>{lang === 'en' ? 'Roadmap' : 'রোডম্যাপ'}</NavLink>
        {CATS.map((c) => <NavLink key={c.slug} to={`/blog/category/${c.slug}`} className={cls}>{lang === 'en' ? c.en : c.bn}</NavLink>)}
      </div>
    </nav>
  )
}

export function SectionHead({ title, to, lang }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b border-ink pb-1.5">
      <h2 className="font-serif text-xl font-bold sm:text-2xl">{title}</h2>
      {to && <Link to={to} className="text-sm font-medium text-brand hover:underline">{lang === 'en' ? 'View all' : 'সব দেখুন'}</Link>}
    </div>
  )
}

const Kicker = ({ post, lang }) => {
  const c = catOf(post.cat)
  return <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-accent">{lang === 'en' ? c.en : c.bn}</span>
}
const Meta = ({ post, lang }) => (
  <p className="text-xs text-muted">{post.external && post.source ? <>{post.source} · </> : null}{post.at ? fmtDate(post.at, lang) : ''}</p>
)
/** internal posts open in-app; aggregated news opens the publisher's page. */
function Wrap({ post, className, children }) {
  return post.external
    ? <a href={post.url} target="_blank" rel="noopener noreferrer nofollow" className={className}>{children}</a>
    : <Link to={`/blog/${post.slug}`} className={className}>{children}</Link>
}

/** Large lead story: image with headline overlay. */
export function LeadStory({ post, lang }) {
  return (
    <article className="group relative overflow-hidden rounded-lg bg-ink">
      <Wrap post={post} className="relative block aspect-[16/10] sm:aspect-[16/9]">
        <Img folder="blog" src={coverOf(post)} alt={tr(post.title, lang)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <span className="bk-lead absolute inset-0" />
        <span className="absolute inset-x-0 bottom-0 block p-4 text-white sm:p-7">
          <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-orange-300">{lang === 'en' ? catOf(post.cat).en : catOf(post.cat).bn}</span>
          <span className="mt-1.5 block font-serif text-xl font-bold leading-snug sm:text-3xl">{tr(post.title, lang)}</span>
          <span className="mt-2 hidden max-w-2xl text-sm leading-6 text-white/85 sm:line-clamp-2 sm:block">{tr(post.excerpt, lang)}</span>
        </span>
      </Wrap>
    </article>
  )
}

/** Small thumbnail + headline row for sidebars and secondary lists. */
export function CompactStory({ post, lang }) {
  return (
    <article className="group flex gap-3">
      <Wrap post={post} className="block w-28 shrink-0 overflow-hidden rounded-md bg-surface sm:w-32">
        <Img folder="blog" src={coverOf(post)} alt="" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />
      </Wrap>
      <div className="min-w-0">
        <Kicker post={post} lang={lang} />
        <h3 className="mt-0.5 line-clamp-3 font-serif text-[15px] font-bold leading-snug"><Wrap post={post} className="hover:text-brand">{tr(post.title, lang)}</Wrap></h3>
        <Meta post={post} lang={lang} />
      </div>
    </article>
  )
}

/** Standard story card: image, kicker, headline, standfirst. */
export function StoryCard({ post, lang }) {
  return (
    <article className="group flex flex-col">
      <Wrap post={post} className="block overflow-hidden rounded-md bg-surface">
        <Img folder="blog" src={coverOf(post)} alt={tr(post.title, lang)} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" />
      </Wrap>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <Kicker post={post} lang={lang} />
        <h3 className="font-serif text-lg font-bold leading-snug"><Wrap post={post} className="hover:text-brand">{tr(post.title, lang)}</Wrap></h3>
        <p className="line-clamp-3 text-sm leading-6 text-muted">{tr(post.excerpt, lang)}</p>
        <div className="mt-auto pt-1"><Meta post={post} lang={lang} /></div>
      </div>
    </article>
  )
}
export const PostCard = StoryCard
