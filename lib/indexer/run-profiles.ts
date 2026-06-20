export interface IndexerRunProfile {
  key: string
  label: string
  path: string
  schedule: string
  domains: string[]
  targetNew: number
  minStars: number
  maxSearchRequests: number
  duplicateRecoverySearchRequests: number
  strictQuality: boolean
  includeCollections: boolean
}

export const INDEXER_RUN_PROFILES: IndexerRunProfile[] = [
  {
    key: 'coding-data',
    label: 'Coding, data, knowledge, and DevOps',
    path: '/api/indexer/run/coding-data',
    schedule: '10 * * * *',
    domains: ['coding', 'data', 'knowledge', 'devops'],
    targetNew: 250,
    minStars: 500,
    maxSearchRequests: 25,
    duplicateRecoverySearchRequests: 5,
    strictQuality: true,
    includeCollections: false,
  },
  {
    key: 'finance-research',
    label: 'Finance, research, documents, and sports analytics',
    path: '/api/indexer/run/finance-research',
    schedule: '25 * * * *',
    domains: ['finance', 'research', 'documents', 'sports'],
    targetNew: 250,
    minStars: 500,
    maxSearchRequests: 25,
    duplicateRecoverySearchRequests: 5,
    strictQuality: true,
    includeCollections: false,
  },
  {
    key: 'growth-ops',
    label: 'Growth, operations, security, legal, and education',
    path: '/api/indexer/run/growth-ops',
    schedule: '40 * * * *',
    domains: [
      'browser-commerce',
      'marketing-seo',
      'customer-support',
      'productivity',
      'security',
      'legal-compliance',
      'education',
    ],
    targetNew: 250,
    minStars: 500,
    maxSearchRequests: 25,
    duplicateRecoverySearchRequests: 5,
    strictQuality: true,
    includeCollections: false,
  },
]

export function getIndexerRunProfile(key: string) {
  return INDEXER_RUN_PROFILES.find((profile) => profile.key === key)
}
