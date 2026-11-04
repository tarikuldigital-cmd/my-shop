"""Merge scripts/details.jsonl (copied from the live site) into src/mocks/products.json.
Books the live site has no description for get a clearly-marked written fallback
(descSource = 'written') built from the title/category, so the admin can review them."""
import json, re, html
ROOT = __file__.rsplit('/scripts/', 1)[0]
P = f'{ROOT}/src/mocks/products.json'
ps = json.load(open(P))
det = {}
for l in open(f'{ROOT}/scripts/details.jsonl'):
    if l.strip():
        d = json.loads(l); det[d['slug']] = d

CAT_LABEL = {'listening': 'Listening', 'speaking': 'Speaking', 'writing': 'Writing', 'reading': 'Reading',
             'grammar': 'ব্যাকরণ', 'vocabulary': 'শব্দভান্ডার', 'spoken-english': 'Spoken English'}

def fallback(p):
    n, cat, s = p['name'], (p['categories'] or [''])[0], p['slug']
    nl = n.lower()
    pts, combo = [], []
    m = re.search(r'ielts (\d+) & note guide', nl)
    if 'note guide' in nl and m:
        pts = [f'Cambridge IELTS {m.group(1)} কম্পিউটার-বেসড পরীক্ষার ধরনে সাজানো প্রশ্ন ও টেস্ট।',
               f'সঙ্গে Note Guide {m.group(1)} — উত্তরের কৌশল ও গুরুত্বপূর্ণ নোট এক জায়গায়।',
               'কম্পিউটার-বেসড IELTS-এর প্রস্তুতি নিতে চাইলে বইটি উপযোগী।']
    elif 'note guide' in nl:
        pts = ['Cambridge IELTS 11–20 কম্পিউটার-বেসড টেস্টের জন্য নোট গাইড।', 'প্রতিটি টেস্টের উত্তরের কৌশল ও গুরুত্বপূর্ণ নোট।', 'কম্পিউটার-বেসড পরীক্ষার প্রস্তুতিতে সহায়ক।']
    elif 'computer based' in nl or 'cbt' in nl:
        pts = ['কম্পিউটার-বেসড IELTS পরীক্ষার ধরনে অনুশীলনের জন্য সাজানো প্যাকেজ।', 'Listening, Reading, Writing ও Speaking—চারটি মডিউলের প্রস্তুতি।', 'Cambridge-এর অফিশিয়াল টেস্টের সাথে সহায়ক গাইড বই অন্তর্ভুক্ত।']
    elif 'solution' in nl or 'answer' in nl:
        pts = ['Cambridge IELTS-এর টেস্টের সমাধান ও উত্তরের ব্যাখ্যা।', 'Reading, Listening, Writing ও Speaking-এর উত্তর বাংলায় বোঝার সুবিধা।', 'নিজে নিজে অনুশীলন ও যাচাই করার জন্য উপযোগী।']
    elif 'general' in nl and 'cambridge' in nl:
        pts = ['Cambridge IELTS General Training সিরিজের আসল পরীক্ষার প্রশ্ন।', 'Listening, Reading, Writing ও Speaking অনুশীলনের সুযোগ।', 'General Training পরীক্ষার্থীদের জন্য উপযোগী।']
    elif 'cambridge ielts' in nl and 'academic' in nl:
        pts = ['Cambridge IELTS Academic সিরিজের আসল পরীক্ষার প্রশ্নসহ পূর্ণাঙ্গ টেস্ট।', 'Listening, Reading, Writing ও Speaking—চার দক্ষতারই অনুশীলন।', 'আসল পরীক্ষার অভিজ্ঞতা পেতে ও নিজের অবস্থান যাচাই করতে সহায়ক।']
    elif 'gre' in nl:
        pts = ['GRE-এর Verbal ও Quantitative প্রস্তুতির জন্য সাজানো কম্বো।', 'অফিসিয়াল গাইড ও প্র্যাকটিস প্রশ্ন অন্তর্ভুক্ত।', 'গ্রাজুয়েট স্কুলে ভর্তির প্রস্তুতিতে সহায়ক।']
    elif 'combo' in nl or 'package' in nl or cat in ('combo-package', 'test-preparation'):
        pts = ['IELTS-এর Listening, Reading, Writing ও Speaking-এর প্রস্তুতি এক প্যাকেজে।', 'Cambridge IELTS সিরিজের সাথে সহায়ক গাইড ও ভোকাবুলারি বই অন্তর্ভুক্ত।', 'আলাদা আলাদা কেনার চেয়ে সাশ্রয়ী ও গোছানো প্রস্তুতি।']
    elif 'grammar' in nl or cat == 'grammar':
        pts = ['ব্যাকরণের নিয়ম সহজ ভাষায় উদাহরণসহ ব্যাখ্যা করা হয়েছে।', 'অনুশীলনী ও উত্তরের মাধ্যমে নিজের দুর্বলতা যাচাই করা যায়।', 'পরীক্ষা ও দৈনন্দিন ব্যবহারে নির্ভুল ইংরেজি লিখতে সহায়ক।']
    elif 'spoken' in nl or cat == 'spoken-english':
        pts = ['দৈনন্দিন পরিস্থিতিতে ইংরেজিতে কথা বলার সহজ কৌশল।', 'বাংলা ব্যাখ্যাসহ সহজ বাক্য ও উদাহরণ।', 'জড়তা কাটিয়ে আত্মবিশ্বাসের সাথে কথা বলতে সহায়ক।']
    elif cat == 'writing' or 'essay' in nl or 'letter' in nl:
        pts = ['Writing Task 1 ও 2-এর গঠন, ধাপ ও কৌশল।', 'নমুনা উত্তর ও প্রয়োজনীয় শব্দভান্ডার।', 'উচ্চ ব্যান্ড স্কোরের জন্য লেখার অনুশীলনে সহায়ক।']
    else:
        pts = [f'{n} বইটি আইইএলটিএস/ইংরেজি প্রস্তুতির জন্য সাজানো।', 'অনুশীলন ও কৌশলের মাধ্যমে প্রস্তুতি গোছানো যায়।']
    return {'pts': pts, 'combo': combo}

def mk_html(pts, combo, source):
    h = '<h4>বইটি সম্পর্কে</h4><ul>' + ''.join(f'<li>{html.escape(x)}</li>' for x in pts) + '</ul>'
    if combo:
        h += f'<h4>প্যাকেজে যা যা আছে</h4><ul>' + ''.join(f'<li>{html.escape(x)}</li>' for x in combo) + '</ul>'
    return h

live = written = 0
for p in ps:
    d = det.get(p['slug'])
    if d and d.get('has') and d.get('pts'):
        src, pts, combo = 'live', d['pts'], d.get('combo') or []
        live += 1
    else:
        f = fallback(p); src, pts, combo = 'written', f['pts'], f['combo']
        written += 1
    if d:
        for k in ('sku', 'author', 'publisher', 'pages', 'edition', 'language'):
            if d.get(k): p[k] = d[k]
        if d.get('print'): p['brand'] = d['print']
        if d.get('coverType'): p['coverType'] = d['coverType']
    p['shortDescription'] = ' '.join(pts[:2])
    p['description'] = mk_html(pts, combo, src)
    p['descSource'] = src
    if combo: p['comboItems'] = combo
json.dump(ps, open(P, 'w'), ensure_ascii=False, indent=1)
print('live', live, 'written', written, 'total', len(ps))
