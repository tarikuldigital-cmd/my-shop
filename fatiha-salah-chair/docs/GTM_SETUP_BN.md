# Fatiha Ayat Salah Chair — Pixel / GTM ট্র্যাকিং (bookshelf.com.bd-এর হুবহু একই)

এই সাইটের ট্র্যাকিং কোড Bookshelf-এর সাথে **লাইন-বাই-লাইন একই** (`src/lib/tracking.js` একই ফাইল)। ওয়েবসাইট নিজে Meta-তে কিছু পাঠায় না — সব ইভেন্ট `dataLayer`-এ যায়, আর Google Tag Manager থেকে আপনি Meta Pixel, Conversions API (server container), GA4, Google Ads চালাবেন।

## আপনাকে যা বসাতে হবে
1. Admin → **Settings → Pixel & tracking → Google Tag Manager container ID**: `GTM-XXXXXXX` → **Save changes**
2. (ঐচ্ছিক) একই পেজে Meta domain verification ও Search Console verification code
3. বাকি সব — Meta Pixel ID, CAPI/server container, GA4, Google Ads — GTM-এর ভেতরে (সাইটের কোডে বা Settings-এ নয়)
> GTM দেওয়া থাকলে সাইট GA4 / Google Ads আলাদা করে লোড করে না, তাই ডাবল কাউন্ট হয় না। Meta Pixel ও CAPI token-এর ঘর থাকলেও সাইট সেগুলো ব্যবহার করে না।

**সবচেয়ে সহজ:** Bookshelf-এর GTM container থেকে Admin → Export Container → নতুন container-এ Import → শুধু Pixel ID / GA4 ID / server container URL বদলে নিন। ইভেন্ট ও ভ্যারিয়েবলের নাম একই, তাই সব ট্যাগ-ট্রিগার হুবহু কাজ করবে।

## dataLayer ইভেন্ট (Custom Event ট্রিগারের নাম)
| কখন | `event` | Meta ইভেন্ট |
|---|---|---|
| প্রতিটি পেজ (ক্যাটাগরি/ক্যাম্পেইন পেজসহ) | `page_view` (`page_path`, `page_title`) | PageView |
| প্রোডাক্ট পেজ খুললে | `view_item` | ViewContent |
| "অর্ডার করুন" / কার্টে যোগ | `add_to_cart` | AddToCart |
| চেকআউট পেজ খুললে | `begin_checkout` | InitiateCheckout |
| অর্ডার কনফার্ম | `purchase` | Purchase |
| সার্চ | `search` (`search_term`) | Search |
| ল্যান্ডিং পেজে অর্ডার ফর্ম | `generate_lead` | Lead |

## প্রতিটি ইভেন্টে যা থাকে
- `event_id` — Pixel আর CAPI ডিডুপ্লিকেশনের জন্য (দুই ট্যাগেই Event ID = `{{DLV - event_id}}`)
- `ecommerce.currency` = `BDT`, `ecommerce.value`, `ecommerce.items[]` → `item_id` (প্রোডাক্ট ID), `item_name`, `price`, `quantity`, `item_category`
- `ecommerce.transaction_id` — শুধু purchase-এ (ইনভয়েস নম্বর, যেমন `FA100101`)
- purchase-এর `value` = সর্বমোট (পণ্য + ডেলিভারি চার্জ − কুপন), Bookshelf-এর মতোই

## Purchase-এ কাস্টমারের তথ্য (Advanced Matching / Enhanced Conversions)
কাঁচা (raw) ভ্যালু যায় — GTM ট্যাগ নিজে SHA-256 হ্যাশ করবে:
- `user_data.phone_number` (+8801XXXXXXXXX), `user_data.email`, `user_data.address.first_name / last_name / street / city / country`
- ফ্ল্যাট নামেও: `phone_number`, `first_name`, `last_name`, `email`, `street`, `address`, `city` (ঢাকার ভিতরে হলে Dhaka), `country` (BD), এবং `user_phone`, `user_first_name`, `user_last_name`, `user_email`, `user_address`, `user_city`, `user_country`

## যাচাই
GTM-এর **Preview** মোডে সাইট খুলে একটা টেস্ট অর্ডার দিন — উপরের ইভেন্টগুলো ক্রমানুসারে আসবে। Meta Events Manager → Test Events-এ Browser ও Server দুটোতে একই event_id দেখলে ডিডুপ্লিকেশন ঠিক আছে। টেস্ট অর্ডারটি পরে অ্যাডমিন থেকে Cancel করে দিন।

## TikTok
TikTok Pixel ID Settings-এ দিলে সাইট সরাসরি ViewContent, AddToCart, InitiateCheckout, CompletePayment পাঠায় (event_id সহ)। খালি রেখে GTM থেকেও চালাতে পারেন।
