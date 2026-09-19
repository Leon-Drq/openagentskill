import type { Locale } from './config'

const copy = {
  next: ['Next: paste this into your selected agent.', '下一步：粘贴到所选 Agent 中。', '次に、選択した Agent に貼り付けてください。', '다음: 선택한 Agent에 붙여넣으세요.', 'Ahora pégalo en el agente seleccionado.', 'Jetzt in den ausgewählten Agent einfügen.', 'Collez maintenant dans l’agent choisi.', 'Berikutnya: tempel ke agent pilihan.'],
  terminal: ['Next: review the command, then run it in an isolated workspace.', '下一步：检查命令，再在隔离工作区运行。', 'コマンドを確認し、隔離した作業環境で実行してください。', '명령을 검토한 후 격리된 작업 공간에서 실행하세요.', 'Revisa el comando y ejecútalo en un entorno aislado.', 'Befehl prüfen und in einer isolierten Umgebung ausführen.', 'Vérifiez la commande, puis exécutez-la dans un espace isolé.', 'Tinjau perintah, lalu jalankan di ruang kerja terisolasi.'],
  evidence: ['Copying is not installation or a successful run. Check dependencies, API costs and permissions before proceeding.', '复制不代表已安装或运行成功。继续前请检查依赖、API 费用和权限。', 'コピーはインストールや実行成功を意味しません。依存関係、API 費用、権限を確認してください。', '복사는 설치나 실행 성공이 아닙니다. 의존성, API 비용, 권한을 확인하세요.', 'Copiar no significa instalar ni ejecutar con éxito. Revisa dependencias, costes API y permisos.', 'Kopieren bedeutet weder Installation noch erfolgreichen Einsatz. Abhängigkeiten, API-Kosten und Berechtigungen prüfen.', 'Copier ne signifie ni installer ni réussir une exécution. Vérifiez dépendances, coûts API et autorisations.', 'Menyalin bukan instalasi atau keberhasilan eksekusi. Periksa dependensi, biaya API, dan izin.'],
  failed: ['Copy failed. Select and copy the text manually.', '复制失败，请手动选择并复制文本。', 'コピーできませんでした。テキストを選択してコピーしてください。', '복사에 실패했습니다. 텍스트를 직접 선택해 복사하세요.', 'No se pudo copiar. Selecciona y copia el texto manualmente.', 'Kopieren fehlgeschlagen. Text bitte manuell kopieren.', 'Échec de la copie. Sélectionnez et copiez le texte manuellement.', 'Gagal menyalin. Pilih dan salin teks secara manual.'],
} as const

export function handoffCopy(locale: Locale, key: keyof typeof copy) {
  return copy[key][['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'].indexOf(locale)] || copy[key][0]
}
