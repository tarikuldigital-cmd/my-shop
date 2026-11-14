<?php
/* sitemap.xml — GET /api/v1/sitemap (home, categories, products, info pages). */
declare(strict_types=1);

function site_base(): string { return rtrim((string)cfg('site_url', ''), '/') ?: ((isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost')); }
function xe(string $s): string { return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); }

function h_sitemap(): void {
  $base = site_base();
  $u = [[$base . '/', 'daily', '1.0']];
  foreach (doc_all('categories') as $c) if (!empty($c['slug'])) $u[] = [$base . '/category/' . rawurlencode($c['slug']), 'weekly', '0.8'];
  foreach (doc_all('products') as $p) if (($p['active'] ?? true) !== false && !empty($p['slug'])) $u[] = [$base . '/product/' . rawurlencode($p['slug']), 'weekly', '0.9'];
  foreach (array_keys((array)kv_get('pages', [])) as $slug) $u[] = [$base . '/page/' . rawurlencode((string)$slug), 'monthly', '0.4'];
  $u[] = [$base . '/site/contact-us', 'monthly', '0.4'];
  header('Content-Type: application/xml; charset=utf-8');
  header('Cache-Control: public, max-age=600');
  echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
  foreach ($u as [$loc, $freq, $prio]) echo '<url><loc>' . xe($loc) . "</loc><changefreq>$freq</changefreq><priority>$prio</priority></url>\n";
  echo '</urlset>';
  exit;
}
