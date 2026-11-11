#!/usr/bin/env python3
"""
Import a WooCommerce Store API export (tools/wc-export.mjs → data/varieytbazar/*.json) into the Smart China Gallery catalogue.

  python3 scripts/import-woocommerce.py ../../data/varieytbazar

- every product: name, prices (sale + regular), images (all), full description, short description, categories, SKU,
  brand, stock (in / out), variants (Size, Colour … with their own price and stock)
- products with price 0 on the source shop are imported HIDDEN (active=false) so a price can be set first
- existing sample products WITHOUT images are removed; sample products with images are kept
- descriptions go to src/mocks/descriptions.json (loaded only on the product page); scripts/export-seed.mjs merges them for the server
"""
import json, re, sys, html
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '../../data/varieytbazar')
ROOT = Path(__file__).resolve().parent.parent
MOCKS = ROOT / 'src' / 'mocks'

P = json.load(open(SRC / 'products.json'))
V = json.load(open(SRC / 'variations.json'))

# ---------- categories: the source shop's 49 categories folded into store sections ----------
CATS = {
    'electronics-and-gadgets': ('Electronics & Gadgets', ['Gadget', 'Wireless Speaker', 'Watch']),
    'home-appliances': ('Home Appliances', ['Home Appliance', 'home applince', 'Electric Cooking Pot', '6 Layer Water Filter']),
    'home-and-kitchen': ('Home & Kitchen', ['Kitchen item', 'Kitchen Wallpaper', 'Kitchen Mats & Pads', 'Modern Wall Mounted', 'Food Container', 'Ice Cube Tray', 'Ice Freezer box', 'Zipper Bags', 'Wall mounted soap', 'mounted Soap Box', 'Cleaning Sponge', 'Oil Stain Remover Pen']),
    'home-decor-and-utility': ('Home Decor & Utility', ['Room Carpet', 'Photo Frame', 'Wall Crack Protection', 'locking Silent Hinge', 'Rat Killer Trap', 'Fire Safety Spray', 'safety Stick', 'Folding Chair', 'Shoe Polish', 'pet item', 'car walpaper']),
    'personal-care': ('Personal Care', ['Personal Care', 'Foot Cushion Heel Protector', 'Knee Patches', 'Knee Joint', 'Ear Cleaner', 'Gel Socks for Men Women', 'Long Hand Gloves']),
    'beauty-and-care': ('Beauty & Cosmetics', ['Cosmetics']),
    'car-and-bike': ('Car & Bike', ['Car Accessories']),
    'islamic-items': ('Islamic Items', ['Islamic item', 'Qurbani kuthar sale']),
    'fashion': ('Fashion & Bags', ['Bag Collection', 'Jewellery Items', 'Shoulder Strap']),
    'toys-and-baby': ('Kids & School', ['Kids Item', 'School item', 'Book Cover', "Book's Item"]),
}
SRC2SLUG = {html.unescape(n).lower(): slug for slug, (_, names) in CATS.items() for n in names}

def map_cats(p):
    out = []
    for c in p['categories']:
        s = SRC2SLUG.get(html.unescape(c['name']).lower())
        if s and s not in out: out.append(s)
    return out or ['home-and-kitchen']

# ---------- text ----------
def clean_html(h):
    h = h or ''
    h = re.sub(r'(?is)<(script|style|iframe|noscript|form)[^>]*>.*?</\1>', '', h)
    h = re.sub(r'\s(?:data-[\w-]+|class|id|style|on\w+|dir|aria-[\w-]+|width|height|srcset|sizes|decoding)="[^"]*"', '', h)
    h = re.sub(r'<(/?)(section|article|div|span)\b[^>]*>', lambda m: '' if m.group(2) in ('span',) else ('</div>' if m.group(1) else '<div>'), h)
    h = re.sub(r'<img ', '<img loading="lazy" ', h)
    h = re.sub(r'<p>\s*(&nbsp;|\s)*</p>', '', h)
    h = re.sub(r'(<div>\s*</div>)+', '', h)
    return h.strip()

