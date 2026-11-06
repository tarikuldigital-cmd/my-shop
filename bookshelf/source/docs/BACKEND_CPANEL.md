# Bookshelf PHP + MySQL backend (api/)

Single-entry PHP 8 API for cPanel (PDO MySQL; SQLite works for local tests). Frontend build: `npm run build:cpanel` (live mode, `VITE_USE_MOCK=false`).

| Part | File |
|---|---|
| Router + CORS + error handling | `api/index.php` |
| DB (MySQL/SQLite), JSON documents, KV, tokens, rate limits | `api/lib/core.php` |
| Routes and handlers | `api/lib/handlers.php` |
| Server-side order pricing, stock, coupons, Steadfast, Meta CAPI | `api/lib/orders.php` |
| SMS gateways + message templates | `api/lib/sms.php` |
| Copy remote images onto this server | `api/lib/mirror.php` |
| One-time installer (also `php api/setup.php driver=sqlite …` for tests) | `api/setup.php` |
| Starting data (generated from `src/mocks`) | `api/seed/seed.json` (`npm run seed`) |

## Storage model
`docs(coll,id,k,k2,k3,seq,updated,data)` keeps one JSON document per row for products, categories, coupons, reviews, landings, chats, messages, incomplete, orders, smsLog. `k/k2/k3` are lookup columns (orders: invoice / track code / phone). `kv` holds settings, home, pages, fraud, nextInvoice. `admins`, `customers`, `tokens` (sha256 of the bearer token), `rl` (rate limit), `otp`.

## Public API (`/api/v1/…`)
`GET bootstrap` (books, categories, home, pages, public settings, active landings, approved reviews – secrets stripped, ETag) · `POST orders` (server recalculates prices/shipping/coupon, locks stock, assigns invoice + tracking code, sends the "placed" SMS, Meta CAPI) · `GET orders/track/{code}` · `POST orders/track` · `POST coupons/validate` · `POST checkout/draft` · `POST contact` · `POST products/{slug}/reviews` · `POST landing/view` · `POST chat` (AI relay) · `POST chat/log` · `customer/{register,login,logout,me,orders,forgot-password,verify-otp}`.

## Admin API (Bearer token from `POST admin/login`)
`GET admin/state` · `GET admin/poll?since=` · `POST admin/sync` (field-level patches; stock/sold/used/views as deltas) · `POST admin/uploads` · `POST admin/courier/steadfast` · `POST sms/send` · `GET|POST chat/config` · `POST admin/mirror-images` · `POST admin/password`.

## Webhook
`POST webhook/steadfast` — `Authorization: Bearer <steadfast_webhook_token>` (from `api/config.php`).

## Config (`api/config.php`, created by setup, never web-readable)
`db`, `site_url`, `secret`, `upload_dir`, `upload_url` (`/uploads`), `sms` {provider: muthofun|bulksmsbd|template|off, api_key, sender_id, url_template}, `steadfast_webhook_token`, `cors`, `trust_cloudflare`.
