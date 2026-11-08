# -*- coding: utf-8 -*-
import json, time, os
from seed_a import post, P
import seed_b

DISC_BN = "> তথ্যটি সাধারণ গাইডলাইন। শর্ত, ডেডলাইন ও ফান্ডিং প্রতি বছর বদলায় — আবেদনের আগে অবশ্যই অফিসিয়াল ওয়েবসাইটে যাচাই করুন।"
DISC_EN = "> General guidance only. Rules, deadlines and funding change every year — always verify on the official website before applying."

post('study-abroad-scholarships-overview', 'scholarship',
 'বিদেশে পড়ার জনপ্রিয় স্কলারশিপ: দেশভিত্তিক সংক্ষিপ্ত পরিচিতি',
 'Popular Study-Abroad Scholarships: A Country-by-Country Overview',
 'Chevening, Commonwealth, Fulbright, DAAD, Australia Awards, MEXT, GKS, CSC, Türkiye Burslari, Stipendium Hungaricum ও Erasmus Mundus — কোনটি কী, কীভাবে খুঁজবেন।',
 'Chevening, Commonwealth, Fulbright, DAAD, Australia Awards, MEXT, GKS, CSC, Türkiye Burslari, Stipendium Hungaricum and Erasmus Mundus — what they are and how to look.',
 """স্কলারশিপ পেলে বিদেশে পড়ার খরচ অনেক কমে। নিচে বিভিন্ন দেশের পরিচিত কিছু কর্মসূচির সংক্ষিপ্ত পরিচিতি দিলাম — **বিস্তারিত শর্ত ও ডেডলাইন প্রতিটির অফিসিয়াল ওয়েবসাইটে দেখুন**।

## যুক্তরাজ্য
- **Chevening:** সরকারি অর্থায়নে এক বছরের মাস্টার্স; কাজের অভিজ্ঞতা ও নেতৃত্বের গুণ গুরুত্ব পায়।
- **Commonwealth Scholarships:** কমনওয়েলথভুক্ত দেশের শিক্ষার্থীদের জন্য মাস্টার্স ও পিএইচডি।

## যুক্তরাষ্ট্র
- **Fulbright:** স্নাতকোত্তর ও গবেষণার জন্য; দেশভিত্তিক প্রতিযোগিতামূলক নির্বাচন।

## জার্মানি
- **DAAD:** স্নাতকোত্তর, গবেষণা ও পিএইচডির জন্য নানা প্রোগ্রাম।

## অস্ট্রেলিয়া
- **Australia Awards:** উন্নয়নশীল দেশের শিক্ষার্থীদের জন্য সরকারি স্কলারশিপ।

## এশিয়া
- **MEXT (জাপান), GKS (কোরিয়া), CSC (চীন):** সরকারি স্কলারশিপ — ফি, বৃত্তি ও কখনও ভাষা-কোর্সসহ।

## তুরস্ক ও হাঙ্গেরি
- **Türkiye Burslari** এবং **Stipendium Hungaricum:** আন্তর্জাতিক শিক্ষার্থীদের জন্য সরকারি পূর্ণ-অর্থায়ন প্রোগ্রাম।

## ইউরোপ
- **Erasmus Mundus:** একাধিক ইউরোপীয় দেশে যৌথ মাস্টার্স প্রোগ্রাম।

## কীভাবে সফল হবেন?
1. ডেডলাইনের কমপক্ষে ৬ মাস আগে শুরু করুন।
2. IELTS স্কোর আগেই প্রস্তুত রাখুন — অনেক স্কলারশিপে নির্দিষ্ট ব্যান্ড চাওয়া হয়।
3. SOP/মোটিভেশন লেটারে নিজের গল্প ও লক্ষ্য পরিষ্কার করুন: [SOP, LOR ও ডকুমেন্ট](/blog/sop-lor-documents-checklist)।
4. অফিসিয়াল সাইট ছাড়া অন্য কাউকে টাকা দেবেন না — কোনো স্কলারশিপ কেনার বিষয় নয়।

""" + DISC_BN + """

আরও দেখুন: [দেশভিত্তিক স্কোর](/blog/ielts-score-requirements-by-country)।

{{books:practice}}""",
 """Scholarships can cut the cost of studying abroad dramatically. Here is a short overview — **check each programme's official website for details and deadlines**.

- **UK:** Chevening (one-year master's, leadership focus) and Commonwealth Scholarships (master's/PhD for eligible countries).
- **USA:** Fulbright for graduate study and research.
- **Germany:** DAAD offers many master's, research and PhD programmes.
- **Australia:** Australia Awards for students from developing countries.
- **Asia:** MEXT (Japan), GKS (Korea), CSC (China) government scholarships.
- **Türkiye and Hungary:** Türkiye Burslari and Stipendium Hungaricum.
- **Europe:** Erasmus Mundus joint master's programmes.

## Tips
Start at least six months before the deadline, keep your IELTS score ready, write a clear [SOP](/blog/sop-lor-documents-checklist), and never pay anyone to "buy" a scholarship.

""" + DISC_EN + """

See also: [score requirements by country](/blog/ielts-score-requirements-by-country).

{{books:practice}}""",
 ['cambridge-ielts-with-answer-1-to-20-book-academic', 'ielts-actual-question-bank-2026-last-6-months-digest'], ['scholarship', 'chevening', 'daad', 'fulbright'])

