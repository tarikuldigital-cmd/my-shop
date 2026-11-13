<?php
/* Smart China Gallery backend — core helpers: config, database, JSON docs, tokens, rate limiting, responses. */
declare(strict_types=1);

function cfg(string $path = '', $default = null) {
  static $c = null;
  if ($c === null) {
    $f = dirname(__DIR__) . '/config.php';
    $c = is_file($f) ? (include $f) : [];
    // keys shipped privately with your own package (never committed to GitHub): api/secrets.php → ['barikoi_key' => '…']
    $s = dirname(__DIR__) . '/secrets.php';
    if (is_file($s)) $c = array_replace((array)(include $s), (array)$c);
  }
  $v = $c;
  foreach ($path === '' ? [] : explode('.', $path) as $k) { if (!is_array($v) || !array_key_exists($k, $v)) return $default; $v = $v[$k]; }
  return $v;
}
function installed(): bool { return is_file(dirname(__DIR__) . '/config.php'); }

function now_ms(): int { return (int)round(microtime(true) * 1000); }
function jenc($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR); }
function jdec(?string $s) { return $s === null || $s === '' ? null : json_decode($s, true); }

/* ---------------- responses ---------------- */
class HttpError extends Exception {
  public array $extra;
  public function __construct(int $code, string $msg, array $extra = []) { parent::__construct($msg, $code); $this->extra = $extra; }
}
function fail(int $code, string $msg, array $extra = []): never { throw new HttpError($code, $msg, $extra); }
function out($data, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo jenc($data);
  exit;
}
function body(): array {
  static $b = null;
  if ($b === null) {
    $raw = file_get_contents('php://input');
    if (strlen((string)$raw) > 8 * 1024 * 1024) fail(413, 'Request too large');
    $b = json_decode((string)$raw, true);
    if (!is_array($b)) $b = $_POST ?: [];
  }
  return $b;
}

/* ---------------- database ---------------- */
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $d = cfg('db', []);
  if (($d['driver'] ?? 'mysql') === 'sqlite') {
    $pdo = new PDO('sqlite:' . $d['sqlite'], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=8000;');
  } else {
    $pdo = new PDO(sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $d['host'] ?? 'localhost', $d['name'] ?? ''), $d['user'] ?? '', $d['pass'] ?? '',
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    $pdo->exec("SET time_zone = '+00:00'");
  }
  return $pdo;
}
function is_sqlite(): bool { return (cfg('db.driver', 'mysql')) === 'sqlite'; }
function q(string $sql, array $args = []): PDOStatement { $s = db()->prepare($sql); $s->execute($args); return $s; }
function lock_sql(): string { return is_sqlite() ? '' : ' FOR UPDATE'; }

/** Run $fn inside a transaction (BEGIN IMMEDIATE on SQLite so concurrent orders queue instead of overselling). */
function tx(callable $fn) {
  $pdo = db();
  if ($pdo->inTransaction()) return $fn();
  if (is_sqlite()) $pdo->exec('BEGIN IMMEDIATE'); else $pdo->beginTransaction();
  try { $r = $fn(); is_sqlite() ? $pdo->exec('COMMIT') : $pdo->commit(); return $r; }
  catch (Throwable $e) { if ($pdo->inTransaction()) { is_sqlite() ? $pdo->exec('ROLLBACK') : $pdo->rollBack(); } throw $e; }
}

function create_schema(): void {
  $sq = is_sqlite();
  $ai = $sq ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
  $big = $sq ? 'INTEGER' : 'BIGINT';
  $txt = $sq ? 'TEXT' : 'MEDIUMTEXT';
  $ine = $sq ? 'IF NOT EXISTS ' : '';
  $tail = $sq ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  $stm = [
    "CREATE TABLE IF NOT EXISTS docs (coll VARCHAR(24) NOT NULL, id VARCHAR(80) NOT NULL, k VARCHAR(190) NULL, k2 VARCHAR(190) NULL, k3 VARCHAR(190) NULL, seq $big NOT NULL DEFAULT 0, updated $big NOT NULL DEFAULT 0, data $txt NOT NULL, PRIMARY KEY (coll, id))$tail",
    "CREATE INDEX {$ine}docs_k ON docs (coll, k)",
    "CREATE INDEX {$ine}docs_k2 ON docs (coll, k2)",
    "CREATE INDEX {$ine}docs_k3 ON docs (coll, k3)",
    "CREATE INDEX {$ine}docs_upd ON docs (coll, updated)",
    "CREATE TABLE IF NOT EXISTS kv (k VARCHAR(64) NOT NULL PRIMARY KEY, v $txt NOT NULL, updated $big NOT NULL DEFAULT 0)$tail",
    "CREATE TABLE IF NOT EXISTS admins (id $ai, email VARCHAR(190) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, pass VARCHAR(255) NOT NULL, created $big NOT NULL)$tail",
    "CREATE TABLE IF NOT EXISTS customers (id $ai, phone VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, pass VARCHAR(255) NOT NULL, address VARCHAR(500) NOT NULL DEFAULT '', email VARCHAR(190) NOT NULL DEFAULT '', created $big NOT NULL)$tail",
    "CREATE TABLE IF NOT EXISTS tokens (h CHAR(64) NOT NULL PRIMARY KEY, kind VARCHAR(10) NOT NULL, uid INT NOT NULL, exp $big NOT NULL)$tail",
    "CREATE TABLE IF NOT EXISTS rl (k VARCHAR(120) NOT NULL, at $big NOT NULL)$tail",
    "CREATE INDEX {$ine}rl_k ON rl (k, at)",
    "CREATE TABLE IF NOT EXISTS otp (phone VARCHAR(20) NOT NULL PRIMARY KEY, h CHAR(64) NOT NULL, exp $big NOT NULL, tries INT NOT NULL DEFAULT 0)$tail",
  ];
  foreach ($stm as $s) {
    // MySQL has no CREATE INDEX IF NOT EXISTS — ignore "duplicate key name"
    try { db()->exec($s); } catch (PDOException $e) { if (stripos($e->getMessage(), 'Duplicate key name') === false) throw $e; }
  }
}

