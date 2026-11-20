<?php
/*
 * Complain Box — customers report a problem (damaged / wrong item / return / refund …) with photos & videos,
 * get a complaint ID by SMS, and follow every step at /complain/track. The team works it from Admin → Complain Box:
 * status steps, a team member per segment (refund, return …), messages to the customer, internal notes,
 * and deleting the media once the case is closed so the hosting does not fill up.
 *
 * Stored as documents in the `complaints` collection (k = phone, k2 = assignee id, k3 = order invoice).
 * Media files live in uploads/complaints/ with long random names (no directory listing, scripts blocked).
 */
declare(strict_types=1);

const CMP_STATUSES = ['submitted', 'received', 'reviewing', 'processing', 'resolved', 'rejected'];
const CMP_STATUS_TEXT = ['submitted' => 'Submitted', 'received' => 'Complaint received', 'reviewing' => 'Under review', 'processing' => 'Being resolved', 'resolved' => 'Resolved', 'rejected' => 'Not accepted'];
const CMP_TYPES = ['damaged' => 'Damaged / broken product', 'wrong' => 'Wrong product / colour', 'missing' => 'Missing parts or items', 'quality' => 'Quality / defect problem', 'return' => 'Return', 'refund' => 'Refund', 'delivery' => 'Delivery problem', 'other' => 'Other'];
const CMP_SEGMENTS = ['refund' => 'Refund', 'return' => 'Return', 'replace' => 'Replacement', 'delivery' => 'Delivery', 'general' => 'General'];
const CMP_TYPE_SEGMENT = ['damaged' => 'replace', 'wrong' => 'replace', 'missing' => 'replace', 'quality' => 'replace', 'return' => 'return', 'refund' => 'refund', 'delivery' => 'delivery', 'other' => 'general'];
const CMP_WANTS = ['replace' => 'Replacement', 'refund' => 'Refund', 'repair' => 'Repair / parts', 'return' => 'Return', 'other' => 'Something else'];
const CMP_MAX_FILES = 8;
const CMP_IMG_MB = 12;

/** saved settings (Admin → Complain Box → Settings) on top of the defaults below — keep in step with src/store/complaintsConfig.js */
function cmp_defaults(): array {
  return [
    'smsEnabled' => true,
    'events' => ['submitted' => true, 'received' => true, 'reviewing' => false, 'processing' => true, 'resolved' => true, 'rejected' => true, 'message' => true, 'assigned' => true],
    'templates' => [
      'submitted' => '{name}, your complaint has been received. Complaint ID: {id}. Track it: {link} -{shop}',
      'received' => 'Complaint {id} has been accepted. Our team is working on it. {link}',
      'reviewing' => 'Complaint {id} is under review. Update: {link}',
      'processing' => 'Complaint {id} is being resolved. Details: {link}',
      'resolved' => '{name}, your complaint {id} is resolved. Please rate us: {link} -{shop}',
      'rejected' => 'We have an update on complaint {id}. Details: {link} Helpline {hotline}',
      'message' => 'Complaint {id}: {message} -{shop}',
      'assigned' => 'New complaint {id} ({segment}) assigned to you. {customer} {phone}. Open: {admin}',
    ],
    'routing' => ['refund' => 0, 'return' => 0, 'replace' => 0, 'delivery' => 0, 'general' => 0],
    'maxVideoMB' => 60,
  ];
}
function cmp_settings(): array {
  static $c = null;
  if ($c !== null) return $c;
  $saved = kv_get('settings', [])['complaints'] ?? [];
  return $c = array_replace_recursive(cmp_defaults(), is_array($saved) ? $saved : []);
}
function cmp_video_mb(): int { return max(5, min(200, (int)(cmp_settings()['maxVideoMB'] ?? 60))); }
function cmp_dir(): string { return rtrim((string)cfg('upload_dir', dirname(__DIR__) . '/uploads'), '/') . '/complaints'; }
function cmp_url(string $name): string { return rtrim((string)cfg('upload_url', '/uploads'), '/') . '/complaints/' . $name; }

