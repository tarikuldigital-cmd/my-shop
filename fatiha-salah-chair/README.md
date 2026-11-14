# Fatiha Ayat Salah Chair — fatihaayatsalahchair.com

Full e-commerce website for **Fatiha Ayat Salah Chair** (prayer chairs, later more furniture) — storefront + admin panel + PHP/MySQL backend.
It is built on the same code and admin panel as Bookshelf (`../bookshelf/`), rebranded and adapted for chairs with colour variants.

**Stack:** React 19 + Vite + React Router + Tailwind CSS 4 (frontend) · PHP 8 + MySQL (backend in `api/`, runs on any cPanel hosting).

## What's inside
- **Storefront:** hero, colour/design gallery, features, product video, gift section, FAQ, banners, search, category pages, product page with colour swatches (all designs of the same *Color group* shown side by side), cart, checkout (Inside Dhaka ৳250 / Outside ৳300, cash on delivery), order success, order tracking (`/t/:code` link in SMS), customer login/account, contact & policy pages, live chat, landing pages (`/lp/:slug`).
- **Admin (`/admin`):** dashboard & insights, orders (status flow, invoice print, CSV, send to Steadfast, BD Courier fraud check), incomplete orders, customers, live chat, SMS, messages, reviews, products (**+ Color** button to add a new colour in one click), categories, landing pages, homepage & banners, coupons, info pages, settings (Pixel/CAPI/GTM/GA4/TikTok, SEO, courier, staff, backup).
- **Products:** 9 salah-chair designs (Green, Red, Black, Royal Blue, Purple, Golden Floral, Blue Mandala, Black & White Geometric, Grey Blue Damask) — ৳5,000 (regular ৳5,500). Edit prices/stock/photos from the admin.
- Contact: 01994-683008 (call / WhatsApp) · Facebook Page: Fatiha Ayat Salah Chair BD.

## Folders
| Path | What |
|---|---|
| `src/` | React source (storefront `pages/`, admin `admin/`) |
| `api/` | PHP backend (`setup.php` = one-time installer, `seed/seed.json` = starting products) |
| `public/img/` | product photos, banners, video |
| `deploy/` | ready-built live site (frontend + api) — copy to the domain folder |
| `cpanel/fatiha-cpanel-upload.zip` | same as `deploy/`, zipped for File Manager upload |
| `preview/` | demo build for GitHub Pages (data saved in the browser only) |
| `docs/CPANEL_GUIDE_BN.md` | step-by-step going-live guide (Bangla) |

## Develop / build
```bash
npm install
npm run dev               # demo mode (browser storage), admin demo: admin@fatihaayatsalahchair.com / 123456
npm run build:cpanel      # live build → dist/ (uses /api/v1)
bash scripts/package-cpanel.sh   # → out/fatiha-cpanel-upload.zip
```

## Go live (short)
1. Point **fatihaayatsalahchair.com** to the Hostnin cPanel, enable SSL.
2. Create a MySQL database + user.
3. Upload & extract `cpanel/fatiha-cpanel-upload.zip` in the domain folder.
4. Open `https://fatihaayatsalahchair.com/api/setup.php` → DB details + your admin email/password → Install.
5. Log in at `/admin`. Full guide: `docs/CPANEL_GUIDE_BN.md`.

Developed by Tarikul Islam.
