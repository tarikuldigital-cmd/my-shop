# Bookshelf — ফিচার রোডম্যাপ ও সাজেশন

ডিজাইন লাইভ সাইটের মতোই রাখা হয়েছে; নিচের ফিচারগুলো তার উপর যোগ করা।

## ✅ এই আপডেটে যা যোগ হয়েছে

### অ্যাডমিন প্যানেল (`/admin`, Smart China Gallery-র ধাঁচে)
- **Dashboard:** অর্ডার, সেল, ডেলিভারি/ক্যানসেল/রিটার্ন রেট, ৩০ দিনের গ্রাফ, বেস্ট-সেলিং বই, ক্যাটাগরি ও সোর্সভিত্তিক সেল, কুরিয়ার সাকসেস রেট, SLA সতর্কতা (৬ ঘণ্টার বেশি pending ইত্যাদি), স্মার্ট ইনসাইট
- **Order management:** স্ট্যাটাস ট্যাব (Pending → Confirmed → Hold → Ready → Transit → Delivered / Cancelled / Returned), তারিখ-কুরিয়ার-সার্চ ফিল্টার, bulk action (স্ট্যাটাস, কুরিয়ারে পাঠানো, ইনভয়েস প্রিন্ট, CSV), অর্ডার ড্রয়ার (টাইমলাইন, নোট, ক্যানসেল/রিটার্ন কারণ, WhatsApp কনফার্মেশন মেসেজ, bKash TrxID যাচাই), risk flag, **BD Courier fraud check**, ফোন/ফেসবুক অর্ডার হাতে এন্ট্রি
- **Incomplete orders:** চেকআউটে সঠিক মোবাইল নাম্বার দিয়ে চলে গেলে অটো সেভ; কল/WhatsApp, Mark contacted, Drop, এক ক্লিকে অর্ডার তৈরি; একই নাম্বারে অর্ডার এলে অটো "Converted"; recovery rate
- **Books/Products:** লেখক, প্রকাশনী, ISBN, পৃষ্ঠা, সংস্করণ, ভাষা, কভার, স্টক, "একটু পড়ে দেখুন" পেজ, কম্বো-প্যাকেজের বইয়ের তালিকা, বইভিত্তিক SEO; কোন তথ্য বাকি আছে সেটা দেখায়
- **Categories, Homepage (ব্যানার, Flash Sale + countdown, Hot Deal, সেকশন অন/অফ), Coupons, Reviews approval, Customers (repeat buyer, lifetime value), Messages, Info pages**
- **Settings:** দোকানের তথ্য, ডেলিভারি চার্জ, ফ্রি ডেলিভারি লিমিট, bKash/Nagad, **Meta Pixel + Conversions API token + domain verification, Google Tag Manager, GA4, Google Ads conversion, TikTok Pixel, custom head/body code**, **SEO (title, description, keywords, share image, Google preview, sitemap.xml ও robots.txt)**, Steadfast key, স্টাফ, ব্যাকআপ/রিস্টোর

### ওয়েবসাইট (কাস্টমার যা দেখবে)
- হেডারে **instant search** (বইয়ের ছবি, লেখক, দামসহ), লেখক দিয়েও খোঁজা যায়
- হোমে **trust strip** (ডেলিভারি, COD, অরিজিনাল বই, পরিবর্তন), **Flash Sale countdown**, **সম্প্রতি দেখেছেন**
- বইয়ের পেজে: লেখক লিংক, **স্টক স্ট্যাটাস** ("মাত্র ৩টি বাকি"), **বইয়ের তথ্য ট্যাব**, **একটু পড়ে দেখুন** প্রিভিউ, কম্বোর ভেতরের বইয়ের চেকলিস্ট, **রিভিউ দেওয়া** (অ্যাডমিন অনুমোদনের পর প্রকাশ), Facebook/WhatsApp শেয়ার, WhatsApp-এ সরাসরি অর্ডার, মোবাইলে **sticky "অর্ডার করুন" বার**
- চেকআউটে: **কুপন**, **bKash/Nagad (TrxID)**, **ফ্রি ডেলিভারির প্রোগ্রেস বার**, ডেলিভারির সময়
- সব পেজে আলাদা title/description, বইয়ের জন্য **Book + Product structured data** (Google-এ দাম ও স্টক দেখাতে)
- Pixel/GTM/GA4/TikTok ইভেন্ট: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase (event_id সহ), Search

