# Fatiha Ayat Salah Chair — cPanel-এ আপলোড গাইড (ধাপে ধাপে)

এই প্যাকেজে ওয়েবসাইট **এবং** নিজস্ব ব্যাকএন্ড (PHP + MySQL) আছে। অর্ডার, স্টক, কাস্টমার, কুপন, অ্যাডমিন লগইন, SMS, কুরিয়ার — সব আপনার নিজের হোস্টিংয়ের ডাটাবেসে জমা হবে। আলাদা কোনো সার্ভার বা মাসিক সার্ভিস লাগবে না।

## আগে যা লাগবে
- cPanel হোস্টিং, **PHP 8.1 বা তার উপরে** (cPanel → *Select PHP Version* এ দেখুন; extension: `pdo_mysql`, `curl`, `mbstring` চালু থাকতে হবে — সাধারণত থাকেই)
- SMS-এর জন্য: Muthofun/Muthobarta অথবা BulkSMSBD এর API key
- কুরিয়ারের জন্য (ঐচ্ছিক): Steadfast API key ও Secret key

---

## ধাপ ১ — ডোমেইন যোগ করুন
ডোমেইন **fatihaayatsalahchair.com** কিনে নেমসার্ভার আপনার হোস্টিংয়ের (Hostnin) নেমসার্ভারে দিন।
একই cPanel-এ আরেকটা সাইট থাকলে cPanel → **Domains → Create A New Domain** → `fatihaayatsalahchair.com`, ডকুমেন্ট রুট যেমন `fatihaayatsalahchair.com/` (আলাদা ফোল্ডার)। নতুন cPanel হলে ফোল্ডার হবে `public_html`।
তারপর cPanel → **SSL/TLS Status → Run AutoSSL** দিয়ে https চালু করুন।

## ধাপ ২ — (ঐচ্ছিক) GitHub থেকে সরাসরি আপডেট
cPanel → Git™ Version Control দিয়ে `my-shop` রিপোজিটরি থেকে `fatiha-salah-chair/deploy/` ফোল্ডারের ফাইলগুলো ডোমেইনের ফোল্ডারে কপি করা যায়। শুরুতে নিচের zip আপলোড করাই সহজ।

## ধাপ ৩ — ডাটাবেস বানান
cPanel → **MySQL® Databases**
1. *Create New Database* → নাম দিন, যেমন `fatiha` (cPanel আগে ইউজারনেম বসিয়ে দেবে, যেমন `cpuser_fatiha`)
2. *MySQL Users → Add New User* → ইউজার ও শক্ত পাসওয়ার্ড দিন
3. *Add User To Database* → ইউজার ও ডাটাবেস সিলেক্ট → **ALL PRIVILEGES** → Make Changes
4. তিনটি জিনিস লিখে রাখুন: **ডাটাবেসের নাম, ইউজারের নাম, পাসওয়ার্ড**

## ধাপ ৪ — ফাইল আপলোড
1. File Manager → ধাপ ১-এর ফোল্ডার খুলুন
2. **Upload** → `fatiha-cpanel-upload.zip`
3. zip-এ রাইট-ক্লিক → **Extract** → (ফোল্ডারে সরাসরি, কোনো সাবফোল্ডার নয়)
4. File Manager-এর Settings → **Show Hidden Files (dotfiles)** চালু করে দেখে নিন `.htaccess` ফাইলটি আছে (এটি না থাকলে পেজ রিফ্রেশে 404 আসবে)

ফোল্ডারে এমন দেখা উচিত: `index.html`, `assets/`, `api/`, `.htaccess`, `favicon.png`, `robots.txt`

## ধাপ ৫ — ইনস্টল (এক মিনিট)
ব্রাউজারে খুলুন: `https://fatihaayatsalahchair.com/api/setup.php`
- ডাটাবেসের নাম / ইউজার / পাসওয়ার্ড (ধাপ ৩ এর)
- Site URL: `https://fatihaayatsalahchair.com` (শেষে `/` নয়)
- আপনার অ্যাডমিন ইমেইল ও পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) — **এটিই এখন থেকে আপনার অ্যাডমিন লগইন**

**ইনস্টল করুন** চাপলে টেবিল তৈরি হবে, ৯টি সালাহ চেয়ার ও ক্যাটাগরি ঢুকবে, আর `setup.php` নিজে মুছে যাবে।
(মুছে না গেলে File Manager থেকে `api/setup.php` ডিলিট করে দিন।)

## ধাপ ৬ — অ্যাডমিনে ঢুকে প্রথম কাজ
`https://fatihaayatsalahchair.com/admin` → আপনার ইমেইল/পাসওয়ার্ড।
1. **Settings** → হটলাইন, WhatsApp, ঠিকানা, bKash/Nagad নাম্বার, ডেলিভারি চার্জ দেখে ঠিক করে **Save changes**
2. **Products** → নতুন কালার যোগ করতে যেকোনো চেয়ারের পাশে **+ Color** চাপুন → কালারের নাম, কালার সোয়াচ, দাম ও ছবি দিয়ে Save। একই "Color group" থাকলে প্রোডাক্ট পেজে সব কালার পাশাপাশি দেখাবে।
3. পাসওয়ার্ড বদলাতে চাইলে একই পেজের **Admin password** বক্সে।

