import { STORE_PRODUCTS } from './catalog'
export type DemoItem = { slug: string; edition: 'basic' | 'full'; acquiredAt: string }
export type DemoOrder = { id: string; slug: string; price: number; createdAt: string }
export type DemoState = { items: DemoItem[]; saved: string[]; orders: DemoOrder[] }
export const EMPTY_DEMO: DemoState = { items: [], saved: [], orders: [] }
const productFor = (slug: unknown) => STORE_PRODUCTS.find(p => p.slug === slug)
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
export function parseDemoState(raw: string | null): DemoState {
  try {
    const value = JSON.parse(raw || '{}')
    if (!value || typeof value !== 'object') return EMPTY_DEMO
    const items: DemoItem[] = Array.isArray(value.items) ? value.items.filter((v: DemoItem) => v && productFor(v.slug) && ['basic', 'full'].includes(v.edition) && validDate(v.acquiredAt)).slice(0, 30) : []
    const saved: string[] = Array.isArray(value.saved) ? [...new Set<string>(value.saved.filter((v: unknown) => typeof v === 'string' && productFor(v)))] : []
    const orders: DemoOrder[] = Array.isArray(value.orders) ? value.orders.filter((v: DemoOrder) => v && typeof v.id === 'string' && /^DEMO-[a-zA-Z0-9-]+$/.test(v.id) && productFor(v.slug)?.price === v.price && validDate(v.createdAt)).slice(0, 30) : []
    return { items, saved, orders }
  } catch { return EMPTY_DEMO }
}
export function acquireDemo(state: DemoState, slug: string, edition: DemoItem['edition'], now: string, orderId?: string): DemoState {
  const product = productFor(slug)
  if (!product) return state
  const existing = state.items.find(item => item.slug === slug)
  if (existing?.edition === 'full' || existing?.edition === edition) return state
  if (edition === 'basic' && product.access !== 'freemium') return state
  const paid = product.access !== 'free' && edition === 'full'
  if (paid && !orderId?.startsWith('DEMO-')) return state
  return { ...state, items: [...state.items.filter(v => v.slug !== slug), { slug, edition, acquiredAt: now }],
    orders: paid ? [...state.orders, { id: orderId!, slug, price: product.price, createdAt: now }] : state.orders }
}
