# Phase 1 — bookshelf.com.bd Site Analysis & Page Inventory

Analysis date: 3 Nov 2026. Source: public pages of https://bookshelf.com.bd (Laravel, "Developed by StackAlix").
Method: page-by-page fetch of the public HTML (text + links + image URLs). CSS/visual styles could **not** be
read directly (see "Unverified items" at the bottom).

---

## 1. Global layout

### Header
| Part | Content (as on the live site) |
|---|---|
| Top bar | Bangla welcome message: original IELTS / Spoken English / Test Preparation books, 3–5 days home delivery nationwide, cash on delivery. Phone **01776363309** |
| Logo | `/public/uploads/settings/bookshelf-logo-dark.svg` → links `/` |
| Utility links | **Track Order** (`/customer/order-track`), **Login / Sign Up** (`/customer/login`) |
| Cart | Item count, mini-cart dropdown (empty state, total ৳0), button **"অর্ডার করুন"** → `/customer/checkout` |
| Search | `/search?keyword=…` (results page exists: "Showing 1-36 of 136 Results" for "ielts") |
| Main nav (with dropdowns) | Listening · Reading (Academic Reading, General Reading) · Writing (Academic Writing, General Writing) · Speaking (Cue Card) · Grammar · Vocabulary · Spoken English (English Story) · Combo Package · Test Preparation (SAT, GRE, Computer Based) |

### Footer
- White logo `/public/uploads/settings/bookshelf-logo-white.svg`
- Address: Shop 12, Level 2, Lily Shopping Complex, Lalbag Killamor, Dhaka, Bangladesh · Cell: 01776363309
- **Useful Links:** Contact Us, Order procedure, Delivery Rules, Return Policy
- **Links:** Delivery Rules, Return Policy, Terms & Conditions, Privacy Policy
- **Follow Us:** 6 social icons (all `#` placeholders on the live site)
- © 2026 Bookshelf. All Rights Reserved. Developed by StackAlix
- Floating buttons: Messenger `https://m.me/bookshelf.com.bd`, WhatsApp `https://wa.me/+8801776363309`

---

## 2. Page inventory

| # | Page | Live URL | Status | React route |
|---|---|---|---|---|
| 1 | Homepage | `/` | Analysed | `/` |
| 2 | Category listing (9) | `/category/{slug}` | Analysed (all 9) | `/category/:slug` |
| 3 | Subcategory listing (9) | `/subcategory/{slug}` | Analysed (all 9) | `/subcategory/:slug` |
| 4 | Search results | `/search?keyword=` | Analysed | `/search?keyword=` |
| 5 | Product detail | `/product/{slug}` | Analysed | `/product/:slug` |
| 6 | Cart + Checkout | `/customer/checkout` | **Blocked** (robots-disallowed; content not readable) | `/customer/checkout` |
| 7 | Login | `/customer/login` | Analysed | `/customer/login` |
| 8 | Register | `/customer/register` | Analysed | `/customer/register` |
| 9 | Forgot password (OTP) | `/customer/forgot-password` | Analysed | `/customer/forgot-password` |
| 10 | Order track | `/customer/order-track` | Analysed | `/customer/order-track` |
| 11 | Customer account / dashboard | (behind login) | Not publicly visible | `/customer/account` |
| 12 | Order history | (behind login) | Not publicly visible | `/customer/orders` |
| 13 | Contact Us | `/site/contact-us` | Analysed | `/site/contact-us` |
| 14 | Order procedure | `/page/order-procedure` | Analysed | `/page/order-procedure` |
| 15 | Delivery Rules | `/page/delivery-rules` | Analysed | `/page/delivery-rules` |
| 16 | Return Policy | `/page/return-policy` | Analysed | `/page/return-policy` |
| 17 | Terms & Conditions | `/page/terms-&-conditions` | Analysed | `/page/terms-&-conditions` |
| 18 | Privacy Policy | `/page/privacy-policy` | Analysed | `/page/privacy-policy` |
| — | About Us | — | **Does not exist** on the live site (no link anywhere) | not built |
| — | Wishlist | — | **Does not exist** on the live site | not built |

URLs are kept identical in React so old links / SEO / ads keep working.

---

## 3. Homepage (top → bottom)
1. Header (above)
2. **Banner slider** — 2 images (`/public/uploads/banner/…1.07.18 AM.jpeg`, `…1.02.21 AM.jpeg`)
3. **Top Categories** — 9 tiles with images (Listening … Test Preparation)
4. **Flash Sales** — 12 products
5. **Hot Deal** — the same 12 products
6. **All Products** — 14 products
7. One section per category (Listening, Reading, Writing, Speaking, Grammar, Vocabulary, Spoken English, Combo Package, Test Preparation) — 4–6 cards each + **View More**
8. **Customer reviews** — heading in Bangla ("positive reviews from our valued customers") + 1 banner image
9. Footer

