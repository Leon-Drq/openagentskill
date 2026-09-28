import type { Locale } from './config'

const copy = {
  en: { price: 'Skill price', all: 'All prices', free: 'Free', paid: 'Paid', note: 'Free means no purchase is needed to obtain the skill files. Model, API and compute fees may apply separately; free access is not a license or safety certification.', details: 'Skill pricing & requirements' },
  zh: { price: 'Skill 价格', all: '全部价格', free: '免费', paid: '付费', note: '免费指 Skill 文件可免费获取。模型、API 和算力可能另收费；免费不代表许可或安全认证。', details: '查看 Skill 价格与使用条件' },
  ja: { price: 'Skill の価格', all: 'すべての価格', free: '無料', paid: '有料', note: '無料は Skill ファイルの入手価格です。モデル・API・計算資源の料金は別途発生する場合があります。ライセンスや安全性の認証ではありません。', details: 'Skill の価格と要件' },
  ko: { price: 'Skill 가격', all: '모든 가격', free: '무료', paid: '유료', note: '무료는 Skill 파일의 취득 비용을 뜻합니다. 모델, API, 컴퓨팅 비용은 별도일 수 있으며 라이선스나 안전 인증은 아닙니다.', details: 'Skill 가격 및 요구 사항' },
  es: { price: 'Precio del skill', all: 'Todos los precios', free: 'Gratis', paid: 'De pago', note: 'Gratis se refiere a obtener los archivos del skill. Modelos, API y cómputo pueden tener costes aparte; no es una licencia ni certificación de seguridad.', details: 'Precio y requisitos del skill' },
  de: { price: 'Skill-Preis', all: 'Alle Preise', free: 'Kostenlos', paid: 'Kostenpflichtig', note: 'Kostenlos bezieht sich auf die Skill-Dateien. Modell-, API- und Rechenkosten können zusätzlich anfallen; keine Lizenz- oder Sicherheitszertifizierung.', details: 'Skill-Preis und Anforderungen' },
  fr: { price: 'Prix du skill', all: 'Tous les prix', free: 'Gratuit', paid: 'Payant', note: 'Gratuit concerne l’accès aux fichiers du skill. Modèles, API et calcul peuvent être payants ; ce n’est ni une licence ni une certification de sécurité.', details: 'Prix et prérequis du skill' },
  id: { price: 'Harga skill', all: 'Semua harga', free: 'Gratis', paid: 'Berbayar', note: 'Gratis berarti berkas skill dapat diperoleh tanpa biaya. Model, API, dan komputasi mungkin berbayar; bukan lisensi atau sertifikasi keamanan.', details: 'Harga dan persyaratan skill' },
} satisfies Record<Locale, { price: string; all: string; free: string; paid: string; note: string; details: string }>
export const galleryPricingCopy = (locale: Locale) => copy[locale]