/** secret used to sign the "open without typing the phone" link sent by SMS */
function cmp_secret(): string {
  $k = (string)cfg('app_key', '');
  if ($k !== '') return $k;
  $s = kv_get('cmp_secret');
  if (!is_string($s) || strlen($s) < 32) { $s = bin2hex(random_bytes(24)); kv_set('cmp_secret', $s); }
  return $s;
}
function cmp_sig(array $c): string { return substr(hash_hmac('sha256', $c['id'] . '|' . $c['phone'], cmp_secret()), 0, 10); }
function cmp_link(array $c): string {
  $set = kv_get('settings', []);
  $site = rtrim(trim((string)($set['sms']['siteUrl'] ?? '')) ?: site_url(), '/');
  return $site . '/c/' . $c['id'] . '-' . cmp_sig($c); // short link (fewer SMS parts) → /complain/track
}
function cmp_new_id(): string {
  $abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for ($i = 0; $i < 20; $i++) {
    $id = 'CM';
    for ($j = 0; $j < 6; $j++) $id .= $abc[random_int(0, strlen($abc) - 1)];
    if (!doc_get('complaints', $id)) return $id;
  }
  fail(500, 'Could not create a complaint ID');
}

/** what the customer may see (no internal notes, no staff phone numbers) */
function cmp_public(array $c): array {
  $hist = array_values(array_filter($c['history'] ?? [], fn($h) => !empty($h['public'])));
  $hist = array_map(fn($h) => ['at' => (int)$h['at'], 'type' => (string)($h['type'] ?? ''), 's' => (string)($h['s'] ?? ''), 'text' => (string)($h['text'] ?? ''), 'by' => ($h['by'] ?? '') === 'customer' ? 'customer' : 'shop', 'files' => $h['files'] ?? []], $hist);
  $files = array_values(array_map(fn($f) => ['name' => $f['name'], 'type' => $f['type'], 'url' => empty($f['deleted']) ? $f['url'] : '', 'deleted' => !empty($f['deleted']), 'by' => $f['by'] ?? 'customer', 'at' => (int)($f['at'] ?? 0)], $c['files'] ?? []));
  return [
    'id' => $c['id'], 'status' => $c['status'], 'statusText' => CMP_STATUS_TEXT[$c['status']] ?? '', 'type' => $c['type'], 'typeText' => CMP_TYPES[$c['type']] ?? '',
    'want' => $c['want'] ?? '', 'name' => $c['name'], 'phone' => $c['phone'], 'invoice' => $c['invoice'] ?? '', 'items' => $c['items'] ?? [], 'description' => $c['description'] ?? '',
    'createdAt' => (int)$c['createdAt'], 'updated' => (int)($c['updated'] ?? $c['createdAt']), 'steps' => $c['steps'] ?? [], 'history' => $hist, 'files' => $files,
    'rating' => $c['rating'] ?? null, 'assigned' => !empty($c['assignee']), 'canReply' => !in_array($c['status'], ['resolved', 'rejected'], true),
    'sig' => cmp_sig($c),
  ];
}

/* ---------------- SMS (only for the Complain Box) ---------------- */
function cmp_render(string $tpl, array $c, array $extra = []): string {
  $set = kv_get('settings', []);
  $first = preg_split('/\s+/', trim((string)($c['name'] ?? '')))[0] ?? '';
  $map = ['{name}' => $first ?: 'Customer', '{id}' => $c['id'], '{link}' => cmp_link($c), '{status}' => CMP_STATUS_TEXT[$c['status']] ?? '', '{type}' => CMP_TYPES[$c['type']] ?? '',
    '{customer}' => (string)($c['name'] ?? ''), '{phone}' => (string)($c['phone'] ?? ''), '{invoice}' => (string)($c['invoice'] ?? ''), '{hotline}' => (string)($set['phone'] ?? ''),
    '{shop}' => (string)($set['siteName'] ?? 'Smart China Gallery'), '{segment}' => CMP_SEGMENTS[$c['segment'] ?? 'general'] ?? '', '{assignee}' => (string)($c['assignee']['name'] ?? ''),
    '{admin}' => rtrim(trim((string)($set['sms']['siteUrl'] ?? '')) ?: site_url(), '/') . '/admin/complaints?open=' . $c['id']] + $extra;
  return trim(preg_replace('/[ \t]{2,}/u', ' ', strtr($tpl, $map)));
}
/** $event: submitted|received|reviewing|processing|resolved|rejected|message|assigned. Returns the log entry or null. */
function cmp_sms(array $c, string $event, string $to = '', bool $force = false): ?array {
  try {
    $cs = cmp_settings();
    if (!$force && (empty($cs['smsEnabled']) || empty($cs['events'][$event]))) return null;
    $tpl = (string)($cs['templates'][$event] ?? '');
    if ($tpl === '') return null;
    $to = $to ?: (string)$c['phone'];
    if (!valid_phone(norm_phone($to))) return null;
    return sms_send_logged($to, cmp_render($tpl, $c), 'complaint_' . $event, $c['id']);
  } catch (Throwable $e) { error_log('cmp_sms: ' . $e->getMessage()); return null; }
}