## ধাপ ৭ — SMS চালু করা
File Manager → `api/config.php` → **Edit**। `sms` অংশ:

```php
'sms' => [
  'provider' => 'muthofun',        // muthofun | bulksmsbd | template | off
  'api_key'  => 'এখানে আপনার API key',
  'sender_id' => '',                // গেটওয়ে দিলে বসান, না থাকলে খালি
  'url_template' => '',             // শুধু provider = template হলে
],
```
Save করুন। তারপর **Admin → SMS → Settings** এ "Send order SMS automatically" টিক দেওয়া আছে কিনা দেখুন এবং টেস্ট SMS পাঠান। সফল/ব্যর্থ — প্রতিটির কারণ **SMS log**-এ লেখা থাকে।
- কাস্টমার অর্ডার করলেই সার্ভার নিজে SMS পাঠায় (ট্র্যাকিং লিংকসহ)।
- অ্যাডমিন থেকে Confirm / Courier / Delivered করলে সংশ্লিষ্ট SMS যায়।

> API key কখনো ব্রাউজারে যায় না — শুধু `api/config.php`-তে থাকে (এই ফাইল বাইরে থেকে খোলা যায় না)।

## ধাপ ৮ — Steadfast কুরিয়ার (ঐচ্ছিক)
1. **Admin → Settings → Courier** → Steadfast API key ও Secret key বসান → Save
2. অর্ডার Confirm করে **Send to courier → Steadfast** দিলে সার্ভার Steadfast-এ পার্সেল বুক করে ট্র্যাকিং কোড নিয়ে আসবে (কোনো কোড হাতে লিখতে হবে না)।
3. Steadfast প্যানেলে Webhook দিলে ডেলিভারি স্ট্যাটাস নিজে নিজে আপডেট হবে: Callback URL = `https://আপনার-ডোমেইন/api/v1/webhook/steadfast`, Auth token = `api/config.php` এর `steadfast_webhook_token` এর মান।
4. Pathao / RedX এ এখনো API সংযোগ নেই — "Send to courier" চাপলে ট্র্যাকিং/কনসাইনমেন্ট আইডি হাতে লিখতে বলবে।

## ধাপ ৯ — Facebook Pixel / Google ট্যাগ
**Settings → Pixel & tracking** এ Pixel ID, Conversion API token, GTM/GA4 বসান। Purchase ইভেন্ট ব্রাউজার ও সার্ভার দুই দিক থেকেই (ডুপ্লিকেট ছাড়া) যাবে।

---

## ব্যাকআপ (নিয়মিত)
- **ডাটাবেস:** cPanel → *Backup* → MySQL database ডাউনলোড, বা phpMyAdmin → Export। (সপ্তাহে একবার)
- **ছবি:** `uploads/` ফোল্ডার (File Manager → Compress → Download)
- cPanel-এর স্বয়ংক্রিয় ব্যাকআপ থাকলে সেটিও চালু রাখুন।

## সমস্যা হলে
| সমস্যা | কী করবেন |
|---|---|
| পেজ রিফ্রেশ করলে 404 | `.htaccess` ফাইলটি `index.html`-এর পাশে আছে কিনা দেখুন (Show hidden files) |
| অ্যাডমিনে লগইন হয় না / "Not found" | `api/.htaccess` আছে কিনা দেখুন; `https://ডোমেইন/api/v1/health` খুললে `{"ok":true…}` দেখা যাওয়া উচিত |
| ইনস্টলে "Access denied" | ডাটাবেস ইউজারকে ডাটাবেসে **ALL PRIVILEGES** দিয়েছেন কিনা দেখুন (ধাপ ৩.৩) |
| ছবি আপলোড হয় না | File Manager-এ `uploads` ফোল্ডারের permission **755** করুন |
| SMS যায় না | Admin → SMS → log এর "info" কলাম দেখুন; `api/config.php`-এ provider ও key ঠিক আছে কিনা |
| 500 error | cPanel → *Errors* বা `api/error_log` ফাইলে কারণ লেখা থাকে |
| PHP version পুরনো | cPanel → Select PHP Version → 8.1 বা তার উপরে |

## নিরাপত্তা — যা করা আছে
- অ্যাডমিন লগইন সার্ভারে যাচাই হয়, পাসওয়ার্ড hash করা; ৮ বার ভুল করলে ১৫ মিনিট ব্লক।
- অর্ডারের দাম, ডেলিভারি চার্জ, কুপন, স্টক — সব সার্ভার নিজে হিসাব করে; ব্রাউজার থেকে বদলানো দাম গ্রাহ্য হয় না। স্টকের বেশি অর্ডার একসাথে এলেও ওভারসেল হয় না।
- SMS/কুরিয়ার/AI key ব্রাউজারে যায় না। কুপন কোডের তালিকা সবার কাছে খোলা নেই।
- ছবি আপলোডে শুধু আসল ছবি (JPG/PNG/WebP/GIF) নেয়; `uploads` ফোল্ডারে কোনো স্ক্রিপ্ট চলে না।
- অর্ডার/ট্র্যাকিং/লগইনে রেট-লিমিট আছে (স্প্যাম ও জোর করে অনুমান ঠেকাতে)।
