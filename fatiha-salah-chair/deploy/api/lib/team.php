<?php
/*
 * Admin team & roles.
 *  - super_admin : everything, and the only role that can add / edit / remove team members and change roles
 *  - admin       : everything except the team page
 *  - order_manager, support, content : limited sections (see ADMIN_ROLES)
 * Permission names match the admin menu: dashboard, orders, incomplete, customers, chat, sms, messages, reviews,
 * products, categories, landings, homepage, coupons, pages, settings, team, complaints.
 */
declare(strict_types=1);

const ADMIN_ROLES = [
  'super_admin'   => ['*'],
  'admin'         => ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages', 'reviews', 'products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'settings'],
  'order_manager' => ['dashboard', 'orders', 'incomplete', 'customers', 'complaints', 'chat', 'sms', 'messages'],
  'support'       => ['orders', 'incomplete', 'customers', 'complaints', 'chat', 'messages', 'reviews'],
  'content'       => ['products', 'categories', 'landings', 'homepage', 'coupons', 'pages', 'reviews'],
];
/** which permission is needed to write each synced collection / key-value block */
const COLL_PERM = ['products' => 'products', 'categories' => 'categories', 'coupons' => 'coupons', 'reviews' => 'reviews', 'landings' => 'landings', 'chats' => 'chat', 'messages' => 'messages', 'incomplete' => 'incomplete', 'orders' => 'orders', 'smsLog' => 'sms', 'complaints' => 'complaints'];
const KV_PERM = ['settings' => 'settings', 'home' => 'homepage', 'pages' => 'pages', 'fraud' => 'orders'];

/** Adds role / active / last_login to an existing `admins` table (once) and makes sure a Super Admin exists. */
function admin_migrate(): void {
  static $done = false;
  if ($done) return;
  $done = true;
  try { q('SELECT role, active, last_login FROM admins LIMIT 1'); }
  catch (PDOException $e) {
    foreach ([
      "ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'",
      'ALTER TABLE admins ADD COLUMN active TINYINT NOT NULL DEFAULT 1',
      'ALTER TABLE admins ADD COLUMN last_login BIGINT NOT NULL DEFAULT 0',
    ] as $sql) { try { db()->exec($sql); } catch (PDOException $e2) { /* column already there */ } }
  }
  try { q('SELECT phone FROM admins LIMIT 1'); }
  catch (PDOException $e) { try { db()->exec("ALTER TABLE admins ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT ''"); } catch (PDOException $e2) { /* already there */ } }
  if (!q("SELECT 1 FROM admins WHERE role = 'super_admin' LIMIT 1")->fetch()) {
    q("UPDATE admins SET role = 'super_admin', active = 1 WHERE id = (SELECT m FROM (SELECT MIN(id) AS m FROM admins) t)");
  }
}

function admin_perms(array $u): array { return ADMIN_ROLES[$u['role'] ?? 'admin'] ?? []; }
function admin_can(array $u, string $perm): bool { $p = admin_perms($u); return in_array('*', $p, true) || in_array($perm, $p, true); }
function admin_public(array $u): array {
  return ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email'], 'phone' => (string)($u['phone'] ?? ''), 'role' => $u['role'] ?? 'admin', 'active' => (int)($u['active'] ?? 1) === 1,
    'created' => (int)$u['created'], 'lastLogin' => (int)($u['last_login'] ?? 0), 'perms' => admin_perms($u)];
}
/** Secrets (courier keys, CAPI token, chat key…) only go to roles that may open Settings. */
function settings_for_admin(array $u, $st) {
  if (admin_can($u, 'settings') || !is_array($st)) return $st;
  unset($st['courier']);
  if (isset($st['tracking']) && is_array($st['tracking'])) unset($st['tracking']['metaCapiToken']);
  if (isset($st['chat']) && is_array($st['chat'])) { $st['chat']['apiKey'] = ''; $st['chat']['relayUrl'] = ''; }
  if (isset($st['sms']) && is_array($st['sms'])) $st['sms']['relayUrl'] = '';
  return $st;
}
function active_supers(): int { return (int)q("SELECT COUNT(*) c FROM admins WHERE role = 'super_admin' AND active = 1")->fetch()['c']; }
function drop_admin_tokens(int $uid): void { q("DELETE FROM tokens WHERE kind = 'admin' AND uid = ?", [$uid]); }