/* ---------------- media upload (public, before the complaint is created) ---------------- */
function h_cmp_upload(): void {
  limit_or_fail('cmpup:' . client_ip(), 40, 3600, 'Too many uploads — please try again later');
  $f = $_FILES['file'] ?? null;
  if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
    $code = (int)($f['error'] ?? 4);
    fail(422, in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'The file is too large (max ' . ini_get('upload_max_filesize') . ')' : 'Upload failed — please try again');
  }
  $mime = '';
  if (class_exists('finfo')) $mime = (string)(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
  $img = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/heic' => 'heic', 'image/heif' => 'heic', 'image/gif' => 'gif'];
  $vid = ['video/mp4' => 'mp4', 'video/quicktime' => 'mov', 'video/webm' => 'webm', 'video/3gpp' => '3gp', 'video/x-matroska' => 'mkv', 'video/x-msvideo' => 'avi'];
  if ($mime === '' && @getimagesize($f['tmp_name'])) $mime = (string)getimagesize($f['tmp_name'])['mime'];
  if (isset($img[$mime])) { $type = 'image'; $ext = $img[$mime]; $max = CMP_IMG_MB; }
  elseif (isset($vid[$mime])) { $type = 'video'; $ext = $vid[$mime]; $max = cmp_video_mb(); }
  else fail(422, 'Only photos (JPG, PNG, WebP, HEIC) or videos (MP4, MOV, WebM) are allowed');
  if ($f['size'] > $max * 1024 * 1024) fail(422, ($type === 'video' ? 'Videos' : 'Photos') . " can be up to {$max}MB");
  $dir = cmp_dir();
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail(500, 'Could not create the upload folder');
  if (!is_file("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Options -Indexes -ExecCGI\n<FilesMatch \"\\.(php|phtml|php\\d|phar|pl|py|cgi|sh|html?|svg|js)$\">\n  Require all denied\n</FilesMatch>\nRemoveHandler .php .phtml\n");
  $name = date('ym') . '-' . bin2hex(random_bytes(12)) . ".$ext";
  if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) fail(500, 'Could not save the file');
  @chmod("$dir/$name", 0644);
  kv_set('cu:' . $name, ['at' => time(), 'type' => $type, 'size' => (int)$f['size']]); // pending until a complaint claims it
  if (random_int(1, 25) === 1) cmp_cleanup_orphans();
  out(['token' => $name, 'type' => $type, 'size' => (int)$f['size'], 'url' => cmp_url($name)]);
}
/** files uploaded but never attached to a complaint (form abandoned) are removed after a day */
function cmp_cleanup_orphans(): void {
  try {
    $rows = q("SELECT k, v FROM kv WHERE k LIKE 'cu:%' LIMIT 200")->fetchAll();
    foreach ($rows as $r) {
      $v = jdec($r['v']);
      if ((int)($v['at'] ?? 0) < time() - 86400) { @unlink(cmp_dir() . '/' . basename(substr($r['k'], 3))); q('DELETE FROM kv WHERE k = ?', [$r['k']]); }
    }
  } catch (Throwable $e) { error_log('cmp_cleanup: ' . $e->getMessage()); }
}
/** turn upload tokens into file records (only tokens that are still pending) */
function cmp_claim_files(array $tokens, string $by): array {
  $out = [];
  foreach (array_slice($tokens, 0, CMP_MAX_FILES) as $t) {
    $t = basename((string)$t);
    if (!preg_match('/^\d{4}-[a-f0-9]{24}\.[a-z0-9]{2,4}$/', $t)) continue;
    $p = kv_get('cu:' . $t);
    if (!is_array($p) || !is_file(cmp_dir() . "/$t")) continue;
    q('DELETE FROM kv WHERE k = ?', ['cu:' . $t]);
    $out[] = ['name' => $t, 'url' => cmp_url($t), 'type' => $p['type'] === 'video' ? 'video' : 'image', 'size' => (int)$p['size'], 'at' => now_ms(), 'by' => $by];
  }
  return $out;
}

