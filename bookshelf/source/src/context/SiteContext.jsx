import { createContext, useContext, useEffect, useState } from 'react'
import { getCategories, getSettings } from '../services/catalogService'
import settingsFallback from '../mocks/settings.json'
import categoriesFallback from '../mocks/categories.json'

const SiteContext = createContext(null)

/** Global site settings (phone, address, shipping charges…) and the category tree. */
export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(settingsFallback)
  const [categories, setCategories] = useState(categoriesFallback)

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {})
    getCategories().then(setCategories).catch(() => {})
  }, [])

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
