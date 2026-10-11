import { notFound } from 'next/navigation'
import { CreatorWorkflowsArticle } from '@/components/blog/creator-workflows-article'
import { creatorArticleMetadata } from '@/lib/blog/creator-workflows'
import { BLOG_LOCALES, LOCALIZED_BLOG_SLUGS, REA_BLOG_SLUG, type BlogLocale } from '@/lib/blog/routes'
import { ReaGuideArticle } from '@/components/blog/rea-guide-article'
import { reaArticleMetadata } from '@/lib/blog/rea-guide'

export const dynamicParams = false

export function generateStaticParams() {
  return BLOG_LOCALES.filter(locale => locale !== 'en').flatMap(locale => LOCALIZED_BLOG_SLUGS.map(slug => ({ locale, slug })))
}

function articleLocale(locale: string, slug: string): BlogLocale {
  if (locale === 'en' || !BLOG_LOCALES.includes(locale as BlogLocale) || !LOCALIZED_BLOG_SLUGS.some(value => value === slug)) notFound()
  return locale as BlogLocale
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  return (slug === REA_BLOG_SLUG ? reaArticleMetadata : creatorArticleMetadata)(articleLocale(locale, slug))
}

export default async function LocalizedCreatorSkillsBlogPage({ params }: Props) {
  const { locale, slug } = await params
  const language = articleLocale(locale, slug)
  return slug === REA_BLOG_SLUG ? <ReaGuideArticle locale={language} /> : <CreatorWorkflowsArticle locale={language} />
}
