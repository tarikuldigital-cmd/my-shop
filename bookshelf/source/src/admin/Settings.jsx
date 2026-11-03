import { useState } from 'react'
import { S, save, useDb, exportDb, importDb, resetDb } from '../store/db'
import { Chips, Field, Panel, toast } from './ui'
import { getKey, setKey } from './fraud'
import { assetUrl, storeUrl } from '../config/env'

const TABS = [['general', 'General'], ['shipping', 'Delivery & payment'], ['tracking', 'Pixel & tracking'], ['seo', 'SEO'], ['courier', 'Courier'], ['backup', 'Staff & backup']]

const CHECKS = {
  metaPixelId: [/^\d{6,20}$/, 'Digits only, e.g. 123456789012345'],
  gtmId: [/^GTM-[A-Z0-9]+$/i, 'Looks like GTM-XXXXXXX'],
  ga4Id: [/^G-[A-Z0-9]+$/i, 'Looks like G-XXXXXXXXXX'],
  googleAdsId: [/^AW-\d+$/i, 'Looks like AW-123456789'],
  tiktokPixelId: [/^[A-Z0-9]{10,30}$/i, '20-character ID from TikTok Events Manager'],
}

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
}

export default function Settings() {
  useDb()
  const [tab, setTab] = useState('general')
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(S.settings)))
  const [bdKey, setBdKey] = useState(getKey())
  const [domain, setDomain] = useState('https://bookshelf.com.bd')
  const set = (path) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setF((old) => { const n = structuredClone(old); const keys = path.split('.'); let o = n; keys.slice(0, -1).forEach((k) => { o = o[k] }); o[keys.at(-1)] = v; return n })
  }
  const txt = (path, label, hint, props = {}) => {
    const v = path.split('.').reduce((o, k) => o?.[k], f) ?? ''
    const key = path.split('.').at(-1)
    const bad = CHECKS[key] && v && !CHECKS[key][0].test(v)
    return (
      <Field label={label} hint={bad ? <span className="text-red-600">⚠ {CHECKS[key][1]}</span> : hint}>
        {props.rows ? <textarea className="field font-mono text-xs" rows={props.rows} value={v} onChange={set(path)} placeholder={props.placeholder} /> : <input className="field" type={props.type || 'text'} value={v} onChange={set(path)} placeholder={props.placeholder} autoComplete="off" />}
      </Field>
    )
  }
  const submit = () => {
    Object.assign(S.settings, f)
    save()
    toast(tab === 'tracking' ? 'Saved. Reload the storefront for tracking changes to load.' : 'Settings saved')
  }
  const sitemap = () => {
    const base = domain.replace(/\/$/, '')
    const urls = ['/', ...S.categories.flatMap((c) => [`/category/${c.slug}`, ...c.subcategories.map((s) => `/subcategory/${s.slug}`)]), ...S.products.filter((p) => p.active !== false).map((p) => `/product/${encodeURIComponent(p.slug)}`), ...Object.keys(S.pages).map((k) => `/page/${encodeURIComponent(k)}`), '/site/contact-us']
    download('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`, 'application/xml')
    toast(`sitemap.xml with ${urls.length} URLs downloaded`)
  }

  const desc = f.seo.description || ''
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button className="btn-accent" onClick={submit}>Save changes</button>
      </div>
      <Chips items={TABS} value={tab} onChange={setTab} />

      {tab === 'general' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Store">
            <div className="grid gap-3 sm:grid-cols-2">
              {txt('siteName', 'Store name')}{txt('phone', 'Hotline')}
              {txt('phoneIntl', 'WhatsApp number', 'With country code, e.g. +8801776363309')}{txt('email', 'Email')}
              <div className="sm:col-span-2">{txt('address', 'Address')}</div>
              <div className="sm:col-span-2">{txt('topBarText', 'Top bar message', 'The line above the header')}</div>
              {txt('messengerUrl', 'Messenger link')}{txt('whatsappUrl', 'WhatsApp link')}
              {txt('logoDark', 'Logo (header)')}{txt('logoWhite', 'Logo (footer, white)')}
            </div>
          </Panel>
          <Panel title="Social links (footer)">
            <div className="grid gap-3 sm:grid-cols-2">
              {f.socials.map((s, i) => <div key={s.name}>{txt(`socials.${i}.url`, s.name, '', { placeholder: 'https://…' })}</div>)}
            </div>
          </Panel>
          <Panel title="Product page “Order Policy” tab" className="xl:col-span-2">{txt('orderPolicyHtml', 'HTML', '', { rows: 6 })}</Panel>
        </div>
      )}

      {tab === 'shipping' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Delivery charges">
            {f.shipping.map((s, i) => (
              <div key={s.id} className="mb-3 grid grid-cols-3 gap-2">
                {txt(`shipping.${i}.label`, 'Label (Bangla)')}{txt(`shipping.${i}.charge`, 'Charge ৳', '', { type: 'number' })}{txt(`shipping.${i}.eta`, 'Delivery time')}
              </div>
            ))}
            {txt('freeShippingMin', 'Free delivery when the order is at least ৳', '0 = off. Shows a “৳X more for free delivery” bar in the cart.', { type: 'number' })}
          </Panel>
          <Panel title="Payment methods">
            <p className="mb-3 text-sm text-muted">Cash on delivery is always on. Fill a number to switch on manual bKash/Nagad payment (customer sends money, enters TrxID, you verify in the order).</p>
            <div className="grid gap-3 sm:grid-cols-2">{txt('bkashNumber', 'bKash merchant/personal number')}{txt('nagadNumber', 'Nagad number')}</div>
            <p className="mt-3 rounded bg-surface p-2 text-xs text-muted">Automatic bKash Checkout (PGW) needs the Laravel backend — the app keys must never be put in the browser.</p>
          </Panel>
        </div>
      )}

      {tab === 'tracking' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Meta (Facebook) Pixel & Conversions API">
            <div className="space-y-3">
              {txt('tracking.metaPixelId', 'Pixel ID', 'Events Manager → Data sources → your pixel. Sends PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Search.')}
              {txt('tracking.metaCapiToken', 'Conversions API access token', 'Used by the Laravel server (not the browser) to send the same events with the same event_id — iOS/ad-blocker safe and deduplicated.', { type: 'password' })}
              {txt('tracking.metaTestCode', 'Test event code (optional)', 'e.g. TEST12345 while testing in Events Manager')}
              {txt('tracking.fbDomainVerify', 'Domain verification code', 'Business Settings → Brand safety → Domains → Meta-tag option (just the content value)')}
            </div>
          </Panel>
          <Panel title="Google">
            <div className="space-y-3">
              {txt('tracking.gtmId', 'Google Tag Manager container ID', 'If set, all Google events go to GTM’s dataLayer (GA4 e-commerce format) and the two fields below are ignored to avoid double counting.')}
              {txt('tracking.ga4Id', 'GA4 Measurement ID', 'Only used when GTM is empty')}
              <div className="grid gap-3 sm:grid-cols-2">{txt('tracking.googleAdsId', 'Google Ads conversion ID')}{txt('tracking.googleAdsLabel', 'Purchase conversion label')}</div>
              {txt('tracking.googleSiteVerify', 'Search Console verification code', 'HTML-tag method, content value only')}
            </div>
          </Panel>
          <Panel title="TikTok">{txt('tracking.tiktokPixelId', 'TikTok Pixel ID', 'Sends ViewContent, AddToCart, InitiateCheckout, CompletePayment')}</Panel>
          <Panel title="Custom code" sub="for other tools (Hotjar, Clarity, chat widgets…)">
            <div className="space-y-3">{txt('tracking.headCode', 'Inside <head>', '', { rows: 4, placeholder: '<script>…</script>' })}{txt('tracking.bodyCode', 'End of <body>', '', { rows: 4 })}</div>
          </Panel>
          <Panel title="Events sent by the website" className="xl:col-span-2">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-1">When</th><th>Meta</th><th>GA4 / GTM</th><th>TikTok</th></tr></thead>
              <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-1.5">
                <tr><td>Every page</td><td>PageView</td><td>page_view</td><td>page()</td></tr>
                <tr><td>Book page opened</td><td>ViewContent</td><td>view_item</td><td>ViewContent</td></tr>
                <tr><td>অর্ডার করুন / add to cart</td><td>AddToCart</td><td>add_to_cart</td><td>AddToCart</td></tr>
                <tr><td>Checkout opened</td><td>InitiateCheckout</td><td>begin_checkout</td><td>InitiateCheckout</td></tr>
                <tr><td>Order placed</td><td>Purchase (value, BDT, event_id)</td><td>purchase (+ Google Ads conversion)</td><td>CompletePayment</td></tr>
                <tr><td>Search</td><td>Search</td><td>search</td><td>Search</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Check with Meta Pixel Helper / Tag Assistant after saving. Events fire on the storefront, not inside this admin.</p>
          </Panel>
        </div>
      )}

      {tab === 'seo' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Default SEO">
            <div className="space-y-3">
              {txt('seo.title', 'Homepage title', `${(f.seo.title || '').length}/60`)}
              {txt('seo.titleSuffix', 'Added after every page title', 'e.g. " - Bookshelf"')}
              {txt('seo.description', 'Meta description', `${desc.length}/160`, { rows: 3 })}
              {txt('seo.keywords', 'Keywords (comma separated)')}
              {txt('seo.ogImage', 'Share image (Facebook/WhatsApp preview)', '1200×630 recommended')}
            </div>
          </Panel>
          <Panel title="Google preview">
            <div className="rounded-md border border-line p-4">
              <p className="text-xs text-green-700">bookshelf.com.bd</p>
              <p className="text-lg text-[#1a0dab]">{f.seo.title}</p>
              <p className="text-sm text-muted">{desc.slice(0, 160)}</p>
            </div>
            {f.seo.ogImage && <img src={assetUrl(f.seo.ogImage)} alt="Share preview" className="mt-3 w-full rounded border border-line" />}
            <p className="mt-3 text-xs text-muted">Each book also gets its own title, description and Book/Product structured data (price, availability, author, ISBN) — edit per book in Products → SEO.</p>
          </Panel>
          <Panel title="Sitemap & robots.txt" className="xl:col-span-2">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Live domain"><input className="field" value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
              <button className="btn-brand" onClick={sitemap}>Download sitemap.xml</button>
              <button className="btn-outline" onClick={() => download('robots.txt', `User-agent: *\nDisallow: /admin\nDisallow: /customer/\nAllow: /\n\nSitemap: ${domain.replace(/\/$/, '')}/sitemap.xml\n`)}>Download robots.txt</button>
            </div>
            <p className="mt-2 text-xs text-muted">Upload both to the website root, then submit the sitemap in Google Search Console. With the Laravel backend the sitemap is generated automatically.</p>
          </Panel>
        </div>
      )}

      {tab === 'courier' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Steadfast Courier">
            <div className="space-y-3">{txt('courier.steadfastApiKey', 'API key', '', { type: 'password' })}{txt('courier.steadfastSecret', 'Secret key', '', { type: 'password' })}</div>
            <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">Saved here for the backend hand-over. “Send to courier” creates real Steadfast consignments only after the Laravel backend is connected (the keys stay on the server there).</p>
          </Panel>
          <Panel title="BD Courier — courier history / fraud check">
            <Field label="API key (app.bdcourier.com → API)" hint="Saved only in this browser, never in backups or GitHub."><input type="password" className="field" value={bdKey} onChange={(e) => setBdKey(e.target.value)} autoComplete="off" /></Field>
            <button className="btn-brand mt-3" onClick={() => { setKey(bdKey.trim()); toast(bdKey.trim() ? 'BD Courier key saved in this browser' : 'Key removed') }}>Save key</button>
          </Panel>
        </div>
      )}

      {tab === 'backup' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Staff (shown in order timeline)">
            {f.staff.map((s, i) => <div key={i} className="mb-2 flex gap-2"><input className="field" value={s} onChange={set(`staff.${i}`)} aria-label="Staff name" /><button className="px-2 text-red-600" onClick={() => setF({ ...f, staff: f.staff.filter((_, k) => k !== i) })} disabled={f.staff.length < 2}>×</button></div>)}
            <button className="text-sm text-brand" onClick={() => setF({ ...f, staff: [...f.staff, 'New staff'] })}>+ Add staff</button>
          </Panel>
          <Panel title="Backup & restore">
            <p className="mb-3 text-sm text-muted">This demo keeps everything in this browser. Download a backup before clearing the browser or moving to another computer.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-brand" onClick={() => download(`bookshelf-backup-${new Date().toISOString().slice(0, 10)}.json`, exportDb(), 'application/json')}>Download backup</button>
              <label className="btn-outline cursor-pointer">Restore backup<input type="file" accept="application/json" className="hidden" onChange={async (e) => { try { importDb(await e.target.files[0].text()); toast('Backup restored'); setF(JSON.parse(JSON.stringify(S.settings))) } catch (err) { toast(err.message) } }} /></label>
              <button className="btn-outline text-red-600" onClick={() => confirm('Reset everything to the original data? Orders and changes will be lost.') && resetDb()}>Reset all data</button>
            </div>
            <a className="mt-3 block text-sm text-brand" href={storeUrl('/')} target="_blank" rel="noreferrer">Open storefront ↗</a>
          </Panel>
        </div>
      )}
    </div>
  )
}