post('ielts-score-requirements-by-country', 'country',
 'দেশভিত্তিক IELTS স্কোর: কোথায় কত ব্যান্ড সাধারণত লাগে',
 'IELTS Score Requirements by Country: What Bands Are Typically Needed',
 'যুক্তরাজ্য, কানাডা, অস্ট্রেলিয়া, যুক্তরাষ্ট্র, জার্মানি ও অন্যান্য দেশে সাধারণ স্কোরের পরিসর এবং কীভাবে নিশ্চিত হবেন।',
 'Typical score ranges for the UK, Canada, Australia, the USA, Germany and others, and how to confirm the exact number.',
 """নির্দিষ্ট কোনো দেশের জন্য একটি "স্থির" স্কোর নেই — **প্রতিটি বিশ্ববিদ্যালয় ও কোর্সের শর্ত আলাদা**। তবে একটি সাধারণ ধারণা থাকলে লক্ষ্য ঠিক করতে সুবিধা হয়।

## সাধারণ পরিসর (আনুমানিক)
- **ব্যাচেলর:** প্রায় Overall ৬.০–৬.৫, প্রতি মডিউলে ৫.৫–৬.০ এর নিচে নয়।
- **মাস্টার্স:** প্রায় Overall ৬.৫–৭.০।
- **মেডিসিন, আইন বা নার্সিং:** প্রায়ই বেশি (৭.০–৭.৫)।
- **পিএইচডি:** বিষয় ও বিশ্ববিদ্যালয় অনুযায়ী ৬.৫–৭.০।

## দেশভিত্তিক কিছু বিষয়
- **যুক্তরাজ্য, অস্ট্রেলিয়া, কানাডা:** IELTS সাধারণভাবে গৃহীত; ভিসার জন্য আলাদা শর্ত থাকতে পারে।
- **যুক্তরাষ্ট্র:** অনেক বিশ্ববিদ্যালয় IELTS-এর সাথে অন্য পরীক্ষাও গ্রহণ করে।
- **জার্মানি ও ইউরোপ:** ইংরেজি-মাধ্যম প্রোগ্রামে IELTS চাওয়া হয়; কিছু ক্ষেত্রে মাধ্যম ইংরেজি সনদ গ্রহণযোগ্য।
- **এশিয়া:** কোর্স ও বিশ্ববিদ্যালয়ভেদে ভিন্ন।

## সঠিক স্কোর কীভাবে জানবেন?
1. বিশ্ববিদ্যালয়ের কোর্স পেজে "English language requirements" দেখুন।
2. ভিসা বা স্কলারশিপের আলাদা শর্ত আছে কি না যাচাই করুন।
3. কাছাকাছি স্কোর হলে বিশ্ববিদ্যালয়ের প্রি-সেশনাল ইংরেজি কোর্সের সুযোগ আছে কি না জিজ্ঞাসা করুন।

""" + DISC_BN + """

লক্ষ্য স্কোর ঠিক হলে [৩ মাসের প্ল্যান](/blog/ielts-3-month-study-plan) অনুসরণ করুন।

{{combo}}""",
 """There is no single fixed score per country — **each university and course sets its own rule**. A rough picture helps you set a target.

## Typical ranges (approximate)
Bachelor's about 6.0–6.5 overall, master's about 6.5–7.0, medicine/law/nursing often 7.0–7.5, PhD 6.5–7.0, usually with minimum module scores.

## By region
UK, Australia and Canada broadly accept IELTS (visas may have separate rules); many US universities accept IELTS and other tests; Germany and Europe ask for IELTS on English-taught programmes; Asia varies.

Find the exact number on the course page under "English language requirements", and check visa or scholarship rules too.

""" + DISC_EN + """

Then follow the [3-month plan](/blog/ielts-3-month-study-plan).

{{combo}}""",
 ['ielts-beginner-combo-package-26-books', 'ielts-advance-combo-package-50-books'], ['ielts score', 'requirements', 'country'])

