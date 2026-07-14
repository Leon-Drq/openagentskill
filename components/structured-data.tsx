import { HOME_SOCIAL_IMAGE_URL } from '@/lib/seo/social'

const BASE_URL = 'https://www.openagentskill.com'

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'OpenAgentSkill',
    alternateName: ['Open Agent Skill', 'OpenAgentSkill Registry', 'AI Agent Skills Registry', 'AgentSkill Registry'],
    url: BASE_URL,
    description: 'The skill layer for AI agents: a registry, audit layer, and recommendation API for discovering, comparing, and installing reusable agent skills.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/skills?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'OpenAgentSkill',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icon.svg`,
      },
    },
  }

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'OpenAgentSkill',
    alternateName: ['Open Agent Skill', 'OpenAgentSkill Registry'],
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: 'OpenAgentSkill helps AI agents and builders discover, compare, audit, and install the right reusable skill automatically.',
    image: HOME_SOCIAL_IMAGE_URL,
    foundingDate: '2026',
    sameAs: [
      'https://github.com/Leon-Drq/openagentskill',
      'https://x.com/openagentskill',
    ],
    knowsAbout: [
      'AI agent skills',
      'agent skill discovery',
      'skill trust and security audits',
      'Codex skills',
      'Claude Code skills',
      'Cursor skills',
    ],
  }

  const softwareApplicationData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${BASE_URL}/#software`,
    name: 'OpenAgentSkill',
    alternateName: 'npm for AI Agent Skills',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    url: BASE_URL,
    description: 'Let your AI agent find, compare, and install the right reusable skill automatically with an agent-facing skills registry and recommendation API.',
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  const apiData = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    '@id': `${BASE_URL}/#recommendation-api`,
    name: 'OpenAgentSkill Recommendation API',
    url: `${BASE_URL}/api-docs`,
    documentation: `${BASE_URL}/api-docs`,
    endpointUrl: `${BASE_URL}/api/agent/recommend`,
    description: 'Agent-facing API for recommending the right reusable AI agent skill from a task description.',
    provider: {
      '@id': `${BASE_URL}/#organization`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(apiData) }}
      />
    </>
  )
}
