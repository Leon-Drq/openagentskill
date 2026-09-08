import type { Locale } from './config'

const en = {
  "title": "AI Agent Skills",
  "intro": "Find a skill for your next task. Explore tools for Codex, Claude Code, Cursor and more.",
  "search": "Search",
  "placeholder": "Search skills or describe a task…",
  "all": "All skills",
  "filters": "More filters",
  "reset": "Reset filters",
  "sort": "Sort by",
  "stars": "Most GitHub stars",
  "recommended": "Recommended",
  "relevance": "Relevance",
  "fresh": "Recently updated",
  "new": "New arrivals",
  "trending": "Adoption",
  "results": "Results",
  "pool": "Candidates in this shortlist, not the full registry. GitHub stars belong to repositories, not individual skills.",
  "offline": "Live data is unavailable. A saved snapshot may be shown; check the source before use.",
  "empty": "No matching skills. Try another task or reset your filters.",
  "details": "View skill",
  "compare": "Compare",
  "selected": "Selected",
  "clear": "Clear",
  "previous": "Previous",
  "next": "Next",
  "page": "Page",
  "collections": "Explore by task",
  "guides": "Guides & comparisons",
  "developers": "For developers",
  "repoStars": "GitHub repository stars",
  "snapshot": "Saved snapshot",
  "review": "Review before use",
  "blocked": "Blocked",
  "source": "View source & review",
  "category": "Category",
  "platform": "Agent / platform",
  "any": "Any",
  "quality": "Quality",
  "trust": "Trust",
  "safety": "Safety",
  "useCase": "Use case",
  "minimum": "Minimum GitHub stars",
  "remove": "Remove",
  "active": "Active filters",
  "compareNow": "Compare skills",
  "loading": "Updating results…"
}
type Copy = Record<keyof typeof en, string>
const copies: Record<Locale, Copy> = {
 en,
zh: {"title":"AI Agent Skills","intro":"为下一项任务找到合适的技能。探索适用于 Codex、Claude Code、Cursor 等 Agent 的工具。","search":"搜索","placeholder":"搜索技能或描述任务…","all":"全部技能","filters":"更多筛选","reset":"重置筛选","sort":"排序","stars":"最多 GitHub Stars","recommended":"精选推荐","relevance":"相关度","fresh":"最近更新","new":"最新收录","trending":"使用热度","results":"搜索结果","pool":"数量仅代表当前候选列表，并非全站总量。GitHub Stars 属于仓库，不代表单个技能的使用量。","offline":"实时数据暂不可用，可能展示已保存的快照；使用前请核对来源。","empty":"暂无匹配技能。请更换任务或重置筛选。","details":"查看技能","compare":"对比","selected":"已选择","clear":"清除","previous":"上一页","next":"下一页","page":"页","collections":"按任务探索","guides":"指南与对比","developers":"开发者入口","repoStars":"GitHub 仓库 Stars","snapshot":"历史快照","review":"使用前请审核","blocked":"已阻止","source":"查看来源与审核","category":"分类","platform":"Agent / 平台","any":"不限","quality":"质量","trust":"信任","safety":"安全","useCase":"用途","minimum":"最低 GitHub Stars","remove":"移除","active":"当前筛选","compareNow":"对比技能","loading":"正在更新结果…"},
ja: {"title":"AI Agent Skills","intro":"次のタスクに合うスキルを。Codex、Claude Code、Cursor などのツールを探せます。","search":"検索","placeholder":"スキルを検索、またはタスクを入力…","all":"すべて","filters":"詳細フィルター","reset":"リセット","sort":"並び順","stars":"GitHub スター数","recommended":"おすすめ","relevance":"関連度","fresh":"更新順","new":"新着順","trending":"利用状況","results":"検索結果","pool":"現在の候補一覧の件数です。全登録数ではありません。スター数は各スキルではなくリポジトリの値です。","offline":"ライブデータを取得できません。保存済みデータの場合は使用前にソースを確認してください。","empty":"該当するスキルがありません。検索やフィルターを変更してください。","details":"スキルを見る","compare":"比較","selected":"選択済み","clear":"クリア","previous":"前へ","next":"次へ","page":"ページ","collections":"タスクから探す","guides":"ガイドと比較","developers":"開発者向け","repoStars":"GitHub リポジトリのスター数","snapshot":"保存済みデータ","review":"使用前に確認","blocked":"ブロック済み","source":"ソースとレビュー","category":"カテゴリ","platform":"Agent / プラットフォーム","any":"指定なし","quality":"品質","trust":"信頼","safety":"安全性","useCase":"用途","minimum":"最低スター数","remove":"削除","active":"適用中","compareNow":"スキルを比較","loading":"更新中…"},
ko: {"title":"AI Agent Skills","intro":"다음 작업에 맞는 스킬을 찾아보세요. Codex, Claude Code, Cursor 등을 지원합니다.","search":"검색","placeholder":"스킬 검색 또는 작업 입력…","all":"전체","filters":"추가 필터","reset":"초기화","sort":"정렬","stars":"GitHub 스타순","recommended":"추천","relevance":"관련도","fresh":"최근 업데이트","new":"신규 등록","trending":"사용 현황","results":"검색 결과","pool":"현재 후보 목록의 수이며 전체 등록 수가 아닙니다. 스타는 개별 스킬이 아닌 저장소 수치입니다.","offline":"실시간 데이터를 사용할 수 없습니다. 저장된 데이터를 사용하기 전에 출처를 확인하세요.","empty":"일치하는 스킬이 없습니다. 검색어나 필터를 변경하세요.","details":"스킬 보기","compare":"비교","selected":"선택됨","clear":"지우기","previous":"이전","next":"다음","page":"페이지","collections":"작업별 탐색","guides":"가이드 및 비교","developers":"개발자용","repoStars":"GitHub 저장소 스타","snapshot":"저장된 데이터","review":"사용 전 검토","blocked":"차단됨","source":"출처 및 검토","category":"분류","platform":"Agent / 플랫폼","any":"전체","quality":"품질","trust":"신뢰","safety":"안전","useCase":"용도","minimum":"최소 스타","remove":"제거","active":"적용된 필터","compareNow":"스킬 비교","loading":"업데이트 중…"},
es: {"title":"AI Agent Skills","intro":"Encuentra una habilidad para tu próxima tarea con Codex, Claude Code, Cursor y más.","search":"Buscar","placeholder":"Busca habilidades o describe una tarea…","all":"Todas","filters":"Más filtros","reset":"Restablecer","sort":"Ordenar","stars":"Más estrellas GitHub","recommended":"Recomendadas","relevance":"Relevancia","fresh":"Actualizadas","new":"Novedades","trending":"Uso","results":"Resultados","pool":"Candidatos de esta selección, no del registro completo. Las estrellas pertenecen al repositorio, no a cada habilidad.","offline":"Datos en vivo no disponibles. Comprueba la fuente antes de usar una copia guardada.","empty":"Sin coincidencias. Cambia la búsqueda o los filtros.","details":"Ver habilidad","compare":"Comparar","selected":"Seleccionada","clear":"Limpiar","previous":"Anterior","next":"Siguiente","page":"Página","collections":"Explorar por tarea","guides":"Guías y comparativas","developers":"Para desarrolladores","repoStars":"Estrellas del repositorio GitHub","snapshot":"Copia guardada","review":"Revisar antes de usar","blocked":"Bloqueada","source":"Fuente y revisión","category":"Categoría","platform":"Agent / plataforma","any":"Cualquiera","quality":"Calidad","trust":"Confianza","safety":"Seguridad","useCase":"Uso","minimum":"Estrellas mínimas","remove":"Quitar","active":"Filtros activos","compareNow":"Comparar habilidades","loading":"Actualizando…"},
de: {"title":"AI Agent Skills","intro":"Finde den passenden Skill für deine nächste Aufgabe mit Codex, Claude Code, Cursor und mehr.","search":"Suchen","placeholder":"Skills suchen oder Aufgabe beschreiben…","all":"Alle Skills","filters":"Weitere Filter","reset":"Zurücksetzen","sort":"Sortieren","stars":"Meiste GitHub-Sterne","recommended":"Empfohlen","relevance":"Relevanz","fresh":"Zuletzt aktualisiert","new":"Neu hinzugefügt","trending":"Nutzung","results":"Ergebnisse","pool":"Kandidaten dieser Auswahl, nicht das gesamte Verzeichnis. Sterne gehören zum Repository, nicht zum einzelnen Skill.","offline":"Live-Daten nicht verfügbar. Prüfe vor der Nutzung die Quelle gespeicherter Daten.","empty":"Keine passenden Skills. Ändere die Suche oder setze die Filter zurück.","details":"Skill ansehen","compare":"Vergleichen","selected":"Ausgewählt","clear":"Leeren","previous":"Zurück","next":"Weiter","page":"Seite","collections":"Nach Aufgabe entdecken","guides":"Anleitungen & Vergleiche","developers":"Für Entwickler","repoStars":"GitHub-Repository-Sterne","snapshot":"Gespeicherter Stand","review":"Vor Nutzung prüfen","blocked":"Blockiert","source":"Quelle & Prüfung","category":"Kategorie","platform":"Agent / Plattform","any":"Alle","quality":"Qualität","trust":"Vertrauen","safety":"Sicherheit","useCase":"Anwendungsfall","minimum":"Mindestens Sterne","remove":"Entfernen","active":"Aktive Filter","compareNow":"Skills vergleichen","loading":"Wird aktualisiert…"},
fr: {"title":"AI Agent Skills","intro":"Trouvez un skill pour votre prochaine tâche avec Codex, Claude Code, Cursor et plus encore.","search":"Rechercher","placeholder":"Rechercher un skill ou décrire une tâche…","all":"Tous","filters":"Plus de filtres","reset":"Réinitialiser","sort":"Trier","stars":"Étoiles GitHub","recommended":"Recommandés","relevance":"Pertinence","fresh":"Mis à jour","new":"Nouveautés","trending":"Utilisation","results":"Résultats","pool":"Candidats de cette sélection, pas du registre entier. Les étoiles appartiennent au dépôt, pas à chaque skill.","offline":"Données en direct indisponibles. Vérifiez la source avant toute utilisation des données sauvegardées.","empty":"Aucun résultat. Modifiez la recherche ou les filtres.","details":"Voir le skill","compare":"Comparer","selected":"Sélectionné","clear":"Effacer","previous":"Précédent","next":"Suivant","page":"Page","collections":"Explorer par tâche","guides":"Guides et comparaisons","developers":"Pour les développeurs","repoStars":"Étoiles du dépôt GitHub","snapshot":"Copie sauvegardée","review":"À vérifier avant usage","blocked":"Bloqué","source":"Source et vérification","category":"Catégorie","platform":"Agent / plateforme","any":"Tous","quality":"Qualité","trust":"Confiance","safety":"Sécurité","useCase":"Usage","minimum":"Étoiles minimum","remove":"Retirer","active":"Filtres actifs","compareNow":"Comparer les skills","loading":"Mise à jour…"},
id: {"title":"AI Agent Skills","intro":"Temukan skill untuk tugas berikutnya dengan Codex, Claude Code, Cursor, dan lainnya.","search":"Cari","placeholder":"Cari skill atau jelaskan tugas…","all":"Semua skill","filters":"Filter lainnya","reset":"Atur ulang","sort":"Urutkan","stars":"Bintang GitHub terbanyak","recommended":"Rekomendasi","relevance":"Relevansi","fresh":"Baru diperbarui","new":"Baru ditambahkan","trending":"Penggunaan","results":"Hasil","pool":"Kandidat dalam daftar ini, bukan seluruh registri. Bintang adalah milik repositori, bukan skill individual.","offline":"Data langsung tidak tersedia. Periksa sumber sebelum menggunakan data tersimpan.","empty":"Tidak ada hasil. Ubah pencarian atau atur ulang filter.","details":"Lihat skill","compare":"Bandingkan","selected":"Dipilih","clear":"Hapus","previous":"Sebelumnya","next":"Berikutnya","page":"Halaman","collections":"Jelajahi menurut tugas","guides":"Panduan & perbandingan","developers":"Untuk pengembang","repoStars":"Bintang repositori GitHub","snapshot":"Data tersimpan","review":"Tinjau sebelum digunakan","blocked":"Diblokir","source":"Sumber & tinjauan","category":"Kategori","platform":"Agent / platform","any":"Semua","quality":"Kualitas","trust":"Kepercayaan","safety":"Keamanan","useCase":"Kegunaan","minimum":"Bintang minimum","remove":"Hapus","active":"Filter aktif","compareNow":"Bandingkan skill","loading":"Memperbarui…"}
}
export const directoryCopy = (locale: Locale) => copies[locale]