## 4. Product card
Image · name · sale price (৳) · struck original price · discount badge **"NN% ছাড়"** · **"Sold 0"** · button **"অর্ডার করুন"**.
Some products have no original price → no badge.

## 5. Listing page (category / subcategory / search)
- Breadcrumb `Home / {name}`
- Sidebar: category tree (same as nav) + **Price** (min/max ৳ inputs) under "Filter"
- Sort: Product: Latest · Product: Oldest · Price: High To Low · Price: Low To High · Name: A-Z · Name: Z-A
- "Showing X-Y of N Results", 24 per page, numeric pagination with ‹ ›

| Category | Live count | Captured in mock data |
|---|---|---|
| Listening | 5 | 5 |
| Reading | 11 | 11 |
| Writing | 31 | 24 (page 2 failed to load — 7 missing, 4 of them known by slug) |
| Speaking | 37 | 37 |
| Grammar | 19 | 19 |
| Vocabulary | 11 | 11 |
| Spoken English | 10 | 10 |
| Combo Package | 59 | 48 with images + 11 from "related products" (price known, image unavailable) |
| Test Preparation | 11 | 11 |

Subcategories: Academic Reading 10, General Reading 1, Academic Writing 27, General Writing 2, Cue Card 2, English Story 3, SAT 4, GRE 3, Computer Based 4.

## 6. Product detail page
- Breadcrumb Home > {category} > {title}
- Image gallery (main + thumbs; most products have 1 image)
- Title, sale price, struck original price, "Save ৳X", **"NN% ছাড়"**
- Product Code (e.g. **P0194**), Product Type (Physical), Brand (N/A)
- Buttons: **"অর্ডার করুন"**, **"কল করুন 01776363309"**, **"Whatsapp +8801776363309"**
- Delivery charge box (Courier): **Inside Dhaka ৳70 · Outside Dhaka ৳120**
- Tabs: **Description · Order Policy · Reviews (0)** (review form requires login: "Login to Post Your Review")
- **Related products** carousel (same category)
- No size/colour variations seen; no quantity selector on the detail page.

## 7. Checkout (inferred — page blocked)
Live checkout HTML could not be fetched. Built from what the site states elsewhere (Order procedure page):
name, mobile number, full address, delivery area (Inside Dhaka ৳70 / Outside Dhaka ৳120), payment: Cash on Delivery
(online payment mentioned). **Must be compared against the real page once backend access is given.**

## 8. Auth & customer pages
- **Login** "কাস্টমার লগিন": মোবাইল নাম্বার, পাসওয়ার্ড, button "লগিন", links "পাসওয়ার্ড ভুলে গেছেন?" and "একাউন্ট না থাকলে? রেজিস্ট্রেশন করুন"
- **Register** "কাস্টমার রেজিস্ট্রেশন": নাম, মোবাইল নাম্বার, পাসওয়ার্ড, button "রেজিস্ট্রেশন", "রেজিস্ট্রেশন করা থাকলে? লগিন করুন"
- **Forgot Password**: Phone → OTP, button "submit", "পাসওয়ার্ড মনে পড়েছে? লগিন করুন"
- **Order Track**: Phone Number, Invoice ID (ঐচ্ছিক), button "submit"
- **Account / Order history**: behind login — layout not visible; built as a standard dashboard, to be matched later.

## 9. Contact page
"যোগাযোগ করুন", address, হটলাইন 01776363309, ইমেইল (Cloudflare-protected, not readable),
form: সম্পূর্ণ নাম*, মোবাইল নাম্বার*, ইমেইল*, বিষয়*, মেসেজ লিখুন*, button "মেসেজ পাঠান".

## 10. Unverified / unavailable items (not guessed)
1. **Colours, fonts, exact spacing** — CSS files could not be downloaded (the live site blocks our fetcher's
   style requests; logo SVG also failed). Theme lives in one file (`src/index.css` `@theme`) so exact values can be
   dropped in from a screenshot or the Laravel `public/css` folder.
2. Product **descriptions** — only P0194's was read; all others are `null` in mock data → loaded from API later.
3. **SKU / product code** for all products except P0194.
4. 4 Writing products and 11 Combo products: images unavailable (marked, placeholder shown).
5. Customer **e-mail address** (Cloudflare protected).
6. Policy pages: text was captured as a structured summary, not character-for-character; replace with DB content.
7. "Sold" counts — all showed 0.
8. Checkout page layout (blocked).
