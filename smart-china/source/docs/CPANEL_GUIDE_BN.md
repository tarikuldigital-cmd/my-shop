# Smart China Gallery — cPanel-এ লাইভ করার গাইড

এই প্যাকেজে ওয়েবসাইট (স্টোরফ্রন্ট + অ্যাডমিন) **এবং** নিজস্ব ব্যাকএন্ড (PHP + MySQL) আছে — Bookshelf যেভাবে চলছে ঠিক সেভাবে।

## আগে যা লাগবে
- cPanel হোস্টিং (Hostnin), **PHP 8.1+** (extension: `pdo_mysql`, `curl`, `mbstring`)
- Steadfast-এর API Key ও Secret Key (Steadfast প্যানেল → API)
- SMS-এর জন্য Muthofun/Muthobarta বা BulkSMSBD API key (Bookshelf-এর মতোই)

## ধাপ ১ — ডাটাবেস
cPanel → **MySQL® Databases** → নতুন ডাটাবেস (যেমন `smartchina`) → নতুন ইউজার + শক্ত পাসওয়ার্ড → *Add User To Database* → **ALL PRIVILEGES**। নাম/ইউজার/পাসওয়ার্ড লিখে রাখুন।

## ধাপ ২ — ফাইল আপলোড
File Manager → ডোমেইনের ফোল্ডার (মূল ডোমেইন হলে `public_html`) → **Upload** `smart-china-cpanel-upload.zip` → **Extract**।
Settings → *Show Hidden Files* চালু করে দেখুন `.htaccess` আছে।

## ধাপ ৩ — ইনস্টল
ব্রাউজারে খুলুন `https://আপনার-ডোমেইন/api/setup.php` → ডাটাবেসের তথ্য, Site URL (শেষে / নয়), অ্যাডমিন ইমেইল ও পাসওয়ার্ড (৮+ অক্ষর) → **Install**।
৪৬টি প্রোডাক্ট (ভ্যারিয়েন্টসহ), ১২টি ক্যাটাগরি ঢুকে যাবে; setup.php নিজে মুছে যাবে। স্ক্রিনে **Steadfast webhook URL ও token** দেখাবে — লিখে রাখুন।

## ধাপ ৪ — অ্যাডমিনে প্রথম কাজ (`/admin`)
1. **Settings** → হটলাইন, ঠিকানা, ডেলিভারি চার্জ, bKash/Nagad → Save
2. **Settings → Courier** → Steadfast API Key ও Secret Key → Save
3. **Settings → Staff & backup → "Copy all images now"** — নমুনা ছবিগুলো আপনার সার্ভারে কপি হবে (পরে নিজের ছবি দিন)
4. **Products** → দাম/স্টক/ছবি ঠিক করুন; Colour/Size/Model অপশন দিলে প্রতিটির আলাদা দাম ও স্টক

## ধাপ ৫ — Steadfast webhook (রাইডার নোট লাইভ দেখার জন্য)
Steadfast প্যানেল → API → Webhook:
- URL: `https://আপনার-ডোমেইন/api/v1/webhook/steadfast`
- Auth token: ধাপ ৩-এর token (না থাকলে `api/config.php` এ `steadfast_webhook_token`)
Webhook ছাড়াও চলবে: কাস্টমার ট্র্যাকিং লিংক খুললে বা অ্যাডমিনে **↻ Courier status** চাপলে সার্ভার Steadfast থেকে সর্বশেষ স্ট্যাটাস ও নোট নিয়ে আসে।

## ধাপ ৬ — SMS
File Manager → `api/config.php` → Edit → `sms` অংশে `provider` (muthofun / bulksmsbd) ও `api_key`, `sender_id`। Bookshelf-এর config থেকে একই মান কপি করতে পারেন।

## অর্ডার → কুরিয়ার → ট্র্যাকিং কীভাবে কাজ করে
1. অর্ডার এলে **Orders** এ খুলুন → **Confirm**
2. **📋 Copy for courier** — নাম, ফোন, ঠিকানা, COD, আইটেম একসাথে কপি (আলাদা আলাদা Copy বাটনও আছে)
3. **Send to courier → Steadfast** → এক ক্লিকে Steadfast-এ COD সহ এন্ট্রি, ট্র্যাকিং কোড সেভ, কাস্টমারকে SMS
4. Steadfast-এর প্রতিটি আপডেট (পিকআপ, হাব, রাইডারের নোট, ডেলিভারি) অর্ডারের **Courier tracking** অংশে ও কাস্টমারের ট্র্যাকিং পেজে (`/t/...`) দেখা যায়; Delivered হলে অর্ডার নিজে থেকেই Delivered + Paid হয়
5. Pathao / RedX: তাদের প্যানেলে বুক করে consignment ID পেস্ট করুন

## নিরাপত্তা
- `api/config.php` কখনো GitHub-এ দেবেন না।
- নিয়মিত ব্যাকআপ: cPanel → Backup বা phpMyAdmin → Export।
