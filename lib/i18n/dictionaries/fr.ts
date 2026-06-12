import en from './en'

const fr = {
  ...en,
  nav: {
    ...en.nav,
    home: 'Accueil',
    skills: 'Skills',
    tasks: 'Taches',
    packs: 'Packs',
    compare: 'Comparer',
    submit: 'Soumettre',
    submitSkill: 'Soumettre un skill',
    docs: 'Docs',
    apiDocs: 'API',
    activity: 'Activite',
    forAgents: 'Pour agents',
  },
  hero: {
    ...en.hero,
    title: 'Laissez votre AI agent trouver et installer automatiquement le bon skill.',
    subtitle: 'OpenAgentSkill est npm pour AI Agent Skills : un registre et une API de recommandation pour decouvrir, comparer, auditer et installer des skills reutilisables.',
    tryItNow: 'Essayer',
    orDescribeTask: 'Decrire une tache',
    taskPlaceholder: 'Explorer des sites web et extraire des donnees structurees...',
    findSkills: 'Trouver des skills',
    searching: 'Recherche...',
    recommendedSkills: 'Skills recommandes',
    noResults: 'Aucun skill correspondant. Essayez une autre description.',
    confidence: 'correspondance',
    installCommand: 'Installer',
    cta: {
      browse: 'Trouver des skills pour mon agent',
      submit: 'Soumettre un skill',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: 'Skills',
    downloads: 'Telechargements',
    platforms: 'Plateformes',
    agentSubmissions: 'Soumissions agents',
  },
  common: {
    ...en.common,
    loading: 'Chargement...',
    error: 'Erreur',
    notFound: 'Introuvable',
    backHome: 'Retour a l’accueil',
    learnMore: 'En savoir plus',
    getStarted: 'Commencer',
  },
}

export default fr
