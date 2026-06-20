import en from './en'

const de = {
  ...en,
  nav: {
    ...en.nav,
    home: 'Start',
    resolve: 'Auflosen',
    skills: 'Skills',
    tasks: 'Aufgaben',
    packs: 'Skill Packs',
    compare: 'Vergleich',
    submit: 'Einreichen',
    submitSkill: 'Skill einreichen',
    docs: 'Docs',
    apiDocs: 'API',
    activity: 'Aktivitat',
    forAgents: 'Fur Agents',
  },
  hero: {
    ...en.hero,
    title: 'Die Skill-Schicht fur AI agents.',
    subtitle: 'Lass deinen AI agent automatisch den richtigen wiederverwendbaren Skill finden, vergleichen und installieren. OpenAgentSkill ist npm fur AI Agent Skills.',
    tryItNow: 'Jetzt testen',
    orDescribeTask: 'Aufgabe beschreiben',
    taskPlaceholder: 'Websites crawlen und strukturierte Daten extrahieren...',
    findSkills: 'Skills finden',
    searching: 'Suche...',
    recommendedSkills: 'Empfohlene Skills',
    noResults: 'Keine passenden Skills gefunden. Probiere eine andere Beschreibung.',
    confidence: 'Passung',
    installCommand: 'Installieren',
    cta: {
      browse: 'Skills fur meinen Agent finden',
      submit: 'Skill einreichen',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: 'Skills',
    downloads: 'Downloads',
    platforms: 'Plattformen',
    agentSubmissions: 'Agent-Einreichungen',
  },
  common: {
    ...en.common,
    loading: 'Ladt...',
    error: 'Fehler',
    notFound: 'Nicht gefunden',
    backHome: 'Zur Startseite',
    learnMore: 'Mehr erfahren',
    getStarted: 'Loslegen',
  },
}

export default de
