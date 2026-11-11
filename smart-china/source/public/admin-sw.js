/* Smart China Gallery admin service worker: makes the admin installable as an app.
   It never caches API data or pages (so orders are always live); it only shows a small
   "no connection" page when the phone is offline. */
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;color:#334155"><div><h2>No internet connection</h2><p>Try again when you are back online.</p><button onclick="location.reload()" style="padding:10px 18px;border:0;border-radius:8px;background:#15803d;color:#fff;font-size:16px">Try again</button></div>'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
  }
})
