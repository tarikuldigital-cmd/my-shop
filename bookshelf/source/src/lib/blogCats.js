/* Blog categories (menu), the A–Z guide stages and the default book suggestions used for the animated book promos. */
export const CATS = [
  { slug: 'guide', icon: '🧭', bn: 'IELTS গাইডলাইন (A–Z)', en: 'IELTS Guide A–Z', dBn: 'একদম বিগিনার থেকে বিদেশে যাওয়া পর্যন্ত ধাপে ধাপে গাইড', dEn: 'Step-by-step, from absolute beginner to flying abroad' },
  { slug: 'exam', icon: '📝', bn: 'পরীক্ষার তথ্য', en: 'Exam Info', dBn: 'IELTS ফরম্যাট, স্কোরিং, রেজিস্ট্রেশন ও পরীক্ষার দিনের তথ্য', dEn: 'Format, scoring, registration and test-day information' },
  { slug: 'study', icon: '📚', bn: 'পড়াশোনার সাজেশন', en: 'Study Tips', dBn: 'Listening, Reading, Writing, Speaking — প্রতিটির প্রস্তুতি কৌশল', dEn: 'Preparation strategies for every IELTS module' },
  { slug: 'books', icon: '📖', bn: 'আমাদের বই গাইড', en: 'Our Books Guide', dBn: 'কোন বই কখন, কোন কাজে পড়বেন এবং কম্বো প্যাকেজের সুবিধা', dEn: 'Which book to read when, and why combo packages help' },
  { slug: 'scholarship', icon: '🎓', bn: 'স্কলারশিপ', en: 'Scholarships', dBn: 'বিভিন্ন দেশের স্কলারশিপ ও ফান্ডিং সম্পর্কে তথ্য', dEn: 'Scholarships and funding by country' },
  { slug: 'university', icon: '🏛️', bn: 'বিশ্ববিদ্যালয় ও আবেদন', en: 'University & Admission', dBn: 'বিশ্ববিদ্যালয় বাছাই, SOP, LOR ও আবেদনের ধাপ', dEn: 'Choosing a university, SOP, LOR and the application steps' },
  { slug: 'country', icon: '🌍', bn: 'দেশভিত্তিক আপডেট', en: 'Country Updates', dBn: 'কোন দেশে কত স্কোর লাগে ও কোন দেশ কীভাবে প্রসেস করছে', dEn: 'Score requirements and how each country processes students' },
  { slug: 'abroad', icon: '✈️', bn: 'ভিসা ও বিদেশযাত্রা', en: 'Visa & Going Abroad', dBn: 'স্টুডেন্ট ভিসা, ফান্ড শো ও যাত্রার প্রস্তুতি', dEn: 'Student visa, proof of funds and travel preparation' },
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
  { n: 1, icon: '🎯', when: { bn: 'সপ্তাহ ০', en: 'Week 0' }, title: { bn: 'লক্ষ্য ঠিক করুন', en: 'Set your goal' },
    text: { bn: 'কোন দেশ, কোন কোর্স আর কত ব্যান্ড স্কোর লাগবে — আগে এটা জানুন। Academic না General Training দিবেন তাও এখানেই ঠিক হবে। লক্ষ্য স্কোর থেকে উল্টো দিক দিয়ে সময় হিসাব করুন।', en: 'Decide the country, the course and the band score you need. Academic or General Training is decided here too. Plan backwards from your target score and test date.' },
    posts: ['what-is-ielts-academic-vs-general', 'ielts-score-requirements-by-country'], topics: ['foundation'] },
  { n: 2, icon: '🧱', when: { bn: 'মাস ১', en: 'Month 1' }, title: { bn: 'ভিত্তি তৈরি: গ্রামার ও ভোকাবুলারি', en: 'Foundation: grammar & vocabulary' },
    text: { bn: 'প্রথম ৩–৪ সপ্তাহ গ্রামারের বেসিক, প্রতিদিন নতুন ১০–১৫টি শব্দ আর ইংরেজি শোনা/পড়ার অভ্যাস। একই সাথে IELTS-এর ফরম্যাট ও প্রশ্নের ধরন বুঝে নিন।', en: 'Spend the first 3–4 weeks on grammar basics, 10–15 new words a day, and a daily habit of listening and reading English. Learn the IELTS format and question types.' },
    posts: ['ielts-test-format-band-score-explained', 'ielts-3-month-study-plan'], topics: ['foundation', 'vocabulary'] },
  { n: 3, icon: '🎧', when: { bn: 'মাস ২', en: 'Month 2' }, title: { bn: 'চার মডিউলের কৌশল শিখুন', en: 'Learn module strategies' },
    text: { bn: 'Listening ও Reading দিয়ে শুরু করুন, তারপর Writing Task 1 ও Task 2, আর Speaking-এর পার্ট ১–৩। প্রতিটি মডিউলের জন্য আলাদা স্ট্র্যাটেজি বই নিন এবং প্র্যাকটিস করুন।', en: 'Start with Listening and Reading, then Writing Tasks 1 and 2, and Speaking parts 1–3. Use one strategy book per module and practise daily.' },
    posts: ['ielts-listening-tips-band-7', 'ielts-reading-tips-time-management', 'ielts-writing-task-1-task-2-guide', 'ielts-speaking-tips-cue-card'], topics: ['listening', 'reading', 'writing', 'speaking'] },
  { n: 4, icon: '🧪', when: { bn: 'মাস ৩', en: 'Month 3' }, title: { bn: 'মক টেস্ট ও দুর্বলতা মেরামত', en: 'Mock tests & fixing weak spots' },
    text: { bn: 'Cambridge IELTS-এর টেস্ট টাইমার দিয়ে সমাধান করুন, ভুলগুলো খাতায় লিখুন এবং প্রতি সপ্তাহে একটি পূর্ণ মক টেস্ট দিন। সাম্প্রতিক প্রশ্নের (question bank) সাথে পরিচিত হোন।', en: 'Solve Cambridge IELTS tests against the clock, log every mistake, and take one full mock test a week. Get familiar with recent question banks.' },
    posts: ['which-ielts-book-to-read-when', 'monthly-ielts-book-update-guide'], topics: ['practice'] },
  { n: 5, icon: '🗓️', when: { bn: 'পরীক্ষার ১–২ মাস আগে', en: '1–2 months before' }, title: { bn: 'রেজিস্ট্রেশন ও পরীক্ষার তারিখ', en: 'Register & fix the date' },
    text: { bn: 'British Council বা IDP-তে রেজিস্ট্রেশন করুন, কম্পিউটার ও পেপার-বেসড কোনটা দিবেন ঠিক করুন, পাসপোর্ট প্রস্তুত রাখুন। তারিখ এমন নিন যাতে ফলাফল আবেদনের ডেডলাইনের আগে হাতে আসে।', en: 'Register with British Council or IDP, choose computer- or paper-based, keep your passport ready. Pick a date so results arrive before your application deadline.' },
    posts: ['how-to-register-for-ielts-bangladesh'], topics: ['combo'] },
  { n: 6, icon: '🏛️', when: { bn: 'ফলাফলের আগে থেকেই', en: 'Even before results' }, title: { bn: 'বিশ্ববিদ্যালয় ও স্কলারশিপ বাছাই', en: 'Shortlist universities & scholarships' },
    text: { bn: 'দেশ ও বিষয় অনুযায়ী ৮–১০টি বিশ্ববিদ্যালয়ের তালিকা করুন (উচ্চাকাঙ্ক্ষী, বাস্তবসম্মত ও নিরাপদ), ডেডলাইন ও স্কলারশিপ দেখুন।', en: 'List 8–10 universities by country and subject (ambitious, realistic, safe) and note deadlines and scholarships.' },
    posts: ['how-to-apply-to-foreign-university-step-by-step', 'study-abroad-scholarships-overview'], topics: [] },
  { n: 7, icon: '📄', when: { bn: 'ডেডলাইনের ২–৩ মাস আগে', en: '2–3 months before deadline' }, title: { bn: 'SOP, LOR ও ডকুমেন্ট', en: 'SOP, LOR & documents' },
    text: { bn: 'SOP লিখুন, শিক্ষকদের কাছ থেকে LOR নিন, ট্রান্সক্রিপ্ট ও সার্টিফিকেট প্রস্তুত করুন এবং অনলাইনে আবেদন জমা দিন।', en: 'Write your SOP, request LORs, prepare transcripts and certificates, then submit the online applications.' },
    posts: ['sop-lor-documents-checklist'], topics: ['writing'] },
  { n: 8, icon: '✈️', when: { bn: 'অফার পাওয়ার পর', en: 'After the offer' }, title: { bn: 'ভিসা ও বিদেশযাত্রা', en: 'Visa & departure' },
    text: { bn: 'অফার লেটার গ্রহণ করে টিউশন ডিপোজিট দিন, ফান্ডের প্রমাণ গোছান, ভিসা আবেদন করুন আর আবাসন ও ফ্লাইটের পরিকল্পনা করুন।', en: 'Accept the offer, pay the deposit, organise proof of funds, apply for the visa and plan accommodation and flights.' },
    posts: ['student-visa-process-overview-and-checklist'], topics: ['speaking'] },
]
