import type { Metadata } from 'next'
import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getHomePageData } from '@/lib/home-page-data'
import {
  HOME_SOCIAL_DESCRIPTION,
  HOME_SOCIAL_IMAGE_URL,
  HOME_SOCIAL_TITLE,
  SITE_URL,
} from '@/lib/seo/social'
import { getLocalizedLanguageAlternates } from '@/lib/seo/localized-pages'

export const revalidate = 300

export const metadata: Metadata = {
  title: {
    absolute: 'Agent Skill Registry & Discovery API | OpenAgentSkill',
  },
  description:
    'The skill layer for AI agents. Let your AI agent find, compare, and install the right reusable skill automatically. OpenAgentSkill is npm for AI Agent Skills.',
  alternates: {
    canonical: SITE_URL,
    languages: getLocalizedLanguageAlternates(),
  },
  openGraph: {
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    url: SITE_URL,
    type: 'website',
    images: [
      {
        url: HOME_SOCIAL_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'OpenAgentSkill — The skill layer for AI agents',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    creator: '@openagentskill',
    site: '@openagentskill',
    images: [
      {
        url: HOME_SOCIAL_IMAGE_URL,
        alt: 'OpenAgentSkill — The skill layer for AI agents',
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default async function Page() {
  const { stats, activities, featuredSkills } = await getHomePageData()

  return (
    <HomePageEnhanced
      stats={stats}
      activities={activities}
      featuredSkills={featuredSkills}
    />
  )
}
