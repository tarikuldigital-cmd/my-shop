# Smart China Gallery — React storefront + admin + PHP/MySQL backend

Same architecture as the Bookshelf site (React + Vite + Tailwind, PHP 8 API in `api/`), English only, green + light-red theme.

- Storefront: categories, search, product variants (colour / size / model with own price & stock), cart, checkout (name, mobile, one full address, Inside/Outside Dhaka), COD + bKash/Nagad, landing pages, live chat, customer accounts, tracking page.
- Admin `/admin`: dashboard, orders (status tabs, filters, bulk actions, copy name/phone/address/COD, send to Steadfast with COD, live courier status + rider notes, courier sync), incomplete orders, fraud check, products with variant editor, categories, homepage, coupons, reviews, SMS, Pixel/GTM/SEO, staff & backup. Installable as a phone app.
- Customer tracking `/t/<code>` (link in the order SMS) shows the courier's live status and every rider / hub note.

```bash
npm install
npm run dev            # demo mode (data in this browser), admin: admin@demo.com / 123456
npm run build:cpanel   # live build for the PHP backend
bash scripts/package-cpanel.sh   # → out/smart-china-cpanel-upload.zip
```
cPanel steps: `docs/CPANEL_GUIDE_BN.md`. API notes: `docs/BACKEND_CPANEL.md`.
