import type { LocalizedCorePageSlug, MarketLocale } from '@/lib/i18n/market-routing'

type PageMeta = {
  eyebrow: string
  title: string
  description: string
}

type Feature = {
  title: string
  copy: string
}

export type MarketCoreContent = {
  language: string
  labels: {
    trust: string
    stars: string
    audit: string
    install: string
    category: string
    openSkill: string
    viewAudit: string
    browseSkills: string
    viewDocs: string
    apiDocs: string
    repository: string
    noResults: string
    searchResults: string
    agentReady: string
    quality: string
    tryExample: string
    match: string
    safety: string
    englishDirectory: string
  }
  resolve: PageMeta & {
    taskLabel: string
    taskPlaceholder: string
    submit: string
    resolving: string
    emptyTitle: string
    emptyDescription: string
    resultLabel: string
    alternativesLabel: string
    whyLabel: string
    riskLabel: string
    copyInstall: string
    copiedInstall: string
    examples: string[]
    features: Feature[]
  }
  skills: PageMeta & {
    searchLabel: string
    searchPlaceholder: string
    search: string
    intro: string
  }
  agentSkill: PageMeta & {
    sections: Feature[]
  }
  registry: PageMeta & {
    metrics: Feature[]
    introTitle: string
    intro: string
  }
  docs: PageMeta & {
    sections: Feature[]
    installIntro: string
    apiIntro: string
  }
}

