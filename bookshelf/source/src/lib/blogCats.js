/* Blog categories (menu), the A–Z guide stages and the default book suggestions used for the animated book promos. */
export const CATS = [
  { slug: 'guide', bn: 'IELTS পূর্ণাঙ্গ গাইডলাইন', en: 'IELTS Guide A–Z', dBn: 'প্রস্তুতির সূচনা থেকে বিদেশে উচ্চশিক্ষা শুরু পর্যন্ত ধাপভিত্তিক নির্দেশিকা', dEn: 'A stage-by-stage guide from the first day of preparation to commencing study abroad' },
  { slug: 'exam', bn: 'পরীক্ষা সম্পর্কিত তথ্য', en: 'Exam Info', dBn: 'পরীক্ষার কাঠামো, মূল্যায়ন পদ্ধতি, নিবন্ধন ও পরীক্ষার দিনের প্রয়োজনীয় তথ্য', dEn: 'Test structure, scoring, registration and test-day information' },
  { slug: 'study', bn: 'প্রস্তুতি কৌশল', en: 'Preparation Strategies', dBn: 'Listening, Reading, Writing ও Speaking — প্রতিটি মডিউলের পদ্ধতিগত প্রস্তুতি', dEn: 'A methodical approach to each IELTS module' },
  { slug: 'books', bn: 'গ্রন্থ নির্দেশিকা', en: 'Book Guide', dBn: 'কোন পর্যায়ে কোন বইটি উপযোগী এবং কম্বো প্যাকেজের সুবিধা', dEn: 'Which book suits which stage, and the advantages of combo packages' },
  { slug: 'scholarship', bn: 'বৃত্তি ও স্কলারশিপ', en: 'Scholarships', dBn: 'বিভিন্ন দেশের বৃত্তি ও আর্থিক সহায়তা সম্পর্কিত তথ্য', dEn: 'Scholarships and funding opportunities by country' },
  { slug: 'university', bn: 'বিশ্ববিদ্যালয় ও ভর্তি আবেদন', en: 'University & Admission', dBn: 'বিশ্ববিদ্যালয় নির্বাচন, SOP, LOR ও আবেদন প্রক্রিয়া', dEn: 'Choosing a university, SOP, LOR and the application process' },
  { slug: 'country', bn: 'দেশভিত্তিক তথ্য', en: 'Country Insights', dBn: 'বিভিন্ন দেশের ভাষাগত যোগ্যতার প্রয়োজনীয়তা ও আবেদন প্রক্রিয়ার সাম্প্রতিক চিত্র', dEn: 'Language requirements and how each country processes applications' },
  { slug: 'abroad', bn: 'ভিসা ও প্রবাস প্রস্তুতি', en: 'Visa & Relocation', dBn: 'স্টুডেন্ট ভিসা, আর্থিক সক্ষমতার প্রমাণ ও যাত্রার প্রস্তুতি', dEn: 'Student visa, proof of funds and travel preparation' },
]
export const catOf = (slug) => CATS.find((c) => c.slug === slug) || CATS[0]

