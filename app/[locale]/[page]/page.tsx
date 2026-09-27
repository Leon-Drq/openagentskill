import LocalizedCoreRoutePage, { generateMetadata as localizedMetadata } from '@/components/localized-core-route-page'
export { generateStaticParams } from '@/components/localized-core-route-page'

export const revalidate = 300
export const dynamicParams = false

type Props = { params: Promise<{ locale: string; page: string }> }

export function generateMetadata({ params }: Props) {
  return localizedMetadata({ params, searchParams: Promise.resolve({}) })
}

export default function Page({ params }: Props) {
  return <LocalizedCoreRoutePage params={params} searchParams={Promise.resolve({})} cachePage />
}
