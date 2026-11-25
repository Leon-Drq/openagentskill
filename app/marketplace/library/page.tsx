import { StoreLibrary } from '@/components/storefront/library'
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <StoreLibrary tab={tab === 'saved' || tab === 'orders' ? tab : 'acquired'} />
}