/** Book suggestions by topic — real slugs from the catalogue; missing ones are skipped automatically. */
export const BOOKS_BY_TOPIC = {
  foundation: ['essential-grammar-in-use-4th-edition', 'banglay-ielts-grammar-by-rashed-mujib-zaman', 'word-power-made-easy', 'ielts-trainer', 'cambridge-ielts-official-guide'],
  listening: ['lizs-ielts-listening-strategies-book-bangla-translated', 'cambridge-ielts-listening-for-high-band-score', 'khans-monologue-ielts-listening', 'cambridge-ielts-listening-answers-developer-guide'],
  reading: ['lis-ielts-reading-strategies-bangla-translated', 'makkar-ielts-reading-volume-1', 'ielts-advantage-reading-skills', 'cambridge-ielts-reading-answers-developer-guide'],
  writing: ['lizs-ielts-writing-task-1-and-2-bangla-translated', 'makkar-ielts-writing-bundle-package-latest', 'cambridge-ielts-writing-task-1-answers-developer-guide', 'confidents-cambridge-ielts-writing-task-2-answers-developer'],
  speaking: ['speaking-for-ielts-by-liz-bangla-translated', 'makkar-ielts-speaking-latest-edition-may-to-august-2026', 'confidents-repeated-cue-cards-for-ielts-speaking', 'cambridge-ielts-speaking-answers-developer-guide'],
  vocabulary: ['cambridge-ielts-vocabulary-by-jibon-ahmed', 'lizs-ielts-high-level-vocabulary-bangla-translated', 'makkar-ielts-vocabulary-builder-english-to-bangla', 'cambridge-ielts-vocabulary-and-phrases-guide'],
  practice: ['cambridge-ielts-with-answer-1-to-20-book-academic', 'confident-cambridge-ielts-mock-test-9-to-18', 'cambridge-ielts-20-with-solution-and-explanation', 'ielts-actual-question-bank-2026-last-6-months-digest'],
  combo: ['ielts-beginner-combo-package-26-books', 'ielts-beginner-to-advanced-package-42-combo', 'ielts-advance-combo-package-50-books', 'ielts-special-combo-package-52-books', 'ielts-exam-package', 'ielts-budget-friendly-17-books-combo', 'ielts-best-package-20-combo', 'computer-based-ielts-55-combo'],
}
export const BOOKS_BY_CAT = {
  guide: ['combo', 'foundation'], exam: ['practice', 'foundation'], study: ['practice', 'combo'], books: ['combo', 'practice'],
  scholarship: ['combo', 'practice'], university: ['combo', 'writing'], country: ['combo', 'practice'], abroad: ['combo', 'speaking'],
}
export const topicSlugs = (topics) => [...new Set(topics.flatMap((t) => BOOKS_BY_TOPIC[t] || []))]

