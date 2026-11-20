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
        { at, type: 'status', s: 'submitted', by: 'customer', public: true, text: 'Complaint submitted' },
        ...x.steps.slice(1).map((s, k) => ({ at: at + (k + 1) * 3 * H, type: 'status', s, by: 'Admin', public: true, text: x.notes?.[s] || '' })),
        ...(x.assignee ? [{ at: at + 1000, type: 'assign', by: 'system', public: false, text: `Auto-assigned to ${x.assignee.name}` }] : []),
        ...(x.rating ? [{ at: at + 60 * H, type: 'rating', by: 'customer', public: true, text: '★'.repeat(x.rating.stars) + (x.rating.text ? ` — ${x.rating.text}` : '') }] : []),
      ],
    }
  }
  return [
    mk(0, { id: 'CMK7M3QD', ago: 2, type: 'damaged', want: 'replace', segment: 'replace', priority: 'high', unread: true, steps: ['submitted'], files: [], desc: 'When I opened the parcel the screen of the smart watch was cracked. I have added the unboxing photos. I would like a replacement.', contactTime: 'After 4 pm' }),
    mk(1, { id: 'CMP4XW8N', ago: 20, type: 'missing', want: 'repair', segment: 'replace', steps: ['submitted', 'received', 'reviewing'], files: [], assignee: { id: 2, name: 'Rafi (Order Manager)', phone: '01811000000' }, desc: 'The charging cable was not in the parcel. Everything else is fine.', notes: { received: 'We have accepted your complaint and are checking at our store.', reviewing: 'We are checking the packing video.' } }),
    mk(2, { id: 'CMR9TB2H', ago: 52, type: 'refund', want: 'refund', segment: 'refund', steps: ['submitted', 'received', 'processing'], desc: 'I cancelled the order but have not received the ৳200 advance I paid by bKash.', notes: { processing: 'Your refund is being processed — you will get it on bKash within 24 hours.' } }),
    mk(3, { id: 'CMW2LN6S', ago: 120, type: 'wrong', want: 'replace', segment: 'replace', steps: ['submitted', 'received', 'reviewing', 'processing', 'resolved'], files: [], deleted: true, rating: { stars: 5, text: 'Very quick solution, thank you!', at: now - 60 * H }, desc: 'I ordered the black one but received the white one.', notes: { resolved: 'The correct colour has been sent and the wrong item collected. Sorry for the trouble.' } }),
  ]
}
