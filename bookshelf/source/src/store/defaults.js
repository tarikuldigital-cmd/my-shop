/* Pure defaults — no browser APIs, so scripts/export-seed.mjs can run it in Node to build the server seed. */
import { defaultChat } from '../lib/chatDefaults.js'
import seedSettings from '../mocks/settings.json' with { type: 'json' }

export const BOOK_FIELDS = { shortDescription: '', descSource: '', author: '', publisher: '', isbn: '', pages: null, edition: '', language: '', coverType: '', lookInside: [], comboItems: [], stock: null, featured: false, seoTitle: '', seoDescription: '', active: true }

export function defaultSettings() {
  return {
    ...seedSettings,
    freeShippingMin: 0,
    bkashNumber: '',
    nagadNumber: '',
    tracking: { metaPixelId: '', metaCapiToken: '', metaTestCode: '', gtmId: '', ga4Id: '', googleAdsId: '', googleAdsLabel: '', tiktokPixelId: '', fbDomainVerify: '', googleSiteVerify: '', headCode: '', bodyCode: '' },
    seo: {
      title: 'Bookshelf | Online Book Shop in Bangladesh - Bookshelf',
      description: 'Bookshelf (bookshelf.com.bd) — original IELTS, Spoken English, Grammar, Vocabulary, SAT and GRE books in Bangladesh. Cash on delivery, 3–5 days nationwide home delivery.',
      keywords: 'IELTS book, Cambridge IELTS, Spoken English book, SAT book, GRE book, online book shop Bangladesh',
      ogImage: 'settings/1789803454-whatsapp-image-2026-09-19-at-1.02.21-am.webp',
      titleSuffix: ' - Bookshelf',
    },
    courier: { steadfastApiKey: '', steadfastSecret: '', bdCourierKey: '' },
    sms: {
      enabled: true,
      relayUrl: '',
      siteUrl: '',
      events: { placed: true, confirmed: true, shipped: true, delivered: true, cancelled: false },
      templates: {
        placed: 'সম্মানিত {name}, Bookshelf-এ আপনার অর্ডার ({invoice}) পেয়েছি। পণ্য: {product}, মূল্য {price}৳, মোট {total}৳ (ডেলিভারিসহ)। ধন্যবাদ! আমাদের প্রতিনিধি কল করে অর্ডার কনফার্ম করবেন। ট্র্যাক: {link}',
        confirmed: 'অর্ডার {invoice} কনফার্ম হয়েছে। ট্র্যাক: {link}',
        shipped: 'অর্ডার {invoice} {courier} কুরিয়ারে পাঠানো হয়েছে ({tracking})। {link}',
        delivered: 'অর্ডার {invoice} ডেলিভারি হয়েছে। Bookshelf থেকে কেনার জন্য ধন্যবাদ!',
        cancelled: '{invoice} অর্ডারটি বাতিল হয়েছে। কোনো প্রশ্ন থাকলে কল করুন {hotline}',
      },
    },
    chat: defaultChat(),
    staff: ['Admin', 'Moderator 1', 'Moderator 2'],
  }
}

