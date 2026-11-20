<?php
/** One-time (per version) import of extra products / landing pages shipped in seed/extras.json. Never overwrites existing docs. */
function ensure_extras(): void {
  static $done = false; if ($done) return; $done = true;
  try {
    $f = dirname(__DIR__) . '/seed/extras.json';
    if (!is_file($f)) return;
    $x = json_decode((string)file_get_contents($f), true);
    if (!is_array($x)) return;
    $key = 'extras_v' . (int)($x['version'] ?? 1);
    if (kv_get($key)) return;
    tx(function () use ($x, $key) {
      foreach (['products', 'landings'] as $coll) foreach (($x[$coll] ?? []) as $d) {
        $old = doc_get($coll, (string)$d[KEYS[$coll]]);
        $replace = !empty($d['replace']); unset($d['replace']);
        if ($old === null) { if ($coll === 'landings') $d['createdAt'] = now_ms(); doc_put($coll, $d); }
        elseif ($replace) { foreach (['views', 'orders', 'createdAt', 'sold', 'stock'] as $keep) if (isset($old[$keep])) $d[$keep] = $old[$keep]; doc_put($coll, $d); }
      }
      kv_set($key, 1);
    });
  } catch (Throwable $e) { /* never break the storefront */ }
}