const terms: Record<string, readonly string[]> = {
"source-recorded": ["Skill source recorded","已记录 Skill 来源","Skill ソース記録済み","Skill 출처 기록됨","Fuente del skill registrada","Skill-Quelle erfasst","Source du skill enregistrée","Sumber skill tercatat"],
"source-needs-review": ["Source needs review","来源待复核","ソース要確認","출처 검토 필요","Fuente pendiente de revisión","Quelle prüfen","Source à vérifier","Sumber perlu ditinjau"],
"unverified": ["Skill source unconfirmed","Skill 来源未确认","Skill ソース未確認","Skill 출처 미확인","Fuente del skill sin confirmar","Skill-Quelle unbestätigt","Source du skill non confirmée","Sumber skill belum dikonfirmasi"],
  "coding-agents": [
    "Coding",
    "编程",
    "コーディング",
    "코딩",
    "Programación",
    "Programmierung",
    "Programmation",
    "Pemrograman"
  ],
  "design-creative": [
    "Design",
    "设计",
    "デザイン",
    "디자인",
    "Diseño",
    "Design",
    "Design",
    "Desain"
  ],
  "video-creation": [
    "Video",
    "视频",
    "動画",
    "영상",
    "Vídeo",
    "Video",
    "Vidéo",
    "Video"
  ],
  "research": [
    "Research",
    "科研",
    "研究",
    "연구",
    "Investigación",
    "Forschung",
    "Recherche",
    "Riset"
  ],
  "presentation": [
    "Presentations",
    "演示文稿",
    "プレゼン",
    "프레젠테이션",
    "Presentaciones",
    "Präsentationen",
    "Présentations",
    "Presentasi"
  ],
  "finance": [
    "Finance",
    "金融",
    "金融",
    "금융",
    "Finanzas",
    "Finanzen",
    "Finance",
    "Keuangan"
  ],
  "production": [
    "Production candidate",
    "生产候选",
    "本番候補",
    "프로덕션 후보",
    "Candidata a producción",
    "Produktionskandidat",
    "Candidat à la production",
    "Kandidat produksi"
  ],
  "strong": [
    "Strong",
    "较强",
    "良好",
    "양호",
    "Sólida",
    "Stark",
    "Solide",
    "Kuat"
  ],
  "excellent": [
    "Excellent",
    "优秀",
    "優秀",
    "우수",
    "Excelente",
    "Ausgezeichnet",
    "Excellent",
    "Unggul"
  ],
  "promising": [
    "Promising",
    "有潜力",
    "有望",
    "유망",
    "Prometedora",
    "Vielversprechend",
    "Prometteur",
    "Menjanjikan"
  ],
  "review": [
    "Manual review",
    "人工审核",
    "手動確認",
    "수동 검토",
    "Revisión manual",
    "Manuelle Prüfung",
    "Vérification manuelle",
    "Tinjauan manual"
  ],
  "risk": [
    "High review required",
    "需重点审核",
    "詳細確認が必要",
    "상세 검토 필요",
    "Revisión exhaustiva",
    "Gründlich prüfen",
    "Vérification approfondie",
    "Perlu tinjauan mendalam"
  ],
  "verified": [
    "Verified",
    "已验证",
    "確認済み",
    "확인됨",
    "Verificada",
    "Verifiziert",
    "Vérifié",
    "Terverifikasi"
  ],
  "reviewed": [
    "Reviewed",
    "已审核",
    "審査済み",
    "검토됨",
    "Revisada",
    "Geprüft",
    "Examiné",
    "Ditinjau"
  ],
  "experimental": [
    "Experimental",
    "实验性",
    "実験的",
    "실험적",
    "Experimental",
    "Experimentell",
    "Expérimental",
    "Eksperimental"
  ],
  "blocked": [
    "Blocked",
    "已阻止",
    "ブロック済み",
    "차단됨",
    "Bloqueada",
    "Blockiert",
    "Bloqué",
    "Diblokir"
  ]
}
export function directoryLabel(locale: Locale, value: string) {
  const index = ['en','zh','ja','ko','es','de','fr','id'].indexOf(locale)
  return terms[value]?.[index] || value.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
