import LocalizedCoreRoutePage, { generateMetadata as localizedMetadata } from '@/components/localized-core-route-page'

type Props = {
  params: Promise<{ locale: string; page: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(props: Props) {
  const metadata = await localizedMetadata(props)
  return { ...metadata, robots: { index: false, follow: true } }
}

export default LocalizedCoreRoutePage
