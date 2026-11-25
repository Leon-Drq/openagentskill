'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'
import { acquireDemo, EMPTY_DEMO, parseDemoState, type DemoItem, type DemoState } from '@/lib/storefront/demo-state'

const KEY = 'oas.storefront.demo.v1'
// Deliberately separate from authentication and actual entitlements. Never use
// browser preview state to authorize real downloads, paid installs or orders.
function createDemoStore() {
  let snapshot: DemoState | null = null
  let storageFailed = false
  const listeners = new Set<() => void>()
  function read() {
    if (snapshot === null && typeof window !== 'undefined') {
      try { snapshot = parseDemoState(localStorage.getItem(KEY)) } catch { snapshot = EMPTY_DEMO; storageFailed = true }
    }
    return snapshot
  }
  function emit() { listeners.forEach(listener => listener()) }
  function onStorage(event: StorageEvent) {
    if (event.key === KEY || event.key === null) { snapshot = null; emit() }
  }
  return {
    read,
    failed: () => storageFailed,
    subscribe: (listener: () => void) => {
      if (!listeners.size) window.addEventListener('storage', onStorage)
      listeners.add(listener)
      return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage) }
    },
    update: (change: (current: DemoState) => DemoState) => {
      snapshot = change(read() || EMPTY_DEMO)
      try { localStorage.setItem(KEY, JSON.stringify(snapshot)) } catch { storageFailed = true }
      emit()
    },
  }
}
type DemoStore = ReturnType<typeof createDemoStore>
const Context = createContext<DemoStore | null>(null)
export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createDemoStore)
  return <Context.Provider value={store}>{children}</Context.Provider>
}
const serverSnapshot = () => null
export function useDemoStore() {
  const store = useContext(Context)
  if (!store) throw new Error('Demo store requires the preview provider')
  const snapshot = useSyncExternalStore(store.subscribe, store.read, serverSnapshot)
  return {
    state: snapshot || EMPTY_DEMO, ready: snapshot !== null, storageFailed: store.failed(),
    toggleSaved: (slug: string) => store.update(s => ({ ...s, saved: s.saved.includes(slug) ? s.saved.filter(v => v !== slug) : [...s.saved, slug] })),
    acquire: (slug: string, edition: DemoItem['edition'], orderId?: string) => store.update(s => acquireDemo(s, slug, edition, new Date().toISOString(), orderId)),
    reset: () => store.update(() => ({ items: [], saved: [], orders: [] })),
  }
}
