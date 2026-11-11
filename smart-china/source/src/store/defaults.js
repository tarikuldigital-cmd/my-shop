/* Pure defaults — no browser APIs, so scripts/export-seed.mjs can run it in Node to build the server seed. */
import { defaultChat } from '../lib/chatDefaults.js'
import seedSettings from '../mocks/settings.json' with { type: 'json' }

/** Fields every product has (variants: options = [{ name, values }], variants = [{ key, price, oldPrice, stock, sku }]) */
export const PRODUCT_FIELDS = { shortDescription: '', description: '', brand: '', sku: '', specs: [], options: [], variants: [], stock: null, featured: false, isNew: false, seoTitle: '', seoDescription: '', active: true, sold: 0 }

export function defaultSettings() {
  return {
    ...seedSettings,
    freeShippingMin: 0,
    bkashNumber: '',
    nagadNumber: '',
    tracking: { metaPixelId: '', metaCapiToken: '', metaTestCode: '', gtmId: '', ga4Id: '', googleAdsId: '', googleAdsLabel: '', tiktokPixelId: '', fbDomainVerify: '', googleSiteVerify: '', headCode: '', bodyCode: '' },
    seo: {
      title: 'Smart China Gallery | Gadgets & Lifestyle Online Shop in Bangladesh',
      description: 'Smart China Gallery — gadgets, electronics, winter gadgets, smart-home, car & bike accessories, personal care and home & kitchen products. Cash on delivery all over Bangladesh.',
      keywords: 'gadget shop Bangladesh, smart watch price in BD, earbuds BD, room heater price, online shopping Bangladesh, cash on delivery',
      ogImage: '',
      titleSuffix: ' | Smart China Gallery',
    },
    courier: { steadfastApiKey: '', steadfastSecret: '', bdCourierKey: '', defaultCourier: 'steadfast', autoRefresh: true },
    sms: {
      enabled: true,
      relayUrl: '',
      siteUrl: '',
      events: { placed: true, confirmed: true, shipped: true, delivered: true, cancelled: false },
      templates: {
        placed: 'Dear {name}, we received your order {invoice} at {shop}: {product}, total {total} Tk incl. delivery. We will call to confirm. Track: {link}',
        confirmed: 'Your order {invoice} is confirmed. Track: {link}',
        shipped: 'Your order {invoice} has been sent with {courier} ({tracking}). Live tracking: {link}',
        delivered: 'Order {invoice} delivered. Thank you for shopping with {shop}!',
        cancelled: 'Order {invoice} has been cancelled. Questions? Call {hotline}',
      },
    },
    chat: defaultChat(),
    staff: ['Admin', 'Moderator 1', 'Moderator 2'],
  }
}
