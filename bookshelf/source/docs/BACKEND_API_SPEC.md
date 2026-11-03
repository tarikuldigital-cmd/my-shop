# Bookshelf — Laravel backend specification (Phase 3)

The React app already talks to one service layer (`src/services/*`) and one mock store (`src/store/db.js`).
Set `VITE_USE_MOCK=false` and implement the endpoints below; the UI does not change.
Every admin screen in `src/admin/` maps to one group of endpoints.

## 1. Database tables
| Table | Key columns |
|---|---|
| `products` | id, slug (unique), name, price, old_price, stock (nullable = untracked), sku, author, publisher, isbn, pages, edition, language, cover_type, print, description (html), images (json), look_inside (json), combo_items (json), seo_title, seo_description, is_active, is_featured, sold_count, timestamps |
| `categories`, `subcategories` | slug, name, image, sort_order, parent_id |
| `category_product`, `product_subcategory` | pivots |
| `home_sections` | key (flash_sale, hot_deal, all_products, category:{slug}), product_ids (json, ordered), is_enabled; `flash_ends_at` |
| `banners` | image, link, sort_order, is_active |
| `customers` | id, name, phone (unique), password, email, address |
| `orders` | id, invoice (unique, `BS100101`…), customer_id, name, phone, address, shipping_area, subtotal, shipping_charge, discount, coupon_code, total, payment_method, payment_status, trx_id, sender_phone, status, courier, tracking_code, consignment_id, source, note, cancel_reason, return_reason, created_by |
| `order_items` | order_id, product_id, name, price, quantity (price copied at order time) |
| `order_events` | order_id, status \| 'note', note, staff_id, created_at → the order timeline |
| `checkout_drafts` | draft_id, phone, name, address, shipping_area, items (json), subtotal, status (new/contacted/converted/dropped), order_invoice, log (json), timestamps → **incomplete orders** |
| `coupons` | code, type (flat/percent), value, min_order, expires_at, is_active, used_count |
| `reviews` | product_id, customer_id, name, rating, text, is_approved |
| `messages` | contact-form messages |
| `pages` | slug, title, html |
| `settings` | key → value (json). Groups: general, shipping, payment, tracking, seo, courier |
| `staff` + roles | admin / moderator; Sanctum login for `/admin` |
| `fraud_checks` | phone, response (json), checked_at (cache 12 h) |

## 2. Public API (`/api/v1`)
| Method & path | Used by |
|---|---|
| `GET /settings` | public settings only — **never** return CAPI token, courier keys |
| `GET /categories` · `GET /home` | header, homepage |
| `GET /products?category=&subcategory=&keyword=&min_price=&max_price=&sort=&page=` | listing/search (Laravel paginator: `data`, `meta`) |
| `GET /products/{slug}` · `GET /products/{slug}/related` | product page |
| `GET /products/{slug}/reviews` · `POST /products/{slug}/reviews` | reviews (saved unapproved) |
| `GET /search/suggest?q=` | header instant search |
| `POST /checkout/draft` | incomplete-order capture (`draft_id`, phone, name, address, items) — upsert, throttle 10/min |
| `POST /coupons/validate` | `{code, subtotal}` → discount or error |
| `POST /orders` | place order — server recalculates prices, shipping, coupon, stock; marks matching drafts `converted`; fires Meta CAPI `Purchase` |
| `POST /orders/track` | `{phone, invoice?}` |
| `POST /customer/register` · `/login` · `/logout` · `GET/PUT /customer/me` · `GET /customer/orders` | account |
| `POST /customer/forgot-password` · `/verify-otp` | OTP by SMS (e.g. SSL Wireless / BulkSMS BD) |
| `POST /contact` | contact form |
| `GET /sitemap.xml` · `GET /robots.txt` | generated from products/categories/pages |

## 3. Admin API (`/api/v1/admin`, Sanctum + role check)
Orders: list with filters (status, date range, courier, q, page) + counts per status · show · `PATCH status` (with reason) · `POST note` · `POST bulk` (status / courier / print) · `GET export.csv` · `POST` manual order.
Courier: `POST /orders/{id}/steadfast` → Steadfast `create_order` API, save `consignment_id` + `tracking_code`; webhook `POST /webhooks/steadfast` updates status to transit/delivered/returned automatically. Pathao/RedX the same way.
Fraud: `GET /fraud/{phone}` → calls `api.bdcourier.com/courier-check` with the key from `.env`, caches 12 h.
Incomplete: list/filter · `PATCH status` · `POST convert` (creates order).
Catalogue: products CRUD + **image upload** (`POST /admin/uploads`, multipart `file` + `kind` = product/page/banner/category → returns `{ path }`; the admin already resizes to WebP before sending) (store to `storage/app/public/product`, generate WebP + thumbnails) · categories · home sections · banners · coupons · reviews approve/delete · pages · messages.
Settings: `GET/PUT /settings/{group}` (tracking, seo, courier keys stored encrypted).
Dashboard: `GET /dashboard?range=` returns the KPIs the React dashboard computes today (orders, sales, delivered, cancel/return rates, trend, top books, categories, sources, courier success, SLA counts).

## 4. Tracking on the server
- **Meta Conversions API**: on `POST /orders` send `Purchase` (and optionally `InitiateCheckout` from `/checkout/draft`) to `graph.facebook.com/v20.0/{pixel_id}/events` with hashed phone/name, `fbp`/`fbc` cookies, client IP + user agent, and the **same `event_id`** the browser sent (the React `track()` returns it; send it in the order payload as `event_id`) → Meta deduplicates.
- Optional: GA4 Measurement Protocol `purchase` for ad-blocked browsers.
- Server-render `<title>`, meta description, Open Graph tags and JSON-LD for `/product/{slug}` and `/category/{slug}` (Blade wrapper around the React `index.html`) so Facebook/WhatsApp link previews and Google show the right book.

## 5. Order SMS & tracking
- Same gateways as Bachelor Home (`server/sms.js`: Muthofun default, BulkSMSBD, URL template) with the key in `.env`.
- Send on: order placed, confirmed, sent to courier (with tracking code), delivered, cancelled — templates and on/off per step come from `settings.sms` (Admin → SMS). Log every SMS in an `sms_log` table (to, event, text, parts, status, gateway reply).
- Every order gets a random `track_code` (`BS100101-K7Q2`); public `GET /orders/track/{code}` returns status timeline, courier + tracking code, items, masked phone — the React page is `/t/{code}`.
- Until Laravel is live, `server/sms-relay.mjs` (or `sms-relay.php`) does the sending.

## 6. Payments
- COD: default.
- Manual bKash/Nagad: TrxID + sender saved, `payment_status = pending` until staff verifies (already in the admin UI).
- Later: bKash Tokenized Checkout (PGW) — create/execute/query endpoints on the server; never expose app key/secret to the browser.

## 7. Security checklist
Server-side validation of every price/stock; rate-limit draft/order/OTP endpoints; Bangladeshi phone validation; CSRF for cookie auth; staff roles (moderator can't see settings/keys); audit log via `order_events`; daily DB backup.
