import { notFound } from 'next/navigation'
import Content, { generateMetadata as metadata } from '@/app/skills/[slug]/evals/content'
import { isPublicCacheLocale } from '@/lib/public-cached-routing'

export const revalidate = 900
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string; slug: string }> }
async function inputs(params: Props['params']) {
  const { locale, slug } = await params
  if (!isPublicCacheLocale(locale)) notFound()
  return { params: Promise.resolve({ slug }), searchParams: Promise.resolve({ lang: locale }) }
}
export async function generateMetadata({ params }: Props) { return metadata(await inputs(params)) }
export default async function Page({ params }: Props) { return <Content {...await inputs(params)} /> }
