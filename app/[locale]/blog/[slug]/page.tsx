import { notFound } from 'next/navigation'
import { CreatorWorkflowsArticle } from '@/components/blog/creator-workflows-article'
import { creatorArticleMetadata } from '@/lib/blog/creator-workflows'
import { BLOG_LOCALES, CREATOR_BLOG_SLUG, type BlogLocale } from '@/lib/blog/routes'

export const dynamicParams = false

export function generateStaticParams() {
  return BLOG_LOCALES.filter(locale => locale !== 'en').map(locale => ({ locale, slug: CREATOR_BLOG_SLUG }))
}

function articleLocale(locale: string, slug: string): BlogLocale {
  if (locale === 'en' || !BLOG_LOCALES.includes(locale as BlogLocale) || slug !== CREATOR_BLOG_SLUG) notFound()
  return locale as BlogLocale
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  return creatorArticleMetadata(articleLocale(locale, slug))
}

export default async function LocalizedCreatorSkillsBlogPage({ params }: Props) {
  const { locale, slug } = await params
  return <CreatorWorkflowsArticle locale={articleLocale(locale, slug)} />
}
