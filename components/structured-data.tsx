const BASE_URL = 'https://www.openagentskill.com'

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OpenAgentSkill',
    alternateName: 'Open Agent Skill',
    url: BASE_URL,
    description: 'The open marketplace for AI agent skills ranked by real agent usage.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/skills?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
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
    name: 'OpenAgentSkill',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: 'OpenAgentSkill is the open marketplace for AI agent skills. Discover, publish, and share skills for AI agents.',
    image: `${BASE_URL}/opengraph-image`,
    foundingDate: '2026',
    sameAs: [
      'https://github.com/Leon-Drq/openagentskill',
      'https://x.com/openagentskill',
    ],
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
    </>
  )
}