## 🔜 পরের ধাপে সাজেশন (গুরুত্ব অনুযায়ী)

### ১. বিক্রি বাড়াতে সবচেয়ে কাজের
1. **Laravel backend যুক্ত করা** — এখন সব ডেটা ব্রাউজারে থাকে; লাইভ অর্ডার, অ্যাডমিন সেটিং সবার জন্য কাজ করতে এটা লাগবেই (`BACKEND_API_SPEC.md`)
2. **Meta Conversions API (server-side)** — iOS আর ad-blocker-এর কারণে হারানো Purchase ইভেন্ট ফিরে আসে, অ্যাডের খরচ কমে
3. **Steadfast API + webhook** — এক ক্লিকে পার্সেল বুকিং, ডেলিভারি স্ট্যাটাস অটো আপডেট
4. **SMS নোটিফিকেশন** — অর্ডার কনফার্ম, কুরিয়ারে পাঠানো, ডেলিভারির দিন; incomplete order-এ অটো রিমাইন্ডার SMS
5. **"এই বইয়ের সাথে কিনুন" (frequently bought together)** — যেমন Cambridge 19-এর সাথে Answers Developer; গড় অর্ডারের মূল্য বাড়ে
6. **নিজের কম্বো বানান** — ৩টা বই নিলে ১০% ছাড়, ৫টায় ফ্রি ডেলিভারি (quantity/bundle discount)

### ২. বইয়ের দোকানের জন্য বিশেষ
- **লেখক ও প্রকাশনী পেজ** (`/author/kiran-makkar`) — SEO-তে খুব ভালো কাজ করে
- **প্রি-অর্ডার** — নতুন Cambridge/Makkar এডিশন আসার আগে অর্ডার নেওয়া
- **"স্টকে এলে জানান"** — স্টক শেষ বইয়ে ফোন নাম্বার রেখে SMS
- **লেভেল/ব্যান্ড অনুযায়ী ফিল্টার** — Beginner / Band 6.5 / Band 7+; Academic vs General
- **IELTS স্টাডি প্ল্যান কুইজ** — ৪টা প্রশ্নের উত্তর দিলে কোন কম্বো লাগবে সাজেস্ট করে (লিড + সেল)
- **ব্লগ/রিসোর্স** — "Cambridge 1-19 কোনটা আগে পড়বেন", "Computer-based IELTS টিপস" — গুগল থেকে ফ্রি ট্রাফিক
- **উইশলিস্ট** ও **রিভিউতে ছবি**

### ৩. ভিজ্যুয়াল উন্নতি (একই স্টাইল রেখে)
- লাইভ সাইটের আসল রং/ফন্ট বসানো (CSS বা screenshot পেলে `src/index.css` এ এক জায়গায়)
- বইয়ের ছবি WebP + ছোট সাইজে (দ্রুত লোড), একই মাপের কভার
- কম্বো কার্ডে "১৭টি বই" ব্যাজ, বেস্টসেলার/নতুন এডিশন রিবন
- হোমে কাস্টমার রিভিউ স্লাইডার (শুধু একটা ব্যানারের বদলে আসল রিভিউ), ডেলিভারি পার্টনার লোগো
- মোবাইলে নিচে বটম নেভিগেশন (Home, Categories, Search, Cart, Account)

### ৪. টেকনিক্যাল
- Laravel থেকে server-side meta tag (Facebook শেয়ার প্রিভিউ ঠিকমতো দেখাতে)
- Image CDN/caching, PWA (হোম স্ক্রিনে অ্যাপের মতো)
- স্টাফ রোল: Moderator শুধু অর্ডার দেখবে, সেটিং/কী দেখবে না
