import { syncVerifiedSkillSources } from '@/lib/indexer/verified-skill-sources'

export const OFFICIAL_FRONTEND_SKILL_SLUGS = [
  'design-taste-frontend',
  'anthropic-frontend-design',
  'figma-implement-design',
  'vercel-web-design-guidelines',
  'vercel-react-best-practices',
  'openai-playwright',
  'anthropic-webapp-testing',
  'anthropic-canvas-design',
  'anthropic-brand-guidelines',
  'vercel-deploy-to-vercel',
] as const

export function syncOfficialFrontendSkills() {
  return syncVerifiedSkillSources({
    label: 'official frontend',
    slugs: OFFICIAL_FRONTEND_SKILL_SLUGS,
  })
}
