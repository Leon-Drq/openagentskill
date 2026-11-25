import { StoreSuccess } from '@/components/storefront/checkout'
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams
  return <StoreSuccess orderId={typeof order === 'string' ? order : ''} />
}