def plain(h, n=260):
    t = html.unescape(re.sub(r'<br\s*/?>', ' · ', h or ''))
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip(' ·')
    return (t[: n - 1].rsplit(' ', 1)[0] + '…') if len(t) > n else t

money = lambda pr, k: round(int(pr.get(k) or 0) / (10 ** int(pr.get('currency_minor_unit') or 2)))
def price_pair(pr):
    price, reg = money(pr, 'price'), money(pr, 'regular_price')
    return price, (reg if reg > price else None)

def slugify(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# ---------- variants ----------
def parse_var(s):  # "Size: 1.5kg, Color: Red" → {'size': '1.5kg', 'color': 'Red'}
    out = {}
    for part in re.split(r',\s*(?=[^,:]+:)', s or ''):
        if ':' in part:
            k, v = part.split(':', 1); out[k.strip().lower()] = html.unescape(v.strip())
    return out

def build_variants(p):
    """One variant per combination. A Woo variation that leaves an attribute as "any" covers every value of it."""
    attrs = [a for a in p['attributes'] if a.get('has_variations')]
    if not attrs or not p['variations']: return [], []
    options = [{'name': html.unescape(a['name']), 'values': [html.unescape(t['name']) for t in a['terms']]} for a in attrs]
    options = [o for o in options if o['values']]
    variants, keys = [], set()
    for ref in p['variations']:
        v = V.get(str(ref['id']))
        vals = parse_var(v['variation']) if v else {}
        combos = [[]]
        for o in options:
            got = vals.get(o['name'].lower())
            if got and got not in o['values']:  # name differs slightly from the term list → match case-insensitively
                got = next((x for x in o['values'] if x.lower() == got.lower()), None)
            combos = [c + [x] for c in combos for x in ([got] if got else o['values'])]
        price, old = price_pair((v or p)['prices'])
        if not price: price, old = price_pair(p['prices'])
        for c in combos:
            key = ' / '.join(c)
            if key in keys: continue
            keys.add(key)
            variants.append({'key': key, 'price': price, 'oldPrice': old, 'stock': None if (v or p).get('is_in_stock', True) else 0, 'sku': (v or {}).get('sku', '')})
    if not variants: return [], []
    used = [[k.split(' / ')[i] for k in keys] for i in range(len(options))]
    for o, u in zip(options, used): o['values'] = [x for x in o['values'] if x in u]
    return options, variants

# ---------- convert ----------
imported, descs, hidden = [], {}, []
for p in P:
    if p.get('type') not in ('simple', 'variable'): continue
    options, variants = build_variants(p) if p['type'] == 'variable' else ([], [])
    if variants:
        cheapest = min(variants, key=lambda v: v['price'])
        price, old = cheapest['price'], cheapest['oldPrice']
        tracked = [v for v in variants if v['stock'] is not None]
        stock = sum(v['stock'] for v in tracked) if len(tracked) == len(variants) else None
    else:
        price, old = price_pair(p['prices'])
        stock = None if p.get('is_in_stock', True) else 0
    slug = slugify(html.unescape(p['slug'])) or f"p{p['id']}"
    desc = clean_html(p['description'])
    short = plain(p['short_description']) or plain(desc, 200)
    item = {
        'id': p['id'], 'slug': slug, 'name': html.unescape(p['name']).strip(), 'price': price, 'oldPrice': old,
        'images': [i['src'] for i in p['images'] if i.get('src')], 'categories': map_cats(p), 'subcategories': [],
        'sku': p.get('sku') or f"VB-{p['id']}", 'productType': 'Physical', 'brand': ', '.join(b['name'] for b in p.get('brands') or []),
        'shortDescription': short, 'options': options, 'variants': variants, 'stock': stock, 'sold': 0,
        'featured': False, 'isNew': False, 'active': price > 0 and bool(p['images']), 'source': 'varieytbazar',
    }
    if not item['active']: hidden.append((item['name'], 'no price' if price <= 0 else 'no image'))
    descs[slug] = desc or f"<p>{html.escape(short)}</p>"
    imported.append(item)

imported.sort(key=lambda x: -x['id'])
for i, it in enumerate(imported[:24]):
    if it['active']: it['isNew'] = True

# existing catalogue: drop products without images; keep the rest (with their own descriptions)
old = json.load(open(MOCKS / 'products.json'))
old_desc = json.load(open(MOCKS / 'descriptions.json')) if (MOCKS / 'descriptions.json').exists() else {}
kept = []
for p in old:
    if p.get('source') == 'varieytbazar': continue
    if not p.get('images'): continue
    if 'description' in p: old_desc[p['slug']] = p.pop('description')
    kept.append(p)
taken = {p['slug'] for p in imported}
kept = [p for p in kept if p['slug'] not in taken]
for p in kept: descs.setdefault(p['slug'], old_desc.get(p['slug'], f"<p>{html.escape(p.get('shortDescription', ''))}</p>"))

products = imported + kept

# ---------- categories (only those with visible products), image = first product photo ----------
old_cats = {c['slug']: c for c in json.load(open(MOCKS / 'categories.json'))}
names = {**{s: v[0] for s, v in CATS.items()}}
order = list(CATS.keys()) + [s for s in old_cats if s not in CATS]
categories = []
for s in order:
    items = [p for p in products if s in p['categories'] and p.get('active', True) is not False]
    if not items: continue
    img = old_cats.get(s, {}).get('image') if s in old_cats and not any(p.get('source') for p in items) else items[0]['images'][0]
    categories.append({'slug': s, 'name': names.get(s) or old_cats[s]['name'], 'image': img, 'subcategories': []})

# ---------- homepage ----------
vis = [p for p in products if p.get('active', True) is not False]
def pct(p): return (p['oldPrice'] - p['price']) / p['oldPrice'] if p.get('oldPrice') else 0
home = json.load(open(MOCKS / 'home.json'))
home['flashSale'] = [p['slug'] for p in sorted([p for p in vis if p.get('source')], key=pct, reverse=True)[:12]]
home['hotDeal'] = 'sameAsFlashSale'
home['allProducts'] = [p['slug'] for p in vis if p.get('source')][:18]
home['categorySections'] = {c['slug']: [p['slug'] for p in vis if c['slug'] in p['categories']][:12] for c in categories}
home['banners'] = [
    {'image': '', 'link': '/category/electronics-and-gadgets', 'title': 'New gadgets, honest prices', 'sub': f"{sum(1 for p in vis if 'electronics-and-gadgets' in p['categories'])}+ gadgets — cash on delivery all over Bangladesh.", 'cta': 'Shop gadgets'},
    {'image': '', 'link': '/category/home-appliances', 'title': 'Smart home appliances', 'sub': 'Make everyday work easier at home and in the kitchen.', 'cta': 'Shop appliances'},
    {'image': '', 'link': '/category/personal-care', 'title': 'Personal care essentials', 'sub': 'Health, comfort and care products delivered to your door.', 'cta': 'Shop personal care'},
]

json.dump(products, open(MOCKS / 'products.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(descs, open(MOCKS / 'descriptions.json', 'w'), ensure_ascii=False)
json.dump(categories, open(MOCKS / 'categories.json', 'w'), ensure_ascii=False, indent=1)
json.dump(home, open(MOCKS / 'home.json', 'w'), ensure_ascii=False, indent=1)
print(f"imported {len(imported)} (hidden {len(hidden)}), kept {len(kept)} sample products with images, removed {len(old) - len(kept) - sum(1 for p in old if p.get('source'))} without images")
print(f"total {len(products)} products, {len(vis)} visible, {sum(1 for p in products if p['variants'])} with variants, {len(categories)} categories")
for c in categories: print('  ', c['name'], sum(1 for p in vis if c['slug'] in p['categories']))
json.dump(hidden, open('/tmp/hidden.json', 'w'), ensure_ascii=False, indent=1)
