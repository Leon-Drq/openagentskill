import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { STORE_PRODUCTS } from '@/lib/storefront/catalog'
import { StoreDetail } from '@/components/storefront/detail'
type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return STORE_PRODUCTS.map(p => ({ slug: p.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params, product = STORE_PRODUCTS.find(p => p.slug === slug)
  return { title: product ? `${product.title.en} · Preview` : 'Workflow not found', robots: { index: false, follow: false } }
}
export default async function WorkflowPage({ params }: Props) {
  const { slug } = await params, product = STORE_PRODUCTS.find(p => p.slug === slug)
  if (!product) notFound()
  return <StoreDetail product={product} />
}
