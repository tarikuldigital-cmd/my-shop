<?php
/* Orders: server-side pricing, stock, coupons, invoice numbers, tracking, courier (Steadfast) and Meta CAPI. */
declare(strict_types=1);

const DAY_MS = 86400000;

function shipping_for(array $settings, string $areaId, int $subtotal): int {
  $areas = $settings['shipping'] ?? [];
  $area = null;
  foreach ($areas as $a) if (($a['id'] ?? '') === $areaId) $area = $a;
  $area ??= $areas[0] ?? ['charge' => 0];
  $min = (int)($settings['freeShippingMin'] ?? 0);
  if ($min && $subtotal >= $min) return 0;
  return (int)$area['charge'];
}

/** Returns ['discount'=>int, 'coupon'=>array|null, 'error'=>string|null]. Does not change anything. */
function coupon_calc(?string $code, int $subtotal, bool $lock = false): array {
  $code = trim((string)$code);
  if ($code === '') return ['discount' => 0, 'coupon' => null, 'error' => null];
  $c = doc_by('coupons', 'k', strtolower($code), $lock);
  $bad = 'কুপন কোডটি সঠিক নয় বা মেয়াদ শেষ';
  if (!$c || empty($c['active'])) return ['discount' => 0, 'coupon' => null, 'error' => $bad];
  if (!empty($c['expires']) && strtotime($c['expires'] . ' 23:59:59 +06:00') < time()) return ['discount' => 0, 'coupon' => null, 'error' => $bad];
  if (!empty($c['min']) && $subtotal < (int)$c['min']) return ['discount' => 0, 'coupon' => null, 'error' => 'এই কুপন ব্যবহার করতে কমপক্ষে ৳' . (int)$c['min'] . ' এর অর্ডার করতে হবে'];
  $disc = ($c['type'] ?? 'flat') === 'percent' ? (int)round($subtotal * (float)$c['value'] / 100) : min((int)$c['value'], $subtotal);
  return ['discount' => max(0, $disc), 'coupon' => $c, 'error' => null];
}

function next_invoice(): string {
  $n = (int)kv_get('nextInvoice', 100101, true);
  kv_set('nextInvoice', $n + 1);
  return 'BS' . $n;
}
function make_track_code(string $invoice): string {
  $a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $c = '';
  for ($i = 0; $i < 6; $i++) $c .= $a[random_int(0, strlen($a) - 1)];
  return "$invoice-$c";
}

/** Fields a customer may see on the tracking page / their order list. */
function public_order(array $o): array {
  unset($o['customerPhone'], $o['demo']);
  $o['history'] = array_map(fn($h) => ['s' => $h['s'] ?? '', 'at' => $h['at'] ?? 0, 'by' => ($h['by'] ?? '') === 'Customer' ? 'Customer' : 'Bookshelf', 'note' => in_array($h['s'] ?? '', ['cancelled', 'returned'], true) ? '' : ($h['note'] ?? '')], $o['history'] ?? []);
  return $o;
}