post('how-to-apply-to-foreign-university-step-by-step', 'university',
 'বিদেশি বিশ্ববিদ্যালয়ে আবেদন: ধাপে ধাপে পূর্ণ গাইড',
 'How to Apply to a Foreign University: A Complete Step-by-Step Guide',
 'দেশ ও কোর্স বাছাই থেকে অফার লেটার পর্যন্ত — কখন কী করবেন তার টাইমলাইন।',
 'From picking a country and course to the offer letter — a timeline of what to do when.',
 """বিদেশি বিশ্ববিদ্যালয়ে আবেদন বড় মনে হলেও ধাপে ভাগ করলে সহজ।

## টাইমলাইন (আনুমানিক)
- **১২–১৮ মাস আগে:** দেশ ও কোর্স ঠিক করুন, IELTS প্রস্তুতি শুরু করুন।
- **৯–১২ মাস আগে:** বিশ্ববিদ্যালয়ের তালিকা, স্কলারশিপের ডেডলাইন লিখুন।
- **৬–৮ মাস আগে:** IELTS দিন, ডকুমেন্ট প্রস্তুত করুন।
- **৪–৬ মাস আগে:** আবেদন জমা দিন।
- **অফারের পর:** শর্ত পূরণ, ডিপোজিট, ভিসা।

## ধাপগুলো
1. **কোর্স ও বিশ্ববিদ্যালয় বাছাই:** বিষয়, র‍্যাংকিং, খরচ, স্কলারশিপ ও চাকরির সুযোগ বিবেচনা করুন। ৮–১০টির তালিকা করুন — কিছু উচ্চাকাঙ্ক্ষী, কিছু বাস্তবসম্মত ও কিছু নিরাপদ।
2. **শর্ত যাচাই:** একাডেমিক ফল, IELTS স্কোর ও প্রয়োজনীয় ডকুমেন্ট।
3. **ডকুমেন্ট:** ট্রান্সক্রিপ্ট, সনদ, পাসপোর্ট, সিভি, SOP, LOR — বিস্তারিত: [SOP, LOR ও ডকুমেন্ট](/blog/sop-lor-documents-checklist)।
4. **অনলাইন আবেদন:** বিশ্ববিদ্যালয়ের পোর্টাল বা নির্ধারিত আবেদন পদ্ধতিতে জমা দিন; ডেডলাইনের আগেই।
5. **অফার ও শর্ত:** শর্তসাপেক্ষ অফার হলে অবশিষ্ট শর্ত (যেমন IELTS) পূরণ করুন।
6. **ডিপোজিট ও ভিসা:** [ভিসা গাইড](/blog/student-visa-process-overview-and-checklist) দেখুন।

## সতর্কতা
অফিসিয়াল পোর্টাল ছাড়া অন্য কাউকে অগ্রিম অনুচিত অর্থ দেবেন না। এজেন্ট ব্যবহার করলে তার চুক্তি ও পরিষেবা ফি পরিষ্কার করে নিন।

""" + DISC_BN + """

স্কলারশিপ দেখুন: [জনপ্রিয় স্কলারশিপ](/blog/study-abroad-scholarships-overview)।

{{books:writing}}""",
 """Applying abroad is manageable when split into steps.

## Timeline (approximate)
12–18 months before: pick country and course, start IELTS. 9–12: shortlist universities and scholarships. 6–8: take IELTS, prepare documents. 4–6: submit applications. After offers: meet conditions, pay deposit, apply for a visa.

## Steps
1. Shortlist 8–10 universities (ambitious, realistic, safe).
2. Check academic, IELTS and document requirements.
3. Prepare transcripts, certificates, passport, CV, [SOP and LOR](/blog/sop-lor-documents-checklist).
4. Apply through the official portal before the deadline.
5. Meet any conditions on a conditional offer.
6. Pay the deposit and follow the [visa checklist](/blog/student-visa-process-overview-and-checklist).

Never pay unofficial intermediaries unreasonable advance sums; if you use an agent, clarify the contract and fees.

""" + DISC_EN + """

See also: [popular scholarships](/blog/study-abroad-scholarships-overview).

{{books:writing}}""",
 ['lizs-ielts-writing-task-1-and-2-bangla-translated', 'makkar-ielts-writing-bundle-package-latest'], ['university application', 'admission', 'study abroad'])