/* ---------------- key/value ---------------- */
function kv_get(string $k, $default = null, bool $lock = false) {
  $r = q('SELECT v FROM kv WHERE k = ?' . ($lock ? lock_sql() : ''), [$k])->fetch();
  return $r ? jdec($r['v']) : $default;
}
function kv_set(string $k, $v): void { q('REPLACE INTO kv (k, v, updated) VALUES (?, ?, ?)', [$k, jenc($v), now_ms()]); }
function kv_updated(string $k): int { $r = q('SELECT updated FROM kv WHERE k = ?', [$k])->fetch(); return $r ? (int)$r['updated'] : 0; }

/* ---------------- document collections ---------------- */
const KEYS = ['products' => 'id', 'categories' => 'slug', 'coupons' => 'code', 'reviews' => 'id', 'landings' => 'id', 'chats' => 'id', 'messages' => 'id', 'incomplete' => 'id', 'orders' => 'id', 'smsLog' => 'id'];
/** collections ordered by a field (newest first) instead of by seq */
const SORT_BY = ['orders' => 'createdAt', 'incomplete' => 'at', 'chats' => 'updated', 'messages' => 'at', 'reviews' => 'at', 'smsLog' => 'at'];
const DELTA = ['products' => ['stock', 'sold'], 'coupons' => ['used'], 'landings' => ['views', 'orders']];

function doc_index(string $coll, array $d): array {
  if ($coll === 'orders') return [(string)($d['invoice'] ?? ''), strtoupper((string)($d['trackCode'] ?? '')), (string)($d['phone'] ?? '')];
  if ($coll === 'products' || $coll === 'landings') return [(string)($d['slug'] ?? ''), null, null];
  if ($coll === 'coupons') return [strtolower((string)($d['code'] ?? '')), null, null];
  if ($coll === 'incomplete') return [(string)($d['phone'] ?? ''), null, null];
  return [null, null, null];
}
function doc_put(string $coll, array $d, ?int $seq = null): void {
  $id = (string)($d[KEYS[$coll]] ?? '');
  if ($id === '') fail(422, "Missing key for $coll");
  [$k, $k2, $k3] = doc_index($coll, $d);
  if ($seq === null) {
    $old = q('SELECT seq FROM docs WHERE coll = ? AND id = ?', [$coll, $id])->fetch();
    if ($old) $seq = (int)$old['seq'];
    else { $m = q('SELECT MIN(seq) m FROM docs WHERE coll = ?', [$coll])->fetch(); $seq = $m && $m['m'] !== null ? (int)$m['m'] - 1 : 0; }
  }
  q('REPLACE INTO docs (coll, id, k, k2, k3, seq, updated, data) VALUES (?,?,?,?,?,?,?,?)', [$coll, $id, $k, $k2, $k3, $seq, now_ms(), jenc($d)]);
}
function doc_get(string $coll, string $id, bool $lock = false): ?array {
  $r = q('SELECT data FROM docs WHERE coll = ? AND id = ?' . ($lock ? lock_sql() : ''), [$coll, $id])->fetch();
  return $r ? jdec($r['data']) : null;
}
function doc_by(string $coll, string $col, string $val, bool $lock = false): ?array {
  if (!in_array($col, ['k', 'k2', 'k3'], true)) return null;
  $r = q("SELECT data FROM docs WHERE coll = ? AND $col = ? LIMIT 1" . ($lock ? lock_sql() : ''), [$coll, $val])->fetch();
  return $r ? jdec($r['data']) : null;
}
function doc_del(string $coll, string $id): void { q('DELETE FROM docs WHERE coll = ? AND id = ?', [$coll, $id]); }
function doc_all(string $coll, int $since = 0, int $limit = 0): array {
  $order = isset(SORT_BY[$coll]) ? 'updated DESC' : 'seq ASC, updated DESC';
  $sql = 'SELECT data FROM docs WHERE coll = ?' . ($since ? ' AND updated > ?' : '') . " ORDER BY $order" . ($limit ? " LIMIT $limit" : '');
  $rows = q($sql, $since ? [$coll, $since] : [$coll])->fetchAll();
  $list = array_map(fn($r) => jdec($r['data']), $rows);
  if (isset(SORT_BY[$coll])) { $f = SORT_BY[$coll]; usort($list, fn($a, $b) => ($b[$f] ?? 0) <=> ($a[$f] ?? 0)); }
  return $list;
}
function doc_count(string $coll): int { return (int)q('SELECT COUNT(*) c FROM docs WHERE coll = ?', [$coll])->fetch()['c']; }

