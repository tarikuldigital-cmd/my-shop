<?php
/*
 * Bookshelf backend — single entry point (PHP 8 + MySQL). Upload the "api" folder to public_html/api and open /api/setup.php once.
 * Routes (all under /api/v1/…): see docs/BACKEND_CPANEL.md
 */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/sms.php';
require __DIR__ . '/lib/orders.php';
require __DIR__ . '/lib/handlers.php';
require __DIR__ . '/lib/mirror.php';

// CORS (same-origin on cPanel; list extra origins in config.php → 'cors' for testing from another domain)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = (array)cfg('cors', []);
if ($origin && in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin"); header('Vary: Origin');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

try {
  if (!installed()) fail(503, 'Backend is not installed yet. Open /api/setup.php');
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  $path = $_GET['r'] ?? null;
  if ($path === null) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = preg_match('#/v1/(.*)$#', $uri, $m) ? $m[1] : (preg_match('#/index\.php/(.*)$#', $uri, $m) ? $m[1] : '');
  }
  $path = trim((string)$path, '/');
  $routes = routes();
  foreach ($routes as [$m, $re, $fn]) {
    if ($m === $method && preg_match('#^' . $re . '$#', $path, $mm)) { array_shift($mm); $fn(...$mm); }
  }
  fail(404, 'Not found');
} catch (HttpError $e) {
  out(['ok' => false, 'message' => $e->getMessage()] + $e->extra, $e->getCode());
} catch (Throwable $e) {
  error_log('API error: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  out(['ok' => false, 'message' => 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'], 500);
}
