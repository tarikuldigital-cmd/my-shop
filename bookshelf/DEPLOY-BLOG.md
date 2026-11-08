# IELTS Blog deploy (cPanel)

1. cPanel → Git™ Version Control → my-shop → Manage → Pull or Deploy → **Update from Remote** → **Deploy HEAD Commit**.
2. Check: `/blog`, `/ielts-guide`, `/blog/ielts-3-month-study-plan`, `/api/v1/sitemap`.
3. Admin → Catalogue → **IELTS Blog** to add/edit posts (Bangla + English, cover upload, book picker).
4. Google Search Console → Sitemaps → submit `https://bookshelf.com.bd/api/v1/sitemap`.

Notes: the deploy package does NOT contain `api/config.php` or `api/setup.php` (server copies stay). 17 starter posts load automatically from `api/seed/posts.json` on the first visit to /blog.
