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
  db()->exec("CREATE TABLE IF NOT EXISTS presence (sid VARCHAR(40) NOT NULL PRIMARY KEY, path VARCHAR(255) NOT NULL DEFAULT '', title VARCHAR(190) NOT NULL DEFAULT '', ref VARCHAR(190) NOT NULL DEFAULT '', src VARCHAR(60) NOT NULL DEFAULT '', country CHAR(2) NOT NULL DEFAULT '', device VARCHAR(10) NOT NULL DEFAULT '', first_seen $big NOT NULL, last_seen $big NOT NULL)$tail");
  try { db()->exec('CREATE INDEX presence_seen ON presence (last_seen)'); } catch (PDOException $e) { /* exists */ }
}

function presence_q(string $sql, array $args = []): PDOStatement {
  try { return q($sql, $args); }
  catch (PDOException $e) {
    $m = $e->getMessage();
    if (preg_match('/no such column|Unknown column|has no column/i', $m)) { db()->exec("ALTER TABLE presence ADD COLUMN country CHAR(2) NOT NULL DEFAULT ''"); return q($sql, $args); }
    if (!preg_match('/presence|no such table|doesn\'t exist/i', $m)) throw $e;
    presence_table();
    return q($sql, $args);
  }
}


/* Country of a visitor: Cloudflare header if present, else a free IP→country lookup
 * (api.country.is, cached 7 days per IP so each IP is looked up at most once a week),
 * else a guess from the browser's time zone. */
const TZ_COUNTRY = ['Asia/Dhaka' => 'BD', 'Asia/Riyadh' => 'SA', 'Asia/Dubai' => 'AE', 'Asia/Qatar' => 'QA', 'Asia/Kuwait' => 'KW', 'Asia/Muscat' => 'OM', 'Asia/Bahrain' => 'BH',
  'Asia/Kuala_Lumpur' => 'MY', 'Asia/Singapore' => 'SG', 'Asia/Kolkata' => 'IN', 'Asia/Calcutta' => 'IN', 'Asia/Karachi' => 'PK', 'Asia/Kathmandu' => 'NP', 'Asia/Tokyo' => 'JP', 'Asia/Seoul' => 'KR',
  'Asia/Baghdad' => 'IQ', 'Asia/Amman' => 'JO', 'Asia/Beirut' => 'LB', 'Europe/London' => 'GB', 'Europe/Rome' => 'IT', 'Europe/Paris' => 'FR', 'Europe/Berlin' => 'DE', 'Europe/Madrid' => 'ES',
  'Europe/Lisbon' => 'PT', 'Europe/Athens' => 'GR', 'Europe/Istanbul' => 'TR', 'Africa/Cairo' => 'EG', 'Africa/Tripoli' => 'LY', 'Australia/Sydney' => 'AU', 'Australia/Melbourne' => 'AU',
  'America/New_York' => 'US', 'America/Chicago' => 'US', 'America/Los_Angeles' => 'US', 'America/Toronto' => 'CA', 'Indian/Maldives' => 'MV'];

function visitor_country(string $tz): string {
  $cf = strtoupper((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''));
  if (preg_match('/^[A-Z]{2}$/', $cf) && $cf !== 'XX' && $cf !== 'T1') return $cf;
  $ip = client_ip();
  if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
    $key = 'g:' . md5($ip);
    $hit = kv_get($key);
    if (is_string($hit) && kv_updated($key) > now_ms() - 7 * 86400000) return $hit;
    [$code, $b] = http_call('https://api.country.is/' . rawurlencode($ip), [CURLOPT_TIMEOUT => 3, CURLOPT_CONNECTTIMEOUT => 2]);
    $c = strtoupper((string)((json_decode($b, true) ?: [])['country'] ?? ''));
    if ($code === 200 && preg_match('/^[A-Z]{2}$/', $c)) { kv_set($key, $c); return $c; }
  }
  return TZ_COUNTRY[$tz] ?? '';
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
      $country = visitor_country(s((string)($b['tz'] ?? ''), 60));
      presence_q('INSERT INTO presence (sid, path, title, ref, src, country, device, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$sid, $path, s((string)($b['title'] ?? ''), 190), $refHost, s((string)($b['src'] ?? ''), 60), $country, $device, $now, $now]);
    } catch (PDOException $e) { /* parallel insert from another tab — fine */ }
  }
  if (random_int(1, 50) === 1) { presence_q('DELETE FROM presence WHERE last_seen < ?', [$now - 86400]); q("DELETE FROM kv WHERE k LIKE 'g:%' AND updated < ?", [now_ms() - 7 * 86400000]); }
  out(['ok' => true]);
}

function h_admin_live(): never {
  require_admin();
  $now = time();
  $rows = presence_q('SELECT sid, path, title, ref, src, country, device, first_seen, last_seen FROM presence WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 300', [$now - LIVE_WINDOW])->fetchAll();
  $pages = []; $devices = ['mobile' => 0, 'desktop' => 0, 'tablet' => 0]; $sources = []; $countries = [];
  foreach ($rows as $r) {
    $k = $r['path'];
    if (!isset($pages[$k])) $pages[$k] = ['path' => $k, 'title' => $r['title'], 'count' => 0];
    $pages[$k]['count']++;
    $devices[$r['device']] = ($devices[$r['device']] ?? 0) + 1;
    $cc = $r['country'] ?: '??';
    $countries[$cc] = ($countries[$cc] ?? 0) + 1;
    $src = $r['src'] ?: ($r['ref'] ?: 'direct');
    $sources[$src] = ($sources[$src] ?? 0) + 1;
  }
  usort($pages, fn($a, $b) => $b['count'] <=> $a['count']);
  arsort($sources); arsort($countries);
  $today = (int)presence_q('SELECT COUNT(*) c FROM presence WHERE first_seen >= ?', [strtotime('today')])->fetch()['c'];
  $last30 = (int)presence_q('SELECT COUNT(*) c FROM presence WHERE last_seen >= ?', [$now - 1800])->fetch()['c'];
  out(['ok' => true, 'now' => count($rows), 'last30' => $last30, 'today' => $today, 'pages' => array_slice($pages, 0, 15),
    'devices' => $devices, 'sources' => array_slice($sources, 0, 8, true), 'countries' => array_slice($countries, 0, 12, true),
    'visitors' => array_map(fn($r) => ['path' => $r['path'], 'title' => $r['title'], 'device' => $r['device'], 'src' => $r['src'] ?: ($r['ref'] ?: 'direct'), 'country' => $r['country'], 'since' => (int)$r['first_seen'], 'seen' => (int)$r['last_seen']], array_slice($rows, 0, 50))]);
}
