import { connection } from 'next/server'
import LocalizedContent, { generateMetadata as buildMetadata } from './content'
export { generateStaticParams } from './content'

export const revalidate = 300
export const dynamicParams = false

type Props = { params: Promise<{ locale: string; page: string }> }

export function generateMetadata({ params }: Props) {
  return buildMetadata({ params, searchParams: Promise.resolve({}) })
}

export default async function LocalizedCoreRoutePage({ params }: Props) {
  const { page } = await params
  // Only the database-backed directory waits for a request. Other localized
  // navigation pages retain their static generation and ISR behavior.
  if (page === 'skills') await connection()
  return <LocalizedContent params={params} searchParams={Promise.resolve({})} requireHealthy={page !== 'skills'} />
}
