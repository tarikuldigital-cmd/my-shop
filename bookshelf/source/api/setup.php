<?php
/*
 * One-time installer. Open https://yourdomain.com/api/setup.php in the browser, fill the form, done.
 * It creates api/config.php, the database tables, loads the books/categories, creates your admin login and then deletes itself.
 * CLI (for testing):  php setup.php driver=sqlite sqlite=/tmp/x.sqlite site_url=http://localhost:8080 admin_email=a@b.c admin_pass=secret123
 */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');
require __DIR__ . '/lib/core.php';

function run_install(array $p): array {
  $root = __DIR__;
  if (is_file("$root/config.php")) throw new RuntimeException('Already installed. Delete api/config.php only if you really want to start over.');
  $driver = ($p['driver'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
  $email = strtolower(trim((string)($p['admin_email'] ?? ''))); $pass = (string)($p['admin_pass'] ?? '');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Admin email is not valid');
  if (strlen($pass) < 8) throw new RuntimeException('Admin password must be at least 8 characters');
  $site = rtrim(trim((string)($p['site_url'] ?? '')), '/');
  if (!preg_match('#^https?://[^/\s]+$#', $site)) throw new RuntimeException('Site URL must look like https://bookshelf.com.bd (no slash at the end)');
  $db = $driver === 'sqlite'
    ? ['driver' => 'sqlite', 'sqlite' => (string)($p['sqlite'] ?? "$root/data.sqlite")]
    : ['driver' => 'mysql', 'host' => trim((string)($p['db_host'] ?? 'localhost')) ?: 'localhost', 'name' => trim((string)($p['db_name'] ?? '')), 'user' => trim((string)($p['db_user'] ?? '')), 'pass' => (string)($p['db_pass'] ?? '')];
  if ($driver === 'mysql' && ($db['name'] === '' || $db['user'] === '')) throw new RuntimeException('Database name and user are required');
  $config = [
    'db' => $db, 'site_url' => $site, 'secret' => bin2hex(random_bytes(24)),
    'upload_dir' => dirname($root) . '/uploads', 'upload_url' => '/uploads',
    'cors' => [], 'trust_cloudflare' => false,
    'sms' => ['provider' => 'off', 'api_key' => '', 'sender_id' => '', 'url_template' => ''],
    'steadfast_webhook_token' => bin2hex(random_bytes(16)),
  ];
  // test the connection BEFORE writing anything
  file_put_contents("$root/config.php", '<?php return ' . var_export($config, true) . ';');
  @chmod("$root/config.php", 0600);
  try {
    db();
    create_schema();
    $seed = json_decode((string)file_get_contents("$root/seed/seed.json"), true);
    if (!$seed) throw new RuntimeException('seed/seed.json is missing or broken');
    tx(function () use ($seed, $email, $pass, $p) {
      if (doc_count('products') === 0) {
        foreach ($seed['products'] as $i => $d) doc_put('products', $d, $i);
        foreach ($seed['categories'] as $i => $d) doc_put('categories', $d, $i);
        foreach ($seed['coupons'] as $i => $d) doc_put('coupons', $d, $i);
        $set = $seed['settings'];
        kv_set('settings', $set); kv_set('home', $seed['home']); kv_set('pages', $seed['pages']); kv_set('fraud', new stdClass());
        kv_set('nextInvoice', (int)$seed['nextInvoice']);
      }
      q('INSERT INTO admins (email, name, pass, created) VALUES (?,?,?,?)', [$email, trim((string)($p['admin_name'] ?? '')) ?: 'Admin', password_hash($pass, PASSWORD_DEFAULT), now_ms()]);
    });
    $up = $config['upload_dir'];
    if (!is_dir($up)) @mkdir($up, 0755, true);
    if (is_dir($up)) file_put_contents("$up/.htaccess", "# images only — never run scripts from here\n<FilesMatch \"\\.(php|phtml|php\\d|phar|pl|py|cgi|sh)$\">\n  Require all denied\n</FilesMatch>\nOptions -Indexes -ExecCGI\nRemoveHandler .php .phtml\n");
  } catch (Throwable $e) {
    @unlink("$root/config.php"); // let the person fix the details and try again
    throw $e;
  }
  return ['webhook_token' => $config['steadfast_webhook_token'], 'uploads' => is_dir($up) && is_writable($up)];
}

if (PHP_SAPI === 'cli') {
  $args = []; foreach (array_slice($argv, 1) as $a) { if (str_contains($a, '=')) { [$k, $v] = explode('=', $a, 2); $args[$k] = $v; } }
  try { $r = run_install($args); echo "OK ", json_encode($r), "\n"; } catch (Throwable $e) { fwrite(STDERR, 'FAILED: ' . $e->getMessage() . "\n"); exit(1); }
  exit;
}

$done = null; $err = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  try { $done = run_install($_POST); } catch (Throwable $e) { $err = $e->getMessage(); }
}
$already = is_file(__DIR__ . '/config.php') && !$done;
$v = fn($k, $d = '') => htmlspecialchars((string)($_POST[$k] ?? $d), ENT_QUOTES);
$guess = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'yourdomain.com');
?><!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bookshelf — Setup</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#f4f6f4;margin:0;padding:24px}main{max-width:560px;margin:auto;background:#fff;border:1px solid #dfe5df;border-radius:12px;padding:24px}
h1{margin:0 0 4px;color:#15803d}label{display:block;margin:12px 0 4px;font-weight:600}input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #c9d1c9;border-radius:8px;font:inherit}
button{margin-top:18px;background:#15803d;color:#fff;border:0;border-radius:8px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer;width:100%}.e{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:10px;border-radius:8px;margin:12px 0}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:12px;border-radius:8px}small{color:#667}code{background:#eef2ee;padding:2px 5px;border-radius:4px}fieldset{border:1px solid #dfe5df;border-radius:8px;margin-top:16px}legend{padding:0 6px;font-weight:700}</style></head><body><main>
<h1>Bookshelf — Backend Setup</h1><small>একবারই করতে হবে · এক মিনিটের কাজ</small>
<?php if ($done): ?>
  <div class="ok"><b>✅ ইনস্টল সম্পন্ন!</b><br>ডাটাবেস টেবিল, বইয়ের তালিকা ও আপনার অ্যাডমিন লগইন তৈরি হয়েছে।<?php if (!$done['uploads']): ?><br><b>⚠ <code>uploads</code> ফোল্ডার লেখা যাচ্ছে না — File Manager-এ public_html/uploads তৈরি করে permission 755 দিন।</b><?php endif; ?></div>
  <p><b>এখন:</b></p><ol>
    <li><a href="<?= htmlspecialchars($guess) ?>/admin">/admin</a> এ গিয়ে আপনার ইমেইল-পাসওয়ার্ড দিয়ে লগইন করুন।</li>
    <li>Admin → Settings থেকে ফোন নাম্বার, bKash/Nagad, Steadfast key বসান।</li>
    <li>SMS চালু করতে <code>api/config.php</code> খুলে <code>sms</code> অংশে provider ও api_key দিন (গাইডে দেখানো আছে)।</li>
    <li>Steadfast webhook token (Steadfast প্যানেলে বসাবেন): <code><?= htmlspecialchars($done['webhook_token']) ?></code> (পরে <code>api/config.php</code> এও পাবেন)</li></ol>
  <?php @unlink(__FILE__); echo is_file(__FILE__) ? '<div class="e">নিরাপত্তার জন্য <b>api/setup.php</b> ফাইলটি File Manager থেকে ডিলিট করে দিন।</div>' : '<p><small>setup.php নিজে নিজেই ডিলিট হয়ে গেছে।</small></p>'; ?>
<?php elseif ($already): ?>
  <div class="ok">ইতিমধ্যে ইনস্টল করা আছে। নিরাপত্তার জন্য এই <code>setup.php</code> ফাইলটি ডিলিট করে দিন।</div>
<?php else: ?>
  <?php if ($err): ?><div class="e"><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <form method="post">
    <fieldset><legend>১. ডাটাবেস (cPanel → MySQL Databases)</legend>
      <label>Database name</label><input name="db_name" value="<?= $v('db_name') ?>" placeholder="cpuser_bookshelf" required>
      <label>Database user</label><input name="db_user" value="<?= $v('db_user') ?>" placeholder="cpuser_bsuser" required>
      <label>Database password</label><input name="db_pass" type="password" value="<?= $v('db_pass') ?>">
      <label>Host</label><input name="db_host" value="<?= $v('db_host', 'localhost') ?>"></fieldset>
    <fieldset><legend>২. ওয়েবসাইট</legend>
      <label>Site URL</label><input name="site_url" value="<?= $v('site_url', $guess) ?>" required><small>শেষে / দেবেন না</small></fieldset>
    <fieldset><legend>৩. আপনার অ্যাডমিন লগইন</legend>
      <label>নাম</label><input name="admin_name" value="<?= $v('admin_name', 'Admin') ?>">
      <label>ইমেইল</label><input name="admin_email" type="email" value="<?= $v('admin_email') ?>" required>
      <label>পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label><input name="admin_pass" type="password" minlength="8" required></fieldset>
    <button>ইনস্টল করুন</button>
  </form>
<?php endif; ?>
</main></body></html>
