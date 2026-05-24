export interface CartItem {
  id: number
  title: string
  price: number | null
}

const KEY = 'lvh_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addToCart(item: CartItem): boolean {
  const cart = getCart()
  if (cart.some(c => c.id === item.id)) return false
  cart.push(item)
  localStorage.setItem(KEY, JSON.stringify(cart))
  return true
}

export function removeFromCart(id: number): void {
  localStorage.setItem(KEY, JSON.stringify(getCart().filter(c => c.id !== id)))
}

export function clearCart(): void {
  localStorage.removeItem(KEY)
}

export function getCartCount(): number {
  return getCart().length
}
