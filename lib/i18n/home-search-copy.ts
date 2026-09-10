import type { Locale } from './config'

export const HOME_SEARCH_EXAMPLES: Record<Locale, readonly string[]> = {
  en: ['Create a product video…', 'Design a brand logo…', 'Find research papers…', 'Review my code…'],
  zh: ['制作产品演示视频…', '设计品牌 Logo…', '搜索并整理科研文献…', '审查代码…'],
  ja: ['製品紹介動画を作る…', 'ブランドロゴを作る…', '研究論文を探す…', 'コードをレビュー…'],
  ko: ['제품 소개 영상 만들기…', '브랜드 로고 디자인…', '연구 논문 찾기…', '코드 리뷰…'],
  es: ['Crear un vídeo de producto…', 'Diseñar un logo…', 'Buscar artículos científicos…', 'Revisar código…'],
  de: ['Ein Produktvideo erstellen…', 'Ein Logo gestalten…', 'Fachartikel finden…', 'Code überprüfen…'],
  fr: ['Créer une vidéo produit…', 'Créer un logo…', 'Trouver des articles scientifiques…', 'Relire du code…'],
  id: ['Buat video produk…', 'Desain logo merek…', 'Cari makalah penelitian…', 'Tinjau kode saya…'],
}

export const HOME_SEARCH_COPY: Record<Locale, { placeholder: string; browse: string; connect: string; indexed: string }> = {
  en: { placeholder: 'Describe a task or skill name…', browse: 'Browse all skills', connect: 'Connect my AI', indexed: 'Indexed skills' },
  zh: { placeholder: '输入任务或技能名称…', browse: '浏览全部技能', connect: '连接我的 AI', indexed: '已收录技能' },
  ja: { placeholder: 'タスクやスキル名を入力…', browse: 'すべてのスキルを見る', connect: 'AI を接続', indexed: '登録済みスキル' },
  ko: { placeholder: '작업 또는 스킬 이름 입력…', browse: '모든 스킬 보기', connect: '내 AI 연결', indexed: '등록된 스킬' },
  es: { placeholder: 'Describe una tarea o un skill…', browse: 'Explorar todos los skills', connect: 'Conectar mi IA', indexed: 'Skills indexados' },
  de: { placeholder: 'Aufgabe oder Skill-Namen eingeben…', browse: 'Alle Skills entdecken', connect: 'Meine KI verbinden', indexed: 'Indexierte Skills' },
  fr: { placeholder: 'Décrivez une tâche ou un skill…', browse: 'Explorer tous les skills', connect: 'Connecter mon IA', indexed: 'Skills indexés' },
  id: { placeholder: 'Masukkan tugas atau nama skill…', browse: 'Jelajahi semua skill', connect: 'Hubungkan AI saya', indexed: 'Skill terindeks' },
}
