import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { track } from '../lib/tracking'

const CART_KEY = 'bookshelf_cart'
const CartContext = createContext(null)

// Only what the order needs is kept; prices are re-validated by the backend on checkout.
const toItem = (p, quantity = 1) => ({
  productId: p.id,
  slug: p.slug,
  name: p.name,
  price: p.price,
  oldPrice: p.oldPrice,
  image: p.images?.[0] || null,
  variation: null,
  quantity,
})

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const found = state.find((i) => i.slug === action.product.slug)
      if (found) return state.map((i) => (i.slug === found.slug ? { ...i, quantity: i.quantity + action.quantity } : i))
      return [...state, toItem(action.product, action.quantity)]
    }
    case 'setQty':
      return state.map((i) => (i.slug === action.slug ? { ...i, quantity: Math.max(1, action.quantity) } : i))
    case 'remove':
      return state.filter((i) => i.slug !== action.slug)
    case 'clear':
      return []
    default:
      return state
  }
}

const load = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch { return [] }
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
      add: (product, quantity = 1) => {
        dispatch({ type: 'add', product, quantity })
        track('AddToCart', { items: [{ productId: product.id, name: product.name, price: product.price, quantity, category: product.categories?.[0] }] })
      },
      setQty: (slug, quantity) => dispatch({ type: 'setQty', slug, quantity }),
      remove: (slug) => dispatch({ type: 'remove', slug }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
