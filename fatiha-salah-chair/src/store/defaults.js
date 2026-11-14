/* Pure defaults — no browser APIs, so scripts/export-seed.mjs can run it in Node to build the server seed. */
import { defaultChat } from '../lib/chatDefaults.js'
import seedSettings from '../mocks/settings.json' with { type: 'json' }

export const BOOK_FIELDS = { shortDescription: '', descSource: '', color: '', colorHex: '', group: '', material: '', dimensions: '', warranty: '', lookInside: [], comboItems: [], stock: null, featured: false, seoTitle: '', seoDescription: '', active: true }

export function defaultSettings() {
  return {
    ...seedSettings,
    freeShippingMin: 0,
    bkashNumber: '',
    nagadNumber: '',
    tracking: { metaPixelId: '', metaCapiToken: '', metaTestCode: '', gtmId: '', ga4Id: '', googleAdsId: '', googleAdsLabel: '', tiktokPixelId: '', fbDomainVerify: '', googleSiteVerify: '', headCode: '', bodyCode: '' },
    seo: {
      title: 'Fatiha Ayat Salah Chair | নামাজের চেয়ার — Salah Chair Bangladesh',
      description: 'Fatiha Ayat Salah Chair — বসে আরামে নামাজের জন্য ভাঁজযোগ্য সালাহ চেয়ার: নরম কুশন, মজবুত মেটাল ফ্রেম, রেহাল ও সাইড পকেট। অনেক কালার, সারাদেশে ক্যাশ অন ডেলিভারি।',
      keywords: 'salah chair, prayer chair, namaz chair, নামাজের চেয়ার, সালাহ চেয়ার, prayer chair Bangladesh, Fatiha Ayat',
      ogImage: '/img/og.jpg',
      titleSuffix: ' - Fatiha Ayat Salah Chair',
    },
    courier: { steadfastApiKey: '', steadfastSecret: '', bdCourierKey: '' },
    sms: {
      enabled: true,
      relayUrl: '',
      siteUrl: '',
      events: { placed: true, confirmed: true, shipped: true, delivered: true, cancelled: false },
      templates: {
        placed: 'সম্মানিত {name}, Fatiha Ayat Salah Chair-এ আপনার অর্ডার ({invoice}) পেয়েছি। পণ্য: {product}, মূল্য {price}৳, মোট {total}৳ (ডেলিভারিসহ)। ধন্যবাদ! আমাদের প্রতিনিধি কল করে অর্ডার কনফার্ম করবেন। ট্র্যাক: {link}',
        confirmed: 'অর্ডার {invoice} কনফার্ম হয়েছে। ট্র্যাক: {link}',
        shipped: 'অর্ডার {invoice} {courier} কুরিয়ারে পাঠানো হয়েছে ({tracking})। {link}',
        delivered: 'অর্ডার {invoice} ডেলিভারি হয়েছে। Fatiha Ayat Salah Chair থেকে কেনার জন্য ধন্যবাদ!',
        cancelled: '{invoice} অর্ডারটি বাতিল হয়েছে। কোনো প্রশ্ন থাকলে কল করুন {hotline}',
      },
    },
    chat: defaultChat(),
    staff: ['Admin', 'Moderator 1', 'Moderator 2'],
  }
}

