import type { Locale } from './config'

const en = {
  overview: 'Overview', editable: 'Editable SVG', local: 'Runs locally',
  formatCount: 'Three formats', previewTitle: 'One idea. Three ways to share it.',
  details: 'Inside the Skill', comparePlans: 'Find your fit.',
  compareLead: 'Explore freely. Pick an original when you need it.',
  annualSaving: 'Save 34% yearly', original: 'An OpenAgentSkill original',
  memberArt: 'Your next idea, in good shape.', collection: 'THE ORIGINALS / 001',
}
const translations: Record<Exclude<Locale, 'en'>, typeof en> = {
  zh: { overview: '作品总览', editable: '可编辑 SVG', local: '本地运行', formatCount: '三种画幅', previewTitle: '一个想法，三种表达。', details: '了解这个 Skill', comparePlans: '选一种，适合你的方式。', compareLead: '自由探索，按需选择原创技能。', annualSaving: '年付省 34%', original: 'OpenAgentSkill 原创', memberArt: '让下一个想法，有个好模样。', collection: '原创系列 / 001' },
  ja: { overview: '一覧', editable: '編集可能な SVG', local: 'ローカルで実行', formatCount: '3つのサイズ', previewTitle: 'ひとつのアイデア。3つの表現。', details: 'Skill の内容', comparePlans: 'あなたに合うプランを。', compareLead: '自由に探して、必要なオリジナルを選ぼう。', annualSaving: '年払いで34%お得', original: 'OpenAgentSkill オリジナル', memberArt: '次のアイデアを、いい形に。', collection: 'オリジナル / 001' },
  ko: { overview: '전체 보기', editable: '편집 가능한 SVG', local: '로컬 실행', formatCount: '세 가지 규격', previewTitle: '하나의 아이디어, 세 가지 표현.', details: 'Skill 구성', comparePlans: '나에게 맞는 선택.', compareLead: '자유롭게 탐색하고 필요한 오리지널을 선택하세요.', annualSaving: '연간 결제 시 34% 절약', original: 'OpenAgentSkill 오리지널', memberArt: '다음 아이디어를 멋진 형태로.', collection: '오리지널 / 001' },
  es: { overview: 'Vista general', editable: 'SVG editable', local: 'Ejecución local', formatCount: 'Tres formatos', previewTitle: 'Una idea. Tres formas de compartirla.', details: 'Dentro del Skill', comparePlans: 'Encuentra tu opción.', compareLead: 'Explora libremente. Elige un original cuando lo necesites.', annualSaving: 'Ahorra un 34% al año', original: 'Un original de OpenAgentSkill', memberArt: 'Tu próxima idea toma forma.', collection: 'ORIGINALES / 001' },
  de: { overview: 'Übersicht', editable: 'Editierbares SVG', local: 'Lokal ausführen', formatCount: 'Drei Formate', previewTitle: 'Eine Idee. Drei Wege, sie zu teilen.', details: 'In diesem Skill', comparePlans: 'Finde deinen Plan.', compareLead: 'Entdecke frei. Wähle ein Original, wenn du es brauchst.', annualSaving: 'Jährlich 34% sparen', original: 'Ein OpenAgentSkill Original', memberArt: 'Deine nächste Idee nimmt Form an.', collection: 'ORIGINALE / 001' },
  fr: { overview: 'Vue d’ensemble', editable: 'SVG modifiable', local: 'Exécution locale', formatCount: 'Trois formats', previewTitle: 'Une idée. Trois façons de la partager.', details: 'Dans ce Skill', comparePlans: 'Trouvez votre formule.', compareLead: 'Explorez librement. Choisissez un original selon vos besoins.', annualSaving: 'Économisez 34% par an', original: 'Un original OpenAgentSkill', memberArt: 'Votre prochaine idée prend forme.', collection: 'ORIGINAUX / 001' },
  id: { overview: 'Ringkasan', editable: 'SVG dapat diedit', local: 'Berjalan lokal', formatCount: 'Tiga format', previewTitle: 'Satu ide. Tiga cara untuk berbagi.', details: 'Isi Skill', comparePlans: 'Temukan pilihanmu.', compareLead: 'Jelajahi dengan bebas. Pilih karya orisinal sesuai kebutuhan.', annualSaving: 'Hemat 34% per tahun', original: 'Karya orisinal OpenAgentSkill', memberArt: 'Ide berikutnya, dalam bentuk terbaik.', collection: 'ORISINAL / 001' },
}
const pricing: Record<Locale, { singlePlan: string; freePriceNote: string }> = {
  en: { singlePlan: 'Single Skill', freePriceNote: 'No subscription needed' },
  zh: { singlePlan: '单项购买', freePriceNote: '无需订阅' },
  ja: { singlePlan: '単品購入', freePriceNote: 'サブスクリプション不要' },
  ko: { singlePlan: '개별 구매', freePriceNote: '구독 없이 이용' },
  es: { singlePlan: 'Skill individual', freePriceNote: 'Sin suscripción' },
  de: { singlePlan: 'Einzelkauf', freePriceNote: 'Kein Abo nötig' },
  fr: { singlePlan: 'Skill à l’unité', freePriceNote: 'Sans abonnement' },
  id: { singlePlan: 'Skill satuan', freePriceNote: 'Tanpa langganan' },
}
export function studioUiCopy(locale: Locale) { return { ...(locale === 'en' ? en : translations[locale]), ...pricing[locale] } }