function create_order_public(array $in): array {
  $settings = kv_get('settings', []);
  $name = s($in['name'] ?? '', 120);
  $phone = norm_phone((string)($in['phone'] ?? ''));
  $address = s($in['address'] ?? '', 500);
  $note = s($in['note'] ?? '', 500);
  if ($name === '') fail(422, 'আপনার নাম লিখুন');
  if (!valid_phone($phone)) fail(422, 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন');
  if (mb_strlen($address) < 10) fail(422, 'সম্পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)');
  $reqItems = $in['items'] ?? [];
  if (!is_array($reqItems) || !$reqItems || count($reqItems) > 40) fail(422, 'কার্টে কোনো বই নেই');

  $ip = client_ip();
  limit_or_fail("order:ip:$ip", 15, 3600, 'অনেক বেশি অর্ডার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন বা হটলাইনে কল করুন।');
  limit_or_fail("order:ph:$phone", 6, 3600, 'এই নাম্বার থেকে অনেক বেশি অর্ডার চেষ্টা হয়েছে। হটলাইনে কল করুন।');

  $method = (string)($in['paymentMethod'] ?? 'cod');
  if (!in_array($method, ['cod', 'bkash', 'nagad'], true)) $method = 'cod';
  if ($method === 'bkash' && empty($settings['bkashNumber'])) $method = 'cod';
  if ($method === 'nagad' && empty($settings['nagadNumber'])) $method = 'cod';
  $payment = ['method' => 'cod', 'status' => 'unpaid'];
  if ($method !== 'cod') {
    $trx = strtoupper(s($in['trx'] ?? '', 40)); $sender = norm_phone((string)($in['sender'] ?? ''));
    if (strlen($trx) < 6 || !valid_phone($sender)) fail(422, 'পেমেন্টের TrxID ও যে নাম্বার থেকে পাঠিয়েছেন তা দিন');
    $payment = ['method' => $method, 'status' => 'pending', 'trx' => $trx, 'sender' => $sender];
  }
  $source = in_array(($in['source'] ?? ''), ['Landing page'], true) ? 'Landing page' : 'Website';
  $landing = $source === 'Landing page' && preg_match('/^[a-z0-9-]{1,80}$/', (string)($in['landing'] ?? '')) ? (string)$in['landing'] : '';
  $cust = auth_user('customer');

  $order = tx(function () use ($reqItems, $settings, $in, $name, $phone, $address, $note, $payment, $source, $landing, $cust) {
    $items = []; $subtotal = 0; $touched = [];
    foreach ($reqItems as $it) {
      $qty = (int)($it['quantity'] ?? 1);
      if ($qty < 1 || $qty > 50) fail(422, 'পরিমাণ সঠিক নয়');
      $p = isset($it['productId']) ? doc_get('products', (string)$it['productId'], true) : null;
      if (!$p && !empty($it['slug'])) { $p = doc_by('products', 'k', (string)$it['slug'], true); }
      if (!$p || ($p['active'] ?? true) === false) fail(422, 'একটি বই আর পাওয়া যাচ্ছে না — কার্ট রিফ্রেশ করুন');
      if (isset($p['stock']) && is_numeric($p['stock']) && (int)$p['stock'] < $qty) fail(409, '"' . $p['name'] . '" স্টকে ' . max(0, (int)$p['stock']) . 'টি আছে');
      $price = (int)$p['price'];
      $items[] = ['productId' => $p['id'], 'slug' => $p['slug'], 'name' => $p['name'], 'price' => $price, 'quantity' => $qty];
      $subtotal += $price * $qty;
      $touched[(string)$p['id']] = ($touched[(string)$p['id']] ?? 0) + $qty;
    }
    $ship = shipping_for($settings, (string)($in['shippingArea'] ?? ''), $subtotal);
    $areaId = (string)($in['shippingArea'] ?? '');
    $ids = array_column($settings['shipping'] ?? [], 'id');
    if (!in_array($areaId, $ids, true)) $areaId = $ids[0] ?? '';
    $cc = coupon_calc($in['couponCode'] ?? '', $subtotal, true);
    $disc = $cc['discount'];
    $now = now_ms();
    $inv = next_invoice();
    $o = [
      'id' => 'o' . $now . random_int(100, 999), 'invoice' => $inv, 'name' => $name, 'phone' => $phone, 'address' => $address,
      'shippingArea' => $areaId, 'items' => $items, 'subtotal' => $subtotal, 'shippingCharge' => $ship, 'discount' => $disc,
      'coupon' => $cc['coupon']['code'] ?? '', 'total' => $subtotal + $ship - $disc, 'payment' => $payment, 'status' => 'pending',
      'courier' => '', 'tracking' => '', 'source' => $source, 'note' => $note, 'customerPhone' => $cust['phone'] ?? null,
      'createdAt' => $now, 'history' => [['s' => 'pending', 'by' => 'Customer', 'at' => $now, 'note' => $source !== 'Website' ? "$source order" : '']],
      'trackCode' => make_track_code($inv),
    ];
    // stock + coupon usage
    foreach ($touched as $pid => $qty) {
      $p = doc_get('products', (string)$pid, true);
      if ($p && isset($p['stock']) && is_numeric($p['stock'])) { $p['stock'] = max(0, (int)$p['stock'] - $qty); }
      if ($p) { $p['sold'] = (int)($p['sold'] ?? 0) + $qty; doc_put('products', $p); }
    }
    if ($cc['coupon']) { $c = $cc['coupon']; $c['used'] = (int)($c['used'] ?? 0) + 1; doc_put('coupons', $c); }
    if ($landing) { $lp = doc_by('landings', 'k', $landing, true); if ($lp) { $lp['orders'] = (int)($lp['orders'] ?? 0) + 1; doc_put('landings', $lp); } }
    // a checkout draft from the same phone in the last 3 days is now recovered
    foreach (doc_all('incomplete') as $d) {
      if (($d['phone'] ?? '') === $phone && in_array($d['status'] ?? '', ['new', 'contacted'], true) && $now - (int)($d['at'] ?? 0) < 3 * DAY_MS) {
        $d['status'] = 'converted'; $d['orderInvoice'] = $inv; $d['updated'] = $now;
        $d['log'][] = ['t' => "Ordered ($inv)", 'by' => 'System', 'at' => $now];
        doc_put('incomplete', $d);
      }
    }
    doc_put('orders', $o);
    return $o;
  });

  sms_order_event($order, 'placed');
  meta_capi_purchase($order, (string)($in['eventId'] ?? ''));
  return $order;
}

/* ---------------- status changes made on the server (courier webhook) ---------------- */
function adjust_stock(array $items, int $sign): void {
  foreach ($items as $it) {
    $p = doc_get('products', (string)$it['productId'], true);
    if ($p && isset($p['stock']) && is_numeric($p['stock'])) { $p['stock'] = max(0, (int)$p['stock'] + $sign * (int)$it['quantity']); doc_put('products', $p); }
  }
}
function set_status_server(array &$o, string $s, string $by, string $note = ''): void {
  if (($o['status'] ?? '') === $s) return;
  $prev = $o['status'];
  if ($s === 'cancelled' && !in_array($prev, ['cancelled', 'returned'], true)) adjust_stock($o['items'], 1);
  if ($prev === 'cancelled' && $s !== 'cancelled') adjust_stock($o['items'], -1);
  $o['status'] = $s;
  if ($s === 'cancelled') $o['cancelReason'] = $note;
  if ($s === 'returned') $o['returnReason'] = $note;
  if ($s === 'delivered' && ($o['payment']['method'] ?? '') === 'cod') $o['payment']['status'] = 'paid';
  $o['history'][] = ['s' => $s, 'by' => $by, 'at' => now_ms(), 'note' => $note];
}

/* ---------------- Steadfast courier ---------------- */
function steadfast_create(array $o): array {
  $set = kv_get('settings', []);
  $k = trim((string)($set['courier']['steadfastApiKey'] ?? '')); $sec = trim((string)($set['courier']['steadfastSecret'] ?? ''));
  if ($k === '' || $sec === '') fail(422, 'Steadfast API Key / Secret সেট করা নেই (Admin → Settings → Courier)');
  $cod = ($o['payment']['status'] ?? '') === 'paid' ? 0 : (int)$o['total'];
  $payload = ['invoice' => $o['invoice'], 'recipient_name' => $o['name'], 'recipient_phone' => $o['phone'], 'recipient_address' => $o['address'], 'cod_amount' => $cod, 'note' => (string)($o['note'] ?? '')];
  [$code, $b, $err] = http_call('https://portal.packzy.com/api/v1/create_order', [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ["Api-Key: $k", "Secret-Key: $sec", 'Content-Type: application/json'], CURLOPT_POSTFIELDS => jenc($payload)]);
  $j = json_decode($b, true) ?: [];
  if ($err) fail(502, 'Steadfast-এর সাথে যোগাযোগ করা যায়নি: ' . $err);
  if ($code >= 300 || (int)($j['status'] ?? 0) !== 200 || empty($j['consignment']['tracking_code'])) {
    $msg = $j['message'] ?? (is_array($j['errors'] ?? null) ? implode(', ', array_map(fn($e) => is_array($e) ? implode(' ', $e) : (string)$e, $j['errors'])) : substr($b, 0, 160));
    fail(502, 'Steadfast: ' . $msg);
  }
  return ['tracking' => (string)$j['consignment']['tracking_code'], 'consignmentId' => $j['consignment']['consignment_id'] ?? null];
}

/** Steadfast webhook → status mapping */
function steadfast_status_map(string $st): ?string {
  return match (strtolower($st)) {
    'delivered' => 'delivered',
    'cancelled', 'returned', 'partial_delivered' => 'returned',
    'hold' => 'hold',
    default => null,
  };
}

/* ---------------- Meta Conversions API (best effort) ---------------- */
function meta_capi_purchase(array $o, string $eventId): void {
  try {
    $t = (kv_get('settings', []))['tracking'] ?? [];
    $px = trim((string)($t['metaPixelId'] ?? '')); $tok = trim((string)($t['metaCapiToken'] ?? ''));
    if ($px === '' || $tok === '' || $eventId === '') return;
    $ev = ['event_name' => 'Purchase', 'event_time' => time(), 'event_id' => $eventId, 'action_source' => 'website',
      'event_source_url' => site_url() . '/',
      'user_data' => ['ph' => [hash('sha256', '88' . $o['phone'])], 'client_ip_address' => client_ip(), 'client_user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 250)],
      'custom_data' => ['currency' => 'BDT', 'value' => $o['total'], 'order_id' => $o['invoice'], 'content_type' => 'product', 'contents' => array_map(fn($i) => ['id' => (string)$i['productId'], 'quantity' => $i['quantity'], 'item_price' => $i['price']], $o['items'])]];
    $payload = ['data' => [$ev]];
    if (!empty($t['metaTestCode'])) $payload['test_event_code'] = $t['metaTestCode'];
    http_call("https://graph.facebook.com/v19.0/$px/events?access_token=" . urlencode($tok), [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => jenc($payload), CURLOPT_TIMEOUT => 6]);
  } catch (Throwable $e) { error_log('capi: ' . $e->getMessage()); }
}
