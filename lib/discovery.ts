import type { Locale } from './i18n/config'

// Shared discovery vocabulary. Links point to established, indexable topic pages.
const text = (en: string, zh: string, ja: string, ko: string, es: string, de: string, fr: string, id: string) => ({ en, zh, ja, ko, es, de, fr, id })
export const discoveryText = {
  categories: text('Categories', '分类', 'カテゴリ', '카테고리', 'Categorías', 'Kategorien', 'Catégories', 'Kategori'),
  task: text('By task', '按任务', 'タスク別', '작업별', 'Por tarea', 'Nach Aufgabe', 'Par tâche', 'Menurut tugas'),
  output: text('By output', '按产出', '出力別', '결과물별', 'Por resultado', 'Nach Ausgabe', 'Par résultat', 'Menurut hasil'),
  agent: text('By agent', '按 Agent', 'エージェント別', '에이전트별', 'Por agente', 'Nach Agent', 'Par agent', 'Menurut agen'),
  taskNote: text('Start with what you want to do.', '从你想完成的任务开始。', 'やりたいことから探す。', '원하는 작업부터 찾아보세요.', 'Empieza por lo que quieres hacer.', 'Mit deiner Aufgabe beginnen.', 'Commencez par votre tâche.', 'Mulai dari tugas Anda.'),
  outputNote: text('Find the format you need.', '选择你需要的成果形式。', '必要な形式を探す。', '필요한 결과물을 찾으세요.', 'Encuentra el formato que necesitas.', 'Das passende Format finden.', 'Trouvez le format souhaité.', 'Temukan format yang dibutuhkan.'),
  agentNote: text('Explore skills for your tools.', '寻找适合你工具的技能。', 'ツールに合うスキルを探す。', '도구에 맞는 스킬을 살펴보세요.', 'Explora skills para tus herramientas.', 'Skills für deine Tools entdecken.', 'Explorez les skills pour vos outils.', 'Jelajahi skill untuk alat Anda.'),
  featured: text('Featured', '精选推荐', 'おすすめ', '추천', 'Destacados', 'Empfohlen', 'Sélection', 'Pilihan'),
  all: text('All skills', '全部 Skills', 'すべてのスキル', '모든 스킬', 'Todos los skills', 'Alle Skills', 'Tous les skills', 'Semua skill'),
  gallery: text('Gallery', '案例 Gallery', 'ギャラリー', '갤러리', 'Galería', 'Galerie', 'Galerie', 'Galeri'),
  browse: text('Browse all skills', '浏览全部 Skills', 'すべてのスキルを見る', '모든 스킬 둘러보기', 'Explorar todos los skills', 'Alle Skills durchsuchen', 'Explorer tous les skills', 'Jelajahi semua skill'),
  finder: text('AI Skill Finder', 'AI 技能推荐', 'AI スキル検索', 'AI 스킬 찾기', 'Buscador de skills con IA', 'KI-Skill-Finder', 'Recherche de skills par IA', 'Pencari skill AI'),
  search: text('Search skills', '搜索技能', 'スキルを検索', '스킬 검색', 'Buscar skills', 'Skills suchen', 'Rechercher des skills', 'Cari skill'),
  filters: text('Filters', '筛选', '絞り込み', '필터', 'Filtros', 'Filter', 'Filtres', 'Filter'),
  explore: text('Explore by task', '按任务探索', 'タスクから探す', '작업별 탐색', 'Explorar por tarea', 'Nach Aufgabe entdecken', 'Explorer par tâche', 'Jelajahi menurut tugas'),
  examples: text('View examples', '查看案例', '作例を見る', '사례 보기', 'Ver ejemplos', 'Beispiele ansehen', 'Voir les exemples', 'Lihat contoh'),
  withExamples: text('With examples', '有案例', '作例あり', '사례 있음', 'Con ejemplos', 'Mit Beispielen', 'Avec exemples', 'Dengan contoh'),
  directoryNote: text('Find a skill for your next task. Preview examples where available.', '找到适合下一个任务的 Skill，有案例的技能可直接预览效果。', '次のタスクに合うスキルを探し、作例で成果を確認。', '다음 작업에 맞는 스킬을 찾고 사례를 확인하세요.', 'Encuentra un skill para tu próxima tarea y explora sus ejemplos.', 'Finde einen Skill für deine nächste Aufgabe und entdecke Beispiele.', 'Trouvez un skill pour votre prochaine tâche et découvrez ses exemples.', 'Temukan skill untuk tugas berikutnya dan lihat contohnya.'),
  views: text('Browse skills and examples', '浏览技能与案例', 'スキルと作例を探す', '스킬과 사례 탐색', 'Explorar skills y ejemplos', 'Skills und Beispiele durchsuchen', 'Explorer les skills et exemples', 'Jelajahi skill dan contoh'),
}
export const discoveryCopy = (locale: Locale) => Object.fromEntries(Object.entries(discoveryText).map(([key, value]) => [key, value[locale]])) as Record<keyof typeof discoveryText, string>