/* ---------------- customer endpoints ---------------- */
function cmp_find_for_customer(string $id, array $b): array {
  $c = doc_get('complaints', strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $id)));
  $phone = norm_phone((string)($b['phone'] ?? ''));
  $sig = (string)($b['sig'] ?? '');
  if (!$c || !(($phone !== '' && $phone === $c['phone']) || ($sig !== '' && hash_equals(cmp_sig($c), $sig)))) fail(404, 'No complaint found for this mobile number');
  return $c;
}

function h_cmp_create(): void {
  limit_or_fail('cmpnew:' . client_ip(), 8, 3600, 'Too many complaints submitted — please try again later');
  $b = body();
  $name = s((string)($b['name'] ?? ''), 120);
  $phone = norm_phone((string)($b['phone'] ?? ''));
  $type = (string)($b['type'] ?? '');
  $desc = s((string)($b['description'] ?? ''), 3000);
  $want = (string)($b['want'] ?? '');
  if ($name === '') fail(422, 'Enter your name');
  if (!valid_phone($phone)) fail(422, 'Enter a valid 11-digit mobile number');
  if (!isset(CMP_TYPES[$type])) fail(422, 'Select the type of problem');
  if (mb_strlen($desc) < 10) fail(422, 'Please describe the problem (at least 10 characters)');
  if (!isset(CMP_WANTS[$want])) $want = 'other';
  // a linked order must belong to this phone number
  $invoice = strtoupper(s((string)($b['invoice'] ?? ''), 20));
  $order = null; $items = [];
  if ($invoice !== '') {
    $order = doc_by('orders', 'k', $invoice);
    if (!$order || $order['phone'] !== $phone) { $order = null; }
  }
  if ($order) {
    $pick = array_map('strval', (array)($b['items'] ?? []));
    foreach ($order['items'] as $it) {
      $key = (string)($it['productId'] ?? $it['slug'] ?? $it['name']);
      if ($pick && !in_array($key, $pick, true)) continue;
      $p = doc_get('products', (string)($it['productId'] ?? '')) ?? doc_by('products', 'k', (string)($it['slug'] ?? ''));
      $items[] = ['key' => $key, 'name' => (string)$it['name'], 'quantity' => (int)$it['quantity'], 'price' => (int)$it['price'], 'image' => (string)($p['images'][0] ?? '')];
    }
  }
  $files = cmp_claim_files((array)($b['files'] ?? []), 'customer');
  $now = now_ms();
  $segment = CMP_TYPE_SEGMENT[$type] ?? 'general';
  if ($want === 'refund') $segment = 'refund'; elseif ($want === 'return' && $segment === 'replace') $segment = 'return';
  $c = [
    'id' => cmp_new_id(), 'createdAt' => $now, 'updated' => $now, 'status' => 'submitted', 'steps' => ['submitted' => $now],
    'type' => $type, 'want' => $want, 'segment' => $segment, 'priority' => in_array($type, ['damaged', 'wrong', 'missing'], true) ? 'high' : 'normal',
    'name' => $name, 'phone' => $phone, 'altPhone' => s((string)($b['altPhone'] ?? ''), 20), 'contactTime' => s((string)($b['contactTime'] ?? ''), 60),
    'invoice' => $order['invoice'] ?? ($invoice !== '' ? $invoice : ''), 'orderId' => $order['id'] ?? '', 'orderVerified' => (bool)$order,
    'orderTotal' => (int)($order['total'] ?? 0), 'orderDate' => (int)($order['createdAt'] ?? 0), 'orderStatus' => (string)($order['status'] ?? ''),
    'items' => $items, 'description' => $desc, 'files' => $files, 'assignee' => null, 'unread' => true, 'rating' => null,
    'country' => function_exists('visitor_country') ? visitor_country(s((string)($b['tz'] ?? ''), 60)) : '',
    'history' => [['at' => $now, 'type' => 'status', 's' => 'submitted', 'by' => 'customer', 'public' => true, 'text' => 'Complaint submitted' . ($files ? ' · ' . count($files) . ' file(s) attached' : '')]],
  ];
  // automatic routing: segment → team member (Admin → Complain Box → Settings)
  $cs = cmp_settings();
  $aid = (int)($cs['routing'][$segment] ?? 0);
  $who = $aid ? q('SELECT * FROM admins WHERE id = ? AND active = 1', [$aid])->fetch() : null;
  if ($who) {
    $c['assignee'] = ['id' => (int)$who['id'], 'name' => $who['name'], 'phone' => (string)($who['phone'] ?? '')];
    $c['history'][] = ['at' => $now + 1, 'type' => 'assign', 'by' => 'system', 'public' => false, 'text' => 'Auto-assigned to ' . $who['name'] . ' (' . (CMP_SEGMENTS[$segment] ?? $segment) . ')'];
  }
  doc_put('complaints', $c);
  cmp_sms($c, 'submitted');
  if ($who && !empty($who['phone'])) cmp_sms($c, 'assigned', (string)$who['phone']);
  out(['id' => $c['id'], 'sig' => cmp_sig($c), 'complaint' => cmp_public($c)]);
}

