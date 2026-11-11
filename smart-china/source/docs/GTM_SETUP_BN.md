# Smart China Gallery — Pixel / GTM ট্র্যাকিং সেটআপ (Bookshelf-এর মতোই)

ওয়েবসাইট **নিজে Meta-তে কিছু পাঠায় না।** সব ইভেন্ট `dataLayer`-এ যায়, আর Google Tag Manager (GTM) থেকে আপনি Meta Pixel, Conversions API (server container), GA4, Google Ads চালাবেন — ঠিক bookshelf.com.bd যেভাবে চলছে।

## আপনাকে যা বসাতে হবে
1. Admin → **Settings → Tracking & SEO → Google Tag Manager container ID**: `GTM-XXXXXXX` → Save
2. (ঐচ্ছিক) Meta domain verification code, Search Console verification code — একই পেজে
3. GTM-এর ভেতরে: Meta Pixel ID, CAPI / server container, GA4 Measurement ID, Google Ads — সব GTM-এ (সাইটের কোডে নয়)
> GTM দেওয়া থাকলে সাইট GA4 / Google Ads আলাদা করে লোড করে না (ডাবল কাউন্ট হবে না)।

## dataLayer ইভেন্ট
| কখন | `event` | `meta_event` (Meta ইভেন্ট নাম) |
|---|---|---|
| প্রতিটি পেজ | `page_view` | PageView |
| প্রোডাক্ট পেজ খুললে | `view_item` | ViewContent |
| কার্টে যোগ / Order now | `add_to_cart` | AddToCart |
| চেকআউট খুললে | `begin_checkout` | InitiateCheckout |
| অর্ডার কনফার্ম | `purchase` | Purchase |
| সার্চ | `search` | Search |
| ল্যান্ডিং পেজে অর্ডার বাটন | `generate_lead` | Lead |

## প্রতিটি ইভেন্টে যা থাকে (Data Layer Variable নাম)
- `event_id` — Pixel আর CAPI ডিডুপ্লিকেশনের জন্য (দুই ট্যাগেই Event ID = এটা)
- `value`, `currency` (BDT), `content_ids` (প্রোডাক্ট ID লিস্ট), `content_type` (product), `contents` ([{id, quantity, item_price}]), `content_name`, `num_items`
- `order_id` — শুধু purchase-এ (ইনভয়েস, যেমন SC100123)
- `search_string` — শুধু search-এ
- GA4 ফরম্যাট: `ecommerce.value`, `ecommerce.currency`, `ecommerce.transaction_id`, `ecommerce.items[]` → `item_id`, `item_name`, `item_variant` (কালার/সাইজ/মডেল), `item_sku`, `item_category` (ক্যাটাগরির নাম), `price`, `quantity`

## Purchase-এ কাস্টমারের তথ্য (Advanced Matching / Enhanced Conversions)
কাঁচা (raw) ভ্যালু যায় — GTM ট্যাগ নিজে SHA-256 হ্যাশ করবে:
- `user_data.phone_number` (+8801XXXXXXXXX), `user_data.email`, `user_data.address.first_name / last_name / street / city / country`
- একই তথ্য ফ্ল্যাট নামেও: `phone_number`, `first_name`, `last_name`, `street`, `city`, `country` (BD), `user_phone`, `user_first_name`, `user_last_name`, `user_address`, `user_city`, `user_country`

## GTM-এ ট্রিগার
Trigger type **Custom Event** → Event name: `purchase` (বা `view_item`, `add_to_cart`, `begin_checkout`, `page_view`)।
Bookshelf-এর GTM container থেকে Export → এখানে Import করলেই প্রায় সব ট্যাগ/ভ্যারিয়েবল একই নামে কাজ করবে; শুধু Pixel ID / GA4 ID বদলে নিন।

## TikTok
TikTok Pixel ID Admin → Tracking-এ দিলে সাইট সরাসরি ViewContent, AddToCart, InitiateCheckout, CompletePayment পাঠায় (event_id সহ)। চাইলে খালি রেখে GTM থেকেও চালাতে পারেন।
