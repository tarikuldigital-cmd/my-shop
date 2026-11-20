// Country code (e.g. "SA") → flag emoji and English name, for the admin panel.
export const flag = (cc) => (/^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐')
let names = null
try { names = new Intl.DisplayNames(['en'], { type: 'region' }) } catch { /* old browser */ }
export const countryName = (cc) => { if (!/^[A-Z]{2}$/.test(cc || '')) return 'Unknown'; try { return names?.of(cc) || cc } catch { return cc } }