/* ---------------- team endpoints (Super Admin only) ---------------- */
function h_team_list(): void {
  require_admin('team');
  out(['members' => array_map('admin_public', q('SELECT * FROM admins ORDER BY id')->fetchAll())]);
}

function h_team_add(): void {
  require_admin('team');
  $b = body();
  $name = s($b['name'] ?? '', 120); $email = strtolower(trim((string)($b['email'] ?? ''))); $pw = (string)($b['password'] ?? ''); $role = (string)($b['role'] ?? '');
  if ($name === '') fail(422, 'নাম লিখুন');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(422, 'সঠিক ইমেইল দিন');
  if (strlen($pw) < 8) fail(422, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
  if (!isset(ADMIN_ROLES[$role])) fail(422, 'রোল সঠিক নয়');
  if (q('SELECT 1 FROM admins WHERE email = ?', [$email])->fetch()) fail(422, 'এই ইমেইলে আগেই একটি অ্যাকাউন্ট আছে');
  $phone = norm_phone((string)($b['phone'] ?? ''));
  if ($phone !== '' && !valid_phone($phone)) fail(422, 'সঠিক মোবাইল নাম্বার দিন (SMS-এর জন্য)');
  q('INSERT INTO admins (email, name, pass, created, role, active, phone) VALUES (?,?,?,?,?,1,?)', [$email, $name, password_hash($pw, PASSWORD_DEFAULT), now_ms(), $role, $phone]);
  out(['member' => admin_public(q('SELECT * FROM admins WHERE email = ?', [$email])->fetch())]);
}

function h_team_update(string $id): void {
  $me = require_admin('team');
  $b = body(); $uid = (int)$id;
  $u = q('SELECT * FROM admins WHERE id = ?', [$uid])->fetch();
  if (!$u) fail(404, 'সদস্য পাওয়া যায়নি');
  $role = array_key_exists('role', $b) ? (string)$b['role'] : $u['role'];
  $active = array_key_exists('active', $b) ? (!empty($b['active']) ? 1 : 0) : (int)$u['active'];
  if (!isset(ADMIN_ROLES[$role])) fail(422, 'রোল সঠিক নয়');
  $wasSuper = $u['role'] === 'super_admin' && (int)$u['active'] === 1;
  if ($wasSuper && ($role !== 'super_admin' || $active === 0) && active_supers() <= 1) fail(422, 'কমপক্ষে একজন সক্রিয় Super Admin থাকতে হবে');
  if ($uid === (int)$me['id'] && $active === 0) fail(422, 'নিজের অ্যাকাউন্ট বন্ধ করা যাবে না');
  $name = array_key_exists('name', $b) ? s($b['name'], 120) : $u['name'];
  if ($name === '') fail(422, 'নাম লিখুন');
  $phone = array_key_exists('phone', $b) ? norm_phone((string)$b['phone']) : (string)($u['phone'] ?? '');
  if ($phone !== '' && !valid_phone($phone)) fail(422, 'সঠিক মোবাইল নাম্বার দিন (SMS-এর জন্য)');
  $sql = 'UPDATE admins SET name = ?, role = ?, active = ?, phone = ?'; $args = [$name, $role, $active, $phone];
  if (isset($b['password']) && $b['password'] !== '') {
    if (strlen((string)$b['password']) < 8) fail(422, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
    $sql .= ', pass = ?'; $args[] = password_hash((string)$b['password'], PASSWORD_DEFAULT);
  }
  q($sql . ' WHERE id = ?', array_merge($args, [$uid]));
  if ($uid !== (int)$me['id'] && ($active === 0 || (isset($b['password']) && $b['password'] !== ''))) drop_admin_tokens($uid); // force a fresh login
  out(['member' => admin_public(q('SELECT * FROM admins WHERE id = ?', [$uid])->fetch())]);
}

function h_team_delete(string $id): void {
  $me = require_admin('team'); $uid = (int)$id;
  $u = q('SELECT * FROM admins WHERE id = ?', [$uid])->fetch();
  if (!$u) fail(404, 'সদস্য পাওয়া যায়নি');
  if ($uid === (int)$me['id']) fail(422, 'নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না');
  if ($u['role'] === 'super_admin' && (int)$u['active'] === 1 && active_supers() <= 1) fail(422, 'কমপক্ষে একজন সক্রিয় Super Admin থাকতে হবে');
  q('DELETE FROM admins WHERE id = ?', [$uid]);
  drop_admin_tokens($uid);
  out(['ok' => true]);
}
