<?php
/*
 * Blog / IELTS guide.
 * Posts live in the `docs` table (coll = 'posts') but are deliberately NOT part of KEYS, so the admin sync payload and
 * the storefront bootstrap stay small. Public: GET posts, GET posts/{slug}, GET sitemap (sitemap.xml),
 * GET blogpage/{path} (HTML shell with title/meta/JSON-LD + article text for Google & Facebook; React takes over in the browser).
 * Admin: GET/POST admin/posts, DELETE admin/posts/{id}.
 */

const BLOG_CATS = [
  'guide' => ['bn' => 'IELTS গাইডলাইন (A–Z)', 'en' => 'IELTS Guide A–Z'],
  'exam' => ['bn' => 'পরীক্ষার তথ্য', 'en' => 'Exam Info'],
  'study' => ['bn' => 'পড়াশোনার সাজেশন', 'en' => 'Study Tips'],
  'books' => ['bn' => 'আমাদের বই গাইড', 'en' => 'Our Books Guide'],
  'scholarship' => ['bn' => 'স্কলারশিপ', 'en' => 'Scholarships'],
  'university' => ['bn' => 'বিশ্ববিদ্যালয় ও আবেদন', 'en' => 'University & Admission'],
  'country' => ['bn' => 'দেশভিত্তিক আপডেট', 'en' => 'Country Updates'],
  'abroad' => ['bn' => 'ভিসা ও বিদেশযাত্রা', 'en' => 'Visa & Going Abroad'],
];

function blog_routes(): array {
  return [
    ['GET', 'posts', 'h_posts'],
    ['GET', 'posts/([a-zA-Z0-9._%-]{1,200})', 'h_post'],
    ['GET', 'sitemap', 'h_sitemap'],
    ['GET', 'blogpage(?:/(.*))?', 'h_blog_page'],
    ['GET', 'admin/posts', 'h_admin_posts'],
    ['POST', 'admin/posts', 'h_admin_post_save'],
    ['DELETE', 'admin/posts/([a-zA-Z0-9_-]{1,60})', 'h_admin_post_delete'],
  ];
}

/* ---------------- storage ---------------- */
function post_put(array $p): void {
  q('REPLACE INTO docs (coll, id, k, k2, k3, seq, updated, data) VALUES (?,?,?,?,?,?,?,?)', ['posts', (string)$p['id'], (string)$p['slug'], null, null, 0, now_ms(), jenc($p)]);
}
/** Adds the starter articles (api/seed/posts.json). Re-runs only when the seed "version" goes up; never overwrites edited posts or brings back deleted ones. */
function blog_seed_once(): void {
  static $done = false;
  if ($done) return;
  $done = true;
  try {
    $f = dirname(__DIR__) . '/seed/posts.json';
    if (!is_file($f)) return;
    $seed = json_decode((string)file_get_contents($f), true);
    if (!is_array($seed) || empty($seed['posts'])) return;
    $ver = (int)($seed['version'] ?? 1);
    if ((int)kv_get('postsSeedVer', 0) >= $ver) return;
    $deleted = (array)kv_get('postsDeleted', []);
    foreach ($seed['posts'] as $p) {
      if (empty($p['id']) || empty($p['slug']) || in_array($p['id'], $deleted, true)) continue;
      if (doc_get('posts', (string)$p['id'])) continue;
      $p['at'] = $p['at'] ?? now_ms(); $p['updated'] = now_ms();
      post_put($p);
    }
    kv_set('postsSeedVer', $ver);
  } catch (Throwable $e) { error_log('blog_seed_once: ' . $e->getMessage()); }
}
function posts_all(): array {
  blog_seed_once();
  $rows = q('SELECT data FROM docs WHERE coll = ?', ['posts'])->fetchAll();
  $list = array_values(array_filter(array_map(fn($r) => jdec($r['data']), $rows)));
  usort($list, fn($a, $b) => ($b['at'] ?? 0) <=> ($a['at'] ?? 0));
  return $list;
}
function post_live(array $p): bool { return ($p['published'] ?? true) !== false && (int)($p['at'] ?? 0) <= now_ms() + 60000; }
function post_summary(array $p): array { unset($p['body']); return $p; }
function post_text(array $p, string $f, string $lang): string {
  $v = $p[$f] ?? '';
  if (!is_array($v)) return (string)$v;
  return trim((string)($v[$lang] ?? '')) !== '' ? (string)$v[$lang] : (string)($v['bn'] ?? $v['en'] ?? '');
}

