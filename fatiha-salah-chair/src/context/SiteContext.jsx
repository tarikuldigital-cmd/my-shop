import { createContext, useContext, useEffect } from 'react'
import { useDb } from '../store/db'
import { initTracking } from '../lib/tracking'

const SiteContext = createContext(null)

/** Global site settings (phone, address, shipping, tracking IDs…) and the category tree — live from the store. */
export function SiteProvider({ children }) {
  const db = useDb()
  const { settings, categories } = db

  // marketing tags load on the storefront only, never inside the admin panel
  useEffect(() => { if (!/\/admin/.test(location.pathname + location.hash)) initTracking(settings.tracking) }, [settings.tracking])

  const findCategory = (slug) => categories.find((c) => c.slug === slug)
  const findSubcategory = (slug) => {
    for (const c of categories) {
      const s = c.subcategories?.find((x) => x.slug === slug)
      if (s) return { ...s, parent: c }
    }
    return null
  }

  return (
    <SiteContext.Provider value={{ settings, categories, findCategory, findSubcategory }}>
      {children}
    </SiteContext.Provider>
  )
}

export const useSite = () => useContext(SiteContext)
