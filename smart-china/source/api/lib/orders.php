<?php
/* Orders: server-side pricing (incl. variants), stock, coupons, invoice numbers, tracking, courier (Steadfast API + status sync). */
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
  $bad = 'This coupon code is invalid or has expired';
  if (!$c || empty($c['active'])) return ['discount' => 0, 'coupon' => null, 'error' => $bad];
  if (!empty($c['expires']) && strtotime($c['expires'] . ' 23:59:59 +06:00') < time()) return ['discount' => 0, 'coupon' => null, 'error' => $bad];
  if (!empty($c['min']) && $subtotal < (int)$c['min']) return ['discount' => 0, 'coupon' => null, 'error' => 'This coupon needs an order of at least ৳' . (int)$c['min']];
  $disc = ($c['type'] ?? 'flat') === 'percent' ? (int)round($subtotal * (float)$c['value'] / 100) : min((int)$c['value'], $subtotal);
  return ['discount' => max(0, $disc), 'coupon' => $c, 'error' => null];
}

function next_invoice(): string {
  $n = (int)kv_get('nextInvoice', 100101, true);
  kv_set('nextInvoice', $n + 1);
  return 'SC' . $n;
}
function make_track_code(string $invoice): string {
  $a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $c = '';
  for ($i = 0; $i < 6; $i++) $c .= $a[random_int(0, strlen($a) - 1)];
  return "$invoice-$c";
}

/** Fields a customer may see on the tracking page / their order list. */
function public_order(array $o): array {
  unset($o['customerPhone'], $o['demo'], $o['courierCheckedAt'], $o['consignmentId']);
  // internal notes (s = 'note') and cancel/return reasons stay inside the admin panel
  $o['history'] = array_values(array_map(fn($h) => ['s' => $h['s'] ?? '', 'at' => $h['at'] ?? 0, 'by' => ($h['by'] ?? '') === 'Customer' ? 'Customer' : (in_array($h['by'] ?? '', ['Steadfast', 'Pathao', 'RedX'], true) ? $h['by'] : 'Smart China Gallery'), 'note' => in_array($h['s'] ?? '', ['cancelled', 'returned', 'partial'], true) ? '' : ($h['note'] ?? '')], array_filter($o['history'] ?? [], fn($h) => ($h['s'] ?? '') !== 'note')));
  $o['courierLog'] = array_values(array_map(fn($e) => ['at' => (int)($e['at'] ?? 0), 'status' => (string)($e['status'] ?? ''), 'message' => (string)($e['message'] ?? '')], $o['courierLog'] ?? []));
  return $o;
}

/* ---------------- variants ---------------- */
function has_options(array $p): bool { return !empty($p['options']) && !empty($p['variants']) && is_array($p['variants']); }
function variant_of(array $p, string $key): ?array {
  if (!has_options($p) || $key === '') return null;
  foreach ($p['variants'] as $v) if ((string)($v['key'] ?? '') === $key) return $v;
  return null;
}
/** [price, variantKey, stock|null] — the server never trusts a price sent by the browser */
function item_price(array $p, string $key): array {
  if (!has_options($p)) return [(int)$p['price'], '', null];
  $v = variant_of($p, $key);
  if (!$v) fail(422, 'Please choose the ' . implode(' / ', array_map(fn($o) => strtolower((string)$o['name']), $p['options'])) . ' for "' . $p['name'] . '"');
  $st = isset($v['stock']) && is_numeric($v['stock']) ? (int)$v['stock'] : null;
  return [(int)$v['price'], (string)$v['key'], $st];
}
/** change stock of one variant (or the plain product) and keep the product total in step */
function stock_change(array $p, string $vkey, int $delta): array {
  if (has_options($p) && $vkey !== '') {
    foreach ($p['variants'] as &$v) if ((string)($v['key'] ?? '') === $vkey && isset($v['stock']) && is_numeric($v['stock'])) $v['stock'] = max(0, (int)$v['stock'] + $delta);
    unset($v);
    $tracked = array_filter($p['variants'], fn($v) => isset($v['stock']) && is_numeric($v['stock']));
    $p['stock'] = $tracked ? array_sum(array_map(fn($v) => (int)$v['stock'], $tracked)) : null;
  } elseif (isset($p['stock']) && is_numeric($p['stock'])) {
    $p['stock'] = max(0, (int)$p['stock'] + $delta);
  }
  return $p;
}