/** The A–Z roadmap: from the first day of preparation to landing abroad. */
export const STAGES = [
  { n: 1, when: { bn: 'প্রারম্ভিক পর্যায়', en: 'Preliminary stage' }, title: { bn: 'লক্ষ্য নির্ধারণ', en: 'Define your objective' },
    text: { bn: 'প্রথমে গন্তব্য দেশ, কোর্স এবং প্রয়োজনীয় ব্যান্ড স্কোর নির্ধারণ করুন। Academic না General Training — এ সিদ্ধান্তও এ পর্যায়েই নিতে হবে। লক্ষ্য স্কোর ও আবেদনের সময়সীমা বিবেচনা করে প্রস্তুতির সময়সূচি তৈরি করুন।', en: 'Establish the destination country, the course and the band score required, and decide between Academic and General Training. Work backwards from your target score and application deadline to plan your timeline.' },
    posts: ['what-is-ielts-academic-vs-general', 'ielts-score-requirements-by-country'], topics: ['foundation'] },
  { n: 2, when: { bn: 'মাস ১', en: 'Month 1' }, title: { bn: 'ভিত্তি গঠন: ব্যাকরণ ও শব্দভান্ডার', en: 'Foundation: grammar & vocabulary' },
    text: { bn: 'প্রথম তিন থেকে চার সপ্তাহে ব্যাকরণের মৌলিক বিষয়গুলো আয়ত্ত করুন, প্রতিদিন ১০–১৫টি নতুন শব্দ শিখুন এবং ইংরেজি শোনা ও পড়ার নিয়মিত অভ্যাস গড়ে তুলুন। একই সঙ্গে IELTS-এর কাঠামো ও প্রশ্নের ধরন সম্পর্কে ধারণা নিন।', en: 'Spend the first three to four weeks on core grammar, learn 10–15 new words a day and build a daily habit of listening to and reading English. Become familiar with the test structure and question types.' },
    posts: ['ielts-test-format-band-score-explained', 'ielts-3-month-study-plan'], topics: ['foundation', 'vocabulary'] },
  { n: 3, when: { bn: 'মাস ২', en: 'Month 2' }, title: { bn: 'প্রতিটি মডিউলের কৌশল অনুশীলন', en: 'Learn module strategies' },
    text: { bn: 'Listening ও Reading দিয়ে শুরু করে Writing Task 1 ও Task 2 এবং Speaking-এর তিনটি পার্ট অনুশীলন করুন। প্রতিটি মডিউলের জন্য একটি নির্দিষ্ট কৌশল-নির্ভর বই অনুসরণ করা কার্যকর।', en: 'Begin with Listening and Reading, then Writing Tasks 1 and 2, and the three parts of Speaking. Follow one dedicated strategy book per module and practise daily.' },
    posts: ['ielts-listening-tips-band-7', 'ielts-reading-tips-time-management', 'ielts-writing-task-1-task-2-guide', 'ielts-speaking-tips-cue-card'], topics: ['listening', 'reading', 'writing', 'speaking'] },
  { n: 4, when: { bn: 'মাস ৩', en: 'Month 3' }, title: { bn: 'মক টেস্ট ও দুর্বলতা বিশ্লেষণ', en: 'Mock tests & fixing weak spots' },
    text: { bn: 'Cambridge IELTS-এর টেস্টগুলো নির্ধারিত সময়ের মধ্যে সমাধান করুন, প্রতিটি ভুল লিপিবদ্ধ করে বিশ্লেষণ করুন এবং প্রতি সপ্তাহে একটি পূর্ণাঙ্গ মক টেস্ট দিন। সাম্প্রতিক প্রশ্ন সংকলনের সঙ্গেও পরিচিত হোন।', en: 'Complete Cambridge IELTS tests under timed conditions, record and analyse every mistake, and sit one full mock test each week. Review recent question banks as well.' },
    posts: ['which-ielts-book-to-read-when', 'monthly-ielts-book-update-guide'], topics: ['practice'] },
  { n: 5, when: { bn: 'পরীক্ষার ১–২ মাস আগে', en: '1–2 months before' }, title: { bn: 'নিবন্ধন ও পরীক্ষার তারিখ নির্ধারণ', en: 'Register & fix the date' },
    text: { bn: 'British Council অথবা IDP-তে নিবন্ধন সম্পন্ন করুন, কম্পিউটার-ভিত্তিক বা কাগজ-ভিত্তিক পরীক্ষার মধ্যে একটি বেছে নিন এবং পাসপোর্ট প্রস্তুত রাখুন। পরীক্ষার তারিখ এমনভাবে নির্ধারণ করুন, যেন ফলাফল আবেদনের সময়সীমার আগেই পাওয়া যায়।', en: 'Register with the British Council or IDP, choose between computer- and paper-based delivery, and keep your passport ready. Select a date that allows results to arrive before your application deadline.' },
    posts: ['how-to-register-for-ielts-bangladesh'], topics: ['combo'] },
  { n: 6, when: { bn: 'ফলাফলের আগে থেকেই', en: 'Even before results' }, title: { bn: 'বিশ্ববিদ্যালয় ও বৃত্তি নির্বাচন', en: 'Shortlist universities & scholarships' },
    text: { bn: 'দেশ ও বিষয় অনুযায়ী ৮–১০টি বিশ্ববিদ্যালয়ের একটি তালিকা তৈরি করুন (উচ্চাকাঙ্ক্ষী, বাস্তবসম্মত ও নিরাপদ শ্রেণিতে বিভক্ত করে), এবং আবেদনের সময়সীমা ও বৃত্তির সুযোগ যাচাই করুন।', en: 'List 8–10 universities by country and subject (ambitious, realistic, safe) and note deadlines and scholarships.' },
    posts: ['how-to-apply-to-foreign-university-step-by-step', 'study-abroad-scholarships-overview'], topics: [] },
  { n: 7, when: { bn: 'ডেডলাইনের ২–৩ মাস আগে', en: '2–3 months before deadline' }, title: { bn: 'SOP, LOR ও প্রয়োজনীয় নথি', en: 'SOP, LOR & documents' },
    text: { bn: 'নিজস্ব ভাষায় SOP রচনা করুন, শিক্ষকদের কাছ থেকে LOR সংগ্রহ করুন, ট্রান্সক্রিপ্ট ও সনদ প্রস্তুত করুন এবং অনলাইনে আবেদন জমা দিন।', en: 'Write your SOP, request LORs, prepare transcripts and certificates, then submit the online applications.' },
    posts: ['sop-lor-documents-checklist'], topics: ['writing'] },
  { n: 8, when: { bn: 'অফার পাওয়ার পর', en: 'After the offer' }, title: { bn: 'ভিসা ও প্রবাস প্রস্তুতি', en: 'Visa & departure' },
    text: { bn: 'অফার লেটার গ্রহণ করে টিউশন ডিপোজিট প্রদান করুন, আর্থিক সক্ষমতার প্রমাণ গুছিয়ে রাখুন, ভিসার আবেদন করুন এবং আবাসন ও ফ্লাইটের পরিকল্পনা সম্পন্ন করুন।', en: 'Accept the offer, pay the deposit, organise proof of funds, apply for the visa and plan accommodation and flights.' },
    posts: ['student-visa-process-overview-and-checklist'], topics: ['speaking'] },
]