/* ---------------- public API ---------------- */
function h_posts(): void {
  $cat = (string)($_GET['cat'] ?? ''); $term = mb_strtolower(trim((string)($_GET['q'] ?? '')));
  $list = array_values(array_filter(posts_all(), function ($p) use ($cat, $term) {
    if (!post_live($p)) return false;
    if ($cat !== '' && ($p['cat'] ?? '') !== $cat) return false;
    if ($term !== '') {
      $hay = mb_strtolower(jenc([$p['title'] ?? '', $p['excerpt'] ?? '', $p['tags'] ?? []]));
      if (!str_contains($hay, $term)) return false;
    }
    return true;
  }));
  header('Cache-Control: public, max-age=60');
  out(['posts' => array_map('post_summary', array_slice($list, 0, 200)), 'total' => count($list)]);
}
function h_post(string $slug): void {
  $slug = urldecode($slug);
  blog_seed_once();
  $p = doc_by('posts', 'k', $slug);
  $admin = auth_user('admin') !== null;
  if (!$p || (!$admin && !post_live($p))) fail(404, 'Not found');
  $rel = array_values(array_filter(posts_all(), fn($x) => post_live($x) && $x['id'] !== $p['id'] && ($x['cat'] ?? '') === ($p['cat'] ?? '')));
  header('Cache-Control: public, max-age=60');
  out(['post' => $p, 'related' => array_map('post_summary', array_slice($rel, 0, 3))]);
}

/* ---------------- admin API ---------------- */
function h_admin_posts(): void { require_admin(); out(['posts' => posts_all()]); }
function blog_slugify(string $s): string {
  $s = strtolower(trim($s));
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim((string)$s, '-');
}
function h_admin_post_save(): void {
  require_admin();
  $b = body();
  $title = ['bn' => trim((string)($b['title']['bn'] ?? '')), 'en' => trim((string)($b['title']['en'] ?? ''))];
  if ($title['bn'] === '' && $title['en'] === '') fail(422, 'শিরোনাম দিন (বাংলা বা ইংরেজি)');
  $cat = (string)($b['cat'] ?? 'guide'); if (!isset(BLOG_CATS[$cat])) $cat = 'guide';
  $slug = blog_slugify((string)($b['slug'] ?? '')) ?: blog_slugify($title['en']);
  if ($slug === '') $slug = 'post-' . date('ymd-His');
  $id = (string)($b['id'] ?? ''); if (!preg_match('/^[a-zA-Z0-9_-]{1,60}$/', $id)) $id = 'p' . base_convert((string)now_ms(), 10, 36);
  $dup = doc_by('posts', 'k', $slug);
  if ($dup && $dup['id'] !== $id) fail(422, 'এই slug আগে থেকেই আছে — অন্য একটি দিন');
  $old = doc_get('posts', $id);
  $clip = fn($v, int $n) => mb_substr(trim((string)$v), 0, $n);
  $p = [
    'id' => $id, 'slug' => $slug, 'cat' => $cat,
    'title' => $title,
    'excerpt' => ['bn' => $clip($b['excerpt']['bn'] ?? '', 400), 'en' => $clip($b['excerpt']['en'] ?? '', 400)],
    'body' => ['bn' => $clip($b['body']['bn'] ?? '', 120000), 'en' => $clip($b['body']['en'] ?? '', 120000)],
    'cover' => $clip($b['cover'] ?? '', 500),
    'tags' => array_slice(array_values(array_filter(array_map(fn($t) => $clip($t, 40), (array)($b['tags'] ?? [])))), 0, 12),
    'books' => array_slice(array_values(array_filter(array_map(fn($t) => $clip($t, 200), (array)($b['books'] ?? [])))), 0, 12),
    'published' => ($b['published'] ?? true) !== false,
    'featured' => !empty($b['featured']),
    'source' => $clip($b['source'] ?? '', 300),
    'at' => (int)($b['at'] ?? ($old['at'] ?? now_ms())) ?: now_ms(),
    'updated' => now_ms(),
  ];
  post_put($p);
  $deleted = array_values(array_diff((array)kv_get('postsDeleted', []), [$id]));
  kv_set('postsDeleted', $deleted);
  out(['ok' => true, 'post' => $p]);
}
function h_admin_post_delete(string $id): void {
  require_admin();
  doc_del('posts', $id);
  $deleted = (array)kv_get('postsDeleted', []); $deleted[] = $id;
  kv_set('postsDeleted', array_values(array_unique($deleted)));
  out(['ok' => true]);
}