const de: MarketCoreContent = {
  language: 'Deutsch',
  labels: {
    trust: 'Trust',
    stars: 'Stars',
    audit: 'Audit',
    install: 'Installieren',
    category: 'Kategorie',
    openSkill: 'Skill öffnen',
    viewAudit: 'Audit ansehen',
    browseSkills: 'Skills durchsuchen',
    viewDocs: 'Dokumentation ansehen',
    apiDocs: 'API-Dokumentation',
    repository: 'Repository',
    noResults: 'Keine passenden Skills gefunden.',
    searchResults: 'Suchergebnisse',
    agentReady: 'Agent-ready',
    quality: 'Qualität',
    tryExample: 'Beispiel ausprobieren',
    match: 'Passung',
    safety: 'Sicherheit',
    englishDirectory: 'Englisches Verzeichnis',
  },
  resolve: {
    eyebrow: 'Agent-Skill-Resolver',
    title: 'Beschreibe die Aufgabe. Finde den passenden Skill.',
    description: 'OpenAgentSkill übersetzt Arbeit für deinen Agent in eine konkrete Empfehlung mit Installationsbefehl, Trust Score, Audit und Risikohinweisen.',
    taskLabel: 'Was soll dein Agent erledigen?',
    taskPlaceholder: 'Aktuelle Aktiennachrichten analysieren und Marktrisiken zusammenfassen',
    submit: 'Skill finden',
    resolving: 'Wird geprüft…',
    emptyTitle: 'Eine Entscheidung statt einer Linkliste.',
    emptyDescription: 'Beschreibe das Ziel. Du erhältst einen empfohlenen Skill, Alternativen, einen Installationspfad und Hinweise zur sicheren Prüfung.',
    resultLabel: 'Empfohlener Skill',
    alternativesLabel: 'Alternativen',
    whyLabel: 'Warum dieser Skill',
    riskLabel: 'Risikohinweise',
    copyInstall: 'Installationsbefehl kopieren',
    copiedInstall: 'Kopiert',
    examples: [
      'Aktuelle Aktiennachrichten analysieren',
      'PDF-Tabellen für einen Bericht extrahieren',
      'Preise von Wettbewerbern aus dem Web sammeln',
    ],
    features: [
      { title: 'Aufgabenbezug', copy: 'Ordnet Szenario, Kategorie und Repository-Signale der tatsächlichen Aufgabe zu.' },
      { title: 'Prüfbare Qualität', copy: 'Zeigt Trust, Audit, Wartung und Installationsbereitschaft vor der Nutzung.' },
      { title: 'Sicherer Übergabepunkt', copy: 'Gibt einen konkreten Installationsbefehl und klare nächste Schritte zurück.' },
    ],
  },
  skills: {
    eyebrow: 'Skill-Verzeichnis',
    title: 'Wiederverwendbare Skills für AI Agents entdecken.',
    description: 'Durchsuche reale GitHub-Skills nach Aufgabe und prüfe Stars, Trust, Audit, Kategorie und Installationspfad vor der Verwendung.',
    searchLabel: 'Skills durchsuchen',
    searchPlaceholder: 'Zum Beispiel: PDF, Aktienanalyse oder Präsentation',
    search: 'Suchen',
    intro: 'Jede Empfehlung bleibt mit ihrem Repository, Audit und Installationspfad nachvollziehbar.',
  },
  agentSkill: {
    eyebrow: 'Grundlagen',
    title: 'Was ist ein Agent Skill?',
    description: 'Ein Agent Skill ist eine wiederverwendbare Anleitung, ein Workflow oder ein Ressourcenpaket, das einem AI Agent eine konkrete Fähigkeit verlässlich vermittelt.',
    sections: [
      { title: 'Aufgabenbezogen', copy: 'Ein guter Skill beschreibt nicht nur ein Thema. Er hilft einem Agent, eine bestimmte Aufgabe mit klaren Eingaben, Schritten und erwarteten Ergebnissen zu erledigen.' },
      { title: 'Prüfbar vor der Installation', copy: 'OpenAgentSkill ergänzt das Repository um Trust-, Audit-, Wartungs- und Risikosignale, damit Agents und Teams nicht blind installieren.' },
      { title: 'Für Menschen und Agents', copy: 'Menschen können vergleichen und prüfen. Agents können dieselben Signale über die Registry API abrufen und eine sichere Übergabe erzeugen.' },
    ],
  },
  registry: {
    eyebrow: 'Agent Skill Registry',
    title: 'Die Skill-Schicht für AI Agents.',
    description: 'Eine offene Registry und Empfehlungs-API, mit der Agents wiederverwendbare Skills finden, vergleichen, prüfen und installieren können.',
    introTitle: 'Von einer Aufgabe zu einer installierbaren Auswahl.',
    intro: 'Statt eine unstrukturierte Liste von Repositories zu durchsuchen, erhält ein Agent eine geordnete Auswahl mit Aufgabenbezug, Trust, Audit, Risiko und Installationspfad.',
    metrics: [
      { title: 'Entdecken', copy: 'Aufgabenorientierte Suche über echte Skills und GitHub-Metadaten.' },
      { title: 'Prüfen', copy: 'Trust, Audit, Wartung, Lizenz und Installationsbereitschaft vor der Ausführung.' },
      { title: 'Installieren', copy: 'CLI-Befehl und agent-taugliche Übergabe für Codex, Claude Code und Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Dokumentation',
    title: 'Mit der OpenAgentSkill Registry arbeiten.',
    description: 'Erfahre, wie du Skills findest, installierst, prüfst und über die agent-freundlichen APIs in Workflows einbindest.',
    installIntro: 'Installationsbefehle bleiben bewusst unverändert, damit sie direkt mit dem Original-Repository funktionieren.',
    apiIntro: 'Die API liefert Aufgabenbezug, Trust, Audit, Risiken und Installationshinweise in einem maschinenlesbaren Format.',
    sections: [
      { title: 'Skills entdecken', copy: 'Nutze das Verzeichnis für eine menschliche Prüfung oder den Resolver, wenn dein Agent von einer Aufgabe zu einer passenden Empfehlung gelangen soll.' },
      { title: 'Vorher prüfen', copy: 'Lies Audit und Trust Score, prüfe die Lizenz und teste risikoreiche Skills zuerst in einer Sandbox.' },
      { title: 'Ergebnisse zurückmelden', copy: 'Nach einer klar abgegrenzten Ausführung kann ein Outcome gemeldet werden, damit spätere Empfehlungen aus realen Ergebnissen lernen.' },
    ],
  },
}

const es: MarketCoreContent = {
  language: 'Español',
  labels: {
    trust: 'Confianza',
    stars: 'Stars',
    audit: 'Auditoría',
    install: 'Instalar',
    category: 'Categoría',
    openSkill: 'Abrir skill',
    viewAudit: 'Ver auditoría',
    browseSkills: 'Explorar skills',
    viewDocs: 'Ver documentación',
    apiDocs: 'Documentación de API',
    repository: 'Repositorio',
    noResults: 'No se encontraron skills coincidentes.',
    searchResults: 'Resultados de búsqueda',
    agentReady: 'Listo para agents',
    quality: 'Calidad',
    tryExample: 'Probar un ejemplo',
    match: 'Ajuste',
    safety: 'Seguridad',
    englishDirectory: 'Directorio en inglés',
  },
  resolve: {
    eyebrow: 'Resolver de agent skills',
    title: 'Describe la tarea. Encuentra el skill correcto.',
    description: 'OpenAgentSkill convierte el trabajo de tu agent en una recomendación concreta con comando de instalación, Trust Score, auditoría y notas de riesgo.',
    taskLabel: '¿Qué debe hacer tu agent?',
    taskPlaceholder: 'Analizar noticias bursátiles recientes y resumir los riesgos del mercado',
    submit: 'Buscar skill',
    resolving: 'Analizando…',
    emptyTitle: 'Una decisión, no solo una lista de enlaces.',
    emptyDescription: 'Describe el objetivo y recibe un skill recomendado, alternativas, una ruta de instalación y pasos de revisión segura.',
    resultLabel: 'Skill recomendado',
    alternativesLabel: 'Alternativas',
    whyLabel: 'Por qué este skill',
    riskLabel: 'Notas de riesgo',
    copyInstall: 'Copiar comando de instalación',
    copiedInstall: 'Copiado',
    examples: [
      'Analizar noticias bursátiles recientes',
      'Extraer tablas de PDF para un informe',
      'Recopilar precios de competidores desde la web',
    ],
    features: [
      { title: 'Ajuste a la tarea', copy: 'Relaciona el escenario, la categoría y las señales del repositorio con el trabajo real que debe hacer el agent.' },
      { title: 'Calidad verificable', copy: 'Muestra confianza, auditoría, mantenimiento y preparación de instalación antes de usar un skill.' },
      { title: 'Entrega segura', copy: 'Devuelve un comando de instalación concreto y los siguientes pasos para revisarlo.' },
    ],
  },
  skills: {
    eyebrow: 'Directorio de skills',
    title: 'Descubre skills reutilizables para AI agents.',
    description: 'Busca skills reales de GitHub por tarea y revisa stars, confianza, auditoría, categoría y ruta de instalación antes de utilizarlos.',
    searchLabel: 'Buscar skills',
    searchPlaceholder: 'Por ejemplo: PDF, análisis bursátil o presentación',
    search: 'Buscar',
    intro: 'Cada recomendación conserva un vínculo claro con su repositorio, auditoría y ruta de instalación.',
  },
  agentSkill: {
    eyebrow: 'Fundamentos',
    title: '¿Qué es un agent skill?',
    description: 'Un agent skill es una instrucción reutilizable, un flujo de trabajo o un paquete de recursos que enseña a un AI agent una capacidad concreta.',
    sections: [
      { title: 'Orientado a una tarea', copy: 'Un buen skill no solo describe un tema. Ayuda a un agent a completar un trabajo específico con entradas, pasos y resultados claros.' },
      { title: 'Revisable antes de instalar', copy: 'OpenAgentSkill añade señales de confianza, auditoría, mantenimiento y riesgo para que los equipos no instalen código a ciegas.' },
      { title: 'Para personas y agents', copy: 'Las personas pueden comparar y revisar. Los agents pueden consumir las mismas señales por la Registry API y producir una entrega segura.' },
    ],
  },
  registry: {
    eyebrow: 'Registry de agent skills',
    title: 'La capa de skills para AI agents.',
    description: 'Una registry abierta y una API de recomendación para que los agents descubran, comparen, revisen e instalen skills reutilizables.',
    introTitle: 'De una tarea a una lista instalable.',
    intro: 'En lugar de recorrer repositorios sin estructura, un agent recibe candidatos ordenados por ajuste a la tarea, confianza, auditoría, riesgo y ruta de instalación.',
    metrics: [
      { title: 'Descubrir', copy: 'Búsqueda orientada a tareas sobre skills reales y metadatos de GitHub.' },
      { title: 'Revisar', copy: 'Confianza, auditoría, mantenimiento, licencia y preparación antes de ejecutar.' },
      { title: 'Instalar', copy: 'Comando CLI y entrega lista para Codex, Claude Code y Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Documentación',
    title: 'Trabaja con la Registry de OpenAgentSkill.',
    description: 'Aprende a descubrir, instalar y revisar skills, y a conectarlos a flujos de trabajo mediante APIs para agents.',
    installIntro: 'Los comandos de instalación no se traducen para que sigan funcionando con el repositorio original.',
    apiIntro: 'La API devuelve ajuste a la tarea, confianza, auditoría, riesgo e instrucciones de instalación en un formato legible por máquinas.',
    sections: [
      { title: 'Descubrir skills', copy: 'Usa el directorio para revisión humana o el resolver cuando tu agent necesite pasar de una tarea a una recomendación concreta.' },
      { title: 'Revisar antes de instalar', copy: 'Lee la auditoría y el Trust Score, verifica la licencia y prueba primero los skills de mayor riesgo en una sandbox.' },
      { title: 'Reportar resultados', copy: 'Después de una ejecución acotada, informa el resultado para que las recomendaciones futuras aprendan de uso real.' },
    ],
  },
}

const id: MarketCoreContent = {
  language: 'Bahasa Indonesia',
  labels: {
    trust: 'Kepercayaan',
    stars: 'Stars',
    audit: 'Audit',
    install: 'Pasang',
    category: 'Kategori',
    openSkill: 'Buka skill',
    viewAudit: 'Lihat audit',
    browseSkills: 'Jelajahi skill',
    viewDocs: 'Lihat dokumentasi',
    apiDocs: 'Dokumentasi API',
    repository: 'Repositori',
    noResults: 'Tidak ada skill yang cocok.',
    searchResults: 'Hasil pencarian',
    agentReady: 'Siap untuk agent',
    quality: 'Kualitas',
    tryExample: 'Coba contoh',
    match: 'Kecocokan',
    safety: 'Keamanan',
    englishDirectory: 'Direktori bahasa Inggris',
  },
  resolve: {
    eyebrow: 'Pencari agent skill',
    title: 'Jelaskan tugasnya. Temukan skill yang tepat.',
    description: 'OpenAgentSkill mengubah pekerjaan agent menjadi rekomendasi konkret dengan perintah pemasangan, Trust Score, audit, dan catatan risiko.',
    taskLabel: 'Apa yang harus dilakukan agent Anda?',
    taskPlaceholder: 'Analisis berita saham terbaru dan rangkum risiko pasar',
    submit: 'Cari skill',
    resolving: 'Menganalisis…',
    emptyTitle: 'Sebuah keputusan, bukan sekadar daftar tautan.',
    emptyDescription: 'Jelaskan tujuan Anda untuk mendapatkan skill yang direkomendasikan, alternatif, jalur pemasangan, dan langkah peninjauan aman.',
    resultLabel: 'Skill yang direkomendasikan',
    alternativesLabel: 'Alternatif',
    whyLabel: 'Mengapa skill ini',
    riskLabel: 'Catatan risiko',
    copyInstall: 'Salin perintah pemasangan',
    copiedInstall: 'Tersalin',
    examples: [
      'Analisis berita saham terbaru',
      'Ekstrak tabel PDF untuk laporan',
      'Kumpulkan harga kompetitor dari web',
    ],
    features: [
      { title: 'Sesuai tugas', copy: 'Mencocokkan skenario, kategori, dan sinyal repositori dengan pekerjaan nyata yang perlu dilakukan agent.' },
      { title: 'Kualitas yang dapat ditinjau', copy: 'Menampilkan trust, audit, pemeliharaan, dan kesiapan pemasangan sebelum sebuah skill digunakan.' },
      { title: 'Serah terima aman', copy: 'Mengembalikan perintah pemasangan yang jelas dan langkah berikutnya untuk proses peninjauan.' },
    ],
  },
  skills: {
    eyebrow: 'Direktori skill',
    title: 'Temukan skill yang dapat digunakan kembali untuk AI agents.',
    description: 'Cari skill GitHub nyata berdasarkan tugas lalu periksa stars, trust, audit, kategori, dan jalur pemasangan sebelum digunakan.',
    searchLabel: 'Cari skill',
    searchPlaceholder: 'Contoh: PDF, analisis saham, atau presentasi',
    search: 'Cari',
    intro: 'Setiap rekomendasi tetap terhubung dengan repositori, audit, dan jalur pemasangannya.',
  },
  agentSkill: {
    eyebrow: 'Dasar-dasar',
    title: 'Apa itu agent skill?',
    description: 'Agent skill adalah instruksi, alur kerja, atau paket sumber daya yang dapat digunakan kembali untuk memberi AI agent kemampuan yang spesifik dan dapat diandalkan.',
    sections: [
      { title: 'Berorientasi pada tugas', copy: 'Skill yang baik bukan hanya menjelaskan topik. Ia membantu agent menyelesaikan pekerjaan tertentu dengan masukan, langkah, dan hasil yang jelas.' },
      { title: 'Dapat diperiksa sebelum dipasang', copy: 'OpenAgentSkill menambahkan sinyal trust, audit, pemeliharaan, dan risiko agar agent dan tim tidak memasang sesuatu secara membabi buta.' },
      { title: 'Untuk manusia dan agents', copy: 'Manusia dapat membandingkan dan meninjau. Agents dapat memakai sinyal yang sama melalui Registry API dan menghasilkan serah terima yang aman.' },
    ],
  },
  registry: {
    eyebrow: 'Registry agent skill',
    title: 'Lapisan skill untuk AI agents.',
    description: 'Registry terbuka dan API rekomendasi agar agents dapat menemukan, membandingkan, meninjau, dan memasang skill yang dapat digunakan kembali.',
    introTitle: 'Dari tugas menjadi daftar yang siap dipasang.',
    intro: 'Daripada menelusuri repositori tanpa struktur, agent menerima kandidat yang diperingkat berdasarkan kesesuaian tugas, trust, audit, risiko, dan jalur pemasangan.',
    metrics: [
      { title: 'Temukan', copy: 'Pencarian berbasis tugas pada skill nyata dan metadata GitHub.' },
      { title: 'Tinjau', copy: 'Trust, audit, pemeliharaan, lisensi, dan kesiapan pemasangan sebelum eksekusi.' },
      { title: 'Pasang', copy: 'Perintah CLI dan serah terima siap pakai untuk Codex, Claude Code, dan Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Dokumentasi',
    title: 'Bekerja dengan Registry OpenAgentSkill.',
    description: 'Pelajari cara menemukan, memasang, dan meninjau skill, serta menghubungkannya ke alur kerja melalui API yang ramah agent.',
    installIntro: 'Perintah pemasangan tidak diterjemahkan agar tetap bekerja dengan repositori asli.',
    apiIntro: 'API memberikan kesesuaian tugas, trust, audit, risiko, dan panduan pemasangan dalam format yang mudah dibaca mesin.',
    sections: [
      { title: 'Temukan skill', copy: 'Gunakan direktori untuk peninjauan manusia atau resolver saat agent perlu berubah dari tugas menjadi rekomendasi yang konkret.' },
      { title: 'Tinjau sebelum memasang', copy: 'Baca audit dan Trust Score, periksa lisensi, dan uji skill berisiko di sandbox terlebih dahulu.' },
      { title: 'Laporkan hasil', copy: 'Setelah satu penggunaan yang terukur, laporkan hasilnya agar rekomendasi berikutnya dapat belajar dari penggunaan nyata.' },
    ],
  },
}

const MARKET_CORE_CONTENT: Record<MarketLocale, MarketCoreContent> = { de, es, id }

const MARKET_CORE_PAGE_KEYS: Record<LocalizedCorePageSlug, keyof Pick<MarketCoreContent, 'resolve' | 'skills' | 'agentSkill' | 'registry' | 'docs'>> = {
  resolve: 'resolve',
  skills: 'skills',
  'agent-skill': 'agentSkill',
  'agent-skills-registry': 'registry',
  docs: 'docs',
}

export function getMarketCoreContent(locale: MarketLocale) {
  return MARKET_CORE_CONTENT[locale]
}

export function getMarketCorePageMeta(locale: MarketLocale, page: LocalizedCorePageSlug) {
  return getMarketCoreContent(locale)[MARKET_CORE_PAGE_KEYS[page]] as PageMeta
}
