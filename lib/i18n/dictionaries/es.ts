import en from './en'

const es = {
  ...en,
  nav: {
    ...en.nav,
    home: 'Inicio',
    skills: 'Skills',
    tasks: 'Tareas',
    packs: 'Packs',
    compare: 'Comparar',
    submit: 'Enviar',
    submitSkill: 'Enviar skill',
    docs: 'Docs',
    apiDocs: 'API',
    activity: 'Actividad',
    forAgents: 'Para agentes',
  },
  hero: {
    ...en.hero,
    title: 'La capa de skills para AI agents.',
    subtitle: 'Permite que tu AI agent encuentre, compare e instale automaticamente el skill reutilizable correcto. OpenAgentSkill es npm para AI Agent Skills.',
    tryItNow: 'Probar ahora',
    orDescribeTask: 'Describe una tarea',
    taskPlaceholder: 'Extraer sitios web y datos estructurados...',
    findSkills: 'Buscar skills',
    searching: 'Buscando...',
    recommendedSkills: 'Skills recomendados',
    noResults: 'No se encontraron skills. Prueba otra descripción.',
    confidence: 'coincidencia',
    installCommand: 'Instalar',
    cta: {
      browse: 'Buscar skills para mi agent',
      submit: 'Enviar un skill',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: 'Skills',
    downloads: 'Descargas',
    platforms: 'Plataformas',
    agentSubmissions: 'Envíos de agents',
  },
  common: {
    ...en.common,
    loading: 'Cargando...',
    error: 'Error',
    notFound: 'No encontrado',
    backHome: 'Volver al inicio',
    learnMore: 'Saber más',
    getStarted: 'Empezar',
  },
}

export default es
