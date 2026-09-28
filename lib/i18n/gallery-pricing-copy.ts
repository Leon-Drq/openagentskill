import type { Locale } from './config'

const copy = {
  en: { price: 'Skill price', all: 'All prices', free: 'Free Skill', paid: 'Paid Skill', note: 'Labels describe skill access, not artwork for sale. Paid includes paid editions; model/API fees are separate.', details: 'Skill pricing & requirements' },
  zh: { price: 'Skill 价格', all: '全部价格', free: '免费 Skill', paid: '付费 Skill', note: '标签指 Skill 获取费用，不是出售作品。付费含付费版本，模型/API 费用另计。', details: '查看 Skill 价格与使用条件' },
  ja: { price: 'Skill の価格', all: 'すべての価格', free: '無料 Skill', paid: '有料 Skill', note: '作品の販売価格ではなく Skill の入手価格です。有料版を含み、モデル・API 料金は別途必要です。', details: 'Skill の価格と要件' },
  ko: { price: 'Skill 가격', all: '모든 가격', free: '무료 Skill', paid: '유료 Skill', note: '작품 판매가 아닌 Skill 이용 가격입니다. 유료 버전을 포함하며 모델/API 요금은 별도입니다.', details: 'Skill 가격 및 요구 사항' },
  es: { price: 'Precio del skill', all: 'Todos los precios', free: 'Skill gratuito', paid: 'Skill de pago', note: 'Las etiquetas indican el acceso al skill, no la venta de la obra. De pago incluye ediciones de pago; modelos y API se cobran aparte.', details: 'Precio y requisitos del skill' },
  de: { price: 'Skill-Preis', all: 'Alle Preise', free: 'Kostenloser Skill', paid: 'Kostenpflichtiger Skill', note: 'Die Angabe betrifft den Skill-Zugang, nicht den Verkauf des Werks. Kostenpflichtig umfasst auch Bezahlversionen; Modell-/API-Kosten sind separat.', details: 'Skill-Preis und Anforderungen' },
  fr: { price: 'Prix du skill', all: 'Tous les prix', free: 'Skill gratuit', paid: 'Skill payant', note: 'Les étiquettes concernent l’accès au skill, pas la vente de l’œuvre. Payant inclut les éditions payantes ; modèles et API sont facturés séparément.', details: 'Prix et prérequis du skill' },
  id: { price: 'Harga skill', all: 'Semua harga', free: 'Skill gratis', paid: 'Skill berbayar', note: 'Label menunjukkan biaya akses skill, bukan penjualan karya. Berbayar termasuk edisi berbayar; biaya model/API terpisah.', details: 'Harga dan persyaratan skill' },
} satisfies Record<Locale, { price: string; all: string; free: string; paid: string; note: string; details: string }>
export const galleryPricingCopy = (locale: Locale) => copy[locale]