function h_cmp_track(): void {
  limit_or_fail('cmptr:' . client_ip(), 60, 3600);
  $b = body();
  $c = cmp_find_for_customer((string)($b['id'] ?? ''), $b);
  out(['complaint' => cmp_public($c)]);
}

/** every complaint made with this phone number (newest first) — the customer only types the phone */
function h_cmp_by_phone(): void {
  limit_or_fail('cmpph:' . client_ip(), 30, 3600);
  $phone = norm_phone((string)(body()['phone'] ?? ''));
  if (!valid_phone($phone)) fail(422, 'Enter a valid 11-digit mobile number');
  $rows = q("SELECT data FROM docs WHERE coll = 'complaints' AND k = ? ORDER BY updated DESC LIMIT 20", [$phone])->fetchAll();
  $list = array_map(fn($r) => cmp_public(jdec($r['data'])), $rows);
  usort($list, fn($a, $b) => $b['createdAt'] <=> $a['createdAt']);
  if (!$list) fail(404, 'No complaints found for this number');
  out(['complaints' => $list]);
}

function h_cmp_reply(): void {
  limit_or_fail('cmprep:' . client_ip(), 20, 3600);
  $b = body();
  $c = cmp_find_for_customer((string)($b['id'] ?? ''), $b);
  if (in_array($c['status'], ['resolved', 'rejected'], true)) fail(422, 'This complaint is closed — please submit a new one for a new problem');
  $text = s((string)($b['text'] ?? ''), 2000);
  $files = cmp_claim_files((array)($b['files'] ?? []), 'customer');
  if ($text === '' && !$files) fail(422, 'Write something or add a file');
  if (count($c['files'] ?? []) + count($files) > 20) fail(422, 'No more files can be added to this complaint');
  $c['files'] = array_merge($c['files'] ?? [], $files);
  $c['history'][] = ['at' => now_ms(), 'type' => 'reply', 'by' => 'customer', 'public' => true, 'text' => $text, 'files' => array_column($files, 'name')];
  $c['updated'] = now_ms(); $c['unread'] = true;
  doc_put('complaints', $c);
  out(['complaint' => cmp_public($c)]);
}

