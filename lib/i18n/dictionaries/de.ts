import en from './en'

const de = {
  ...en,
  nav: {
    ...en.nav,
    home: 'Start',
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
    title: 'Lass deinen AI Agent automatisch den richtigen Skill finden und installieren.',
    subtitle: 'OpenAgentSkill ist npm fur AI Agent Skills: Registry und Empfehlungs-API zum Entdecken, Vergleichen, Prufen und Installieren wiederverwendbarer Skills.',
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
