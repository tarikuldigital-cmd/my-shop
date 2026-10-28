<?php
/*
 * Smart China Gallery — BD Courier fraud-check proxy
 * ---------------------------------------------------
 * Upload this file to public_html (next to index.html) on your hosting.
 * Then edit the two lines below in cPanel File Manager. NEVER commit your real key to GitHub.
 *
 * এই ফাইলটা হোস্টিংয়ের public_html ফোল্ডারে index.html-এর পাশে আপলোড করুন।
 * তারপর cPanel File Manager-এ নিচের দুটো লাইন এডিট করুন। আসল Key কখনো GitHub-এ দেবেন না।
 */
$BDC_API_KEY  = 'PASTE_YOUR_NEW_BDCOURIER_API_KEY_HERE';   // app.bdcourier.com → API → API Key
$ADMIN_SECRET = 'CHOOSE_A_SECRET_WORD';                     // same word goes in Admin → Settings → Fraud checker

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($code, $arr) { http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'POST only']);
$in = json_decode(file_get_contents('php://input'), true) ?: $_POST;

if ($BDC_API_KEY === '' || strpos($BDC_API_KEY, 'PASTE_') === 0) out(500, ['ok' => false, 'error' => 'API key not set in courier-check.php']);
if (!isset($in['secret']) || !hash_equals($ADMIN_SECRET, (string)$in['secret'])) out(403, ['ok' => false, 'error' => 'Wrong secret']);

$action = isset($in['action']) ? $in['action'] : 'check';
if ($action === 'ping') {
  $url = 'https://api.bdcourier.com/check-connection';
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $BDC_API_KEY, 'Accept: application/json']]);
} else {
  $phone = preg_replace('/\D/', '', (string)($in['phone'] ?? ''));
  if (strpos($phone, '880') === 0) $phone = substr($phone, 2);
  if (!preg_match('/^01[3-9]\d{8}$/', $phone)) out(400, ['ok' => false, 'error' => 'Invalid phone']);
  $url = 'https://api.bdcourier.com/courier-check?phone=' . $phone;
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['phone' => $phone]),
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $BDC_API_KEY, 'Content-Type: application/json', 'Accept: application/json']]);
}
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);
if ($body === false) out(502, ['ok' => false, 'error' => 'Could not reach BD Courier: ' . $err]);
$json = json_decode($body, true);
out(200, ['ok' => $code >= 200 && $code < 300, 'status' => $code, 'data' => $json !== null ? $json : $body]);
