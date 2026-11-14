import { S } from '../store/db'

/** Categories that have at least one visible product (empty ones stay out of the menu but their links still work). */
export function visibleCategories(categories) {
  return categories.filter((c) => c.hideInMenu !== true && S.products.some((p) => p.active !== false && (p.categories || []).includes(c.slug)))
}