function h_cmp_rate(): void {
  limit_or_fail('cmprate:' . client_ip(), 10, 3600);
  $b = body();
  $c = cmp_find_for_customer((string)($b['id'] ?? ''), $b);
  if ($c['status'] !== 'resolved') fail(422, 'You can rate once the complaint is resolved');
  $stars = max(1, min(5, (int)($b['stars'] ?? 0)));
  $c['rating'] = ['stars' => $stars, 'text' => s((string)($b['text'] ?? ''), 1000), 'at' => now_ms()];
  $c['history'][] = ['at' => now_ms(), 'type' => 'rating', 'by' => 'customer', 'public' => true, 'text' => str_repeat('★', $stars) . ($c['rating']['text'] ? ' — ' . $c['rating']['text'] : '')];
  $c['updated'] = now_ms(); $c['unread'] = true;
  doc_put('complaints', $c);
  out(['complaint' => cmp_public($c)]);
}

/* ---------------- admin ---------------- */
function h_cmp_staff(): void {
  require_admin('complaints');
  $rows = q('SELECT * FROM admins WHERE active = 1 ORDER BY id')->fetchAll();
  out(['staff' => array_map(fn($u) => ['id' => (int)$u['id'], 'name' => $u['name'], 'role' => $u['role'] ?? 'admin', 'phone' => (string)($u['phone'] ?? '')], $rows)]);
}

/**
 * One endpoint for every change the team makes, so the SMS + file deletion happen on the server.
 * body: { id, action: status|assign|message|note|priority|segment|files_delete|read|resolution, … }
 */
