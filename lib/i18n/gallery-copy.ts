// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { isLocale, type Locale } from './config.ts'

// Editorial UI strings. Every entry must explicitly cover all six additional
// languages; EN/ZH remain at the call site during migration. Never translate
// repository names, commands, licenses, or the text inside an author's artwork.
type Translations = readonly [ja: string, ko: string, es: string, de: string, fr: string, id: string]
export const galleryTranslations = {
  'A floral studio, in full bloom': ['花咲くフローラルスタジオ', '꽃으로 가득한 플로럴 스튜디오', 'Un estudio floral en plena floración', 'Ein Blumenstudio in voller Blüte', 'Un atelier floral en pleine floraison', 'Studio bunga yang bermekaran'],
  'A dark botanical storefront with editorial typography and a complete scrolling layout.': ['植物をテーマにしたダークな店舗サイト。編集的なタイポグラフィと縦長レイアウトが特徴です。', '식물 테마의 어두운 쇼핑 페이지에 편집형 타이포그래피와 긴 스크롤 레이아웃을 적용했습니다.', 'Una tienda botánica oscura con tipografía editorial y un diseño completo de desplazamiento.', 'Ein dunkler botanischer Shop mit redaktioneller Typografie und vollständigem Scroll-Layout.', 'Une boutique botanique sombre, avec typographie éditoriale et mise en page défilante complète.', 'Etalase botani gelap dengan tipografi editorial dan tata letak gulir lengkap.'],
  'Room to grow': ['成長する余白', '성장할 여백', 'Espacio para crecer', 'Raum zum Wachsen', 'De la place pour grandir', 'Ruang untuk tumbuh'],
  'A botanical poster in two inks, with oversized type and tactile print detail.': ['2 色のインク、大きな文字、印刷の質感を生かした植物ポスター。', '두 가지 잉크와 큰 글자, 인쇄 질감을 살린 식물 포스터입니다.', 'Un cartel botánico a dos tintas, con tipografía grande y textura de impresión.', 'Ein botanisches Zweifarbenposter mit großer Schrift und fühlbarer Druckstruktur.', 'Une affiche botanique en deux encres, avec grands caractères et texture d’impression.', 'Poster botani dua tinta dengan huruf besar dan detail tekstur cetak.'],
  'Stories that become slides': ['物語をスライドに', '슬라이드가 되는 이야기', 'Historias que se convierten en diapositivas', 'Geschichten werden zu Folien', 'Des histoires devenues diapositives', 'Cerita yang menjadi presentasi'],
  'An author’s collection of editorial presentations, from travel to ideas.': ['旅からアイデアまで、作者による編集的なプレゼンテーション集。', '여행부터 아이디어까지 담은 제작자의 편집형 프레젠테이션 모음입니다.', 'Presentaciones editoriales del autor, desde viajes hasta ideas.', 'Eine Sammlung redaktioneller Präsentationen des Autors, von Reisen bis zu Ideen.', 'Une collection de présentations éditoriales de l’auteur, des voyages aux idées.', 'Koleksi presentasi editorial pembuat, dari perjalanan hingga gagasan.'],
  'Skill by': ['スキル作者', '스킬 제작자', 'Skill de', 'Skill von', 'Skill par', 'Pembuat skill'],
  'Breadcrumb': ['パンくずリスト', '탐색 경로', 'Ruta de navegación', 'Brotkrumennavigation', 'Fil d’Ariane', 'Jejak navigasi'],
  'All work': ['すべての作品', '모든 작품', 'Todas las obras', 'Alle Werke', 'Toutes les créations', 'Semua karya'],
  'Work & skill by': ['作品・スキル作者', '작품 및 스킬 제작자', 'Obra y skill de', 'Werk und Skill von', 'Création et skill par', 'Pembuat karya dan skill'],
  'Work by': ['作品の作者', '작품 제작자', 'Obra de', 'Werk von', 'Création par', 'Pembuat karya'],
  'Copy task & get started': ['タスクをコピーして始める', '작업 복사 후 시작', 'Copiar tarea y empezar', 'Aufgabe kopieren und starten', 'Copier la tâche et commencer', 'Salin tugas dan mulai'],
  'Scrollable full website preview': ['スクロール可能な全体プレビュー', '스크롤 가능한 전체 웹 미리보기', 'Vista completa desplazable', 'Scrollbare Website-Vorschau', 'Aperçu complet défilable', 'Pratinjau situs yang dapat digulir'],
  'Choose preview image': ['プレビュー画像を選ぶ', '미리보기 이미지 선택', 'Elegir imagen de vista previa', 'Vorschaubild auswählen', 'Choisir une image d’aperçu', 'Pilih gambar pratinjau'],
  'Open original video': ['元の動画を開く', '원본 영상 열기', 'Abrir vídeo original', 'Originalvideo öffnen', 'Ouvrir la vidéo originale', 'Buka video asli'],
  'View full image': ['元の画像を見る', '전체 이미지 보기', 'Ver imagen completa', 'Vollständiges Bild ansehen', 'Voir l’image complète', 'Lihat gambar lengkap'],
  'Inside this example': ['この事例の内容', '이 사례의 구성', 'Qué incluye este ejemplo', 'In diesem Beispiel', 'Dans cet exemple', 'Isi contoh ini'],
  'The starting point': ['入力素材', '시작 자료', 'Punto de partida', 'Ausgangsmaterial', 'Point de départ', 'Bahan awal'],
  'The result': ['成果物', '결과물', 'Resultado', 'Ergebnis', 'Résultat', 'Hasil'],
  'What you’ll need': ['必要なもの', '필요한 것', 'Qué necesitas', 'Voraussetzungen', 'Prérequis', 'Yang dibutuhkan'],
  'Source & production notes': ['出典・制作記録', '출처 및 제작 기록', 'Fuente y notas de producción', 'Quelle und Produktionsnotizen', 'Source et notes de production', 'Sumber dan catatan produksi'],
  'View source': ['出典を見る', '출처 보기', 'Ver fuente', 'Quelle ansehen', 'Voir la source', 'Lihat sumber'],
  'Curated': ['編集部のおすすめ', '에디터 추천', 'Selección editorial', 'Redaktionelle Auswahl', 'Sélection éditoriale', 'Pilihan editor'],
  'Source ref': ['参照バージョン', '출처 버전', 'Versión de origen', 'Quellversion', 'Version source', 'Versi sumber'],
  'Make your own': ['自分の作品を作る', '나만의 작품 만들기', 'Crea tu versión', 'Eigenes Werk erstellen', 'Créez votre version', 'Buat karya sendiri'],
  'Your starting point': ['ここから始める', '시작하기', 'Tu punto de partida', 'Dein Ausgangspunkt', 'Votre point de départ', 'Titik awal Anda'],
  'Make it yours.': ['あなたらしい作品に。', '나만의 작품으로.', 'Hazlo tuyo.', 'Mach es zu deinem Werk.', 'Faites-en votre création.', 'Jadikan karya Anda.'],
  'Copy the task, add your own subject and assets, then hand it to your agent.': ['タスクをコピーし、テーマや素材を差し替えて Agent に渡しましょう。', '작업을 복사하고 주제와 자료를 바꾼 뒤 Agent에 전달하세요.', 'Copia la tarea, añade tu tema y recursos y pásala a tu agente.', 'Kopiere die Aufgabe, ergänze dein Thema und Material und übergib sie deinem Agenten.', 'Copiez la tâche, ajoutez votre sujet et vos ressources, puis confiez-la à votre agent.', 'Salin tugas, tambahkan topik dan aset Anda, lalu serahkan ke agent.'],
  '01 / Copy the task': ['01 / タスクをコピー', '01 / 작업 복사', '01 / Copiar la tarea', '01 / Aufgabe kopieren', '01 / Copier la tâche', '01 / Salin tugas'],
  'Original prompt': ['使用した元のプロンプト', '실제 사용한 원본 프롬프트', 'Prompt original', 'Original-Prompt', 'Prompt original', 'Prompt asli'],
  'Suggested task': ['提案タスク', '추천 작업', 'Tarea sugerida', 'Aufgabenvorschlag', 'Tâche suggérée', 'Tugas yang disarankan'],
  'Task to copy': ['コピー用タスク', '복사할 작업', 'Tarea para copiar', 'Aufgabe zum Kopieren', 'Tâche à copier', 'Tugas untuk disalin'],
  'A task adapted from this example, not the author’s original prompt. Your result will vary.': ['事例をもとに編集したタスクです。作者の元のプロンプトではなく、生成結果は異なります。', '사례를 바탕으로 작성한 작업이며 제작자의 원본 프롬프트가 아닙니다. 결과는 달라질 수 있습니다.', 'Tarea adaptada del ejemplo, no el prompt original del autor. El resultado puede variar.', 'An dieses Beispiel angepasste Aufgabe, nicht der Original-Prompt des Autors. Ergebnisse variieren.', 'Tâche adaptée de l’exemple, et non prompt original de l’auteur. Le résultat peut varier.', 'Tugas diadaptasi dari contoh, bukan prompt asli pembuat. Hasil dapat berbeda.'],
  'Task copied': ['タスクをコピーしました', '작업 복사 완료', 'Tarea copiada', 'Aufgabe kopiert', 'Tâche copiée', 'Tugas disalin'],
  'Copy task': ['タスクをコピー', '작업 복사', 'Copiar tarea', 'Aufgabe kopieren', 'Copier la tâche', 'Salin tugas'],
  '02 / Start using the skill': ['02 / スキルを使う', '02 / 스킬 사용 시작', '02 / Empezar a usar la skill', '02 / Skill verwenden', '02 / Utiliser la skill', '02 / Mulai menggunakan skill'],
  'Start using': ['使い始める', '사용 시작', 'Empezar', 'Jetzt starten', 'Commencer', 'Mulai menggunakan'],
  'Runs in your own agent. Get setup instructions and the task in the next step.': ['ご自身の Agent で実行します。次に設定手順とタスクを表示します。', '사용자의 Agent에서 실행합니다. 다음 단계에서 설정 안내와 작업을 확인하세요.', 'Se ejecuta en tu agente. El siguiente paso incluye instrucciones y tarea.', 'Läuft in deinem Agenten. Im nächsten Schritt erhältst du Einrichtung und Aufgabe.', 'S’exécute dans votre agent. L’étape suivante fournit la configuration et la tâche.', 'Dijalankan di agent Anda. Langkah berikutnya berisi panduan penyiapan dan tugas.'],
  'Automatic copy failed. Select the text above and copy it manually.': ['コピーできませんでした。上のテキストを選択して手動でコピーしてください。', '자동 복사에 실패했습니다. 위 텍스트를 선택해 직접 복사하세요.', 'No se pudo copiar. Selecciona el texto y cópialo manualmente.', 'Automatisches Kopieren fehlgeschlagen. Bitte den Text manuell kopieren.', 'Échec de la copie. Sélectionnez le texte et copiez-le manuellement.', 'Gagal menyalin otomatis. Pilih teks di atas dan salin secara manual.'],
  'Copied to clipboard.': ['クリップボードにコピーしました。', '클립보드에 복사했습니다.', 'Copiado al portapapeles.', 'In die Zwischenablage kopiert.', 'Copié dans le presse-papiers.', 'Disalin ke papan klip.'],
  'Hand it to your agent': ['Agent に渡す', 'Agent에 전달', 'Pásalo a tu agente', 'An deinen Agenten übergeben', 'Transmettre à votre agent', 'Serahkan ke agent Anda'],
  'Open your agent and paste the complete text below into a new conversation. It includes the skill source, setup requirements and your task.': ['Agent の新しい会話に下の全文を貼り付けてください。スキルの出典、設定要件、タスクを含みます。', 'Agent의 새 대화에 아래 전체 텍스트를 붙여 넣으세요. 스킬 출처, 설정 요건, 작업이 포함됩니다.', 'Abre una conversación con tu agente y pega el texto completo: fuente, requisitos y tarea.', 'Füge den vollständigen Text in eine neue Unterhaltung mit deinem Agenten ein. Er enthält Quelle, Voraussetzungen und Aufgabe.', 'Collez le texte complet dans une nouvelle conversation avec votre agent : source, prérequis et tâche.', 'Tempel seluruh teks di bawah ke percakapan baru dengan agent Anda. Termasuk sumber, persyaratan, dan tugas.'],
  'Complete setup and task': ['設定とタスクの全文', '전체 설정 및 작업', 'Configuración y tarea completas', 'Vollständige Einrichtung und Aufgabe', 'Configuration et tâche complètes', 'Penyiapan dan tugas lengkap'],
  'Setup & task copied': ['設定とタスクをコピーしました', '설정 및 작업 복사 완료', 'Configuración y tarea copiadas', 'Einrichtung und Aufgabe kopiert', 'Configuration et tâche copiées', 'Penyiapan dan tugas disalin'],
  'Copy setup + task': ['設定とタスクをコピー', '설정 및 작업 복사', 'Copiar configuración y tarea', 'Einrichtung und Aufgabe kopieren', 'Copier configuration et tâche', 'Salin penyiapan dan tugas'],
  'View skill & installation options': ['スキルと導入方法を見る', '스킬 및 설치 옵션 보기', 'Ver skill y opciones de instalación', 'Skill und Installationsoptionen ansehen', 'Voir la skill et les options d’installation', 'Lihat skill dan opsi pemasangan'],
  'Keep exploring.': ['もっと作品を探す。', '계속 둘러보세요.', 'Sigue explorando.', 'Weiter entdecken.', 'Continuez à explorer.', 'Terus jelajahi.'],
  'Voting is unavailable. Please retry.': ['投票できません。再試行してください。', '투표할 수 없습니다. 다시 시도하세요.', 'Votación no disponible. Reinténtalo.', 'Abstimmung nicht verfügbar. Bitte erneut versuchen.', 'Vote indisponible. Réessayez.', 'Voting tidak tersedia. Coba lagi.'],
  'Shared through your device.': ['端末の共有機能に渡しました。', '기기의 공유 기능으로 전달했습니다.', 'Compartido mediante tu dispositivo.', 'Über dein Gerät geteilt.', 'Partagé via votre appareil.', 'Dibagikan melalui perangkat Anda.'],
  'Link copied. Paste it to share.': ['リンクをコピーしました。貼り付けて共有できます。', '링크를 복사했습니다. 붙여 넣어 공유하세요.', 'Enlace copiado. Pégalo para compartir.', 'Link kopiert. Zum Teilen einfügen.', 'Lien copié. Collez-le pour partager.', 'Tautan disalin. Tempel untuk berbagi.'],
  'Copy the link below to share.': ['下のリンクをコピーしてください。', '아래 링크를 복사해 공유하세요.', 'Copia el enlace para compartir.', 'Zum Teilen den Link unten kopieren.', 'Copiez le lien ci-dessous pour partager.', 'Salin tautan di bawah untuk berbagi.'],
  'Like': ['いいね', '좋아요', 'Me gusta', 'Gefällt mir', 'J’aime', 'Suka'],
  'Dislike': ['よくない', '싫어요', 'No me gusta', 'Gefällt mir nicht', 'Je n’aime pas', 'Tidak suka'],
  'Share': ['共有', '공유', 'Compartir', 'Teilen', 'Partager', 'Bagikan'],
  'Copied': ['コピー済み', '복사됨', 'Copiado', 'Kopiert', 'Copié', 'Disalin'],
  'Share options': ['共有オプション', '공유 옵션', 'Opciones para compartir', 'Teiloptionen', 'Options de partage', 'Opsi berbagi'],
  'Copy link': ['リンクをコピー', '링크 복사', 'Copiar enlace', 'Link kopieren', 'Copier le lien', 'Salin tautan'],
  'More sharing options': ['その他の共有方法', '다른 공유 방법', 'Más opciones para compartir', 'Weitere Teiloptionen', 'Autres options de partage', 'Opsi berbagi lainnya'],
  'Voting unavailable. Retry': ['投票できません。再試行', '투표 불가. 다시 시도', 'Votación no disponible. Reintentar', 'Abstimmung nicht verfügbar. Wiederholen', 'Vote indisponible. Réessayer', 'Voting tidak tersedia. Coba lagi'],
  'Share link': ['共有リンク', '공유 링크', 'Enlace para compartir', 'Link zum Teilen', 'Lien de partage', 'Tautan berbagi'],
  'Made with skills': ['スキルで作った作品', '스킬로 만든 작품', 'Creado con skills', 'Mit Skills erstellt', 'Créé avec des skills', 'Dibuat dengan skill'],
  'Discover the work, meet its creators, and make something of your own.': ['作品と作者に出会い、スキルで自分の作品を作りましょう。', '작품과 제작자를 만나고 나만의 작품을 만들어 보세요.', 'Descubre obras y creadores y crea algo propio.', 'Entdecke Werke und ihre Urheber und gestalte etwas Eigenes.', 'Découvrez les créations et leurs auteurs, puis créez à votre tour.', 'Temukan karya dan pembuatnya, lalu ciptakan karya Anda sendiri.'],
  'Browse examples': ['作品を探す', '작품 둘러보기', 'Explorar ejemplos', 'Beispiele entdecken', 'Explorer les exemples', 'Jelajahi contoh'],
  'Output format': ['作品の形式', '결과물 형식', 'Formato de salida', 'Ausgabeformat', 'Format de sortie', 'Format keluaran'],
  'Format': ['形式', '형식', 'Formato', 'Format', 'Format', 'Format'],
  'Search examples or skills': ['作品やスキルを検索', '작품 또는 스킬 검색', 'Buscar ejemplos o skills', 'Beispiele oder Skills suchen', 'Rechercher des exemples ou skills', 'Cari contoh atau skill'],
  'Search work or skills…': ['作品やスキルを検索…', '작품 또는 스킬 검색…', 'Buscar obras o skills…', 'Werke oder Skills suchen…', 'Rechercher des créations ou skills…', 'Cari karya atau skill…'],
  'Search': ['検索', '검색', 'Buscar', 'Suchen', 'Rechercher', 'Cari'],
  'Clear filters': ['絞り込みを解除', '필터 초기화', 'Borrar filtros', 'Filter zurücksetzen', 'Effacer les filtres', 'Hapus filter'],
  'Filter by use case': ['用途で絞り込む', '용도별 필터', 'Filtrar por uso', 'Nach Anwendungsfall filtern', 'Filtrer par usage', 'Filter berdasarkan kegunaan'],
  'All use cases': ['すべての用途', '모든 용도', 'Todos los usos', 'Alle Anwendungsfälle', 'Tous les usages', 'Semua kegunaan'],
  'Filter by skill creator': ['スキル作者で絞り込む', '스킬 제작자별 필터', 'Filtrar por creador', 'Nach Skill-Autor filtern', 'Filtrer par créateur', 'Filter berdasarkan pembuat skill'],
  'All skill creators': ['すべてのスキル作者', '모든 스킬 제작자', 'Todos los creadores', 'Alle Skill-Autoren', 'Tous les créateurs', 'Semua pembuat skill'],
  'Sort examples': ['作品の並び順', '작품 정렬', 'Ordenar ejemplos', 'Beispiele sortieren', 'Trier les exemples', 'Urutkan contoh'],
  'Top rated': ['コミュニティ評価順', '커뮤니티 평가순', 'Mejor valorados', 'Beste Bewertungen', 'Les mieux notés', 'Nilai tertinggi'],
  'Play a preview on the card; open the title for the task and workflow. Videos load only when you press play.': ['カードで動画を再生し、タイトルからタスクと手順を確認できます。動画は再生を押したときだけ読み込みます。', '카드에서 미리보기를 재생하고 제목을 눌러 작업과 과정을 확인하세요. 영상은 재생을 누를 때만 로드됩니다.', 'Reproduce la vista previa en la tarjeta; abre el título para ver la tarea. El vídeo solo carga al pulsar reproducir.', 'Vorschau auf der Karte abspielen, Titel für Aufgabe und Ablauf öffnen. Videos laden erst beim Abspielen.', 'Lancez l’aperçu sur la carte ; ouvrez le titre pour la tâche et le workflow. Les vidéos ne chargent qu’à la lecture.', 'Putar pratinjau di kartu; buka judul untuk tugas dan alur kerja. Video dimuat hanya saat diputar.'],
  'Votes are unavailable. Showing curated order.': ['投票データを取得できません。編集順で表示しています。', '투표 데이터를 불러올 수 없어 추천순으로 표시합니다.', 'Votos no disponibles. Se muestra el orden editorial.', 'Stimmen nicht verfügbar. Redaktionelle Reihenfolge wird angezeigt.', 'Votes indisponibles. Affichage dans l’ordre éditorial.', 'Data voting tidak tersedia. Menampilkan urutan editor.'],
  'Loading votes…': ['投票を読み込み中…', '투표 불러오는 중…', 'Cargando votos…', 'Stimmen werden geladen…', 'Chargement des votes…', 'Memuat voting…'],
  'Ranked by likes minus dislikes. Ties keep the curated order.': ['いいね数から低評価数を引いた順です。同点では編集順を維持します。', '좋아요에서 싫어요를 뺀 점수순입니다. 동점은 추천순을 유지합니다.', 'Orden por votos positivos menos negativos. Los empates conservan el orden editorial.', 'Sortiert nach positiven minus negativen Stimmen. Gleichstände bleiben in redaktioneller Reihenfolge.', 'Classement par votes positifs moins négatifs. Les égalités conservent l’ordre éditorial.', 'Diurutkan berdasarkan suka dikurangi tidak suka. Nilai seri mengikuti urutan editor.'],
  'Retry': ['再試行', '다시 시도', 'Reintentar', 'Erneut versuchen', 'Réessayer', 'Coba lagi'],
  'No examples just yet.': ['該当する作品はありません。', '일치하는 작품이 없습니다.', 'Aún no hay ejemplos.', 'Noch keine passenden Beispiele.', 'Aucun exemple pour le moment.', 'Belum ada contoh yang cocok.'],
  'Try a different search, or clear the filters to see all work.': ['別のキーワードを試すか、絞り込みを解除してください。', '다른 검색어를 사용하거나 필터를 초기화하세요.', 'Prueba otra búsqueda o borra los filtros.', 'Versuche eine andere Suche oder setze die Filter zurück.', 'Essayez une autre recherche ou effacez les filtres.', 'Coba pencarian lain atau hapus filter untuk melihat semua karya.'],
  'See all work': ['すべての作品を見る', '모든 작품 보기', 'Ver todas las obras', 'Alle Werke ansehen', 'Voir toutes les créations', 'Lihat semua karya'],
  'Gallery pagination': ['作品集のページ送り', '갤러리 페이지 탐색', 'Paginación de galería', 'Galerie-Seitennavigation', 'Pagination de la galerie', 'Navigasi halaman galeri'],
  'Previous': ['前へ', '이전', 'Anterior', 'Zurück', 'Précédent', 'Sebelumnya'],
  'Next': ['次へ', '다음', 'Siguiente', 'Weiter', 'Suivant', 'Berikutnya'],
  'Curated work, reusable templates and style studies are labeled separately, alongside work made here. Each names its source, requirements and prompt status. Author previews are not platform retests; multiple views of one work count once.': ['作者の作品、テンプレート、スタイル例、本站制作を区別して表示します。各項目に出典、条件、プロンプトの性質を明記しています。作者のプレビューは本站での再検証を意味しません。同じ作品の複数画像は1件として数えます。', '제작자 작품, 템플릿, 스타일 예시, 자체 제작을 구분합니다. 출처, 요건, 프롬프트 성격을 명시합니다. 제작자 미리보기는 플랫폼 재검증을 뜻하지 않으며 같은 작품의 여러 이미지는 한 건으로 집계합니다.', 'Obras, plantillas, estudios de estilo y creaciones propias se identifican por separado, con fuentes, requisitos y tipo de prompt. Las vistas del autor no son pruebas de la plataforma; varias imágenes de una obra cuentan una vez.', 'Werke, Vorlagen, Stilstudien und eigene Produktionen sind getrennt gekennzeichnet, mit Quelle, Voraussetzungen und Prompt-Status. Autorenvorschauen sind keine Plattformtests; mehrere Ansichten eines Werks zählen einmal.', 'Créations, modèles, études de style et productions internes sont distingués, avec sources, prérequis et statut du prompt. Les aperçus d’auteurs ne sont pas des tests de la plateforme ; plusieurs vues d’une œuvre comptent une fois.', 'Karya, templat, studi gaya, dan karya internal diberi label terpisah beserta sumber, persyaratan, dan status prompt. Pratinjau pembuat bukan pengujian platform; beberapa tampilan satu karya dihitung sekali.'],
  'Explore the skill registry': ['スキル一覧を見る', '스킬 목록 둘러보기', 'Explorar el registro de skills', 'Skill-Verzeichnis entdecken', 'Explorer le registre de skills', 'Jelajahi registri skill'],
  'Your next project starts here.': ['次の作品は、ここから。', '다음 작품은 여기서 시작됩니다.', 'Tu próximo proyecto empieza aquí.', 'Dein nächstes Projekt beginnt hier.', 'Votre prochain projet commence ici.', 'Proyek berikutnya dimulai di sini.'],
  'See the result. Copy a task. Make it yours with the skill behind it.': ['作品を見て、タスクをコピー。そのスキルで自分だけの作品を。', '결과를 보고 작업을 복사하세요. 해당 스킬로 나만의 작품을 만드세요.', 'Mira el resultado, copia una tarea y crea tu versión con la skill utilizada.', 'Ergebnis ansehen, Aufgabe kopieren und mit dem passenden Skill etwas Eigenes gestalten.', 'Découvrez le résultat, copiez une tâche et créez votre version avec la skill utilisée.', 'Lihat hasilnya, salin tugas, dan buat versi Anda dengan skill yang digunakan.'],
  'Explore the gallery': ['作品集を見る', '갤러리 둘러보기', 'Explorar la galería', 'Galerie entdecken', 'Explorer la galerie', 'Jelajahi galeri'],
  'See what it makes': ['作れるものを見る', '무엇을 만드는지 보기', 'Mira lo que crea', 'Ergebnisse entdecken', 'Découvrez les résultats', 'Lihat hasil karyanya'],
  'Examples you can start from': ['制作の出発点になる事例', '시작점이 되는 사례', 'Ejemplos para empezar', 'Beispiele als Ausgangspunkt', 'Des exemples pour commencer', 'Contoh untuk memulai'],
  'View all': ['すべて見る', '모두 보기', 'Ver todo', 'Alle ansehen', 'Tout voir', 'Lihat semua'],
  'Preview could not load': ['動画を読み込めませんでした', '미리보기를 불러올 수 없습니다', 'No se pudo cargar la vista previa', 'Vorschau konnte nicht geladen werden', 'Impossible de charger l’aperçu', 'Pratinjau gagal dimuat'],
  'Retry preview': ['再生を再試行', '미리보기 다시 시도', 'Reintentar vista previa', 'Vorschau erneut laden', 'Réessayer l’aperçu', 'Coba pratinjau lagi'],
  'Play preview': ['プレビューを再生', '미리보기 재생', 'Reproducir vista previa', 'Vorschau abspielen', 'Lire l’aperçu', 'Putar pratinjau'],
  'Related video skills · 5 tools': ['関連動画スキル · 5 ツール', '관련 영상 스킬 · 도구 5개', 'Skills de vídeo relacionadas · 5 herramientas', 'Passende Video-Skills · 5 Tools', 'Skills vidéo associées · 5 outils', 'Skill video terkait · 5 alat'],
  'Making a product demo or editing footage? Explore these tools and their requirements. Recommendations do not imply authorship of the examples above or platform testing; skills without a showcased output are not counted as examples.': ['製品デモや動画編集に使えるツールと条件をご覧ください。推薦は上の作品の作者であることや本站での検証を意味しません。作品のないスキルは事例数に含めません。', '제품 데모나 영상 편집 도구와 요건을 확인하세요. 추천은 위 사례의 저작자임이나 플랫폼 검증을 의미하지 않습니다. 전시 결과물이 없는 스킬은 작품 수에 포함하지 않습니다.', 'Explora herramientas para demos y edición y sus requisitos. Recomendarlas no atribuye autoría ni implica pruebas de la plataforma. Sin obra mostrada, no cuentan como ejemplos.', 'Entdecke Tools für Produktdemos und Videoschnitt samt Voraussetzungen. Empfehlungen belegen weder Urheberschaft noch Plattformtests. Skills ohne gezeigtes Ergebnis zählen nicht als Beispiele.', 'Découvrez des outils de démo et de montage et leurs prérequis. Une recommandation ne signifie ni attribution des œuvres ni test par la plateforme. Sans résultat présenté, ils ne comptent pas comme exemples.', 'Temukan alat untuk demo produk dan penyuntingan video beserta persyaratannya. Rekomendasi bukan atribusi karya di atas atau bukti pengujian platform. Skill tanpa karya tidak dihitung sebagai contoh.'],
  'View inspected source': ['確認したソースを見る', '검토한 소스 보기', 'Ver fuente inspeccionada', 'Geprüfte Quelle ansehen', 'Voir la source examinée', 'Lihat sumber yang diperiksa'],
  'Web & UI': ['Web・UI', '웹 및 UI', 'Web e interfaces', 'Web und UI', 'Web et interfaces', 'Web dan UI'],
  'Slides': ['スライド', '프레젠테이션', 'Presentaciones', 'Präsentationen', 'Présentations', 'Presentasi'],
  'Images': ['画像・デザイン', '이미지 및 디자인', 'Imágenes', 'Bilder', 'Images', 'Gambar'],
  'Video': ['動画・アニメーション', '영상 및 애니메이션', 'Vídeo', 'Video', 'Vidéo', 'Video'],
  'Documents': ['文書・ガイド', '문서 및 가이드', 'Documentos', 'Dokumente', 'Documents', 'Dokumen'],
  'Logo & identity': ['ロゴ・ブランド', '로고 및 브랜드', 'Logo e identidad', 'Logo und Identität', 'Logo et identité', 'Logo dan identitas'],
  'Product promotion': ['製品プロモーション', '제품 홍보', 'Promoción de productos', 'Produktwerbung', 'Promotion de produits', 'Promosi produk'],
  'Educational explainers': ['解説・学習', '교육 및 해설', 'Vídeos educativos', 'Wissensvermittlung', 'Explications pédagogiques', 'Penjelasan edukatif'],
  'Data storytelling': ['データで伝える', '데이터 스토리텔링', 'Narración con datos', 'Geschichten mit Daten', 'Récits de données', 'Bercerita dengan data'],
  'Open source': ['オープンソース', '오픈 소스', 'Código abierto', 'Open Source', 'Open source', 'Sumber terbuka'],
  'Free': ['無料', '무료', 'Gratis', 'Kostenlos', 'Gratuit', 'Gratis'],
  'Paid': ['有料', '유료', 'De pago', 'Kostenpflichtig', 'Payant', 'Berbayar'],
  'Free + paid': ['無料・有料プラン', '무료 및 유료', 'Gratis y de pago', 'Kostenlos und kostenpflichtig', 'Gratuit et payant', 'Gratis dan berbayar'],
  'Made here': ['本站で制作', '자체 제작', 'Creado aquí', 'Hier erstellt', 'Créé ici', 'Dibuat di sini'],
  'Author template': ['作者のテンプレート', '제작자 템플릿', 'Plantilla del autor', 'Autorenvorlage', 'Modèle de l’auteur', 'Templat pembuat'],
  'Author style study': ['作者のスタイル例', '제작자 스타일 예시', 'Estudio de estilo del autor', 'Stilstudie des Autors', 'Étude de style de l’auteur', 'Studi gaya pembuat'],
  'Author example': ['作者の事例', '제작자 사례', 'Ejemplo del autor', 'Autorenbeispiel', 'Exemple de l’auteur', 'Contoh pembuat'],
  'Original-language content': ['作品説明・プロンプトは原文の場合があります。', '작품 설명과 프롬프트는 원문으로 제공될 수 있습니다.', 'Las descripciones y los prompts pueden estar en su idioma original.', 'Beschreibungen und Prompts können in der Originalsprache vorliegen.', 'Les descriptions et prompts peuvent être dans leur langue d’origine.', 'Deskripsi karya dan prompt dapat menggunakan bahasa aslinya.'],
  'Page {page}': ['{page} ページ', '{page} 페이지', 'Página {page}', 'Seite {page}', 'Page {page}', 'Halaman {page}'],
  'Preview image {page}': ['プレビュー画像 {page}', '미리보기 이미지 {page}', 'Imagen de vista previa {page}', 'Vorschaubild {page}', 'Image d’aperçu {page}', 'Gambar pratinjau {page}'],
  '{count} selected examples · {workflows} skills & workflows': ['厳選 {count} 事例 · {workflows} スキル・ワークフロー', '엄선한 사례 {count}개 · 스킬 및 워크플로 {workflows}개', '{count} ejemplos seleccionados · {workflows} skills y flujos', '{count} ausgewählte Beispiele · {workflows} Skills und Workflows', '{count} exemples sélectionnés · {workflows} skills et workflows', '{count} contoh pilihan · {workflows} skill dan alur kerja'],
  '{count} examples': ['{count} 件の事例', '사례 {count}개', '{count} ejemplos', '{count} Beispiele', '{count} exemples', '{count} contoh'],
  'Showing {start}–{end}': ['{start}–{end} 件を表示', '{start}–{end} 표시', 'Mostrando {start}–{end}', '{start}–{end} angezeigt', 'Affichage {start}–{end}', 'Menampilkan {start}–{end}'],
  'Remove {action}': ['{action}を取り消す', '{action} 취소', 'Quitar {action}', '{action} entfernen', 'Retirer {action}', 'Batalkan {action}'],
} as const satisfies Record<string, Translations>

