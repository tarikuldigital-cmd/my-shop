<?php
/* "Copy images to my server": downloads every remote / old-site image used by books, categories, banners, landing pages and SEO
 * into /uploads/mirror and rewrites the references — so the shop no longer depends on other websites staying online. */
declare(strict_types=1);

const IMG_RE = '/\.(jpe?g|png|webp|gif)(\?[^"\s]*)?$/i';

function mirror_is_candidate(string $v): bool {
  if (!preg_match(IMG_RE, $v) || preg_match('#^(local:|idb:|data:|blob:)#', $v)) return false;
  $own = parse_url(site_url(), PHP_URL_HOST);
  if (preg_match('#^https?://#i', $v)) return parse_url($v, PHP_URL_HOST) !== $own;       // remote image
  return !str_starts_with($v, '/') && !str_contains($v, '..');                           // relative path from the old site's uploads
}
function mirror_abs(string $v): string {
  if (preg_match('#^https?://#i', $v)) return $v;
  return rtrim((string)cfg('old_asset_base', ''), '/') . '/' . ltrim($v, '/');
}
function mirror_walk(&$n, callable $fn): void {
  if (is_array($n)) foreach ($n as $k => &$v) mirror_walk($v, $fn);
  elseif (is_string($n)) $n = $fn($n);
}
function mirror_collect(): array {
  $found = [];
  $see = function (string $v) use (&$found) { if (mirror_is_candidate($v)) $found[$v] = true; return $v; };
  foreach (['products', 'categories', 'landings'] as $c) foreach (doc_all($c) as $d) mirror_walk($d, $see);
  foreach (['home', 'settings'] as $k) { $x = kv_get($k, []); mirror_walk($x, $see); }
  return array_keys($found);
}
function mirror_fetch(string $url): ?string {
  $abs = mirror_abs($url);
  if (!preg_match('#^https?://#i', $abs)) return null;
  // never let the server be pointed at its own network (SSRF) unless explicitly allowed for local testing
  $ip = gethostbyname((string)parse_url($abs, PHP_URL_HOST));
  if (!cfg('mirror_allow_private') && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
  [$code, $body] = http_call($abs, [CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, CURLOPT_TIMEOUT => 15, CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; SmartChinaGallery/1.0)', CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS]);
  if ($code !== 200 || strlen($body) < 40 || strlen($body) > 10 * 1024 * 1024) return null;
  $tmp = tempnam(sys_get_temp_dir(), 'mir'); file_put_contents($tmp, $body);
  $info = @getimagesize($tmp);
  $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$info['mime'] ?? ''] ?? null;
  if (!$ext) { @unlink($tmp); return null; }
  $dir = rtrim((string)cfg('upload_dir', dirname(__DIR__) . '/uploads'), '/') . '/mirror';
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) { @unlink($tmp); return null; }
  $name = sha1($abs) . ".$ext";
  $ok = @rename($tmp, "$dir/$name") || (@copy($tmp, "$dir/$name") && @unlink($tmp));
  if (!$ok) return null;
  @chmod("$dir/$name", 0644);
  return rtrim((string)cfg('upload_url', '/uploads'), '/') . "/mirror/$name";
}

/** One batch (≈20 s). Returns progress; the admin page calls it repeatedly until remaining = 0. */
function h_mirror(): void {
  require_admin();
  @set_time_limit(60);
  $map = kv_get('mirrorMap', []); $fail = kv_get('mirrorFail', []);
  if (!empty(body()['retry'])) $fail = [];
  $todo = array_values(array_filter(mirror_collect(), fn($u) => !isset($map[$u]) && !isset($fail[$u])));
  $start = time(); $done = 0;
  foreach ($todo as $u) {
    if (time() - $start > 20) break;
    $new = mirror_fetch($u);
    if ($new) { $map[$u] = $new; $done++; } else $fail[$u] = 1;
  }
  kv_set('mirrorMap', $map); kv_set('mirrorFail', $fail);
  // rewrite references that now have a local copy
  $swap = fn(string $v) => $map[$v] ?? $v;
  tx(function () use ($swap) {
    foreach (['products', 'categories', 'landings'] as $c) foreach (doc_all($c) as $d) { $before = jenc($d); mirror_walk($d, $swap); if (jenc($d) !== $before) doc_put($c, $d); }
    foreach (['home', 'settings'] as $k) { $x = kv_get($k, []); $before = jenc($x); mirror_walk($x, $swap); if (jenc($x) !== $before) kv_set($k, $x); }
  });
  $remaining = count(array_filter(mirror_collect(), fn($u) => !isset($fail[$u])));
  out(['ok' => true, 'copied' => $done, 'total_copied' => count($map), 'remaining' => $remaining, 'failed' => array_slice(array_keys($fail), 0, 30), 'failed_count' => count($fail)]);
}
