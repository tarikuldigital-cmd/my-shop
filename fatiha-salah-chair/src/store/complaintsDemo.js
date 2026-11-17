/* Demo-only sample complaints so the Complain Box can be tried without a server. */
const H = 36e5
const IMG = (name) => `img/${name}`

export function demoComplaints(orders, now) {
  const o = (i) => orders[i % Math.max(1, orders.length)] || {}
  const item = (ord) => (ord.items || []).slice(0, 1).map((it) => ({ key: String(it.productId || it.slug || it.name), name: it.name, quantity: it.quantity, price: it.price, image: '' }))
  const mk = (i, x) => {
    const ord = o(i)
    const at = now - x.ago * H
    return {
      id: x.id, demo: true, createdAt: at, updated: at + (x.steps.length - 1) * 3 * H, status: x.steps[x.steps.length - 1],
      steps: Object.fromEntries(x.steps.map((s, k) => [s, at + k * 3 * H])), type: x.type, want: x.want, segment: x.segment, priority: x.priority || 'normal',
      name: ord.name || x.name, phone: ord.phone || '01711000000', altPhone: '', contactTime: x.contactTime || '', invoice: ord.invoice || '', orderId: ord.id || '', orderVerified: !!ord.id,
      orderTotal: ord.total || 0, orderDate: ord.createdAt || 0, orderStatus: ord.status || '', items: item(ord), description: x.desc,
      files: (x.files || []).map((f, k) => ({ name: `demo-${x.id}-${k}.jpg`, url: IMG(f), type: 'image', size: 380000 + k * 91000, at, by: 'customer', ...(x.deleted ? { deleted: true, url: '', deletedAt: at + 50 * H } : {}) })),
      assignee: x.assignee || null, unread: x.unread || false, rating: x.rating || null, country: 'BD',
      history: [
        { at, type: 'status', s: 'submitted', by: 'customer', public: true, text: 'অভিযোগ জমা দেওয়া হয়েছে' },
        ...x.steps.slice(1).map((s, k) => ({ at: at + (k + 1) * 3 * H, type: 'status', s, by: 'Admin', public: true, text: x.notes?.[s] || '' })),
        ...(x.assignee ? [{ at: at + 1000, type: 'assign', by: 'system', public: false, text: `স্বয়ংক্রিয়ভাবে ${x.assignee.name}-কে দেওয়া হয়েছে` }] : []),
        ...(x.rating ? [{ at: at + 60 * H, type: 'rating', by: 'customer', public: true, text: '★'.repeat(x.rating.stars) + (x.rating.text ? ` — ${x.rating.text}` : '') }] : []),
      ],
    }
  }
  return [
    mk(0, { id: 'FCK7M3QD', ago: 2, type: 'damaged', want: 'replace', segment: 'replace', priority: 'high', unread: true, steps: ['submitted'], files: ['chair-green-2.webp', 'chair-green-4.webp'], desc: 'পার্সেল খুলে দেখি চেয়ারের একটা পায়া বাঁকা আর কুশনের সেলাই ছেঁড়া। আনবক্সিংয়ের ছবি দিলাম। রিপ্লেসমেন্ট চাই।', contactTime: 'বিকেল ৪টার পর' }),
    mk(1, { id: 'FCP4XW8N', ago: 20, type: 'missing', want: 'repair', segment: 'replace', steps: ['submitted', 'received', 'reviewing'], files: ['chair-green-5.webp'], assignee: { id: 2, name: 'Rafi (Order Manager)', phone: '01811000000' }, desc: 'রেহালটা পার্সেলে ছিল না। বাকি সব ঠিক আছে।', notes: { received: 'আপনার অভিযোগটি গ্রহণ করা হয়েছে, আমরা স্টোরে চেক করছি।', reviewing: 'প্যাকিং ভিডিও মিলিয়ে দেখা হচ্ছে।' } }),
    mk(2, { id: 'FCR9TB2H', ago: 52, type: 'refund', want: 'refund', segment: 'refund', steps: ['submitted', 'received', 'processing'], desc: 'অর্ডার ক্যানসেল করেছিলাম কিন্তু bKash-এ অগ্রিম দেওয়া ২০০ টাকা ফেরত পাইনি।', notes: { processing: 'রিফান্ড প্রসেস করা হচ্ছে, ২৪ ঘণ্টার মধ্যে bKash-এ পাবেন।' } }),
    mk(3, { id: 'FCW2LN6S', ago: 120, type: 'wrong', want: 'replace', segment: 'replace', steps: ['submitted', 'received', 'reviewing', 'processing', 'resolved'], files: ['chair-green-1.webp'], deleted: true, rating: { stars: 5, text: 'খুব দ্রুত সমাধান পেয়েছি, ধন্যবাদ!', at: now - 60 * H }, desc: 'সবুজ অর্ডার করেছিলাম, লাল এসেছে।', notes: { resolved: 'সঠিক কালারের চেয়ার পাঠানো হয়েছে এবং ভুলটি ফেরত নেওয়া হয়েছে। অসুবিধার জন্য দুঃখিত।' } }),
  ]
}