export type GalleryMessage = keyof typeof galleryTranslations
const extraLocales = ['ja', 'ko', 'es', 'de', 'fr', 'id'] as const
export function galleryCopy(locale: string, english: GalleryMessage, chinese: string, values: Record<string, string | number> = {}) {
  const selected = locale === 'zh' ? chinese : locale === 'en' ? english : galleryTranslations[english][extraLocales.indexOf(locale as typeof extraLocales[number])] || english
  return selected.replace(/\{(\w+)\}/g, (token, key) => values[key] === undefined ? token : String(values[key]))
}

/** Only authored translations are used. Untranslated editorial/source text is
 * retained verbatim and disclosed in the UI, not silently machine-translated. */
export function localizeEditorialText(text: { en: string; zh: string }, locale: string) {
  return Object.hasOwn(galleryTranslations, text.en)
    ? galleryCopy(locale, text.en as GalleryMessage, text.zh)
    : locale === 'zh' ? text.zh : text.en
}

export function formatGalleryNumber(value: number, locale: string) {
  return new Intl.NumberFormat(isLocale(locale) ? locale as Locale : 'en').format(value)
}

export function editorialSearchText(text: { en: string; zh: string }) {
  return [text.en, text.zh, ...(Object.hasOwn(galleryTranslations, text.en) ? galleryTranslations[text.en as GalleryMessage] : [])].join(' ')
}
