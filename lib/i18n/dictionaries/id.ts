import en from './en'

const id = {
  ...en,
  nav: {
    ...en.nav,
    home: 'Beranda',
    resolve: 'Temukan',
    skills: 'Skill',
    tasks: 'Tugas',
    packs: 'Paket',
    compare: 'Bandingkan',
    submit: 'Kirim',
    submitSkill: 'Kirim Skill',
    docs: 'Dokumentasi',
    apiDocs: 'API',
    activity: 'Aktivitas',
    forAgents: 'Untuk Agent',
  },
  hero: {
    ...en.hero,
    title: 'Lapisan skill untuk AI agents.',
    subtitle: 'Biarkan AI agent Anda menemukan, membandingkan, dan memasang skill yang tepat secara otomatis. OpenAgentSkill adalah npm untuk AI Agent Skills.',
    tryItNow: 'Coba sekarang',
    orDescribeTask: 'Jelaskan tugas',
    taskPlaceholder: 'Ambil data situs dan ekstrak data terstruktur...',
    findSkills: 'Cari Skill',
    searching: 'Mencari...',
    recommendedSkills: 'Skill rekomendasi',
    noResults: 'Tidak ada skill yang cocok. Coba deskripsi lain.',
    confidence: 'kecocokan',
    installCommand: 'Pasang',
    cta: {
      browse: 'Cari Skill untuk Agent Saya',
      submit: 'Kirim Skill',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: 'Skill',
    downloads: 'Unduhan',
    platforms: 'Platform',
    agentSubmissions: 'Kiriman Agent',
  },
  common: {
    ...en.common,
    loading: 'Memuat...',
    error: 'Kesalahan',
    notFound: 'Tidak ditemukan',
    backHome: 'Kembali ke beranda',
    learnMore: 'Pelajari lebih lanjut',
    getStarted: 'Mulai',
  },
}

export default id