function h_cmp_action(): void {
  $me = require_admin('complaints');
  $b = body();
  $id = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['id'] ?? '')));
  $sent = [];
  $c = tx(function () use ($id, $b, $me, &$sent) {
    $c = doc_get('complaints', $id, true);
    if (!$c) fail(404, 'Complaint not found');
    $now = now_ms(); $by = $me['name']; $act = (string)($b['action'] ?? '');
    $msg = s((string)($b['message'] ?? ''), 1000);
    $wantSms = !empty($b['sms']);
    switch ($act) {
      case 'status':
        $s = (string)($b['status'] ?? '');
        if (!in_array($s, CMP_STATUSES, true)) fail(422, 'Unknown status');
        if ($s === $c['status'] && $msg === '') fail(422, 'Status is unchanged');
        $c['status'] = $s; $c['steps'][$s] = $now;
        if ($s === 'resolved' && isset($b['refundAmount']) && is_numeric($b['refundAmount'])) $c['refundAmount'] = max(0, (int)$b['refundAmount']);
        $c['history'][] = ['at' => $now, 'type' => 'status', 's' => $s, 'by' => $by, 'public' => true, 'text' => $msg];
        if ($wantSms) $sent[] = ['event' => $s, 'to' => ''];
        break;
      case 'message':
        if ($msg === '') fail(422, 'Write a message');
        $c['history'][] = ['at' => $now, 'type' => 'message', 'by' => $by, 'public' => true, 'text' => $msg];
        if ($wantSms) $sent[] = ['event' => 'message', 'to' => '', 'extra' => ['{message}' => $msg]];
        break;
      case 'note':
        if ($msg === '') fail(422, 'Write a note');
        $c['history'][] = ['at' => $now, 'type' => 'note', 'by' => $by, 'public' => false, 'text' => $msg];
        break;
      case 'assign':
        $seg = (string)($b['segment'] ?? $c['segment']);
        if (isset(CMP_SEGMENTS[$seg])) $c['segment'] = $seg;
        $aid = (int)($b['assigneeId'] ?? 0);
        if ($aid) {
          $u = q('SELECT * FROM admins WHERE id = ? AND active = 1', [$aid])->fetch();
          if (!$u) fail(422, 'Team member not found');
          $c['assignee'] = ['id' => (int)$u['id'], 'name' => $u['name'], 'phone' => (string)($u['phone'] ?? '')];
          $c['history'][] = ['at' => $now, 'type' => 'assign', 'by' => $by, 'public' => false, 'text' => (CMP_SEGMENTS[$c['segment']] ?? '') . ' → ' . $u['name'] . ($msg ? " · $msg" : '')];
          if ($wantSms && !empty($u['phone'])) $sent[] = ['event' => 'assigned', 'to' => (string)$u['phone'], 'force' => true];
        } else {
          $c['assignee'] = null;
          $c['history'][] = ['at' => $now, 'type' => 'assign', 'by' => $by, 'public' => false, 'text' => 'Segment: ' . (CMP_SEGMENTS[$c['segment']] ?? '') . ' · unassigned'];
        }
        break;
      case 'priority':
        $p = (string)($b['priority'] ?? 'normal');
        if (!in_array($p, ['low', 'normal', 'high', 'urgent'], true)) fail(422, 'Unknown priority');
        $c['priority'] = $p;
        $c['history'][] = ['at' => $now, 'type' => 'note', 'by' => $by, 'public' => false, 'text' => "Priority: $p"];
        break;
      case 'files_delete':
        $names = $b['names'] ?? 'all';
        $n = 0; $freed = 0;
        foreach ($c['files'] as &$f) {
          if (!empty($f['deleted']) || ($names !== 'all' && !in_array($f['name'], (array)$names, true))) continue;
          @unlink(cmp_dir() . '/' . basename($f['name']));
          $f['deleted'] = true; $f['deletedAt'] = $now; $f['url'] = ''; $n++; $freed += (int)$f['size'];
        }
        unset($f);
        if (!$n) fail(422, 'No files to delete');
        $c['history'][] = ['at' => $now, 'type' => 'files', 'by' => $by, 'public' => false, 'text' => "{$n} file(s) deleted from the server (" . round($freed / 1048576, 1) . ' MB)'];
        break;
      case 'read':
        $c['unread'] = false;
        doc_put('complaints', $c);
        return $c;
      default:
        fail(422, 'Unknown action');
    }
    $c['updated'] = $now;
    $c['unread'] = false;
    doc_put('complaints', $c);
    return $c;
  });
  $log = [];
  foreach ($sent as $x) {
    if (!empty($x['extra'])) {
      $cs = cmp_settings(); $tpl = (string)($cs['templates']['message'] ?? '');
      if ($tpl !== '') $log[] = sms_send_logged($c['phone'], cmp_render($tpl, $c, $x['extra']), 'complaint_message', $c['id']);
      continue;
    }
    $r = cmp_sms($c, $x['event'], $x['to'], true); // the team member ticked “send SMS”
    if ($r) $log[] = $r;
  }
  if ($log) {
    $c = doc_get('complaints', $c['id']) ?? $c;
    foreach ($log as $l) $c['history'][] = ['at' => now_ms(), 'type' => 'sms', 'by' => 'system', 'public' => false, 'text' => 'SMS → ' . $l['to'] . ' · ' . ($l['status'] === 'sent' ? 'sent' : 'not sent: ' . ($l['info'] ?? $l['status']))];
    doc_put('complaints', $c);
  }
  out(['complaint' => $c, 'sms' => $log]);
}

/** delete media of every resolved / rejected complaint older than N days (bulk storage cleanup) */
function h_cmp_cleanup(): void {
  $me = require_admin('complaints');
  $days = max(0, (int)(body()['days'] ?? 0));
  $n = 0; $freed = 0; $cases = 0;
  foreach (doc_all('complaints') as $c) {
    if (!in_array($c['status'], ['resolved', 'rejected'], true)) continue;
    $closedAt = (int)($c['steps'][$c['status']] ?? $c['updated']);
    if ($closedAt > now_ms() - $days * 86400000) continue;
    $k = 0;
    foreach ($c['files'] as &$f) { if (!empty($f['deleted'])) continue; @unlink(cmp_dir() . '/' . basename($f['name'])); $f['deleted'] = true; $f['deletedAt'] = now_ms(); $f['url'] = ''; $k++; $freed += (int)$f['size']; }
    unset($f);
    if ($k) { $c['history'][] = ['at' => now_ms(), 'type' => 'files', 'by' => $me['name'], 'public' => false, 'text' => "{$k} file(s) deleted (bulk cleanup)"]; $c['updated'] = now_ms(); doc_put('complaints', $c); $n += $k; $cases++; }
  }
  out(['ok' => true, 'files' => $n, 'cases' => $cases, 'freedMB' => round($freed / 1048576, 1)]);
}
