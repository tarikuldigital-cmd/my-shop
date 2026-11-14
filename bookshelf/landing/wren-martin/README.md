# Wren & Martin landing page (Bookshelf)

Single-file landing page for the "Wren martin Sales" Facebook ads.
Orders go straight into the Bookshelf admin (source = "Landing page"), half-filled forms show under Incomplete, and SMS goes out like normal website orders.
Tracking: GTM-5DKVPQMP only (view_item → begin_checkout → purchase, same data-layer shape as the main site). No pixel ID in the code.

## Deploy (cPanel / Hostnin)
1. File Manager → `public_html` → create folder `wren-martin`
2. Upload `index.html` into it (or upload `wren-martin-cpanel.zip` into `public_html` and Extract)
3. Open https://bookshelf.com.bd/wren-martin/ → use this URL in the ad

Optional: in Admin → Landing pages create one with slug `wren-martin` to see views/orders counts.

## Change prices / products
Edit the `PACKS` and `SHIP` block at the bottom of `index.html` (product IDs 1789803697 and 1789754698). The server always charges the admin price, so update the text on the page too if the price changes.
