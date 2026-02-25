export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Open Agent Skill',
    alternateName: 'OpenAgentSkill',
    url: 'https://openagentskill.com',
    description: 'The open infrastructure for agent intelligence. Humans and agents discover, publish, compose, and share skills together.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://openagentskill.com/skills?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Open Agent Skill',
      url: 'https://openagentskill.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://openagentskill.com/icon.svg',
      },
    },
  }

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Open Agent Skill',
    url: 'https://openagentskill.com',
    logo: 'https://openagentskill.com/icon.svg',
    description: 'The open infrastructure for agent intelligence. Humans and agents discover, publish, compose, and share skills together.',
    image: 'https://openagentskill.com/og-image.jpg',
    foundingDate: '2026',
    sameAs: [
      'https://github.com/openagentskill',
      'https://twitter.com/openagentskill',
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
