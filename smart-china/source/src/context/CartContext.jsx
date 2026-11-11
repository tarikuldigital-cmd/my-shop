import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { track } from '../lib/tracking'
import { variantOf } from '../store/db'

const CART_KEY = 'scg_cart_v2'
const CartContext = createContext(null)

/** One cart line per product + variant ("Black / XL"). Prices are re-checked by the server at checkout. */
export const lineKey = (slug, variant) => `${slug}|${variant || ''}`
const toItem = (p, quantity = 1, variant = '') => {
  const v = variantOf(p, variant)
  return {
    key: lineKey(p.slug, variant),
    productId: p.id,
    slug: p.slug,
    name: p.name,
    variant: variant || '',
    price: v ? v.price : p.price,
    oldPrice: v ? v.oldPrice : p.oldPrice,
    image: p.images?.[0] || null,
    quantity,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.product.slug, action.variant)
      const found = state.find((i) => i.key === key)
      if (found) return state.map((i) => (i.key === key ? { ...i, quantity: i.quantity + action.quantity } : i))
      return [...state, toItem(action.product, action.quantity, action.variant)]
    }
    case 'setQty':
      return state.map((i) => (i.key === action.key ? { ...i, quantity: Math.max(1, action.quantity) } : i))
    case 'remove':
      return state.filter((i) => i.key !== action.key)
    case 'clear':
      return []
    default:
      return state
  }
}

const load = () => {
  try { return (JSON.parse(localStorage.getItem(CART_KEY)) || []).filter((i) => i.key) } catch { return [] }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0)
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    return {
      items,
      count,
      subtotal,
      add: (product, quantity = 1, variant = '') => {
        dispatch({ type: 'add', product, quantity, variant })
        const price = variantOf(product, variant)?.price ?? product.price
        track('AddToCart', { items: [{ productId: product.id, name: product.name, variant, price, quantity, category: product.categories?.[0] }] })
      },
      setQty: (key, quantity) => dispatch({ type: 'setQty', key, quantity }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
