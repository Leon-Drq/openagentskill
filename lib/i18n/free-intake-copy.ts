import type { Locale } from './config'

const rows = {
  title: ['Free skills first', '目前收录免费 Skill', '現在は無料 Skill を受付', '현재 무료 Skill 접수', 'Primero, skills gratuitos', 'Zuerst kostenlose Skills', 'Des skills gratuits pour commencer', 'Skill gratis terlebih dahulu'],
  confirm: ['I confirm the complete skill files can be obtained without a purchase.', '我确认完整的 Skill 文件无需购买即可获取。', 'Skill の全ファイルを購入せずに入手できることを確認します。', '구매 없이 전체 Skill 파일을 받을 수 있음을 확인합니다.', 'Confirmo que todos los archivos del skill se pueden obtener sin comprarlos.', 'Ich bestätige, dass alle Skill-Dateien ohne Kauf erhältlich sind.', 'Je confirme que tous les fichiers du skill sont accessibles sans achat.', 'Saya mengonfirmasi semua berkas skill dapat diperoleh tanpa pembelian.'],
  note: ['Model, API and compute fees may still apply. This declaration does not replace review or license checks. Paid listings will come later.', '模型、API 和算力可能另外收费。此声明不替代审核或许可证检查，付费上架将后续开放。', 'モデル・API・計算資源の料金は別途発生する場合があります。この申告は審査やライセンス確認に代わるものではありません。有料掲載は今後対応予定です。', '모델, API, 컴퓨팅 비용은 별도일 수 있습니다. 이 확인은 심사나 라이선스 확인을 대체하지 않습니다. 유료 등록은 추후 지원합니다.', 'Puede haber costes de modelos, API y cómputo. La declaración no sustituye la revisión ni la licencia. Los listados de pago llegarán más adelante.', 'Modell-, API- und Rechenkosten können anfallen. Die Erklärung ersetzt weder Prüfung noch Lizenzkontrolle. Bezahlangebote folgen später.', 'Les modèles, API et ressources de calcul peuvent être payants. Cette déclaration ne remplace ni l’examen ni la vérification de licence. Les offres payantes viendront plus tard.', 'Biaya model, API, dan komputasi mungkin berlaku. Pernyataan ini tidak menggantikan peninjauan atau pemeriksaan lisensi. Listing berbayar akan hadir nanti.'],
  required: ['Please confirm free access to the complete skill files.', '请先确认完整 Skill 文件可免费获取。', '全 Skill ファイルを無料で入手できることを確認してください。', '전체 Skill 파일의 무료 제공을 확인해 주세요.', 'Confirma el acceso gratuito a todos los archivos del skill.', 'Bitte den kostenlosen Zugang zu allen Skill-Dateien bestätigen.', 'Veuillez confirmer l’accès gratuit à tous les fichiers du skill.', 'Konfirmasikan akses gratis ke semua berkas skill.'],
} as const
export function freeIntakeCopy(locale: Locale, key: keyof typeof rows) {
  const index = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'].indexOf(locale)
  return rows[key][index < 0 ? 0 : index]
}
