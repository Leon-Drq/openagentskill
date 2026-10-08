import type { Locale } from './config'

const en = {
  access: 'Access', all: 'All', free: 'Free', paid: 'Paid', 'third-party': 'Third-party',
  moreCategories: 'More categories', advanced: 'More filters', apply: 'Show results', close: 'Close filters',
  description: 'Choose your filters, then show results.',
  paidNote: 'Paid Skills by OpenAgentSkill will appear here when available.',
  freeNote: 'Free to get. Model, API or service usage may have separate costs.',
  thirdPartyNote: 'Skills from external platforms, including free and paid listings.',
}
type Copy = Record<keyof typeof en, string>
const copies: Record<Locale, Copy> = {
  en,
  zh: { access: '获取方式', all: '全部', free: '免费', paid: '付费', 'third-party': '第三方', moreCategories: '更多分类', advanced: '更多筛选', apply: '显示结果', close: '关闭筛选', description: '选择条件后，点击显示结果。', paidNote: '本站自研的付费 Skill 上架后，将在这里展示。', freeNote: '免费获取 Skill；使用模型、API 或其他服务可能另有费用。', thirdPartyNote: '来自外部平台的 Skill，包含免费和付费项目。' },
  ja: { access: '入手方法', all: 'すべて', free: '無料', paid: '有料', 'third-party': '外部提供', moreCategories: 'その他のカテゴリ', advanced: '詳細な絞り込み', apply: '結果を表示', close: '絞り込みを閉じる', description: '条件を選択して結果を表示します。', paidNote: 'OpenAgentSkill の有料 Skill は、公開後にここに表示されます。', freeNote: '入手は無料です。モデル、API、サービスの利用は別途料金がかかる場合があります。', thirdPartyNote: '外部プラットフォームの無料・有料 Skill。' },
  ko: { access: '이용 방식', all: '전체', free: '무료', paid: '유료', 'third-party': '외부 제공', moreCategories: '더 많은 카테고리', advanced: '추가 필터', apply: '결과 보기', close: '필터 닫기', description: '조건을 선택한 후 결과를 확인하세요.', paidNote: 'OpenAgentSkill의 유료 Skill이 출시되면 여기에 표시됩니다.', freeNote: 'Skill은 무료로 받을 수 있습니다. 모델, API 및 서비스 사용에는 별도 비용이 발생할 수 있습니다.', thirdPartyNote: '외부 플랫폼의 무료 및 유료 Skill입니다.' },
  es: { access: 'Acceso', all: 'Todos', free: 'Gratis', paid: 'De pago', 'third-party': 'Externos', moreCategories: 'Más categorías', advanced: 'Más filtros', apply: 'Ver resultados', close: 'Cerrar filtros', description: 'Elige los filtros y muestra los resultados.', paidNote: 'Los Skills de pago de OpenAgentSkill aparecerán aquí cuando estén disponibles.', freeNote: 'Obtención gratuita. El uso de modelos, API o servicios puede tener costes adicionales.', thirdPartyNote: 'Skills de plataformas externas, gratuitos y de pago.' },
  de: { access: 'Zugang', all: 'Alle', free: 'Kostenlos', paid: 'Kostenpflichtig', 'third-party': 'Drittanbieter', moreCategories: 'Weitere Kategorien', advanced: 'Weitere Filter', apply: 'Ergebnisse anzeigen', close: 'Filter schließen', description: 'Filter auswählen und Ergebnisse anzeigen.', paidNote: 'Kostenpflichtige Skills von OpenAgentSkill erscheinen hier, sobald sie verfügbar sind.', freeNote: 'Kostenlos erhältlich. Für Modelle, APIs oder Dienste können weitere Kosten anfallen.', thirdPartyNote: 'Kostenlose und kostenpflichtige Skills externer Plattformen.' },
  fr: { access: 'Accès', all: 'Tous', free: 'Gratuit', paid: 'Payant', 'third-party': 'Plateformes tierces', moreCategories: 'Autres catégories', advanced: 'Plus de filtres', apply: 'Voir les résultats', close: 'Fermer les filtres', description: 'Choisissez les filtres, puis affichez les résultats.', paidNote: 'Les Skills payants d’OpenAgentSkill apparaîtront ici dès leur disponibilité.', freeNote: 'Obtention gratuite. Les modèles, API ou services peuvent entraîner des frais supplémentaires.', thirdPartyNote: 'Skills de plateformes externes, gratuits et payants.' },
  id: { access: 'Akses', all: 'Semua', free: 'Gratis', paid: 'Berbayar', 'third-party': 'Pihak ketiga', moreCategories: 'Kategori lainnya', advanced: 'Filter lainnya', apply: 'Lihat hasil', close: 'Tutup filter', description: 'Pilih filter, lalu lihat hasilnya.', paidNote: 'Skill berbayar dari OpenAgentSkill akan ditampilkan di sini saat tersedia.', freeNote: 'Gratis untuk diperoleh. Penggunaan model, API, atau layanan mungkin dikenakan biaya terpisah.', thirdPartyNote: 'Skill dari platform eksternal, termasuk yang gratis dan berbayar.' },
}
export function directoryFilterCopy(locale: Locale) { return copies[locale] || en }
