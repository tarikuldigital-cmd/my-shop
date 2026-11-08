import { Fragment } from 'react'
import { Link } from 'react-router-dom'

/* Small markdown subset (same as api/lib/blog.php md_html): ##/###, lists, **bold**, [link](url), > quote, ![img](url), ---, {{books:topic}} / {{combo}} */
const inline = (s, key = 'i') => {
  const out = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`/g
  let last = 0, m, n = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${key}${n++}`}>{m[1]}</strong>)
    else if (m[4]) out.push(<code key={`${key}${n++}`} className="rounded bg-gray-100 px-1">{m[4]}</code>)
    else {
      const url = m[3]
      out.push(/^https?:/.test(url)
        ? <a key={`${key}${n++}`} href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline">{m[2]}</a>
        : <Link key={`${key}${n++}`} to={url} className="text-brand underline">{m[2]}</Link>)
    }
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

/** Returns an array of {type, ...} blocks; `slot` blocks are replaced by the caller (promo carousels). */
export function parseMd(text = '') {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i].trim()
    if (!l) { i++; continue }
    let m
    if ((m = l.match(/^\{\{\s*(books|combo)(?::([\w,-]+))?\s*\}\}$/))) { blocks.push({ type: 'slot', kind: m[1], topics: (m[2] || '').split(',').filter(Boolean) }); i++; continue }
    if ((m = l.match(/^(#{2,3})\s+(.+)$/))) { blocks.push({ type: 'h', level: m[1].length, text: m[2] }); i++; continue }
    if (/^---+$/.test(l)) { blocks.push({ type: 'hr' }); i++; continue }
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) { blocks.push({ type: 'img', alt: m[1], src: m[2] }); i++; continue }
    if (l.startsWith('>')) { const q = []; while (i < lines.length && lines[i].trim().startsWith('>')) q.push(lines[i++].trim().replace(/^>\s?/, '')); blocks.push({ type: 'quote', text: q.join(' ') }); continue }
    if (/^[-*]\s+/.test(l)) { const it = []; while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) it.push(lines[i++].trim().replace(/^[-*]\s+/, '')); blocks.push({ type: 'ul', items: it }); continue }
    if (/^\d+\.\s+/.test(l)) { const it = []; while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) it.push(lines[i++].trim().replace(/^\d+\.\s+/, '')); blocks.push({ type: 'ol', items: it }); continue }
    const p = []
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+\.\s|>|---|!\[|\{\{)/.test(lines[i].trim())) p.push(lines[i++].trim())
    if (!p.length) { i++; continue }
    blocks.push({ type: 'p', text: p.join(' ') })
  }
  return blocks
}
export const headings = (text) => parseMd(text).filter((b) => b.type === 'h' && b.level === 2).map((b) => b.text)
export const slugH = (t) => 'h-' + t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')

export default function Md({ text, renderSlot, imgFolder = 'blog' }) {
  const blocks = parseMd(text)
  return (
    <div className="blog-prose">
      {blocks.map((b, k) => {
        switch (b.type) {
          case 'h': return b.level === 2 ? <h2 key={k} id={slugH(b.text)}>{inline(b.text, `h${k}`)}</h2> : <h3 key={k}>{inline(b.text, `h${k}`)}</h3>
          case 'p': return <p key={k}>{inline(b.text, `p${k}`)}</p>
          case 'ul': return <ul key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, `u${k}${j}`)}</li>)}</ul>
          case 'ol': return <ol key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, `o${k}${j}`)}</li>)}</ol>
          case 'quote': return <blockquote key={k}>{inline(b.text, `q${k}`)}</blockquote>
          case 'hr': return <hr key={k} />
          case 'img': return <img key={k} src={/^https?:|^\//.test(b.src) ? b.src : b.src} alt={b.alt} loading="lazy" className="my-4 w-full rounded-lg" />
          case 'slot': return <Fragment key={k}>{renderSlot?.(b)}</Fragment>
          default: return null
        }
      })}
    </div>
  )
}
