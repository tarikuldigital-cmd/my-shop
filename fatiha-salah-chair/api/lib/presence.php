<?php
/*
 * Live visitors — every open tab of the storefront sends a small heartbeat
 * (POST /api/v1/presence, every ~25s while the tab is visible). A visitor counts
 * as "live" if a heartbeat arrived within the last LIVE_WINDOW seconds.
 * The table is created automatically the first time it is needed.
 */
const LIVE_WINDOW = 70;

function presence_table(): void {
  $sq = is_sqlite();
  $big = $sq ? 'INTEGER' : 'BIGINT';
  $tail = $sq ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  db()->exec("CREATE TABLE IF NOT EXISTS presence (sid VARCHAR(40) NOT NULL PRIMARY KEY, path VARCHAR(255) NOT NULL DEFAULT '', title VARCHAR(190) NOT NULL DEFAULT '', ref VARCHAR(190) NOT NULL DEFAULT '', src VARCHAR(60) NOT NULL DEFAULT '', device VARCHAR(10) NOT NULL DEFAULT '', first_seen $big NOT NULL, last_seen $big NOT NULL)$tail");
  try { db()->exec('CREATE INDEX presence_seen ON presence (last_seen)'); } catch (PDOException $e) { /* exists */ }
}

function presence_q(string $sql, array $args = []): PDOStatement {
  try { return q($sql, $args); }
  catch (PDOException $e) {
    if (!preg_match('/presence|no such table|doesn\'t exist/i', $e->getMessage())) throw $e;
    presence_table();
    return q($sql, $args);
  }
}

function h_presence(): never {
  $b = body();
  $sid = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($b['sid'] ?? ''));
  if (strlen($sid) < 8) out(['ok' => true]);
  if (!empty($b['leave'])) { presence_q('DELETE FROM presence WHERE sid = ?', [substr($sid, 0, 40)]); out(['ok' => true]); }
  if (rate_hit('pr:' . client_ip(), 40, 60)) out(['ok' => true]);   // quietly ignore floods
  $path = s((string)($b['path'] ?? '/'), 255);
  if (str_starts_with($path, '/admin')) out(['ok' => true]);         // admins are not visitors
  $ua = strtolower((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
  if ($ua === '' || preg_match('/bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/', $ua)) out(['ok' => true]);
  $device = preg_match('/ipad|tablet/', $ua) ? 'tablet' : (preg_match('/mobi|android|iphone/', $ua) ? 'mobile' : 'desktop');
  $ref = s((string)($b['ref'] ?? ''), 190);
  $refHost = $ref ? (string)(parse_url($ref, PHP_URL_HOST) ?: '') : '';
  $now = time();
  $sid = substr($sid, 0, 40);
  $up = presence_q('UPDATE presence SET path = ?, title = ?, last_seen = ?, device = ? WHERE sid = ?', [$path, s((string)($b['title'] ?? ''), 190), $now, $device, $sid]);
  if (!$up->rowCount()) {
    try {
      presence_q('INSERT INTO presence (sid, path, title, ref, src, device, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$sid, $path, s((string)($b['title'] ?? ''), 190), $refHost, s((string)($b['src'] ?? ''), 60), $device, $now, $now]);
    } catch (PDOException $e) { /* parallel insert from another tab — fine */ }
  }
  if (random_int(1, 50) === 1) presence_q('DELETE FROM presence WHERE last_seen < ?', [$now - 86400]);
  out(['ok' => true]);
}

function h_admin_live(): never {
  require_admin();
  $now = time();
  $rows = presence_q('SELECT sid, path, title, ref, src, device, first_seen, last_seen FROM presence WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 300', [$now - LIVE_WINDOW])->fetchAll();
  $pages = []; $devices = ['mobile' => 0, 'desktop' => 0, 'tablet' => 0]; $sources = [];
  foreach ($rows as $r) {
    $k = $r['path'];
    if (!isset($pages[$k])) $pages[$k] = ['path' => $k, 'title' => $r['title'], 'count' => 0];
    $pages[$k]['count']++;
    $devices[$r['device']] = ($devices[$r['device']] ?? 0) + 1;
    $src = $r['src'] ?: ($r['ref'] ?: 'direct');
    $sources[$src] = ($sources[$src] ?? 0) + 1;
  }
  usort($pages, fn($a, $b) => $b['count'] <=> $a['count']);
  arsort($sources);
  $today = (int)presence_q('SELECT COUNT(*) c FROM presence WHERE first_seen >= ?', [strtotime('today')])->fetch()['c'];
  $last30 = (int)presence_q('SELECT COUNT(*) c FROM presence WHERE last_seen >= ?', [$now - 1800])->fetch()['c'];
  out(['ok' => true, 'now' => count($rows), 'last30' => $last30, 'today' => $today, 'pages' => array_slice($pages, 0, 15),
    'devices' => $devices, 'sources' => array_slice($sources, 0, 8, true),
    'visitors' => array_map(fn($r) => ['path' => $r['path'], 'title' => $r['title'], 'device' => $r['device'], 'src' => $r['src'] ?: ($r['ref'] ?: 'direct'), 'since' => (int)$r['first_seen'], 'seen' => (int)$r['last_seen']], array_slice($rows, 0, 50))]);
}
