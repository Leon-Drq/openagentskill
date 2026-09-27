import { notFound } from 'next/navigation'
import SkillsPage, { generateMetadata as directoryMetadata } from '@/components/skills-directory-page'
import { isLocale } from '@/lib/i18n/config'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function queryFor({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { ...await searchParams, lang: locale }
}

export async function generateMetadata(props: Props) {
  const query = await queryFor(props)
  const metadata = await directoryMetadata({ searchParams: Promise.resolve(query) })
  const canonical = `https://www.openagentskill.com/${query.lang === 'en' ? '' : `${query.lang}/`}skills`
  return {
    ...metadata,
    alternates: { canonical },
    openGraph: { ...metadata.openGraph, url: canonical },
    robots: { index: false, follow: true },
  }
}

export default async function Page(props: Props) {
  return <SkillsPage searchParams={Promise.resolve(await queryFor(props))} />
}
