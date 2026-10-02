import { connection } from 'next/server'
import LocalizedContent, { generateMetadata as buildMetadata } from './content'
export { generateStaticParams } from './content'

export const revalidate = 300
export const dynamicParams = false

type Props = {
  params: Promise<{ locale: string; page: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { page } = await params
  return buildMetadata({ params, searchParams: page === 'skills' ? searchParams : Promise.resolve({}) })
}

export default async function LocalizedCoreRoutePage({ params, searchParams }: Props) {
  const { page } = await params
  // Only the database-backed directory waits for a request. Other localized
  // navigation pages retain their static generation and ISR behavior.
  if (page === 'skills') await connection()
  return <LocalizedContent params={params} searchParams={page === 'skills' ? searchParams : Promise.resolve({})} requireHealthy={page !== 'skills'} />
}
