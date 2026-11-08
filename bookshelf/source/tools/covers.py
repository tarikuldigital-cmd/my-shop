# -*- coding: utf-8 -*-
"""Generates formal editorial cover illustrations (1200x675 webp) for blog posts: category palette + line-art motif + pattern."""
import json, os, sys, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

PAL = {  # from, to
 'guide': ('#0b4a24', '#16a34a'), 'exam': ('#0f2f4d', '#2a6fa8'), 'study': ('#0f3f3c', '#14998c'),
 'books': ('#5c2a0e', '#d9682a'), 'scholarship': ('#2e2147', '#7a4fb8'), 'university': ('#18202c', '#4b5a6e'),
 'country': ('#083a57', '#1593b5'), 'abroad': ('#14296b', '#3f78e0'), 'news': ('#5e1414', '#c63a3a'),
}
ICON = {
 'guide': '<circle cx="150" cy="150" r="110"/><circle cx="150" cy="150" r="8" fill="#fff"/><path d="M150 60 L180 150 L150 240 L120 150 Z"/><path d="M150 25v22M150 253v22M25 150h22M253 150h22"/>',
 'exam': '<path d="M70 30h110l50 50v190H70z"/><path d="M180 30v50h50"/><path d="M100 130h100M100 165h100M100 200h60"/><path d="M180 215l16 16 34-38"/>',
 'study': '<path d="M60 70h150a20 20 0 0 1 20 20v170H80a20 20 0 0 1-20-20z"/><path d="M95 120h100M95 155h100M95 190h70"/><path d="M215 60l45 45-95 95-52 8 8-52z"/>',
 'books': '<rect x="50" y="200" width="200" height="45" rx="6"/><rect x="70" y="150" width="170" height="45" rx="6"/><rect x="55" y="100" width="190" height="45" rx="6"/><path d="M85 200v45M85 150v45M220 100v45"/><path d="M105 78q45-35 90 0"/>',
 'scholarship': '<path d="M150 55L275 115 150 175 25 115z"/><path d="M75 145v70q75 50 150 0v-70"/><path d="M262 125v80"/><circle cx="262" cy="215" r="10"/>',
 'university': '<path d="M25 110L150 40l125 70z"/><path d="M50 235h200M40 262h220"/><path d="M70 125v100M120 125v100M180 125v100M230 125v100"/>',
 'country': '<circle cx="150" cy="150" r="115"/><ellipse cx="150" cy="150" rx="52" ry="115"/><path d="M35 150h230M55 90h190M55 210h190"/><path d="M150 35v230"/>',
 'abroad': '<path d="M270 45L30 140l75 28 28 75z"/><path d="M105 168L270 45"/><path d="M133 243l22-60"/>',
 'news': '<rect x="40" y="55" width="220" height="190" rx="8"/><rect x="62" y="80" width="95" height="65"/><path d="M175 85h65M175 112h65M175 139h65M62 170h178M62 195h178M62 220h120"/>',
}
KW = {  # kicker text per post slug (Latin, uppercase)
}
def svg(cat, kicker, variant):
    a, b = PAL[cat]
    pats = [
      '<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#fff" opacity=".18"/></pattern>',
      '<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="1"/></pattern>',
      '<pattern id="p" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V36" stroke="#fff" stroke-opacity=".09" stroke-width="2"/></pattern>',
    ]
    ang = [135, 160, 110, 145][variant % 4]
    x = 1200 - 360 - [0, 40, 80][variant % 3]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="g" gradientTransform="rotate({ang} .5 .5)"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>{pats[variant % 3]}
<radialGradient id="v" cx=".5" cy=".5" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
<rect width="1200" height="675" fill="url(#g)"/><rect width="1200" height="675" fill="url(#p)"/>
<circle cx="{x+150}" cy="330" r="250" fill="#fff" opacity=".07"/><circle cx="{x+150}" cy="330" r="190" fill="#fff" opacity=".07"/>
<g transform="translate({x} 180) scale(1.0)" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".92">{ICON[cat]}</g>
<rect width="1200" height="675" fill="url(#v)"/>
<rect x="70" y="520" width="64" height="5" fill="#f08a3c"/>
<text x="70" y="575" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="7" fill="#fff" opacity=".95">{kicker}</text>
<text x="70" y="615" font-family="Georgia, 'Times New Roman', serif" font-size="22" letter-spacing="5" fill="#fff" opacity=".7">BOOKSHELF  ·  IELTS KNOWLEDGE CENTRE</text>
</svg>'''

def main():
    posts = json.load(open('api/seed/posts.json'))['posts']
    kick = json.load(open('tools/kickers.json'))
    jobs = []
    for i, p in enumerate(posts):
        jobs.append((p['slug'], p['cat'], kick.get(p['slug'], p['cat'].upper()), i))
    for i, c in enumerate(PAL):
        jobs.append((f'cat-{c}', c, {'guide':'THE COMPLETE GUIDE','exam':'EXAM INFORMATION','study':'PREPARATION','books':'BOOK GUIDE','scholarship':'SCHOLARSHIPS','university':'UNIVERSITIES','country':'COUNTRY INSIGHTS','abroad':'VISA & RELOCATION','news':'LATEST NEWS'}[c], i))
    os.makedirs('public/blog-img', exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': 1200, 'height': 675})
        for slug, cat, kick, i in jobs:
            pg.set_content(f'<html><body style="margin:0">{svg(cat, kick, i)}</body></html>')
            tmp = tempfile.mktemp(suffix='.png'); pg.screenshot(path=tmp)
            Image.open(tmp).convert('RGB').save(f'public/blog-img/{slug}.webp', 'WEBP', quality=84, method=6)
            os.remove(tmp)
        b.close()
    print(len(jobs), 'covers')
main()