post('sop-lor-documents-checklist', 'university',
 'SOP, LOR ও আবেদনের ডকুমেন্ট চেকলিস্ট',
 'SOP, LOR and Application Documents Checklist',
 'ভালো SOP কীভাবে লিখবেন, কাকে দিয়ে LOR নেবেন এবং আবেদনের আগে কোন কাগজগুলো তৈরি রাখবেন।',
 'How to write a strong SOP, who to ask for an LOR, and which documents to keep ready.',
 """SOP (Statement of Purpose) আপনার আবেদনের মূল গল্প; LOR (Letter of Recommendation) অন্যের চোখে আপনার যোগ্যতা।

## ভালো SOP-এর কাঠামো
1. **ভূমিকা:** আপনার আগ্রহ কীভাবে শুরু হলো — একটি নির্দিষ্ট ঘটনা বা অভিজ্ঞতা দিয়ে।
2. **একাডেমিক ও কাজের অভিজ্ঞতা:** প্রাসঙ্গিক প্রকল্প, গবেষণা বা ইন্টার্নশিপ।
3. **কেন এই কোর্স ও বিশ্ববিদ্যালয়:** নির্দিষ্ট মডিউল, অধ্যাপক বা গবেষণা গোষ্ঠীর উল্লেখ।
4. **ভবিষ্যৎ লক্ষ্য:** পড়াশোনা শেষে কী করবেন এবং কীভাবে এটি কাজে লাগবে।
5. **উপসংহার:** সংক্ষিপ্ত ও আত্মবিশ্বাসী।

**সতর্কতা:** অন্যের SOP কপি বা অনলাইনের টেমপ্লেট হুবহু ব্যবহার করবেন না — কপি ধরা পড়লে আবেদন বাতিল হতে পারে। নিজের কথায় লিখুন।

## LOR
- আপনাকে ভালো চেনেন এমন শিক্ষক বা সুপারভাইজারকে বলুন।
- অন্তত ১ মাস আগে অনুরোধ করুন এবং তাঁকে আপনার সিভি ও SOP খসড়া দিন।

## ডকুমেন্ট চেকলিস্ট
- পাসপোর্ট (মেয়াদ যাচাই করুন)
- একাডেমিক ট্রান্সক্রিপ্ট ও সনদ (প্রয়োজনে অনুবাদ ও সত্যায়ন)
- IELTS স্কোর রিপোর্ট
- সিভি
- SOP ও LOR
- কাজের অভিজ্ঞতার সনদ (থাকলে)
- পোর্টফোলিও বা গবেষণা প্রস্তাব (কোর্স অনুযায়ী)

SOP লেখায় ইংরেজি দক্ষতা কাজে লাগবে — [Writing Task 2 গাইড](/blog/ielts-writing-task-1-task-2-guide) দেখুন।

""" + DISC_BN + """

{{books:writing}}""",
 """The SOP is your story; the LOR is someone else's view of your potential.

## SOP structure
Introduction with a specific experience, academic and work background, why this course and university (name modules or professors), future goals, a concise conclusion. **Never copy** another SOP or a template — plagiarism can cancel your application.

## LOR
Ask teachers or supervisors who know you well at least a month ahead and give them your CV and SOP draft.

## Checklist
Passport, transcripts and certificates (translated/attested if needed), IELTS report, CV, SOP, LORs, work certificates, and a portfolio or research proposal if required.

Strengthen your writing with the [Writing guide](/blog/ielts-writing-task-1-task-2-guide).

""" + DISC_EN + """

{{books:writing}}""",
 ['lizs-ielts-writing-task-1-and-2-bangla-translated', 'confidents-cambridge-ielts-writing-task-2-answers-developer'], ['sop', 'lor', 'documents'])

