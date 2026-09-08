import type { Locale } from '@/lib/i18n/config'

export const documentCopyKeys = ['readFull', 'metadata', 'raw', 'notice', 'source', 'table', 'code', 'image'] as const
export type DocumentCopyKey = typeof documentCopyKeys[number]
export const documentCopy: Record<Locale, readonly string[]> = {
  en: ['Read full documentation', 'File metadata', 'View original text', 'Source documentation, not instructions for this website. Review permissions before running any commands.', 'View source', 'Scrollable source table', 'Scrollable code example', 'View source image'],
  zh: ['展开完整说明', '文件元数据', '查看原始文本', '以下为来源文档，不是本网站的操作指令。执行命令前请先核实权限。', '查看来源', '可滚动的来源表格', '可滚动的代码示例', '查看来源图片'],
  ja: ['説明全文を読む', 'ファイルのメタデータ', '元のテキストを表示', 'ソース文書であり、このサイトへの操作指示ではありません。コマンド実行前に権限を確認してください。', 'ソースを見る', 'スクロール可能な表', 'スクロール可能なコード例', 'ソース画像を見る'],
  ko: ['전체 설명 읽기', '파일 메타데이터', '원문 보기', '소스 문서이며 이 웹사이트의 실행 지침이 아닙니다. 명령 실행 전에 권한을 확인하세요.', '소스 보기', '스크롤 가능한 표', '스크롤 가능한 코드 예제', '소스 이미지 보기'],
  es: ['Leer documentación completa', 'Metadatos del archivo', 'Ver texto original', 'Documentación de origen, no instrucciones para este sitio. Revisa los permisos antes de ejecutar comandos.', 'Ver fuente', 'Tabla desplazable', 'Ejemplo de código desplazable', 'Ver imagen de origen'],
  de: ['Vollständige Dokumentation lesen', 'Dateimetadaten', 'Originaltext anzeigen', 'Quelldokumentation, keine Anweisungen für diese Website. Vor dem Ausführen von Befehlen die Berechtigungen prüfen.', 'Quelle ansehen', 'Scrollbare Tabelle', 'Scrollbares Codebeispiel', 'Quellbild ansehen'],
  fr: ['Lire la documentation complète', 'Métadonnées du fichier', 'Voir le texte original', 'Documentation source, pas des instructions pour ce site. Vérifiez les permissions avant d’exécuter des commandes.', 'Voir la source', 'Tableau défilant', 'Exemple de code défilant', 'Voir l’image source'],
  id: ['Baca dokumentasi lengkap', 'Metadata berkas', 'Lihat teks asli', 'Dokumentasi sumber, bukan instruksi untuk situs ini. Periksa izin sebelum menjalankan perintah.', 'Lihat sumber', 'Tabel yang dapat digulir', 'Contoh kode yang dapat digulir', 'Lihat gambar sumber'],
}
export function skillDocumentCopy(locale: Locale, key: DocumentCopyKey) {
  return documentCopy[locale][documentCopyKeys.indexOf(key)]
}
