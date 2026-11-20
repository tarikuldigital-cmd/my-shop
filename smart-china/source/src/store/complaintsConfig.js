/* Complain Box — labels, steps and default SMS texts. Must match the constants in api/lib/complaints.php. */

export const CMP_STEPS = ['submitted', 'received', 'reviewing', 'processing', 'resolved']

export const CMP_STATUS = {
  submitted: { bn: 'Submitted', short: 'New', en: 'New', tone: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', desc: 'We have received your complaint' },
  received: { bn: 'Complaint accepted', short: 'Accepted', en: 'Received', tone: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', desc: 'Our team has accepted your complaint' },
  reviewing: { bn: 'Under review', short: 'Reviewing', en: 'Reviewing', tone: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', desc: 'We are checking your photos/videos against the order' },
  processing: { bn: 'Resolution in progress', short: 'In progress', en: 'Processing', tone: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', desc: 'Replacement / refund / return is being processed' },
  resolved: { bn: 'Resolved', short: 'Resolved', en: 'Resolved', tone: 'bg-green-100 text-green-800', dot: 'bg-green-600', desc: 'Your complaint has been resolved' },
  rejected: { bn: 'Complaint declined', short: 'Declined', en: 'Rejected', tone: 'bg-red-100 text-red-800', dot: 'bg-red-500', desc: 'See the reason below' },
}
export const CMP_STATUS_KEYS = Object.keys(CMP_STATUS)
export const CMP_OPEN = ['submitted', 'received', 'reviewing', 'processing']

export const CMP_TYPES = {
  damaged: { bn: 'Damaged product', hint: 'Broken, cracked or marked on arrival', seg: 'replace' },
  wrong: { bn: 'Wrong product / colour', hint: 'Does not match the order', seg: 'replace' },
  missing: { bn: 'Missing parts or items', hint: 'Charger, cable, accessory or another part is missing', seg: 'replace' },
  quality: { bn: 'Quality / defect', hint: 'Not working properly or faulty', seg: 'replace' },
  return: { bn: 'Return', hint: 'You want to send the product back', seg: 'return' },
  refund: { bn: 'Refund', hint: 'You want your money back', seg: 'refund' },
  delivery: { bn: 'Delivery issue', hint: 'Late, rude courier or parcel not received', seg: 'delivery' },
  other: { bn: 'Other', hint: 'Anything else', seg: 'general' },
}

export const CMP_WANTS = { replace: 'Replacement', refund: 'Refund', repair: 'Repair / parts', return: 'Return', other: 'Something else' }

export const CMP_SEGMENTS = {
  refund: { bn: 'Refund', tone: 'bg-rose-100 text-rose-800' },
  return: { bn: 'Return', tone: 'bg-orange-100 text-orange-800' },
  replace: { bn: 'Replacement', tone: 'bg-teal-100 text-teal-800' },
  delivery: { bn: 'Delivery', tone: 'bg-blue-100 text-blue-800' },
  general: { bn: 'General', tone: 'bg-gray-100 text-gray-700' },
}

export const CMP_PRIORITY = {
  low: { bn: 'Low', tone: 'bg-gray-100 text-gray-600' },
  normal: { bn: 'General', tone: 'bg-slate-100 text-slate-700' },
  high: { bn: 'High', tone: 'bg-amber-100 text-amber-800' },
  urgent: { bn: 'Urgent', tone: 'bg-red-600 text-white' },
}

/** which SMS events exist (customer unless noted) */
export const CMP_SMS_EVENTS = {
  submitted: 'Complaint submitted (with ID)',
  received: 'Complaint accepted',
  reviewing: 'Review started',
  processing: 'Resolution in progress',
  resolved: 'Resolved',
  rejected: 'Declined',
  message: 'Message to customer',
  assigned: 'Assigned to a team member (sent to the member)',
}

export const cmpDefaults = () => ({
  smsEnabled: true,
  events: { submitted: true, received: true, reviewing: false, processing: true, resolved: true, rejected: true, message: true, assigned: true },
  templates: {
    submitted: '{name}, your complaint has been received. Complaint ID: {id}. Track it: {link} -{shop}',
    received: 'Complaint {id} has been accepted. Our team is working on it. {link}',
    reviewing: 'Complaint {id} is under review. Update: {link}',
    processing: 'Complaint {id} is being resolved. Details: {link}',
    resolved: '{name}, your complaint {id} is resolved. Please rate us: {link} -{shop}',
    rejected: 'We have an update on complaint {id}. Details: {link} Helpline {hotline}',
    message: 'Complaint {id}: {message} -{shop}',
    assigned: 'New complaint {id} ({segment}) assigned to you. {customer} {phone}. Open: {admin}',
  },
  routing: { refund: 0, return: 0, replace: 0, delivery: 0, general: 0 },
  maxVideoMB: 60,
  responseHours: 24,
})
