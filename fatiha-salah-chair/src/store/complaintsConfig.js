/* Complain Box — labels, steps and default SMS texts. Must match the constants in api/lib/complaints.php. */

export const CMP_STEPS = ['submitted', 'received', 'reviewing', 'processing', 'resolved']

export const CMP_STATUS = {
  submitted: { bn: 'জমা হয়েছে', short: 'নতুন', en: 'New', tone: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', desc: 'আপনার অভিযোগ আমাদের কাছে পৌঁছেছে' },
  received: { bn: 'অভিযোগটি গ্রহণ করা হয়েছে', short: 'গৃহীত', en: 'Received', tone: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', desc: 'আমাদের টিম অভিযোগটি গ্রহণ করেছে' },
  reviewing: { bn: 'পর্যালোচনা চলছে', short: 'পর্যালোচনা', en: 'Reviewing', tone: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', desc: 'ছবি/ভিডিও ও অর্ডার মিলিয়ে দেখা হচ্ছে' },
  processing: { bn: 'সমাধান প্রক্রিয়াধীন', short: 'প্রক্রিয়াধীন', en: 'Processing', tone: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', desc: 'রিপ্লেসমেন্ট / রিফান্ড / রিটার্নের কাজ চলছে' },
  resolved: { bn: 'সমাধান হয়েছে', short: 'সমাধান', en: 'Resolved', tone: 'bg-green-100 text-green-800', dot: 'bg-green-600', desc: 'অভিযোগের সমাধান সম্পন্ন হয়েছে' },
  rejected: { bn: 'অভিযোগটি গ্রহণযোগ্য হয়নি', short: 'বাতিল', en: 'Rejected', tone: 'bg-red-100 text-red-800', dot: 'bg-red-500', desc: 'বিস্তারিত কারণ নিচে দেওয়া হয়েছে' },
}
export const CMP_STATUS_KEYS = Object.keys(CMP_STATUS)
export const CMP_OPEN = ['submitted', 'received', 'reviewing', 'processing']

export const CMP_TYPES = {
  damaged: { bn: 'প্রোডাক্ট ভাঙা / ক্ষতিগ্রস্ত', hint: 'ডেলিভারিতে ভাঙা, ফাটা বা দাগ', seg: 'replace' },
  wrong: { bn: 'ভুল প্রোডাক্ট / কালার', hint: 'অর্ডারের সাথে মিলছে না', seg: 'replace' },
  missing: { bn: 'পার্টস বা আইটেম কম', hint: 'স্ক্রু, কুশন, রেহাল বা অন্য অংশ নেই', seg: 'replace' },
  quality: { bn: 'মান / ত্রুটির সমস্যা', hint: 'ঠিকমতো কাজ করছে না, নড়বড়ে', seg: 'replace' },
  return: { bn: 'রিটার্ন করতে চাই', hint: 'প্রোডাক্ট ফেরত দিতে চান', seg: 'return' },
  refund: { bn: 'রিফান্ড চাই', hint: 'টাকা ফেরত পেতে চান', seg: 'refund' },
  delivery: { bn: 'ডেলিভারি সমস্যা', hint: 'দেরি, খারাপ ব্যবহার, পার্সেল পাইনি', seg: 'delivery' },
  other: { bn: 'অন্যান্য', hint: 'অন্য যেকোনো বিষয়', seg: 'general' },
}

export const CMP_WANTS = { replace: 'রিপ্লেসমেন্ট', refund: 'টাকা ফেরত', repair: 'মেরামত / পার্টস', return: 'রিটার্ন', other: 'অন্য কিছু' }

export const CMP_SEGMENTS = {
  refund: { bn: 'রিফান্ড', tone: 'bg-rose-100 text-rose-800' },
  return: { bn: 'রিটার্ন', tone: 'bg-orange-100 text-orange-800' },
  replace: { bn: 'রিপ্লেসমেন্ট / ক্ষতিপূরণ', tone: 'bg-teal-100 text-teal-800' },
  delivery: { bn: 'ডেলিভারি', tone: 'bg-blue-100 text-blue-800' },
  general: { bn: 'সাধারণ', tone: 'bg-gray-100 text-gray-700' },
}

export const CMP_PRIORITY = {
  low: { bn: 'কম', tone: 'bg-gray-100 text-gray-600' },
  normal: { bn: 'সাধারণ', tone: 'bg-slate-100 text-slate-700' },
  high: { bn: 'জরুরি', tone: 'bg-amber-100 text-amber-800' },
  urgent: { bn: 'অতি জরুরি', tone: 'bg-red-600 text-white' },
}

/** which SMS events exist (customer unless noted) */
export const CMP_SMS_EVENTS = {
  submitted: 'অভিযোগ জমা হলে (আইডিসহ)',
  received: 'অভিযোগ গ্রহণ করা হলে',
  reviewing: 'পর্যালোচনা শুরু হলে',
  processing: 'সমাধান প্রক্রিয়াধীন হলে',
  resolved: 'সমাধান হলে',
  rejected: 'অভিযোগ বাতিল হলে',
  message: 'কাস্টমারকে মেসেজ পাঠালে',
  assigned: 'টিম মেম্বারকে দায়িত্ব দিলে (মেম্বারের ফোনে)',
}

export const cmpDefaults = () => ({
  smsEnabled: true,
  events: { submitted: true, received: true, reviewing: false, processing: true, resolved: true, rejected: true, message: true, assigned: true },
  templates: {
    submitted: '{name}, আপনার অভিযোগ জমা হয়েছে। অভিযোগ আইডি: {id}। অবস্থা দেখুন: {link} -{shop}',
    received: 'অভিযোগ {id} গ্রহণ করা হয়েছে। আমাদের টিম দ্রুত সমাধানে কাজ করছে। {link}',
    reviewing: 'অভিযোগ {id} পর্যালোচনা করা হচ্ছে। আপডেট: {link}',
    processing: 'অভিযোগ {id}-এর সমাধান প্রক্রিয়াধীন। বিস্তারিত: {link}',
    resolved: '{name}, আপনার অভিযোগ {id} সমাধান হয়েছে। আপনার মতামত দিন: {link} -{shop}',
    rejected: 'অভিযোগ {id} নিয়ে আপডেট দেওয়া হয়েছে। বিস্তারিত: {link} হেল্পলাইন {hotline}',
    message: 'অভিযোগ {id}: {message} -{shop}',
    assigned: 'নতুন অভিযোগ {id} ({segment}) আপনাকে দেওয়া হয়েছে। {customer} {phone}। দেখুন: {admin}',
  },
  routing: { refund: 0, return: 0, replace: 0, delivery: 0, general: 0 },
  maxVideoMB: 60,
  responseHours: 24,
})
