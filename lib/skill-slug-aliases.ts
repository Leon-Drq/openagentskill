export const SKILL_SLUG_ALIASES: Record<string, string> = {
  crawl4ai: 'crawl4ai',
  'crawl-4-ai': 'crawl4ai',
  serenity: 'serenity-skill',
  'serenity-stock-analysis': 'serenity-skill',
  'muxuuu-serenity-skill': 'serenity-skill',
  last30days: 'last30days-skill',
  'last-30-days': 'last30days-skill',
  'mvanhorn-last30days-skill': 'last30days-skill',
  'agent-skills': 'addyosmani-agent-skills',
  'addy-agent-skills': 'addyosmani-agent-skills',
  'addyosmani-agent-skills': 'addyosmani-agent-skills',
  'davidondrej-skills': 'davidondrej-skills',
  'david-ondrej-skills': 'davidondrej-skills',
  openbb: 'openbb',
  'openbb-finance': 'openbb',
  'aaron-marketing': 'aaron-he-zhu-aaron-marketing-skills',
  'aaron-marketing-skills': 'aaron-he-zhu-aaron-marketing-skills',
  markitdown: 'markitdown',
  'mark-it-down': 'markitdown',
  'frontend-skill': 'design-taste-frontend',
  'taste-skill': 'design-taste-frontend',
  'design-taste': 'design-taste-frontend',
  'frontend-design': 'anthropic-frontend-design',
  'anthropic-frontend-design': 'anthropic-frontend-design',
  'figma-implement-design': 'figma-implement-design',
  'web-design-guidelines': 'vercel-web-design-guidelines',
  'react-best-practices': 'vercel-react-best-practices',
  'vercel-react-best-practices': 'vercel-react-best-practices',
  'playwright-skill': 'openai-playwright',
  'openai-playwright': 'openai-playwright',
  'webapp-testing': 'anthropic-webapp-testing',
  'canvas-design': 'anthropic-canvas-design',
  'brand-guidelines': 'anthropic-brand-guidelines',
  'deploy-to-vercel': 'vercel-deploy-to-vercel',
  'vercel-deploy-claimable': 'vercel-deploy-to-vercel',
  'vox-director': 'vox-director',
  'vox director': 'vox-director',
  vox: 'vox-director',
  broll: 'vox-director',
  'b-roll': 'vox-director',
  'seedance-prompt': 'seedance-prompt-en',
  'seedance-prompt-en': 'seedance-prompt-en',
  seedance: 'seedance-prompt-en',
  'seedance 2': 'seedance-prompt-en',
  'seedance2-skill': 'seedance-prompt-en',
  statsbomb: 'statsbomb-open-data',
  'football-analytics': 'statsbomb-open-data',
}

export function normalizeRequestedSkillSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
}

export function getCanonicalSkillSlug(slug: string) {
  const normalized = normalizeRequestedSkillSlug(slug)
  return SKILL_SLUG_ALIASES[normalized] || normalized
}

export function isCanonicalSkillSlug(slug: string) {
  return normalizeRequestedSkillSlug(slug) === getCanonicalSkillSlug(slug)
}
