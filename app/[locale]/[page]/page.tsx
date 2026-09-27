import LocalizedContent, { generateMetadata as buildMetadata } from './content'
export { generateStaticParams } from './content'

export const revalidate = 300
export const dynamicParams = false

type Props = { params: Promise<{ locale: string; page: string }> }

export function generateMetadata({ params }: Props) {
  return buildMetadata({ params, searchParams: Promise.resolve({}) })
}

export default function LocalizedCoreRoutePage({ params }: Props) {
  return <LocalizedContent params={params} searchParams={Promise.resolve({})} requireHealthy />
}
