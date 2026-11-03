# Bookshelf SMS server (অর্ডার SMS)

কাস্টমার অর্ডার করলে, অর্ডার কনফার্ম/কুরিয়ারে পাঠানো/ডেলিভারি হলে কাস্টমারের মোবাইলে SMS যায় — সাথে তার নিজের **অর্ডার ট্র্যাকিং লিংক** (`/t/BS100101-K7Q2`)।
SMS গেটওয়ে **Bachelor Home প্রজেক্টের মতোই** (Muthofun/Muthobarta ডিফল্ট, BulkSMSBD, বা যেকোনো HTTP গেটওয়ে) — একই অ্যাকাউন্ট ও key ব্যবহার করা যায়।

API key ওয়েবসাইটে (ব্রাউজারে) কখনো রাখা যায় না, তাই এই ছোট server টা key নিজের কাছে রাখে। দুটো ভার্সন আছে — হোস্টিং অনুযায়ী যেকোনো একটা।

## ক) Node.js (Bachelor Home যেভাবে চলে)
```bash
cd server
cp .env.example .env      # SMS_API_KEY, SMS_SENDER_ID, ADMIN_SECRET, SITE_URL বসান
npm start                 # = node --env-file=.env sms-relay.mjs   (Node 20.6+, কোনো প্যাকেজ লাগে না)
```
cPanel → **Setup Node.js App** দিয়ে `sms-relay.mjs` চালান, একটা সাবডোমেইন দিন (যেমন `sms.bookshelf.com.bd`)।

## খ) PHP (শেয়ার্ড হোস্টিং)
`sms-relay.php` কে `public_html/sms/index.php` নামে আপলোড করুন, পাশে `sms-config.php`:
```php
<?php return ['SMS_PROVIDER'=>'muthofun','SMS_API_KEY'=>'Token ...','SMS_SENDER_ID'=>'','ADMIN_SECRET'=>'long-random-text','ALLOWED_ORIGIN'=>'https://bookshelf.com.bd','SITE_URL'=>'https://bookshelf.com.bd'];
```
একই ফোল্ডারে `.htaccess`:
```
RewriteEngine On
RewriteRule ^sms/(order-placed|send|health)$ index.php?route=$1 [L,QSA]
```
তাহলে SMS server URL হবে `https://yourdomain.com/sms`।

## অ্যাডমিনে সংযোগ
Admin → **SMS → Settings & messages**:
1. **SMS server URL**: যেমন `https://sms.bookshelf.com.bd`
2. **Admin secret**: `.env` এর `ADMIN_SECRET` এর মতোই
3. **Send test** দিয়ে নিজের নাম্বারে টেস্ট করুন
4. প্রতিটি ধাপের মেসেজ বাংলায় এডিট করা যায় — বাংলা SMS এ ৭০ অক্ষর = ১টি SMS, তাই কাউন্টার দেখে ছোট রাখুন

## নিরাপত্তা
- `/sms/order-placed` (কাস্টমারের ব্রাউজার থেকে): শুধু `BS…` ইনভয়েসসহ অর্ডার মেসেজ, প্রতি অর্ডারে একবার, প্রতি নাম্বারে ঘণ্টায় ৩টি ও প্রতি IP তে ১০টি।
- `/sms/send` (অ্যাডমিন): `X-Admin-Secret` ছাড়া কাজ করে না।
- Laravel backend চালু হলে অর্ডার সার্ভারেই তৈরি হবে, তখন SMS সরাসরি Laravel থেকে যাবে আর এই relay আর লাগবে না।
