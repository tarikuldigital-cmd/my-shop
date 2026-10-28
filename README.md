# Smart China Gallery

Online store for Smart China Gallery (New Paltan, Dhaka · WhatsApp +880 1338-325365), built with **React + Vite**.
Everything is in English: storefront, checkout and admin panel.

- **Live demo:** https://tarikuldigital-cmd.github.io/my-shop/
- **Admin:** add `#admin` to the address. Demo login: `admin@demo.com` / `123456`

## Features

**Storefront:** Daraz-style light theme, image categories, flash sale with countdown, every category's products on the home page, search with suggestions, filters and sorting, product variants (colour, size…), reviews, wishlist, cart, order tracking, customer account, WhatsApp ordering, Meta Pixel and GA4 events, SEO tags.

**Checkout:** name, mobile number, one full-address box and an Inside/Outside Dhaka choice (sets the delivery charge). Cash on delivery, bKash and Nagad, coupons and free-delivery threshold. Abandoned checkouts are saved as *incomplete orders*.

**Admin:** overview dashboard with insights, order management portal (status tabs, date/status/courier filters, today's snapshot, bulk actions, pagination, WhatsApp button, courier tracking links, DUE/PAID), BD Courier fraud checker, incomplete orders, returns, customers, messages, reviews, products with variants, categories, coupons and store settings.

## Folder layout

| Path | What it is |
|---|---|
| `react-app/` | React source code (edit here) |
| `index.html`, `assets/` | Production build served by GitHub Pages (generated, do not edit) |
| `courier-check.php` | Server-side helper for the BD Courier fraud check |
| `brand/` | Logo files |
| `legacy/` | The old single-file version, kept for reference |

## Develop

```bash
cd react-app
npm install
npm run dev            # local dev server
npm run publish-site   # build and copy the build to the repo root, then commit and push
```

## Put it on your own domain (Hostnin / cPanel)

1. In `react-app`, run `npm run build` (or download `index.html`, the `assets` folder and `courier-check.php` from this repo).
2. cPanel → File Manager → `public_html`: upload `index.html`, the `assets` folder and `courier-check.php`.
3. Turn on SSL in cPanel (SSL/TLS Status → AutoSSL).

The site uses `#` links (e.g. `#product-p5`), so it works on any host without extra server rules.

## BD Courier fraud checker

1. Edit `courier-check.php` on your hosting: put your BD Courier API key in `$BDC_API_KEY` and choose a secret word for `$ADMIN_SECRET`.
2. Admin → Settings → Fraud checker: enter the same secret word, press **Test connection**, then **Save settings**.

Never put the real API key in GitHub or in the React code. The fraud check does not run on GitHub Pages because PHP is not available there.

## Important

Data is currently stored in the visitor's browser (localStorage). Before taking real orders, connect a server database (PHP + MySQL on Hostnin works) so orders from every customer reach the admin panel, and replace the demo admin login with a real one. All data access goes through `react-app/src/lib/core.js` (the `DB` object), which is the place to connect an API.
