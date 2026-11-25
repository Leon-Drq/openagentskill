import { notFound } from 'next/navigation'
import { STORE_PRODUCTS } from '@/lib/storefront/catalog'
import { StoreCheckout } from '@/components/storefront/checkout'
export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, product = STORE_PRODUCTS.find(p => p.slug === slug && p.access !== 'free')
  if (!product) notFound()
  return <StoreCheckout product={product} />
}
