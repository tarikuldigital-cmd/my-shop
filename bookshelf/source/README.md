# Bookshelf.com.bd — React frontend (Phase 1–2)

Public storefront rebuild of https://bookshelf.com.bd in **React + Vite + React Router + Tailwind CSS + Axios**.
Includes an **admin panel at `/admin`** (orders, incomplete orders, books, homepage, coupons, reviews, Pixel/GTM/GA4/TikTok, SEO, courier) modelled on Smart China Gallery.
Until the Laravel API is connected, all data lives in a mock store (`src/store/db.js`) saved in **this browser's localStorage** — admin changes and orders are visible only in the same browser. See `docs/BACKEND_API_SPEC.md` and `docs/ROADMAP.md`.

Admin demo login: `admin@bookshelf.com.bd` / `123456` (demo only — replaced by a server login in the Laravel phase).

```bash
npm install
cp .env.example .env     # VITE_USE_MOCK=true by default
npm run dev              # http://localhost:5173
npm run build            # production build in dist/
```

## Pages (URLs identical to the live Laravel site)
| Route | Page |
|---|---|
| `/` | Home — banner slider, Top Categories, Flash Sales, Hot Deal, All Products, 9 category sections, customer-review banner |
| `/category/:slug`, `/subcategory/:slug`, `/search?keyword=` | Listing — category tree, price filter, 6 sort options, 24/page pagination |
| `/product/:slug` | Product — gallery, price/discount, code/type/brand, qty, add to cart, অর্ডার করুন, call/WhatsApp, delivery charges, Description / Order Policy / Reviews tabs, related products |
| `/customer/checkout` | Cart + checkout (qty update, remove, delivery area, COD) |
| `/customer/order-success/:invoice` | Order confirmation |
| `/customer/login`, `/customer/register`, `/customer/forgot-password` | Auth (mobile + password, OTP reset) |
| `/customer/order-track` | Track by phone (+ optional invoice) |
| `/t/:code` (also `/track/:code`) | Order tracking page linked in the customer's SMS (timeline, courier link) |
| `/customer/account`, `/customer/orders`, `/customer/orders/:invoice` | Customer dashboard & order history (login required) |
| `/site/contact-us`, `/page/:slug` | Contact form and CMS pages |

## Folder structure
```
src/
  store/       db.js — mock backend shared by storefront + admin (orders, incomplete, settings…)
  admin/       admin panel (Dashboard, Orders, Incomplete, Products, Categories, HomeEditor, Misc, Settings)
  lib/         tracking.js (Pixel/GTM/GA4/TikTok events) · seo.js (meta tags, JSON-LD) · recent.js · imageStore.js (demo image uploads in IndexedDB)
  services/uploadService.js — image upload: demo → IndexedDB, live → POST /admin/uploads
  config/      env.js (env vars, asset URLs) · api.js (Axios instance + ENDPOINTS map)
  services/    catalogService · authService · orderService · mockStore   ← only layer that knows mock vs API
  mocks/       products.json (187 products) · categories.json · home.json · pages.json · settings.json
  context/     SiteContext (settings + categories) · CartContext · AuthContext
  components/  layout/ (Header, nav, mobile menu, mini-cart, Footer) · product/ · common/
  pages/       Home, ProductList, ProductDetail, Checkout, customer/*, info/*
scripts/       raw-products.txt (data captured from the live site) → build-mock-data.py → products.json
server/        SMS relay (Node `sms-relay.mjs` or PHP `sms-relay.php`) — same gateways as Bachelor Home; see server/README.md
docs/          PHASE1_SITE_ANALYSIS.md (page inventory + what could not be verified)
```
UI components never import mock files; they call services only.

## Connecting the Laravel API later
1. Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=https://bookshelf.com.bd/api/v1` in `.env`.
2. Adjust paths in `src/config/api.js → ENDPOINTS` to match the real routes.
3. Make API responses match the mock shapes (see `src/mocks/products.json`), or map them inside the service functions:
   - product: `{ id, slug, name, price, oldPrice, images[], categories[], subcategories[], sku, productType, brand, description(html), sold, variations[] }`
   - list: Laravel paginator `{ data: [...], meta: { current_page, last_page, per_page, total, from, to } }`
   - login/register: `{ token, user }` — token is sent as `Authorization: Bearer` (Sanctum-ready)
4. Images: `VITE_ASSET_BASE_URL` (default `https://bookshelf.com.bd/public/uploads`) + stored relative path.

## Known gaps (documented, not guessed)
- Exact colours/fonts: the live CSS couldn't be read. Brand tokens are in **one place** — `src/index.css` `@theme`.
- Product descriptions and SKUs (except P0194) — `null` until the API provides them.
- Writing page 2 (7 products) not captured; 11 combo products have no image.
- Live checkout page was blocked from inspection — current checkout follows the site's own "Order procedure" page.
- Mock auth/orders are stored in the browser's localStorage (demo OTP: `123456`).

## Landing pages
Admin → Catalogue → **Landing pages**: pick any book/product, content is auto-filled from the product, edit text/theme/FAQ/video/countdown, publish at `/lp/<slug>`. Orders arrive in Orders with source "Landing page"; incomplete orders, Pixel/GTM/GA4/TikTok events and SMS work the same as the normal checkout. Data lives in `S.landings` (Laravel phase: `landing_pages` table, see docs/BACKEND_API_SPEC.md).

## Live chat (AI support agent)
Admin → Store → **Live chat**. A "💬 লাইভ চ্যাট" button on every storefront page opens a chat that answers from the live catalogue (names, prices, stock, combo contents, delivery charges, policies). Modes: Auto (no AI, free) · AI via your server (key stays on the server) · AI direct (test only). Works with any OpenAI-compatible provider — Groq, Google Gemini and OpenRouter have free tiers. See `server/README.md`. Code: `src/lib/chat.js` (retrieval + prompt), `src/components/chat/LiveChat.jsx`, `src/admin/LiveChat.jsx`, `server/chat.js`.
