import { useState } from 'react'
import { S, save, useDb, validPhone } from '../store/db'
import { Chips, Empty, Field, Panel, Pill, fdate, toast } from './ui'
import { SMS_EVENTS, SMS_VARS, getSmsSecret, setSmsSecret, renderSms, resendSms, sendSms, smsParts } from '../lib/sms'

const ST = { sent: ['green', 'Sent'], sending: ['sky', 'Sending'], failed: ['red', 'Failed'], not_configured: ['amber', 'Not sent — SMS server not set'] }
const SAMPLE = { name: 'Rahim Uddin', invoice: 'BS100123', total: 350, subtotal: 280, items: [{ name: 'Makkar IELTS Speaking and Writing Task 1 & 2 (2026 Edition)', price: 280, quantity: 1 }], courier: 'steadfast', tracking: 'SF12345678', trackCode: 'BS100123-AB12', phone: '01700000000' }

export default function Sms() {
  useDb()
  const [tab, setTab] = useState('log')
  const [filter, setFilter] = useState('all')
  const [cfg, setCfg] = useState(() => structuredClone(S.settings.sms))
  const [secret, setSecret] = useState(getSmsSecret())
  const [test, setTest] = useState({ to: '', text: 'Bookshelf থেকে টেস্ট SMS। সব ঠিক আছে ✓' })
  const log = S.smsLog.filter((x) => filter === 'all' || x.status === filter || (filter === 'failed' && x.status === 'not_configured'))
  const count = (k) => S.smsLog.filter((x) => x.status === k).length
  const parts = S.smsLog.filter((x) => x.status === 'sent').reduce((s, x) => s + x.parts, 0)

  const saveCfg = () => { S.settings.sms = cfg; save(); setSmsSecret(secret.trim()); toast('SMS settings saved') }
  const sendTest = async () => {
    if (!validPhone(test.to)) return toast('Enter a valid mobile number')
    saveCfg()
    const r = await sendSms({ to: test.to, text: test.text, event: 'test' })
    toast(r.status === 'sent' ? 'Test SMS sent ✓' : `Not sent: ${r.info}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">SMS</h1>
        <Chips items={[['log', 'SMS log', S.smsLog.length], ['settings', 'Settings & messages']]} value={tab} onChange={setTab} />
      </div>

      {!S.settings.sms.relayUrl && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          SMS server এখনো যুক্ত করা হয়নি, তাই SMS তৈরি হয়ে লগে জমা হচ্ছে কিন্তু কাস্টমারের ফোনে যাচ্ছে না। <button className="font-semibold underline" onClick={() => setTab('settings')}>Settings & messages</button> এ SMS server-এর URL দিন (সেটআপ: <code>server/README.md</code>)।
        </div>
      )}

      {tab === 'log' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Chips items={[['all', 'All', S.smsLog.length], ['sent', 'Sent', count('sent')], ['failed', 'Not sent / failed', count('failed') + count('not_configured')]]} value={filter} onChange={setFilter} />
            <span className="text-sm text-muted">Sent SMS parts: <b>{parts}</b></span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Time</th><th className="p-3">To</th><th className="p-3">Type</th><th className="p-3">Message</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
              <tbody className="divide-y divide-line">
                {log.length ? log.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap p-3 text-xs">{fdate(x.at)}</td>
                    <td className="whitespace-nowrap p-3">{x.to}{x.invoice && <div className="text-xs text-muted">{x.invoice}</div>}</td>
                    <td className="p-3 text-xs">{SMS_EVENTS[x.event]?.split(' (')[0] || x.event}</td>
                    <td className="max-w-md p-3 text-xs">{x.text}<div className="mt-0.5 text-muted">{x.chars} chars · {x.parts} SMS{x.unicode ? ' (Bangla)' : ''}</div></td>
                    <td className="p-3"><Pill tone={ST[x.status]?.[0]}>{ST[x.status]?.[1] || x.status}</Pill>{x.info && x.status !== 'sent' && <div className="mt-0.5 max-w-48 text-xs text-muted">{x.info}</div>}</td>
                    <td className="whitespace-nowrap p-3 text-right text-xs">
                      {x.status !== 'sent' && <button className="text-brand" onClick={async () => { const r = await resendSms(x); toast(r.status === 'sent' ? 'Sent ✓' : r.info) }}>Send again</button>}
                      <a className="ml-3 text-muted" href={`sms:${x.to}?body=${encodeURIComponent(x.text)}`}>Phone SMS app</a>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6}><Empty>No SMS yet. They appear here when customers order and when you change an order's status.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="SMS server (gateway)">
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />Send order SMS automatically</label>
              <Field label="SMS server URL" hint="The relay from server/ on your hosting, e.g. https://sms.bookshelf.com.bd — it holds the Muthofun / BulkSMSBD key in its .env (same gateway setup as Bachelor Home).">
                <input className="field" value={cfg.relayUrl} onChange={(e) => setCfg({ ...cfg, relayUrl: e.target.value.trim() })} placeholder="https://…" />
              </Field>
              <Field label="Admin secret" hint="Same as ADMIN_SECRET in the server .env. Saved only in this browser — needed for status-change SMS sent by staff.">
                <input type="password" className="field" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Website address for tracking links" hint="Leave empty to use this site's current address. On the live domain: https://bookshelf.com.bd">
                <input className="field" value={cfg.siteUrl} onChange={(e) => setCfg({ ...cfg, siteUrl: e.target.value.trim() })} placeholder="https://bookshelf.com.bd" />
              </Field>
              <button className="btn-accent" onClick={saveCfg}>Save</button>
            </div>
          </Panel>

          <Panel title="Send a test SMS">
            <div className="space-y-3">
              <Field label="Mobile number"><input className="field" inputMode="tel" value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
              <Field label="Message" hint={`${smsParts(test.text).chars} chars · ${smsParts(test.text).parts} SMS`}><textarea rows={3} className="field" value={test.text} onChange={(e) => setTest({ ...test, text: e.target.value })} /></Field>
              <button className="btn-brand" onClick={sendTest}>Send test</button>
            </div>
          </Panel>

          <Panel title="Messages for each step" sub="Bangla SMS: 70 characters = 1 SMS" className="xl:col-span-2">
            <p className="mb-3 text-xs text-muted">Variables: {SMS_VARS.map((v) => <code key={v} className="mr-1 rounded bg-surface px-1">{v}</code>)} — <b>{'{link}'}</b> = the customer's own order-tracking page.</p>
            <div className="space-y-4">
              {Object.entries(SMS_EVENTS).map(([k, label]) => {
                const preview = renderSms(cfg.templates[k], { ...SAMPLE })
                const p = smsParts(preview)
                return (
                  <div key={k} className="rounded-md border border-line p-3">
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={cfg.events[k]} onChange={(e) => setCfg({ ...cfg, events: { ...cfg.events, [k]: e.target.checked } })} />{label}</label>
                    <textarea rows={2} className="field text-sm" value={cfg.templates[k]} onChange={(e) => setCfg({ ...cfg, templates: { ...cfg.templates, [k]: e.target.value } })} disabled={!cfg.events[k]} />
                    <p className="mt-1.5 rounded bg-surface p-2 text-xs"><span className="text-muted">Preview: </span>{preview}</p>
                    <p className={`mt-1 text-xs ${p.parts > 2 ? 'text-red-600' : 'text-muted'}`}>{p.chars} chars · {p.parts} SMS per customer{p.parts > 2 ? ' — shorten to save cost' : ''}</p>
                  </div>
                )
              })}
            </div>
            <button className="btn-accent mt-3" onClick={saveCfg}>Save messages</button>
          </Panel>
        </div>
      )}
    </div>
  )
}
