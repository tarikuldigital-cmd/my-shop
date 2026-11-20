<?php
/*
 * Blog: posts live in the `docs` table (coll = 'posts') but are NOT part of KEYS, so the admin sync payload and the
 * storefront bootstrap stay small.  Public: GET posts, GET posts/{slug},  Admin: GET/POST admin/posts, DELETE admin/posts/{id}.
 */
declare(strict_types=1);

function blog_routes(): array {
  return [
    ['GET', 'posts', 'h_posts'],
    ['GET', 'posts/([a-zA-Z0-9._%-]{1,200})', 'h_post'],
    ['GET', 'admin/posts', 'h_admin_posts'],
    ['POST', 'admin/posts', 'h_admin_post_save'],
    ['DELETE', 'admin/posts/([a-zA-Z0-9_-]{1,60})', 'h_admin_post_delete'],
  ];
}
function post_put(array $p): void {
  q('REPLACE INTO docs (coll, id, k, k2, k3, seq, updated, data) VALUES (?,?,?,?,?,?,?,?)', ['posts', (string)$p['id'], (string)$p['slug'], null, null, 0, now_ms(), jenc($p)]);
}
function posts_all(): array {
  $rows = q('SELECT data FROM docs WHERE coll = ?', ['posts'])->fetchAll();
  $list = array_values(array_filter(array_map(fn($r) => jdec($r['data']), $rows)));
  usort($list, fn($a, $b) => ($b['at'] ?? 0) <=> ($a['at'] ?? 0));
  return $list;
}
function post_live(array $p): bool { return ($p['published'] ?? true) !== false && (int)($p['at'] ?? 0) <= now_ms() + 60000; }
function post_summary(array $p): array { unset($p['body']); return $p; }

function h_posts(): void {
  $cat = (string)($_GET['cat'] ?? ''); $term = mb_strtolower(trim((string)($_GET['q'] ?? '')));
  $list = array_values(array_filter(posts_all(), function ($p) use ($cat, $term) {
    if (!post_live($p)) return false;
    if ($cat !== '' && ($p['cat'] ?? '') !== $cat) return false;
    if ($term !== '' && !str_contains(mb_strtolower(jenc([$p['title'] ?? '', $p['excerpt'] ?? '', $p['tags'] ?? []])), $term)) return false;
    return true;
  }));
  header('Cache-Control: public, max-age=60');
  out(['posts' => array_map('post_summary', array_slice($list, 0, 300)), 'total' => count($list)]);
}
function h_post(string $slug): void {
  $p = doc_by('posts', 'k', urldecode($slug));
  $admin = auth_user('admin') !== null;
  if (!$p || (!$admin && !post_live($p))) fail(404, 'Not found');
  $rel = array_values(array_filter(posts_all(), fn($x) => post_live($x) && $x['id'] !== $p['id'] && ($x['cat'] ?? '') === ($p['cat'] ?? '')));
  header('Cache-Control: public, max-age=60');
  out(['post' => $p, 'related' => array_map('post_summary', array_slice($rel, 0, 3))]);
}
function h_admin_posts(): void { require_admin('blog'); out(['posts' => posts_all()]); }
function blog_slugify(string $s): string { return trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower(trim($s))), '-'); }
function h_admin_post_save(): void {
  require_admin('blog');
  $b = body();
  $title = s((string)($b['title'] ?? ''), 200);
  if ($title === '') fail(422, 'Enter a title');
  $slug = blog_slugify((string)($b['slug'] ?? '')) ?: blog_slugify($title);
  if ($slug === '') $slug = 'post-' . date('ymd-His');
  $id = (string)($b['id'] ?? ''); if (!preg_match('/^[a-zA-Z0-9_-]{1,60}$/', $id)) $id = 'p' . base_convert((string)now_ms(), 10, 36);
  $dup = doc_by('posts', 'k', $slug);
  if ($dup && $dup['id'] !== $id) fail(422, 'This slug is already used — choose another one');
  $old = doc_get('posts', $id);
  $p = [
    'id' => $id, 'slug' => $slug, 'cat' => s((string)($b['cat'] ?? 'news'), 40) ?: 'news', 'title' => $title,
    'excerpt' => s((string)($b['excerpt'] ?? ''), 400), 'body' => mb_substr(trim((string)($b['body'] ?? '')), 0, 120000),
    'cover' => s((string)($b['cover'] ?? ''), 500),
    'tags' => array_slice(array_values(array_filter(array_map(fn($t) => s((string)$t, 40), (array)($b['tags'] ?? [])))), 0, 12),
    'published' => ($b['published'] ?? true) !== false, 'featured' => !empty($b['featured']),
    'at' => (int)($b['at'] ?? ($old['at'] ?? now_ms())) ?: now_ms(), 'updated' => now_ms(),
  ];
  post_put($p);
  out(['ok' => true, 'post' => $p]);
}
function h_admin_post_delete(string $id): void {
  require_admin('blog');
  q('DELETE FROM docs WHERE coll = ? AND id = ?', ['posts', $id]);
  out(['ok' => true]);
}