post('student-visa-process-overview-and-checklist', 'abroad',
 'স্টুডেন্ট ভিসা প্রক্রিয়া: সাধারণ ধাপ ও চেকলিস্ট',
 'Student Visa Process: General Steps and Checklist',
 'অফার লেটার পাওয়ার পর ফান্ডের প্রমাণ, ভিসা আবেদন, স্বাস্থ্য-পরীক্ষা, ইন্টারভিউ ও ফ্লাইটের পরিকল্পনা — সাধারণ ধারণা।',
 'After the offer: proof of funds, the visa application, medicals, interview and travel — the general picture.',
 """স্টুডেন্ট ভিসার নিয়ম দেশভেদে আলাদা এবং প্রায়ই বদলায়। এখানে সাধারণ কাঠামোটি দেওয়া হলো — **বিস্তারিত অবশ্যই সংশ্লিষ্ট দেশের অফিসিয়াল ইমিগ্রেশন বা দূতাবাসের ওয়েবসাইটে দেখুন**।

## সাধারণ ধাপ
1. **অফার গ্রহণ ও ডিপোজিট:** শর্ত পূরণ করে অফার গ্রহণ করুন এবং বিশ্ববিদ্যালয়ের নির্দেশনা মতো ডিপোজিট দিন।
2. **ভিসার জন্য প্রয়োজনীয় সনদ পাওয়া:** বিশ্ববিদ্যালয় থেকে ভিসার জন্য নির্ধারিত নথি (যেমন CAS বা সমতুল্য) আসবে।
3. **ফান্ডের প্রমাণ:** ব্যাংক স্টেটমেন্ট বা অন্যান্য প্রমাণ — অর্থের উৎস পরিষ্কার ও স্বচ্ছ হতে হবে।
4. **অনলাইনে ভিসা আবেদন ও ফি:** অফিসিয়াল পোর্টাল ব্যবহার করুন।
5. **বায়োমেট্রিক্স, স্বাস্থ্য পরীক্ষা ও ইন্টারভিউ:** দেশ অনুযায়ী প্রযোজ্য হলে।
6. **ভিসা পাওয়ার পর:** আবাসন, ফ্লাইট, ইনস্যুরেন্স ও প্রাথমিক খরচের পরিকল্পনা।

## ডকুমেন্ট চেকলিস্ট
- বৈধ পাসপোর্ট
- অফার/ভর্তির নিশ্চিতকরণ
- IELTS স্কোর রিপোর্ট
- একাডেমিক সনদ
- ফান্ডের প্রমাণ
- স্বাস্থ্য বা ইনস্যুরেন্স সংক্রান্ত কাগজ (প্রযোজ্য হলে)
- পাসপোর্ট সাইজ ছবি

## সতর্কতা
- ভুয়া বা জাল কাগজ কখনোই ব্যবহার করবেন না — এতে ভবিষ্যতে ভিসা নিষিদ্ধও হতে পারে।
- অফিসিয়াল চ্যানেল ছাড়া "গ্যারান্টি ভিসা"-র প্রলোভনে পড়বেন না।
- আবেদনের সময় সীমা আগেভাগে দেখুন — প্রক্রিয়ায় সপ্তাহ বা মাস লাগতে পারে।

ভিসা ইন্টারভিউ বা অ্যাকাডেমিক আলোচনায় ইংরেজিতে আত্মবিশ্বাসী হতে [Speaking গাইড](/blog/ielts-speaking-tips-cue-card) কাজে লাগবে।

""" + DISC_BN + """

{{books:speaking}}""",
 """Student visa rules differ by country and change often — **always check the official immigration or embassy site**.

## General steps
Accept the offer and pay the deposit; receive the university's visa document (such as a CAS or equivalent); prepare proof of funds with a clear source; apply online and pay the fee; complete biometrics, medicals and interview if required; then plan accommodation, flights and insurance.

## Checklist
Valid passport, offer confirmation, IELTS report, academic certificates, proof of funds, health/insurance papers if required, photos.

## Cautions
Never use forged documents (it can lead to bans), ignore "guaranteed visa" promises, and apply early — processing can take weeks.

Build confidence for interviews with the [Speaking guide](/blog/ielts-speaking-tips-cue-card).

""" + DISC_EN + """

{{books:speaking}}""",
 ['speaking-for-ielts-by-liz-bangla-translated', 'makkar-ielts-speaking-latest-edition-may-to-august-2026'], ['student visa', 'visa checklist', 'abroad'])

# ---- write seed ----
base = 1793491200000  # fixed so the demo order is stable; the server uses it as publish date
day = 86400000
for i, p in enumerate(P):
    p['at'] = base - i * day
    p['updated'] = p['at']
os.makedirs('api/seed', exist_ok=True)
json.dump({'version': 1, 'posts': P}, open('api/seed/posts.json', 'w'), ensure_ascii=False, indent=1)
print(len(P), 'posts')
# link check: every /blog/slug and /product/slug used must exist
import re
slugs = {p['slug'] for p in P}
prods = {x['slug'] for x in json.load(open('src/mocks/products.json'))}
bad = []
for p in P:
    txt = json.dumps(p, ensure_ascii=False)
    for s in re.findall(r'/blog/([a-z0-9-]+)\)', txt):
        if s not in slugs and s != 'category': bad.append(('blog', p['slug'], s))
    for s in re.findall(r'/product/([a-z0-9-]+)\)', txt):
        if s not in prods: bad.append(('product', p['slug'], s))
    for s in p['books']:
        if s not in prods: bad.append(('books', p['slug'], s))
print('missing links:', sorted(set(bad)))
