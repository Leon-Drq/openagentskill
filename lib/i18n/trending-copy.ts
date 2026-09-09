import type { Locale } from './config'

const en = {
  title: 'Trending Skills', eyebrow: 'On-site activity · updated daily',
  intro: 'Discover skills attracting attention on OpenAgentSkill. Ranked over seven completed UTC days, not by lifetime GitHub stars.',
  period: 'Activity window (UTC)', updated: 'Snapshot updated', interactions: 'Interactions / 7 days',
  activeDays: 'Active days', evidence: 'Why it ranks', views: 'Page views', copies: 'Command copies', compares: 'Comparisons', saves: 'Saves', clicks: 'Repository clicks',
  notice: 'Interactions are not unique users. Copies are not confirmed installs. GitHub stars belong to the source repository.',
  method: 'How this ranking works', methodology: 'Views, copies, comparisons, saves and repository clicks are capped per skill per UTC day, weighted by recency and dampened logarithmically. Activity across multiple days adds weight. Only public skills active in this window qualify. Stars and lifetime activity do not determine rank. Inclusion is not a safety or runtime certification.',
  stale: 'An older snapshot is shown. A new ranking is not available yet; check the activity window below.',
  unavailable: 'The ranking is temporarily unavailable. Browse the directory or return after the next update.',
  empty: 'No qualifying activity in this window. Discover more skills in the directory.',
  noMatch: 'No skills in this snapshot match this category.', allCategories: 'All categories', apply: 'Apply',
  stars: 'GitHub stars', newest: 'New arrivals', rankings: 'All rankings', related: 'Keep exploring', hot: 'Freshness shortlist', official: 'Technology makers', audits: 'Skill audits', agents: 'Browse by agent',
}
type Copy = Record<keyof typeof en, string>
const copies: Record<Locale, Copy> = {
  en,
  zh: {
    title: '热门趋势', eyebrow: '站内热度 · 每日更新', intro: '发现 OpenAgentSkill 上受到关注的技能。按最近 7 个完整 UTC 日的互动排名，不是 GitHub 累计 Star 榜。',
    period: '统计区间（UTC）', updated: '快照更新时间', interactions: '近 7 日互动', activeDays: '活跃天数', evidence: '上榜依据', views: '页面浏览', copies: '命令复制', compares: '技能比较', saves: '收藏', clicks: '仓库点击',
    notice: '互动次数不等于独立用户数；命令复制不等于安装成功。GitHub Star 数属于源仓库。', method: '榜单如何排名', methodology: '按技能、按 UTC 日对浏览、命令复制、比较、收藏和仓库点击分别设上限，结合时间衰减、对数加权及活跃天数排名。仅纳入区间内有互动的公开技能，不以累计 Star 或历史互动补位。上榜不代表安全认证或运行验证。',
    stale: '当前显示较早保存的快照。新榜单尚未更新，请留意下方统计区间。', unavailable: '当前榜单暂时不可用。可先浏览技能目录，或在下次更新后返回。', empty: '此区间暂无符合条件的互动记录。可前往技能目录继续发现。', noMatch: '此快照中没有符合该分类的技能。', allCategories: '全部分类', apply: '筛选', stars: 'GitHub Stars', newest: '最新收录', rankings: '全部榜单', related: '继续探索', hot: '近期活跃与更新', official: '技术厂商', audits: '技能审核', agents: '按 Agent 浏览',
  },
  ja: {
    title: '注目のスキル', eyebrow: 'サイト内の関心度 · 毎日更新', intro: 'OpenAgentSkill で注目されるスキル。直近の完了した UTC 7 日間の操作に基づく順位で、GitHub の累計スター順ではありません。',
    period: '集計期間（UTC）', updated: 'スナップショット更新', interactions: '7 日間の操作数', activeDays: 'アクティブ日数', evidence: '順位の根拠', views: 'ページ閲覧', copies: 'コマンドのコピー', compares: '比較', saves: '保存', clicks: 'リポジトリへのクリック',
    notice: '操作数はユーザー数ではありません。コピーはインストール成功を意味しません。スターは元のリポジトリの値です。', method: 'ランキングの仕組み', methodology: '閲覧、コピー、比較、保存、クリックにスキル別・UTC 日別の上限を設け、時間減衰、対数加重、活動日数で順位を決めます。期間内に活動がある公開スキルのみ対象です。累計スターや過去の活動で補完しません。掲載は安全性や動作の認証ではありません。',
    stale: '以前のスナップショットです。新しい順位はまだありません。集計期間をご確認ください。', unavailable: 'ランキングを取得できません。一覧を見るか、次回更新後に再度お試しください。', empty: 'この期間に対象の活動はありません。スキル一覧から探せます。', noMatch: 'このカテゴリのスキルはありません。', allCategories: 'すべてのカテゴリ', apply: '適用', stars: 'GitHub スター', newest: '新着', rankings: '全ランキング', related: 'さらに探す', hot: '最近の活動と更新', official: '技術提供者', audits: 'スキル監査', agents: 'Agent 別に探す',
  },
  ko: {
    title: '인기 급상승 스킬', eyebrow: '사이트 내 관심도 · 매일 업데이트', intro: 'OpenAgentSkill에서 관심을 받는 스킬입니다. GitHub 누적 스타가 아닌 최근 완료된 UTC 7일간의 활동 순위입니다.',
    period: '집계 기간 (UTC)', updated: '스냅샷 업데이트', interactions: '7일간 상호작용', activeDays: '활동 일수', evidence: '순위 근거', views: '페이지 조회', copies: '명령 복사', compares: '비교', saves: '저장', clicks: '저장소 클릭',
    notice: '상호작용 수는 고유 사용자 수가 아닙니다. 복사는 설치 성공이 아닙니다. 스타는 원본 저장소 기준입니다.', method: '순위 산정 방식', methodology: '조회, 복사, 비교, 저장, 클릭에 스킬별 UTC 일일 상한을 적용하고 최근 활동, 로그 가중치와 활동 일수로 순위를 정합니다. 기간 내 활동이 있는 공개 스킬만 포함합니다. 누적 스타나 과거 활동으로 채우지 않습니다. 등재는 안전성이나 실행 인증이 아닙니다.',
    stale: '이전 스냅샷입니다. 새 순위가 아직 없습니다. 집계 기간을 확인하세요.', unavailable: '현재 순위를 불러올 수 없습니다. 목록을 보거나 다음 업데이트 후 확인하세요.', empty: '이 기간에 해당하는 활동이 없습니다. 목록에서 더 찾아보세요.', noMatch: '해당 카테고리의 스킬이 없습니다.', allCategories: '전체 카테고리', apply: '적용', stars: 'GitHub 스타', newest: '신규 등록', rankings: '전체 순위', related: '계속 탐색', hot: '최근 활동과 업데이트', official: '기술 제작사', audits: '스킬 감사', agents: 'Agent별 탐색',
  },
  es: {
    title: 'Skills en tendencia', eyebrow: 'Actividad en el sitio · actualización diaria', intro: 'Descubre qué skills atraen atención en OpenAgentSkill. El ranking cubre siete días UTC completos, no las estrellas GitHub acumuladas.',
    period: 'Periodo (UTC)', updated: 'Instantánea actualizada', interactions: 'Interacciones / 7 días', activeDays: 'Días activos', evidence: 'Motivo de la posición', views: 'Vistas', copies: 'Copias del comando', compares: 'Comparaciones', saves: 'Guardados', clicks: 'Clics al repositorio',
    notice: 'Las interacciones no son usuarios únicos. Copiar no confirma una instalación. Las estrellas pertenecen al repositorio.', method: 'Cómo se calcula el ranking', methodology: 'Limitamos vistas, copias, comparaciones, guardados y clics por skill y día UTC. Ponderamos por antigüedad, escala logarítmica y días activos. Solo participan skills públicos activos en el periodo. No rellenamos con estrellas acumuladas ni actividad histórica. La inclusión no certifica seguridad ni ejecución.',
    stale: 'Se muestra una instantánea anterior. El nuevo ranking no está disponible; comprueba el periodo.', unavailable: 'Ranking temporalmente no disponible. Explora el directorio o vuelve tras la próxima actualización.', empty: 'Sin actividad válida en este periodo. Explora el directorio.', noMatch: 'No hay skills de esta categoría en la instantánea.', allCategories: 'Todas las categorías', apply: 'Aplicar', stars: 'Estrellas GitHub', newest: 'Novedades', rankings: 'Todos los rankings', related: 'Sigue explorando', hot: 'Actividad y actualizaciones', official: 'Creadores de tecnología', audits: 'Auditorías', agents: 'Explorar por agente',
  },
  de: {
    title: 'Skills im Trend', eyebrow: 'Aktivität auf der Website · täglich aktualisiert', intro: 'Entdecke Skills, die auf OpenAgentSkill Aufmerksamkeit erhalten. Die Rangliste nutzt sieben abgeschlossene UTC-Tage, nicht die gesamten GitHub-Sterne.',
    period: 'Zeitraum (UTC)', updated: 'Snapshot aktualisiert', interactions: 'Interaktionen / 7 Tage', activeDays: 'Aktive Tage', evidence: 'Grund der Platzierung', views: 'Seitenaufrufe', copies: 'Befehlskopien', compares: 'Vergleiche', saves: 'Gespeichert', clicks: 'Repository-Klicks',
    notice: 'Interaktionen sind keine einzelnen Nutzer. Kopien bestätigen keine Installation. Sterne gehören zum Quell-Repository.', method: 'So entsteht die Rangliste', methodology: 'Aufrufe, Kopien, Vergleiche, gespeicherte Einträge und Klicks werden pro Skill und UTC-Tag begrenzt. Aktualität, logarithmische Gewichtung und aktive Tage bestimmen den Rang. Nur öffentliche Skills mit Aktivität im Zeitraum zählen. Gesamte Sterne und historische Aktivität dienen nicht als Ersatz. Die Aufnahme ist kein Sicherheits- oder Laufzeitnachweis.',
    stale: 'Ein älterer Snapshot wird angezeigt. Es gibt noch keine neue Rangliste; bitte den Zeitraum beachten.', unavailable: 'Rangliste vorübergehend nicht verfügbar. Öffne das Verzeichnis oder komme nach dem nächsten Update zurück.', empty: 'Keine passende Aktivität in diesem Zeitraum. Entdecke weitere Skills im Verzeichnis.', noMatch: 'Keine Skills dieser Kategorie im Snapshot.', allCategories: 'Alle Kategorien', apply: 'Anwenden', stars: 'GitHub-Sterne', newest: 'Neu aufgenommen', rankings: 'Alle Ranglisten', related: 'Weiter entdecken', hot: 'Aktivität und Updates', official: 'Technologieanbieter', audits: 'Skill-Prüfungen', agents: 'Nach Agent suchen',
  },
  fr: {
    title: 'Skills en tendance', eyebrow: 'Activité sur le site · mise à jour quotidienne', intro: 'Découvrez les skills qui attirent l’attention sur OpenAgentSkill. Le classement couvre sept jours UTC complets, et non les étoiles GitHub cumulées.',
    period: 'Période (UTC)', updated: 'Instantané mis à jour', interactions: 'Interactions / 7 jours', activeDays: 'Jours actifs', evidence: 'Pourquoi ce classement', views: 'Pages vues', copies: 'Copies de commande', compares: 'Comparaisons', saves: 'Enregistrements', clicks: 'Clics vers le dépôt',
    notice: 'Les interactions ne sont pas des utilisateurs uniques. Une copie ne confirme pas une installation. Les étoiles appartiennent au dépôt source.', method: 'Méthode de classement', methodology: 'Vues, copies, comparaisons, enregistrements et clics sont plafonnés par skill et jour UTC, puis pondérés par récence, échelle logarithmique et jours actifs. Seuls les skills publics actifs dans cette période comptent. Aucun remplacement par les étoiles cumulées ou l’activité historique. La présence ne certifie ni sécurité ni fonctionnement.',
    stale: 'Un ancien instantané est affiché. Le nouveau classement n’est pas disponible ; vérifiez la période.', unavailable: 'Classement temporairement indisponible. Consultez le répertoire ou revenez après la prochaine mise à jour.', empty: 'Aucune activité admissible durant cette période. Explorez le répertoire.', noMatch: 'Aucun skill de cette catégorie dans l’instantané.', allCategories: 'Toutes les catégories', apply: 'Appliquer', stars: 'Étoiles GitHub', newest: 'Nouveautés', rankings: 'Tous les classements', related: 'Continuer à explorer', hot: 'Activité et mises à jour', official: 'Créateurs de technologies', audits: 'Audits de skills', agents: 'Explorer par agent',
  },
  id: {
    title: 'Skill yang sedang tren', eyebrow: 'Aktivitas di situs · diperbarui setiap hari', intro: 'Temukan skill yang menarik perhatian di OpenAgentSkill. Peringkat berdasarkan tujuh hari UTC penuh terakhir, bukan total bintang GitHub.',
    period: 'Periode (UTC)', updated: 'Snapshot diperbarui', interactions: 'Interaksi / 7 hari', activeDays: 'Hari aktif', evidence: 'Dasar peringkat', views: 'Tampilan halaman', copies: 'Salinan perintah', compares: 'Perbandingan', saves: 'Disimpan', clicks: 'Klik repositori',
    notice: 'Interaksi bukan jumlah pengguna unik. Salinan bukan bukti instalasi berhasil. Bintang adalah milik repositori sumber.', method: 'Cara peringkat dihitung', methodology: 'Tampilan, salinan, perbandingan, simpan, dan klik dibatasi per skill per hari UTC, lalu diberi bobot berdasarkan kebaruan, skala logaritmik dan hari aktif. Hanya skill publik aktif dalam periode ini yang masuk. Total bintang dan aktivitas lama tidak menjadi pengganti. Masuk daftar bukan sertifikasi keamanan atau eksekusi.',
    stale: 'Snapshot lama ditampilkan. Peringkat baru belum tersedia; perhatikan periode aktivitas.', unavailable: 'Peringkat sementara tidak tersedia. Buka direktori atau kembali setelah pembaruan berikutnya.', empty: 'Tidak ada aktivitas yang memenuhi syarat. Jelajahi direktori skill.', noMatch: 'Tidak ada skill kategori ini dalam snapshot.', allCategories: 'Semua kategori', apply: 'Terapkan', stars: 'Bintang GitHub', newest: 'Baru ditambahkan', rankings: 'Semua peringkat', related: 'Jelajahi lebih lanjut', hot: 'Aktivitas dan pembaruan', official: 'Pembuat teknologi', audits: 'Audit skill', agents: 'Jelajahi menurut agent',
  },
}
export function trendingCopy(locale: Locale): Copy { return copies[locale] }