/* ---------------- tokens ---------------- */
function new_token(string $kind, int $uid, int $days): string {
  $t = bin2hex(random_bytes(32));
  q('INSERT INTO tokens (h, kind, uid, exp) VALUES (?,?,?,?)', [hash('sha256', $t), $kind, $uid, time() + $days * 86400]);
  if (random_int(1, 20) === 1) q('DELETE FROM tokens WHERE exp < ?', [time()]);
  return $t;
}
function bearer(): string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (!$h && function_exists('getallheaders')) foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
  return preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m) ? strtolower($m[1]) : '';
}
function auth_user(string $kind): ?array {
  $t = bearer();
  if (!$t) return null;
  $r = q('SELECT uid, exp FROM tokens WHERE h = ? AND kind = ?', [hash('sha256', $t), $kind])->fetch();
  if (!$r || (int)$r['exp'] < time()) return null;
  $table = $kind === 'admin' ? 'admins' : 'customers';
  $u = q("SELECT * FROM $table WHERE id = ?", [(int)$r['uid']])->fetch();
  return $u ?: null;
}
function require_admin(): array { $u = auth_user('admin'); if (!$u) fail(401, 'Admin login required'); return $u; }
function drop_token(): void { $t = bearer(); if ($t) q('DELETE FROM tokens WHERE h = ?', [hash('sha256', $t)]); }

/* ---------------- request helpers ---------------- */
function client_ip(): string {
  if (cfg('trust_cloudflare') && !empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return substr($_SERVER['HTTP_CF_CONNECTING_IP'], 0, 45);
  return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
}
/** Returns true when the limit is exceeded (and does not count the blocked attempt). */
function rate_hit(string $key, int $max, int $windowSec): bool {
  $now = time();
  $key = substr($key, 0, 120);
  q('DELETE FROM rl WHERE k = ? AND at < ?', [$key, $now - $windowSec]);
  $c = (int)q('SELECT COUNT(*) c FROM rl WHERE k = ?', [$key])->fetch()['c'];
  if ($c >= $max) return true;
  q('INSERT INTO rl (k, at) VALUES (?, ?)', [$key, $now]);
  return false;
}
/** Failed-attempt limiter: blocks once $max failures were recorded; call rate_add() on each failure. */
function rate_blocked(string $key, int $max, int $windowSec): bool {
  $key = substr($key, 0, 120);
  q('DELETE FROM rl WHERE k = ? AND at < ?', [$key, time() - $windowSec]);
  return (int)q('SELECT COUNT(*) c FROM rl WHERE k = ?', [$key])->fetch()['c'] >= $max;
}
function rate_add(string $key): void { q('INSERT INTO rl (k, at) VALUES (?, ?)', [substr($key, 0, 120), time()]); }
function limit_or_fail(string $key, int $max, int $windowSec, string $msg = 'Too many attempts, please try again in a little while'): void {
  if (rate_hit($key, $max, $windowSec)) fail(429, $msg);
}
function norm_phone(string $p): string { return preg_replace('/^88/', '', preg_replace('/\D/', '', $p)); }
function valid_phone(string $p): bool { return (bool)preg_match('/^01[3-9]\d{8}$/', norm_phone($p)); }
function s(?string $v, int $max): string { return mb_substr(trim((string)$v), 0, $max); }

function site_url(): string { return rtrim((string)cfg('site_url', ''), '/'); }

/** Settings with secrets removed — safe for the public storefront. */
function public_settings(array $st): array {
  unset($st['courier']);
  if (isset($st['tracking'])) unset($st['tracking']['metaCapiToken']);
  if (isset($st['chat'])) { $st['chat']['apiKey'] = ''; $st['chat']['relayUrl'] = ''; }
  $st['sms'] = ['enabled' => false, 'relayUrl' => '', 'siteUrl' => '', 'events' => new stdClass(), 'templates' => new stdClass()];
  $st['staff'] = [];
  return $st;
}
