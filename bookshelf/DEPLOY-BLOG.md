# IELTS Blog deploy (cPanel)

1. cPanel → Git™ Version Control → my-shop → Manage → Pull or Deploy → **Update from Remote** → **Deploy HEAD Commit**.
2. Check: `/blog`, `/ielts-guide`, `/blog/ielts-3-month-study-plan`, `/api/v1/sitemap`.
3. Admin → Catalogue → **IELTS Blog** to add/edit posts (Bangla + English, cover upload, book picker).
4. Google Search Console → Sitemaps → submit `https://bookshelf.com.bd/api/v1/sitemap`.

Notes: the deploy package does NOT contain `api/config.php` or `api/setup.php` (server copies stay). 17 starter posts load automatically from `api/seed/posts.json` on the first visit to /blog.

## Update: magazine layout, covers and auto news
- Upload/deploy the new `blog-img/` folder (cover images) together with `index.html`, `assets/`, `api/lib/blog.php` and `api/seed/posts.json` (the deploy folder has all of them).
- News: the server fetches RSS headlines about every 6 hours (default: ICEF Monitor, The PIE News). Manage sources and use "Fetch news now" in Admin > IELTS Blog. Needs outbound HTTP on the host.
- Existing posts are not overwritten; new seed articles are added once.
