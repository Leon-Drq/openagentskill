const BASE_URL = 'https://www.openagentskill.com'

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Open Agent Skill',
    alternateName: 'OpenAgentSkill',
    url: BASE_URL,
    description: 'The open marketplace for AI agent skills. Discover 35+ skills ranked by real agent usage.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/skills?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Open Agent Skill',
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
    name: 'Open Agent Skill',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: 'The open marketplace for AI agent skills. Discover, publish, and share skills for AI agents.',
    image: `${BASE_URL}/opengraph-image`,
    foundingDate: '2026',
    sameAs: [
      'https://github.com/Leon-Drq/openagentskill',
      'https://x.com/openagentskill',
    ],
  }

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Open Agent Skill?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Open Agent Skill is an open marketplace for AI agent skills. It helps developers discover, publish, and share skills (tools, plugins, MCP servers) for AI agents like Claude, GPT, and LangChain.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I install a skill?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can install any skill using the command: npx skills add <owner/repo>. Each skill page also shows specific installation instructions.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are skills ranked?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Skills are ranked by real agent usage data, not just GitHub stars. We track actual API calls from agents, success rates, and response times to surface the most reliable skills.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I submit my own skill?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Visit the Submit page and provide your GitHub repository URL. Our AI will review your skill for quality and security, then it will be listed in the marketplace.',
        },
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
    </>
  )
}
