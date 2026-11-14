// Same gateway code as the Bachelor Home project (server/sms.js) so both projects use one SMS account.
// SMS gateway. Default: Muthofun / Muthobarta (sysadmin.muthobarta.com). Also supports BulkSMSBD.
// Any other HTTP gateway works by setting SMS_URL_TEMPLATE with {number} and {message}.
//
// .env options:
//   SMS_PROVIDER=muthofun | bulksmsbd | template | none
//   SMS_API_KEY=Token xxxxx   (Muthofun: the full 'Token ...' value from the Muthobarta panel)
//   SMS_SENDER_ID=8809XXXXXXXXX
//   SMS_URL_TEMPLATE=https://example.com/send?key=XXX&to={number}&msg={message}

export function normalizeBdNumber(n) {
  let d = String(n || '').replace(/[^\d]/g, '');
  if (d.startsWith('880')) return d;
  if (d.startsWith('0')) return '88' + d;
  if (d.length === 10 && d.startsWith('1')) return '880' + d;
  return d;
}

export async function sendSms(number, message) {
  const provider = (process.env.SMS_PROVIDER || 'muthofun').toLowerCase();
  const to = normalizeBdNumber(number);
  if (!to || to.length < 11) return { ok: false, info: 'invalid number' };

  try {
    if (provider === 'none') {
      console.log(`[SMS disabled] ${to}: ${message}`);
      return { ok: false, info: 'SMS disabled' };
    }
    if (provider === 'template') {
      const tpl = process.env.SMS_URL_TEMPLATE;
      if (!tpl) return { ok: false, info: 'SMS_URL_TEMPLATE missing' };
      const url = tpl.replace('{number}', encodeURIComponent(to)).replace('{message}', encodeURIComponent(message));
      const r = await fetch(url);
      const text = await r.text();
      return { ok: r.ok, info: text.slice(0, 200) };
    }
    if (provider === 'muthofun') {
      let key = (process.env.SMS_API_KEY || '').trim();
      if (!key) return { ok: false, info: 'SMS_API_KEY missing in .env' };
      if (!/^token\s/i.test(key)) key = 'Token ' + key;
      const body = { receiver: to.replace(/^88/, ''), message, remove_duplicate: true };
      if (process.env.SMS_SENDER_ID) body.sender_id = process.env.SMS_SENDER_ID;
      const r = await fetch('https://sysadmin.muthobarta.com/api/v1/send-sms', {
        method: 'POST',
        headers: { Authorization: key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        /* not json */
      }
      const ok = r.ok && (data.code === undefined || Number(data.code) === 200);
      return { ok, info: data.message || data.detail || text.slice(0, 200) };
    }
    // BulkSMSBD
    const key = process.env.SMS_API_KEY;
    const sender = process.env.SMS_SENDER_ID;
    if (!key || !sender) return { ok: false, info: 'SMS_API_KEY / SMS_SENDER_ID missing in .env' };
    const body = new URLSearchParams({ api_key: key, type: 'text', number: to, senderid: sender, message });
    const r = await fetch('http://bulksmsbd.net/api/smsapi', { method: 'POST', body });
    const text = await r.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* not json */
    }
    // BulkSMSBD returns response_code 202 on success
    const ok = r.ok && (data.response_code === 202 || /202|success/i.test(text));
    return { ok, info: data.success_message || data.error_message || text.slice(0, 200) };
  } catch (e) {
    return { ok: false, info: e.message };
  }
}
