<?php
/* SMS gateway (Muthofun/Muthobarta, BulkSMSBD or any HTTP template) + message templates rendered on the server. */
declare(strict_types=1);

function http_call(string $url, array $opts = []): array {
  $ch = curl_init($url);
  curl_setopt_array($ch, $opts + [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false]);
  $body = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  return [$code, (string)$body, $err];
}

/** Send one SMS through the configured gateway. Returns [ok, info]. */
function sms_gateway(string $to, string $msg): array {
  $c = cfg('sms', []);
  $p = strtolower((string)($c['provider'] ?? ''));
  $num = preg_replace('/\D/', '', $to);
  if (str_starts_with($num, '0')) $num = '88' . $num;
  if (!preg_match('/^8801[3-9]\d{8}$/', $num)) return [false, 'Invalid Bangladeshi mobile number'];
  if ($p === '' || $p === 'off') return [false, 'SMS gateway is not configured (api/config.php)'];
  $key = trim((string)($c['api_key'] ?? ''));
  if ($p === 'muthofun') {
    if ($key === '') return [false, 'SMS API key is empty'];
    if (!preg_match('/^token\s/i', $key)) $key = 'Token ' . $key;
    $payload = ['receiver' => substr($num, 2), 'message' => $msg, 'remove_duplicate' => true];
    if (!empty($c['sender_id'])) $payload['sender_id'] = $c['sender_id'];
    [$code, $b, $err] = http_call('https://sysadmin.muthobarta.com/api/v1/send-sms', [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ["Authorization: $key", 'Content-Type: application/json'], CURLOPT_POSTFIELDS => jenc($payload)]);
    $j = json_decode($b, true) ?: [];
    return [$code < 300 && (!isset($j['code']) || (int)$j['code'] === 200), $err ?: ($j['message'] ?? substr($b, 0, 200))];
  }
  if ($p === 'bulksmsbd') {
    [$code, $b, $err] = http_call('http://bulksmsbd.net/api/smsapi', [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query(['api_key' => $key, 'type' => 'text', 'number' => $num, 'senderid' => $c['sender_id'] ?? '', 'message' => $msg])]);
    $j = json_decode($b, true) ?: [];
    return [$code < 300 && ((($j['response_code'] ?? 0) == 202) || preg_match('/202|success/i', $b)), $err ?: ($j['success_message'] ?? $j['error_message'] ?? substr($b, 0, 200))];
  }
  if ($p === 'template') {
    $u = str_replace(['{number}', '{message}'], [urlencode($num), urlencode($msg)], (string)($c['url_template'] ?? ''));
    if (!preg_match('#^https?://#', $u)) return [false, 'url_template must start with http(s)://'];
    [$code, $b, $err] = http_call($u);
    return [$code < 300, $err ?: substr($b, 0, 200)];
  }
  return [false, 'Unknown SMS provider'];
}

function sms_parts(string $t): array {
  $uni = (bool)preg_match('/[^\x00-\x7F]/', $t);
  $single = $uni ? 70 : 160; $multi = $uni ? 67 : 153; $n = mb_strlen($t);
  return ['chars' => $n, 'unicode' => $uni, 'parts' => $n <= $single ? 1 : (int)ceil($n / $multi)];
}

function track_link(array $o): string {
  $set = kv_get('settings', []);
  $site = rtrim(trim((string)($set['sms']['siteUrl'] ?? '')) ?: site_url(), '/');
  return $site . '/t/' . ($o['trackCode'] ?? '');
}
function product_label(array $o): string {
  $it = $o['items'] ?? [];
  if (!$it) return '';
  $n = trim((string)$it[0]['name']);
  $name = mb_strlen($n) > 32 ? trim(mb_substr($n, 0, 31)) . '…' : $n;
  $c = count($it);
  return $c > 1 ? "$name + " . ($c - 1) . ' more' : ((int)($it[0]['quantity'] ?? 1) > 1 ? "$name × " . $it[0]['quantity'] : $name);
}
function render_sms(string $tpl, array $o): string {
  $set = kv_get('settings', []);
  $couriers = ['steadfast' => 'Steadfast', 'pathao' => 'Pathao', 'redx' => 'RedX'];
  $first = preg_split('/\s+/', trim((string)($o['name'] ?? '')))[0] ?? '';
  $map = [
    '{name}' => $first ?: 'Customer', '{invoice}' => $o['invoice'], '{total}' => (string)$o['total'], '{product}' => product_label($o),
    '{price}' => (string)($o['subtotal'] ?? $o['total']), '{link}' => track_link($o), '{courier}' => $couriers[$o['courier'] ?? ''] ?? '',
    '{tracking}' => (string)($o['tracking'] ?? ''), '{hotline}' => (string)($set['phone'] ?? ''), '{shop}' => (string)($set['siteName'] ?? 'Smart China Gallery'),
  ];
  return trim(preg_replace('/\s{2,}/u', ' ', strtr($tpl, $map)));
}

function sms_log(array $e): void { doc_put('smsLog', $e); }

/** Send + log. $event: placed|confirmed|shipped|delivered|cancelled|custom */
function sms_send_logged(string $to, string $text, string $event, string $invoice = ''): array {
  $entry = ['id' => 's' . now_ms() . random_int(100, 999), 'at' => now_ms(), 'to' => norm_phone($to), 'event' => $event, 'invoice' => $invoice, 'text' => $text, 'status' => 'sending'] + sms_parts($text);
  [$ok, $info] = sms_gateway($to, $text);
  $entry['status'] = $ok ? 'sent' : (str_contains((string)$info, 'not configured') ? 'not_configured' : 'failed');
  $entry['info'] = (string)$info;
  $entry['at'] = now_ms();
  sms_log($entry);
  return $entry;
}

/** Automatic order SMS (server side). Never throws. */
function sms_order_event(array $o, string $event): void {
  try {
    $set = kv_get('settings', []);
    $c = $set['sms'] ?? [];
    if (empty($c['enabled']) || empty($c['events'][$event]) || !empty($o['demo'])) return;
    if ($event === 'shipped' && empty($o['tracking'])) return;
    $tpl = $c['templates'][$event] ?? '';
    if ($tpl === '') return;
    sms_send_logged($o['phone'], render_sms($tpl, $o), $event, $o['invoice']);
  } catch (Throwable $e) { error_log('sms_order_event: ' . $e->getMessage()); }
}