/* ---------------- sitemap.xml ---------------- */
function site_base(): string { return rtrim((string)cfg('site_url', ''), '/') ?: ((isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost')); }
function xe(string $s): string { return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); }
function h_sitemap(): void {
  $base = site_base();
  $u = [];
  $add = function (string $path, ?int $ms = null, string $freq = 'weekly', string $prio = '0.6', array $alt = []) use (&$u, $base) { $u[] = [$base . $path, $ms, $freq, $prio, $alt]; };
  $add('/', null, 'daily', '1.0');
  $add('/blog/', null, 'daily', '0.9');
  $add('/ielts-guide', null, 'weekly', '0.9');
  foreach (array_keys(BLOG_CATS) as $c) $add("/blog/category/$c", null, 'weekly', '0.6');
  foreach (doc_all('categories') as $c) if (!empty($c['slug'])) $add('/category/' . rawurlencode($c['slug']), null, 'weekly', '0.7');
  foreach (posts_all() as $p) if (post_live($p)) $add('/blog/' . rawurlencode($p['slug']), (int)($p['updated'] ?? $p['at'] ?? 0), 'monthly', '0.8', ['bn' => "$base/blog/" . rawurlencode($p['slug']), 'en' => "$base/blog/" . rawurlencode($p['slug']) . '?lang=en']);
  foreach (doc_all('products') as $p) if (($p['active'] ?? true) !== false && !empty($p['slug'])) $add('/product/' . rawurlencode($p['slug']), null, 'weekly', '0.7');
  header('Content-Type: application/xml; charset=utf-8');
  header('Cache-Control: public, max-age=600');
  echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
  foreach ($u as [$loc, $ms, $freq, $prio, $alt]) {
    echo '<url><loc>' . xe($loc) . '</loc>';
    if ($ms) echo '<lastmod>' . gmdate('Y-m-d', (int)($ms / 1000)) . '</lastmod>';
    foreach ($alt as $l => $href) echo '<xhtml:link rel="alternate" hreflang="' . $l . '" href="' . xe($href) . '"/>';
    echo "<changefreq>$freq</changefreq><priority>$prio</priority></url>\n";
  }
  echo '</urlset>';
  exit;
}

/* ---------------- HTML shell with SEO tags + readable article text (crawlers, Facebook/WhatsApp previews) ---------------- */
function md_html(string $md): string {
  $inline = function (string $t): string {
    $t = htmlspecialchars($t, ENT_QUOTES, 'UTF-8');
    $t = preg_replace_callback('/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/', fn($m) => '<img src="' . $m[2] . '" alt="' . $m[1] . '" loading="lazy">', $t);
    $t = preg_replace_callback('/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/', fn($m) => '<a href="' . $m[2] . '">' . $m[1] . '</a>', $t);
    return preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $t);
  };
  $out = ''; $list = null;
  $close = function () use (&$out, &$list) { if ($list) { $out .= "</$list>"; $list = null; } };
  foreach (preg_split('/\R/', $md) as $line) {
    $l = rtrim($line);
    if (preg_match('/^\{\{.*\}\}$/', trim($l))) { $close(); continue; }
    if (preg_match('/^(#{2,3})\s+(.+)$/', $l, $m)) { $close(); $n = strlen($m[1]); $out .= "<h$n>" . $inline($m[2]) . "</h$n>"; continue; }
    if (preg_match('/^[-*]\s+(.+)$/', $l, $m)) { if ($list !== 'ul') { $close(); $out .= '<ul>'; $list = 'ul'; } $out .= '<li>' . $inline($m[1]) . '</li>'; continue; }
    if (preg_match('/^\d+[.)]\s+(.+)$/', $l, $m)) { if ($list !== 'ol') { $close(); $out .= '<ol>'; $list = 'ol'; } $out .= '<li>' . $inline($m[1]) . '</li>'; continue; }
    if (preg_match('/^>\s?(.*)$/', $l, $m)) { $close(); $out .= '<blockquote>' . $inline($m[1]) . '</blockquote>'; continue; }
    if (trim($l) === '') { $close(); continue; }
    if (preg_match('/^-{3,}$/', trim($l))) { $close(); $out .= '<hr>'; continue; }
    $close(); $out .= '<p>' . $inline($l) . '</p>';
  }
  $close();
  return $out;
}
function blog_abs_img(string $c, string $base): string {
  if ($c === '') return '';
  if (preg_match('#^https?://#', $c)) return $c;
  if ($c[0] === '/') return $base . $c;
  return $base . '/public/uploads/' . ltrim($c, '/');
}
function h_blog_page(string $rest = ''): void {
  blog_seed_once();
  $rest = trim(rawurldecode($rest), '/');
  $lang = (($_GET['lang'] ?? '') === 'en') ? 'en' : 'bn';
  $base = site_base();
  $root = dirname(__DIR__, 2);
  $shell = is_file("$root/index.html") ? (string)file_get_contents("$root/index.html") : '';
  if ($shell === '') fail(500, 'index.html not found');
  $set = kv_get('settings', []);
  $siteName = (string)($set['siteName'] ?? 'Bookshelf');
  $ogDefault = blog_abs_img((string)($set['seo']['ogImage'] ?? ''), $base);
  $status = 200; $ld = []; $content = ''; $noindex = false;
  $listHtml = function (array $posts) use ($lang): string {
    $h = '<ul>';
    foreach ($posts as $p) $h .= '<li><a href="/blog/' . htmlspecialchars(rawurlencode($p['slug'])) . ($lang === 'en' ? '?lang=en' : '') . '"><strong>' . htmlspecialchars(post_text($p, 'title', $lang)) . '</strong></a> — ' . htmlspecialchars(post_text($p, 'excerpt', $lang)) . '</li>';
    return $h . '</ul>';
  };
  $path = '/blog/'; $img = $ogDefault;
  if ($rest === '') {
    $title = $lang === 'en' ? 'IELTS Blog — guides, tips, scholarships & study abroad' : 'IELTS ব্লগ — গাইডলাইন, টিপস, স্কলারশিপ ও বিদেশে পড়াশোনা';
    $desc = $lang === 'en' ? 'Free IELTS preparation guides from beginner to advanced, exam information, scholarships, university applications and visa guidance for Bangladeshi students.' : 'বিগিনার থেকে অ্যাডভান্স IELTS প্রস্তুতি, পরীক্ষার তথ্য, স্কলারশিপ, বিশ্ববিদ্যালয়ে আবেদন ও ভিসা — বাংলাদেশি শিক্ষার্থীদের জন্য ফ্রি গাইড।';
    $live = array_values(array_filter(posts_all(), 'post_live'));
    $content = '<h1>' . htmlspecialchars($title) . '</h1><p>' . htmlspecialchars($desc) . '</p>' . $listHtml($live);
    $ld[] = ['@context' => 'https://schema.org', '@type' => 'Blog', 'name' => $title, 'url' => $base . '/blog/', 'inLanguage' => $lang];
  } elseif (str_starts_with($rest, 'category/')) {
    $c = substr($rest, 9); $path = '/blog/category/' . rawurlencode($c);
    if (!isset(BLOG_CATS[$c])) { $status = 404; $noindex = true; $title = 'Not found'; $desc = ''; }
    else {
      $title = BLOG_CATS[$c][$lang] . ' — ' . ($lang === 'en' ? 'IELTS Blog' : 'IELTS ব্লগ');
      $desc = $lang === 'en' ? 'Articles in this category for IELTS & study-abroad students.' : 'IELTS ও বিদেশে পড়াশোনা সংক্রান্ত এই বিভাগের সব লেখা।';
      $live = array_values(array_filter(posts_all(), fn($p) => post_live($p) && ($p['cat'] ?? '') === $c));
      $content = '<h1>' . htmlspecialchars($title) . '</h1>' . $listHtml($live);
    }
  } else {
    $p = doc_by('posts', 'k', $rest);
    $path = '/blog/' . rawurlencode($rest);
    if (!$p || !post_live($p)) { $status = 404; $noindex = true; $title = 'Not found'; $desc = ''; }
    else {
      $title = post_text($p, 'title', $lang);
      $desc = trim(post_text($p, 'excerpt', $lang)) ?: mb_substr(strip_tags(md_html(post_text($p, 'body', $lang))), 0, 160);
      if (!empty($p['cover'])) $img = blog_abs_img((string)$p['cover'], $base);
      $content = '<article><h1>' . htmlspecialchars($title) . '</h1>' . md_html(post_text($p, 'body', $lang)) . '</article>';
      $ld[] = ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $title, 'description' => $desc, 'inLanguage' => $lang, 'datePublished' => gmdate('c', (int)(($p['at'] ?? now_ms()) / 1000)), 'dateModified' => gmdate('c', (int)(($p['updated'] ?? $p['at'] ?? now_ms()) / 1000)), 'mainEntityOfPage' => $base . $path, 'author' => ['@type' => 'Organization', 'name' => $siteName], 'publisher' => ['@type' => 'Organization', 'name' => $siteName, 'logo' => ['@type' => 'ImageObject', 'url' => $base . '/logo.webp']]] + ($img ? ['image' => [$img]] : []);
      $ld[] = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => $siteName, 'item' => $base . '/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'IELTS Blog', 'item' => $base . '/blog/'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $title, 'item' => $base . $path]]];
    }
  }
  $full = $title . ($status === 200 && $rest !== '' ? " | $siteName" : '');
  $canon = $base . $path;
  $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
  $head = '<meta name="description" content="' . $e($desc) . '">'
    . '<meta name="robots" content="' . ($noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large') . '">'
    . '<link rel="canonical" href="' . $e($canon) . '">'
    . '<link rel="alternate" hreflang="bn" href="' . $e($canon) . '"><link rel="alternate" hreflang="en" href="' . $e($canon . '?lang=en') . '"><link rel="alternate" hreflang="x-default" href="' . $e($canon) . '">'
    . '<meta property="og:title" content="' . $e($full) . '"><meta property="og:description" content="' . $e($desc) . '"><meta property="og:type" content="' . ($rest !== '' && !str_starts_with($rest, 'category/') ? 'article' : 'website') . '"><meta property="og:url" content="' . $e($canon) . '">'
    . ($img ? '<meta property="og:image" content="' . $e($img) . '">' : '')
    . '<meta name="twitter:card" content="summary_large_image">';
  foreach ($ld as $j) $head .= '<script type="application/ld+json" id="jsonld">' . str_replace('</', '<\/', jenc($j)) . '</script>';
  $html = preg_replace('#<title>.*?</title>#s', '<title>' . $e($full) . '</title>', $shell, 1);
  $html = preg_replace('#<meta\s+(name="description"|property="og:image")[^>]*>#i', '', (string)$html);
  $html = str_replace('</head>', $head . '</head>', (string)$html);
  $html = str_replace('<div id="root"></div>', '<div id="root"><main style="max-width:760px;margin:0 auto;padding:16px;font-family:sans-serif;line-height:1.7">' . $content . '</main></div>', $html);
  http_response_code($status);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: public, max-age=300');
  echo $html;
  exit;
}