function create_order_public(array $in): array {
  $settings = kv_get('settings', []);
  $name = s($in['name'] ?? '', 120);
  $phone = norm_phone((string)($in['phone'] ?? ''));
  $address = s($in['address'] ?? '', 500);
  $note = s($in['note'] ?? '', 500);
  if ($name === '') fail(422, 'Please enter your name');
  if (!valid_phone($phone)) fail(422, 'Enter a valid 11-digit mobile number');
  if (mb_strlen($address) < 10) fail(422, 'Enter your full address (house/road, area, thana, district)');
  $reqItems = $in['items'] ?? [];
  if (!is_array($reqItems) || !$reqItems || count($reqItems) > 40) fail(422, 'Your cart is empty');

  $ip = client_ip();
  limit_or_fail("order:ip:$ip", 15, 3600, 'Too many order attempts. Please try again later or call our hotline.');
  limit_or_fail("order:ph:$phone", 6, 3600, 'Too many orders from this number. Please call our hotline.');

  $method = (string)($in['paymentMethod'] ?? 'cod');
  if (!in_array($method, ['cod', 'bkash', 'nagad'], true)) $method = 'cod';
  if ($method === 'bkash' && empty($settings['bkashNumber'])) $method = 'cod';
  if ($method === 'nagad' && empty($settings['nagadNumber'])) $method = 'cod';
  $payment = ['method' => 'cod', 'status' => 'unpaid'];
  if ($method !== 'cod') {
    $trx = strtoupper(s($in['trx'] ?? '', 40)); $sender = norm_phone((string)($in['sender'] ?? ''));
    if (strlen($trx) < 6 || !valid_phone($sender)) fail(422, 'Enter the payment TrxID and the number you paid from');
    $payment = ['method' => $method, 'status' => 'pending', 'trx' => $trx, 'sender' => $sender];
  }
  $source = in_array(($in['source'] ?? ''), ['Landing page'], true) ? 'Landing page' : 'Website';
  $landing = $source === 'Landing page' && preg_match('/^[a-z0-9-]{1,80}$/', (string)($in['landing'] ?? '')) ? (string)$in['landing'] : '';
  $cust = auth_user('customer');

  $order = tx(function () use ($reqItems, $settings, $in, $name, $phone, $address, $note, $payment, $source, $landing, $cust) {
    $items = []; $subtotal = 0; $touched = [];
    foreach ($reqItems as $it) {
      $qty = (int)($it['quantity'] ?? 1);
      if ($qty < 1 || $qty > 50) fail(422, 'Invalid quantity');
      $p = isset($it['productId']) ? doc_get('products', (string)$it['productId'], true) : null;
      if (!$p && !empty($it['slug'])) { $p = doc_by('products', 'k', (string)$it['slug'], true); }
      if (!$p || ($p['active'] ?? true) === false) fail(422, 'A product in your cart is no longer available — please refresh your cart');
      [$price, $vkey, $vstock] = item_price($p, (string)($it['variant'] ?? ''));
      $label = $p['name'] . ($vkey !== '' ? " ($vkey)" : '');
      $tkey = $p['id'] . '|' . $vkey;
      $want = ($touched[$tkey] ?? 0) + $qty;
      if ($vstock !== null && $vstock < $want) fail(409, "Only " . max(0, $vstock) . " left of \"$label\"");
      if ($vkey === '' && isset($p['stock']) && is_numeric($p['stock']) && (int)$p['stock'] < $want) fail(409, "Only " . max(0, (int)$p['stock']) . " left of \"$label\"");
      $items[] = ['productId' => $p['id'], 'slug' => $p['slug'], 'name' => $p['name'], 'variant' => $vkey, 'sku' => (string)(variant_of($p, $vkey)['sku'] ?? $p['sku'] ?? ''), 'price' => $price, 'quantity' => $qty];
      $subtotal += $price * $qty;
      $touched[$tkey] = $want;
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
      'courier' => '', 'tracking' => '', 'courierLog' => [], 'source' => $source, 'note' => $note, 'customerPhone' => $cust['phone'] ?? null,
      'createdAt' => $now, 'history' => [['s' => 'pending', 'by' => 'Customer', 'at' => $now, 'note' => $source !== 'Website' ? "$source order" : '']],
      'trackCode' => make_track_code($inv),
    ];
    // stock (variant + product total) + coupon usage
    foreach ($touched as $tk => $qty) {
      [$pid, $vkey] = explode('|', (string)$tk, 2);
      $p = doc_get('products', $pid, true);
      if (!$p) continue;
      $p = stock_change($p, $vkey, -$qty);
      $p['sold'] = (int)($p['sold'] ?? 0) + $qty;
      doc_put('products', $p);
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
  // Meta Conversions API is handled in Google Tag Manager (server container); the site no longer sends it directly.
  return $order;
}

/* ---------------- status changes made on the server (courier webhook) ---------------- */
function adjust_stock(array $items, int $sign): void {
  foreach ($items as $it) {
    $p = doc_get('products', (string)$it['productId'], true);
    if ($p) doc_put('products', stock_change($p, (string)($it['variant'] ?? ''), $sign * (int)$it['quantity']));
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

/* ---------------- Steadfast courier (portal.packzy.com) ---------------- */
const SF_API = 'https://portal.packzy.com/api/v1';
/** config.php may point 'steadfast_api' elsewhere (sandbox / local test double) */
function sf_base(): string { return rtrim((string)cfg('steadfast_api', SF_API), '/'); }
/** Steadfast delivery_status → readable text (shown on the tracking page and in the admin) */
const SF_STATUS_TEXT = [
  'pending' => 'Picked up — on the way', 'in_review' => 'Booked — waiting for pickup', 'hold' => 'On hold at courier',
  'delivered_approval_pending' => 'Delivered (waiting for courier approval)', 'partial_delivered_approval_pending' => 'Partly delivered (waiting for approval)',
  'cancelled_approval_pending' => 'Delivery cancelled (waiting for approval)', 'unknown_approval_pending' => 'Status under review',
  'delivered' => 'Delivered', 'partial_delivered' => 'Partly delivered', 'cancelled' => 'Delivery cancelled — returning to merchant', 'exceptional' => 'Exception at courier', 'unknown' => 'Status unknown',
];

function steadfast_keys(): array {
  $set = kv_get('settings', []);
  $k = trim((string)($set['courier']['steadfastApiKey'] ?? '')); $sec = trim((string)($set['courier']['steadfastSecret'] ?? ''));
  if ($k === '' || $sec === '') fail(422, 'Steadfast API key / secret key are not set (Admin → Settings → Courier)');
  return ["Api-Key: $k", "Secret-Key: $sec", 'Content-Type: application/json', 'Accept: application/json'];
}
function steadfast_get(string $path): array {
  [$code, $b, $err] = http_call(sf_base() . $path, [CURLOPT_HTTPHEADER => steadfast_keys(), CURLOPT_TIMEOUT => 15]);
  if ($err) fail(502, 'Could not reach Steadfast: ' . $err);
  $j = json_decode($b, true);
  if ($code >= 300 || !is_array($j)) fail(502, 'Steadfast: ' . (is_array($j) ? ($j['message'] ?? "HTTP $code") : substr($b, 0, 160)));
  return $j;
}

/** COD = what the rider must collect: 0 when the order is already paid (bKash/Nagad verified). */
function cod_amount(array $o): int { return ($o['payment']['status'] ?? '') === 'paid' ? 0 : (int)$o['total']; }
function sf_clean(string $s, int $max): string { return mb_substr(trim(str_replace(['{', '}', ';', '<', '>', '$'], ' ', $s)), 0, $max); }
function item_summary(array $o): string {
  return implode(', ', array_map(fn($i) => $i['name'] . (!empty($i['variant']) ? " ({$i['variant']})" : '') . ' x' . $i['quantity'], $o['items'] ?? []));
}

function steadfast_create(array $o): array {
  $payload = [
    'invoice' => $o['invoice'], 'recipient_name' => sf_clean((string)$o['name'], 100), 'recipient_phone' => norm_phone((string)$o['phone']),
    'recipient_address' => sf_clean((string)$o['address'], 250), 'cod_amount' => cod_amount($o),
    'note' => sf_clean((string)($o['courierNote'] ?? $o['note'] ?? ''), 250), 'item_description' => sf_clean(item_summary($o), 250),
    'total_lot' => array_sum(array_map(fn($i) => (int)$i['quantity'], $o['items'] ?? [])),
  ];
  [$code, $b, $err] = http_call(sf_base() . '/create_order', [CURLOPT_POST => true, CURLOPT_HTTPHEADER => steadfast_keys(), CURLOPT_POSTFIELDS => jenc($payload)]);
  $j = json_decode($b, true) ?: [];
  if ($err) fail(502, 'Could not reach Steadfast: ' . $err);
  if ($code >= 300 || (int)($j['status'] ?? 0) !== 200 || empty($j['consignment']['tracking_code'])) {
    $msg = $j['message'] ?? (is_array($j['errors'] ?? null) ? implode(', ', array_map(fn($e) => is_array($e) ? implode(' ', $e) : (string)$e, $j['errors'])) : substr($b, 0, 160));
    fail(502, 'Steadfast: ' . $msg);
  }
  return ['tracking' => (string)$j['consignment']['tracking_code'], 'consignmentId' => $j['consignment']['consignment_id'] ?? null, 'cod' => $payload['cod_amount'], 'status' => (string)($j['consignment']['status'] ?? 'in_review')];
}

/** Steadfast status → our order status (null = no change) */
function steadfast_status_map(string $st): ?string {
  return match (strtolower($st)) {
    'delivered', 'delivered_approval_pending' => 'delivered',
    'partial_delivered', 'partial_delivered_approval_pending' => 'partial',
    'cancelled', 'cancelled_approval_pending' => 'returned',
    default => null,
  };
}

/** add one courier event (rider note / status) unless the same text is already there */
function courier_log_add(array &$o, string $status, string $message, int $at = 0): bool {
  $message = trim($message); $status = trim($status);
  if ($message === '' && $status === '') return false;
  $o['courierLog'] ??= [];
  foreach ($o['courierLog'] as $e) if (($e['message'] ?? '') === $message && ($e['status'] ?? '') === $status) return false;
  $o['courierLog'][] = ['at' => $at ?: now_ms(), 'status' => $status, 'message' => $message !== '' ? $message : (SF_STATUS_TEXT[$status] ?? $status)];
  usort($o['courierLog'], fn($a, $b) => ($a['at'] ?? 0) <=> ($b['at'] ?? 0));
  return true;
}
/** Steadfast sends local Bangladesh time without a zone ("2026-11-12 10:05:00"); ISO strings with Z / +hh:mm are kept as they are. */
function ts_ms(?string $s): int {
  $s = trim((string)$s);
  if ($s === '') return now_ms();
  $t = strtotime(preg_match('/(Z|[+-]\d{2}:?\d{2})$/', $s) ? $s : "$s +06:00");
  return $t ? $t * 1000 : now_ms();
}

/**
 * Apply a courier status to an order: logs it, moves the order (ready → in transit → delivered / returned)
 * and returns the SMS event to send (or null).
 */
function apply_courier_status(array &$o, string $st, string $message, string $by, int $at = 0): ?string {
  $st = strtolower(trim($st));
  if ($st !== '') $o['courierStatus'] = $st;
  courier_log_add($o, $st, $message, $at);
  if (in_array($o['status'], ['delivered', 'cancelled', 'returned', 'partial'], true)) return null;
  $to = steadfast_status_map($st);
  // picked up: Steadfast moves "in_review" → "pending" once the rider has the parcel; any rider/hub note means the same
  if (!$to && $o['status'] === 'ready' && (in_array($st, ['pending', 'hold'], true) || ($st === '' && $message !== '' && !preg_match('/created|booked|placed|review/i', $message)))) $to = 'transit';
  if (!$to || $o['status'] === $to) return null;
  set_status_server($o, $to, $by, $message);
  return $to === 'delivered' ? 'delivered' : null;
}

/** Pull the latest status + full tracking history (rider notes) from Steadfast. */
function steadfast_refresh(array &$o): ?string {
  $inv = rawurlencode((string)$o['invoice']);
  $st = steadfast_get(!empty($o['consignmentId']) ? '/status_by_cid/' . rawurlencode((string)$o['consignmentId']) : "/status_by_invoice/$inv");
  $status = (string)($st['delivery_status'] ?? '');
  // tracking steps: [{ tracking_type, text, created_at }] — wrapped differently in some API versions
  try {
    $t = steadfast_get("/trackings_by_invoice/$inv");
    $rows = array_is_list($t) ? $t : ($t['data'] ?? $t['trackings'] ?? $t['tracking'] ?? []);
    if (is_array($rows)) foreach ($rows as $r) if (is_array($r) && !empty($r['text'])) courier_log_add($o, (string)($r['tracking_type'] ?? ''), (string)$r['text'], ts_ms($r['created_at'] ?? null));
  } catch (HttpError $e) { /* history is optional; the status still counts */ }
  $o['courierCheckedAt'] = now_ms();
  return $status !== '' ? apply_courier_status($o, $status, SF_STATUS_TEXT[$status] ?? '', 'Steadfast') : null;
}
