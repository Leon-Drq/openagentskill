import { StoreCatalog } from '@/components/storefront/catalog'
import { normalizeStoreFilters } from '@/lib/storefront/catalog'
export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams
  const params = new URLSearchParams(Object.entries(raw).flatMap(([key,value]) => typeof value === 'string' ? [[key,value]] : []))
  return <StoreCatalog filters={normalizeStoreFilters(params)} />
}
