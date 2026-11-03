<?php
/*
 * Bookshelf SMS relay — PHP version for shared hosting (cPanel) where Node is not available.
 * Upload as e.g. public_html/sms/index.php and put the settings below (or in sms-config.php next to it).
 * Same gateways as Bachelor Home: muthofun | bulksmsbd | template.
 *   POST /sms/?route=order-placed   (public)        POST /sms/?route=send  (header X-Admin-Secret)
 *   The React admin calls {SMS server URL}/sms/order-placed — set the URL to https://yourdomain/sms/index.php?r=
 *   or add the .htaccess rule from server/README.md so /sms/order-placed works.
 */
$CFG = [
  'SMS_PROVIDER' => 'muthofun', 'SMS_API_KEY' => '', 'SMS_SENDER_ID' => '', 'SMS_URL_TEMPLATE' => '',
  'ADMIN_SECRET' => '', 'ALLOWED_ORIGIN' => '*', 'SITE_URL' => 'https://bookshelf.com.bd',
];
if (is_file(__DIR__ . '/sms-config.php')) $CFG = array_merge($CFG, include __DIR__ . '/sms-config.php');

header('Access-Control-Allow-Origin: ' . $CFG['ALLOWED_ORIGIN']);
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Secret');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

$route = $_GET['route'] ?? basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if ($route === 'health') out(200, ['ok' => true, 'provider' => $CFG['SMS_PROVIDER']]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(404, ['ok' => false, 'error' => 'Not found']);

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$num = preg_replace('/\D/', '', $in['to'] ?? '');
if (str_starts_with($num, '0')) $num = '88' . $num;
$msg = trim($in['message'] ?? '');
$inv = (string)($in['invoice'] ?? '');
if (!preg_match('/^8801[3-9]\d{8}$/', $num)) out(400, ['ok' => false, 'error' => 'Invalid Bangladeshi mobile number']);
if ($msg === '' || mb_strlen($msg) > 320) out(400, ['ok' => false, 'error' => 'Message must be 1–320 characters']);

// simple file-based rate limit / once-per-invoice
$store = sys_get_temp_dir() . '/bookshelf_sms.json';
$db = is_file($store) ? (json_decode(file_get_contents($store), true) ?: []) : [];
$now = time();
$limit = function ($key, $max, $win) use (&$db, $now) { $db[$key] = array_values(array_filter($db[$key] ?? [], fn($t) => $now - $t < $win)); if (count($db[$key]) >= $max) return true; $db[$key][] = $now; return false; };

if ($route === 'send') {
  if (!$CFG['ADMIN_SECRET'] || ($_SERVER['HTTP_X_ADMIN_SECRET'] ?? '') !== $CFG['ADMIN_SECRET']) out(403, ['ok' => false, 'error' => 'Wrong admin secret']);
} elseif ($route === 'order-placed') {
  if (!preg_match('/^BS\d{6,}$/', $inv) || strpos($msg, $inv) === false) out(400, ['ok' => false, 'error' => 'Not an order confirmation']);
  if ($CFG['SITE_URL'] && strpos($msg, '/t/' . $inv . '-') === false) out(400, ['ok' => false, 'error' => 'Tracking link must point to SITE_URL']);
  if (!empty($db['inv'][$inv])) out(200, ['ok' => true, 'info' => 'Already sent for this order']);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  if ($limit("n:$num", 3, 3600) || $limit("ip:$ip", 10, 3600)) { file_put_contents($store, json_encode($db)); out(429, ['ok' => false, 'error' => 'Too many SMS, try later']); }
} else out(404, ['ok' => false, 'error' => 'Not found']);

function http_send($url, $opts) { $ch = curl_init($url); curl_setopt_array($ch, $opts + [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20]); $body = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); return [$code, (string)$body]; }
$p = strtolower($CFG['SMS_PROVIDER']);
if ($p === 'muthofun') {
  $key = trim($CFG['SMS_API_KEY']); if (!preg_match('/^token\s/i', $key)) $key = 'Token ' . $key;
  $payload = ['receiver' => substr($num, 2), 'message' => $msg, 'remove_duplicate' => true];
  if ($CFG['SMS_SENDER_ID']) $payload['sender_id'] = $CFG['SMS_SENDER_ID'];
  [$code, $body] = http_send('https://sysadmin.muthobarta.com/api/v1/send-sms', [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ["Authorization: $key", 'Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode($payload)]);
  $j = json_decode($body, true) ?: []; $ok = $code < 300 && (!isset($j['code']) || (int)$j['code'] === 200); $info = $j['message'] ?? substr($body, 0, 200);
} elseif ($p === 'bulksmsbd') {
  [$code, $body] = http_send('http://bulksmsbd.net/api/smsapi', [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query(['api_key' => $CFG['SMS_API_KEY'], 'type' => 'text', 'number' => $num, 'senderid' => $CFG['SMS_SENDER_ID'], 'message' => $msg])]);
  $j = json_decode($body, true) ?: []; $ok = $code < 300 && ((($j['response_code'] ?? 0) == 202) || preg_match('/202|success/i', $body)); $info = $j['success_message'] ?? $j['error_message'] ?? substr($body, 0, 200);
} elseif ($p === 'template') {
  [$code, $body] = http_send(str_replace(['{number}', '{message}'], [urlencode($num), urlencode($msg)], $CFG['SMS_URL_TEMPLATE']), []);
  $ok = $code < 300; $info = substr($body, 0, 200);
} else out(200, ['ok' => false, 'info' => 'SMS disabled']);

if ($ok && $route === 'order-placed') $db['inv'][$inv] = $now;
file_put_contents($store, json_encode($db));
out($ok ? 200 : 502, ['ok' => $ok, 'info' => $info]);