export const DISCOVERY_TASKS = [
  { id: 'design-creative', href: '/collections/frontend-product-ui', icon: 'web', label: text('Web & UI design', '网站与 UI 设计', 'Web・UI デザイン', '웹 및 UI 디자인', 'Diseño web y UI', 'Web- und UI-Design', 'Design web et UI', 'Desain web & UI') },
  { id: 'coding-agents', href: '/best/coding-agents', icon: 'code', label: text('Coding & testing', '编码与测试', '開発・テスト', '코딩 및 테스트', 'Código y pruebas', 'Code und Tests', 'Code et tests', 'Kode & pengujian') },
  { id: 'video-creation', href: '/collections/video-creation-studio', icon: 'video', label: text('Video creation', '视频创作', '動画制作', '영상 제작', 'Creación de vídeo', 'Videoerstellung', 'Création vidéo', 'Pembuatan video') },
  { id: 'research', href: '/best/research-agents', icon: 'search', label: text('Research & analysis', '研究与分析', '調査・分析', '연구 및 분석', 'Investigación y análisis', 'Recherche und Analyse', 'Recherche et analyse', 'Riset & analisis') },
  { id: 'web-scraping', href: '/best/web-scraping', icon: 'workflow', label: text('Scraping & automation', '数据提取与自动化', '抽出・自動化', '데이터 추출 및 자동화', 'Extracción y automatización', 'Extraktion und Automation', 'Extraction et automatisation', 'Ekstraksi & otomatisasi') },
  { id: 'document-processing', href: '/best/document-processing', icon: 'document', label: text('Documents & office', '文档与办公', '文書・オフィス', '문서 및 사무', 'Documentos y oficina', 'Dokumente und Büro', 'Documents et bureautique', 'Dokumen & kantor') },
  { id: 'presentation', href: '/best/presentation-generation', icon: 'slides', label: text('Presentations', '演示文稿', 'プレゼンテーション', '프레젠테이션', 'Presentaciones', 'Präsentationen', 'Présentations', 'Presentasi') },
  { id: 'data', href: '/best/data-analysis', icon: 'data', label: text('Data & analytics', '数据与分析', 'データ分析', '데이터 분석', 'Datos y analítica', 'Daten und Analytik', 'Données et analyses', 'Data & analitik') },
] as const

export const DISCOVERY_OUTPUTS = [
  { id: 'web', href: '/collections/frontend-product-ui', icon: 'web', label: text('Websites & apps', '网站与应用', 'Web・アプリ', '웹사이트 및 앱', 'Webs y aplicaciones', 'Websites und Apps', 'Sites et applications', 'Situs & aplikasi') },
  { id: 'image', href: '/best/design-creative', icon: 'image', label: text('Images & design', '图片与设计', '画像・デザイン', '이미지 및 디자인', 'Imágenes y diseño', 'Bilder und Design', 'Images et design', 'Gambar & desain') },
  { id: 'video', href: '/collections/video-creation-studio', icon: 'video', label: text('Video & motion', '视频与动画', '動画・アニメーション', '영상 및 애니메이션', 'Vídeo y animación', 'Video und Animation', 'Vidéo et animation', 'Video & animasi') },
  { id: 'slides', href: '/best/presentation-generation', icon: 'slides', label: text('Slides', '幻灯片', 'スライド', '슬라이드', 'Diapositivas', 'Folien', 'Diapositives', 'Slide') },
  { id: 'document', href: '/best/document-processing', icon: 'document', label: text('Documents & reports', '文档与报告', '文書・レポート', '문서 및 보고서', 'Documentos e informes', 'Dokumente und Berichte', 'Documents et rapports', 'Dokumen & laporan') },
  { id: 'code', href: '/best/coding-agents', icon: 'code', label: text('Code & data', '代码与数据', 'コード・データ', '코드 및 데이터', 'Código y datos', 'Code und Daten', 'Code et données', 'Kode & data') },
] as const

export const DISCOVERY_AGENTS = [
  { id: 'codex', href: '/best/codex-skills', icon: 'terminal', label: text('Codex', 'Codex', 'Codex', 'Codex', 'Codex', 'Codex', 'Codex', 'Codex') },
  { id: 'claude', href: '/best/claude-code-skills', icon: 'terminal', label: text('Claude Code', 'Claude Code', 'Claude Code', 'Claude Code', 'Claude Code', 'Claude Code', 'Claude Code', 'Claude Code') },
  { id: 'cursor', href: '/best/cursor-code-review', icon: 'code', label: text('Cursor · code review', 'Cursor · 代码审查', 'Cursor · コードレビュー', 'Cursor · 코드 리뷰', 'Cursor · revisión de código', 'Cursor · Code-Review', 'Cursor · revue de code', 'Cursor · tinjauan kode') },
  { id: 'other', href: '/agents', icon: 'workflow', label: text('More agents', '更多 Agents', 'その他のエージェント', '더 많은 에이전트', 'Más agentes', 'Weitere Agents', 'Autres agents', 'Agen lainnya') },
] as const
