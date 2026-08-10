import { syncVerifiedSkillSources } from '@/lib/indexer/verified-skill-sources'

export const FINANCE_RESEARCH_SKILL_SLUGS = [
  'anthropic-earnings-analysis',
  'anthropic-portfolio-monitoring',
  'anthropic-three-statement-model',
  'geeksfino-financial-statement-analyzer',
  'geeksfino-quant-factor-screener',
  'geeksfino-portfolio-health-check',
  'tradermonty-market-environment-analysis',
  'tradermonty-market-news-analyst',
  'tradermonty-earnings-calendar',
  'tradermonty-us-stock-analysis',
  'alphagbm-stock-analysis',
  'gauss314-fred-macro',
  'gauss314-yahoo-finance',
  'joellewis-qualitative-valuation',
  'star23-tech-earnings-deepdive',
  'himself65-company-valuation',
  'himself65-earnings-preview',
  'tushare-finance',
  'alphaear-stock',
  'simons-quant',
  'trade-fundamental',
  'portfolio-analytics',
] as const

/**
 * Keeps the source-checked financial research subset fresh without treating
 * trading connectors or repository-wide bundles as automatically installable.
 */
export function syncFinanceResearchSkills() {
  return syncVerifiedSkillSources({
    label: 'finance research',
    slugs: FINANCE_RESEARCH_SKILL_SLUGS,
    listingVerified: false,
    listingSource: 'curated-finance-research-skill-path',
  })
}
