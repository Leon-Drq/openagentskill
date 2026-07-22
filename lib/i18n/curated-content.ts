import type { SkillStackDefinition } from '@/lib/collections'
import { defaultLocale, type Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationContent } from '@/lib/i18n/localized-navigation-pages'
import { isMarketLocale, type MarketLocale } from '@/lib/i18n/market-routing'
import type { SkillPackDefinition } from '@/lib/skill-packs'

type LocalizedStep = {
  title: string
  description: string
}

type CuratedPageCopy = {
  packBreadcrumb: string
  collectionBreadcrumb: string
  packEyebrow: string
  collectionEyebrow: string
  selectedSkills: string
  installOrder: string
  topAdoption: string
  executionOrder: string
  packWorkflowTitle: string
  goodFit: string
  reviewFirstWhen: string
  agentInstallPlan: string
  agentInstallTitle: string
  agentInstallDescription: string
  openTextPlan: string
  reviewChecklist: string
  outcomeEndpoint: string
  recommendedSkills: string
  recommendedTitle: string
  openPackApi: string
  sourceDescription: string
  quality: string
  trust: string
  audit: string
  stars: string
  unknownLicense: string
  install: string
  skillPage: string
  auditReport: string
  compareRecommendedSkills: string
  browseMatchingSkills: string
  expectedOutcome: string
  workflowMap: string
  followSequence: string
  suggestedCapabilities: string
  chooseSkills: string
  chooseSkillsDescription: string
  compare: string
  notRightWhen: string
  needPack: string
  needPackDescription: string
  browsePacks: string
  packPersona: (title: string) => string
  packBestFor: (title: string) => string[]
  packAvoidWhen: string[]
  collectionPersona: (title: string) => string
  collectionOutcomes: (title: string) => string[]
  collectionIdealFor: (title: string) => string[]
  collectionAvoidWhen: string[]
  packSteps: LocalizedStep[]
  collectionSteps: LocalizedStep[]
}

type LocalizedCuratedContent = {
  shortTitle: string
  title: string
  description: string
}

const packReviewChecklists: Record<Locale, string[]> = {
  en: [
    'Open the audit URL for every selected skill before installation.',
    'Install only inside a sandbox, local branch, or disposable workspace first.',
    'Review license, recent repository activity, README/SKILL.md completeness, and dependency surface.',
    'Run one narrow task before using the pack in production workflows.',
    'Report success, setup friction, risk blocks, or low-quality output to the outcome endpoint.',
  ],
  zh: [
    '安装前，先打开每个入选技能的审计链接。',
    '优先在沙箱、本地分支或可随时丢弃的工作区安装。',
    '检查许可证、近期仓库活跃度、README/SKILL.md 完整度和依赖范围。',
    '用于生产工作流前，先完成一个范围明确的小任务。',
    '将成功、配置阻碍、风险拦截或低质量输出回传至结果端点。',
  ],
  ja: [
    'インストール前に、選定した各 Skill の監査 URL を開いてください。',
    'まずはサンドボックス、ローカルブランチ、または破棄可能なワークスペース内でインストールします。',
    'ライセンス、最近のリポジトリ活動、README/SKILL.md の完全性、依存関係の範囲を確認します。',
    '本番ワークフローで使う前に、範囲の狭いタスクを一つ実行します。',
    '成功、設定上の摩擦、リスクによる停止、低品質な出力を結果エンドポイントに報告します。',
  ],
  ko: [
    '설치 전에 선택한 각 Skill의 감사 URL을 여세요.',
    '먼저 샌드박스, 로컬 브랜치 또는 폐기 가능한 작업 공간에서만 설치하세요.',
    '라이선스, 최근 저장소 활동, README/SKILL.md 완성도와 의존성 범위를 검토하세요.',
    '운영 워크플로에 사용하기 전에 범위가 좁은 작업 하나를 실행하세요.',
    '성공, 설정 마찰, 위험 차단 또는 낮은 품질의 결과를 결과 엔드포인트로 보고하세요.',
  ],
  es: [
    'Abre la URL de auditoría de cada skill seleccionada antes de instalarla.',
    'Instala primero solo en un sandbox, rama local o espacio de trabajo desechable.',
    'Revisa licencia, actividad reciente, completitud de README/SKILL.md y superficie de dependencias.',
    'Ejecuta una tarea acotada antes de usar el pack en producción.',
    'Informa éxitos, fricción de configuración, bloqueos de riesgo o resultados de baja calidad al endpoint.',
  ],
  de: [
    'Öffne vor der Installation die Audit-URL jedes ausgewählten Skills.',
    'Installiere zuerst nur in einer Sandbox, einem lokalen Branch oder einem wegwerfbaren Arbeitsbereich.',
    'Prüfe Lizenz, aktuelle Repository-Aktivität, README/SKILL.md-Vollständigkeit und Abhängigkeitsumfang.',
    'Führe eine klar abgegrenzte Aufgabe aus, bevor du das Paket produktiv nutzt.',
    'Melde Erfolg, Einrichtungsprobleme, Risikoblockaden oder mangelhafte Ergebnisse an den Ergebnis-Endpunkt.',
  ],
  fr: [
    'Ouvrez l’URL d’audit de chaque skill sélectionnée avant installation.',
    'Installez d’abord uniquement dans un bac à sable, une branche locale ou un espace de travail jetable.',
    'Vérifiez la licence, l’activité récente, la complétude de README/SKILL.md et la surface de dépendances.',
    'Exécutez une tâche limitée avant d’utiliser le pack en production.',
    'Signalez succès, difficulté de configuration, blocage de risque ou résultat faible à l’endpoint de résultat.',
  ],
  id: [
    'Buka URL audit untuk setiap skill terpilih sebelum memasangnya.',
    'Pasang terlebih dahulu hanya di sandbox, branch lokal, atau ruang kerja yang dapat dibuang.',
    'Tinjau lisensi, aktivitas repositori terbaru, kelengkapan README/SKILL.md, dan cakupan dependensi.',
    'Jalankan satu tugas yang sempit sebelum menggunakan pack dalam alur kerja produksi.',
    'Laporkan keberhasilan, hambatan penyiapan, blokir risiko, atau hasil berkualitas rendah ke endpoint hasil.',
  ],
}

const auditRiskLabels: Record<Locale, { safe: string; review: string; risky: string }> = {
  en: { safe: 'Safe to try', review: 'Needs review', risky: 'Risky' },
  zh: { safe: '可先试用', review: '需要审查', risky: '风险较高' },
  ja: { safe: '試用可能', review: '要レビュー', risky: '高リスク' },
  ko: { safe: '시도 가능', review: '검토 필요', risky: '위험 높음' },
  es: { safe: 'Seguro para probar', review: 'Requiere revisión', risky: 'Riesgoso' },
  de: { safe: 'Sicher testbar', review: 'Prüfung nötig', risky: 'Riskant' },
  fr: { safe: 'Peut être testé', review: 'À vérifier', risky: 'Risqué' },
  id: { safe: 'Aman untuk dicoba', review: 'Perlu ditinjau', risky: 'Berisiko' },
}

const englishCopy: CuratedPageCopy = {
  packBreadcrumb: 'Installable skill packs',
  collectionBreadcrumb: 'Workflow recipes',
  packEyebrow: 'Installable pack',
  collectionEyebrow: 'Workflow recipe',
  selectedSkills: 'Selected skills',
  installOrder: 'Install order',
  topAdoption: 'Top adoption',
  executionOrder: 'Execution order',
  packWorkflowTitle: 'How an agent should use this pack',
  goodFit: 'Good fit',
  reviewFirstWhen: 'Review first when',
  agentInstallPlan: 'Agent install plan',
  agentInstallTitle: 'A machine-readable plan agents can execute.',
  agentInstallDescription: 'The pack API returns install order, audit URLs, review checks, and an outcome feedback contract. Use this page for context, then call the API for the exact JSON plan.',
  openTextPlan: 'Open text plan',
  reviewChecklist: 'Review checklist',
  outcomeEndpoint: 'Outcome endpoint',
  recommendedSkills: 'Recommended skills',
  recommendedTitle: 'Installable shortlist for this pack',
  openPackApi: 'Open pack API',
  sourceDescription: 'Repository description',
  quality: 'Quality',
  trust: 'Trust',
  audit: 'Audit',
  stars: 'stars',
  unknownLicense: 'Unknown license',
  install: 'Install',
  skillPage: 'Skill page',
  auditReport: 'Audit report',
  compareRecommendedSkills: 'Compare recommended skills',
  browseMatchingSkills: 'Browse matching skills',
  expectedOutcome: 'Expected outcome',
  workflowMap: 'Workflow map',
  followSequence: 'Follow this sequence',
  suggestedCapabilities: 'Suggested capabilities',
  chooseSkills: 'Choose skills for each step',
  chooseSkillsDescription: 'Ranked by relevance to this workflow, quality, GitHub adoption, and maintenance freshness. This is a decision guide, not a single install command.',
  compare: 'Compare',
  notRightWhen: 'Not the right route when',
  needPack: 'Need a runnable bundle?',
  needPackDescription: 'Skill packs include an install order, audit links, and a machine-readable Agent plan.',
  browsePacks: 'Browse packs',
  packPersona: (title) => `A curated, reviewable starting point for the ${title.toLowerCase()} workflow.`,
  packBestFor: (title) => [`${title} workflows`, 'Choosing skills with public audit signals', 'Testing a shortlist in a controlled workspace'],
  packAvoidWhen: ['The task requires unreviewed access to sensitive data or production credentials', 'No one can review source code, permissions, or output before use'],
  collectionPersona: (title) => `A reviewable workflow for teams using agents in ${title.toLowerCase()} work.`,
  collectionOutcomes: (title) => [`Clarify the ${title.toLowerCase()} task`, 'Choose matching capabilities', 'Verify evidence before the next step'],
  collectionIdealFor: (title) => [`${title} workflows`, 'Auditable agent decisions', 'Controlled workspace trials'],
  collectionAvoidWhen: ['The task needs unsupervised access to sensitive systems', 'Source material or result quality cannot be reviewed'],
  packSteps: [
    { title: 'Define', description: 'Clarify the job, constraints, and evidence the agent needs before choosing an install.' },
    { title: 'Select', description: 'Choose a narrow set of skills with useful quality, trust, and maintenance signals.' },
    { title: 'Run safely', description: 'Install only the required files in a controlled workspace and review permissions first.' },
    { title: 'Verify', description: 'Check the output, record the outcome, and keep a human approval point for material risk.' },
  ],
  collectionSteps: [
    { title: 'Frame', description: 'Turn the requested outcome into a clear, reviewable agent task.' },
    { title: 'Choose', description: 'Select capabilities that fit the current stage rather than a broad category.' },
    { title: 'Execute', description: 'Run the smallest useful step with sources, permissions, and scope checked.' },
    { title: 'Validate', description: 'Review evidence and results before moving to the next stage.' },
  ],
}

const localizedCopy: Record<MarketLocale, CuratedPageCopy> = {
  zh: {
    ...englishCopy,
    packBreadcrumb: '可安装技能包', collectionBreadcrumb: '工作流方案', packEyebrow: '可安装技能包', collectionEyebrow: '工作流方案', selectedSkills: '入选技能', installOrder: '安装顺序', topAdoption: '最高采用度', executionOrder: '执行顺序', packWorkflowTitle: 'Agent 如何使用这个技能包', goodFit: '适用场景', reviewFirstWhen: '以下情况请先审查', agentInstallPlan: 'Agent 安装计划', agentInstallTitle: '可由 Agent 执行的机器可读计划。', agentInstallDescription: 'Pack API 返回安装顺序、审计链接、审查清单和结果回传约定。先用本页了解上下文，再调用 API 获取精确 JSON 计划。', openTextPlan: '打开文本计划', reviewChecklist: '审查清单', outcomeEndpoint: '结果回传端点', recommendedSkills: '推荐技能', recommendedTitle: '这个技能包的可安装精选', openPackApi: '打开 Pack API', sourceDescription: '源仓库说明（原文）', quality: '质量', trust: '信任', audit: '审计', stars: 'Stars', unknownLicense: '许可证未知', install: '安装', skillPage: '技能页面', auditReport: '审计报告', compareRecommendedSkills: '对比推荐技能', browseMatchingSkills: '浏览匹配技能', expectedOutcome: '预期结果', workflowMap: '工作流地图', followSequence: '按此顺序执行', suggestedCapabilities: '推荐能力', chooseSkills: '为每个步骤选择技能', chooseSkillsDescription: '按当前工作流相关性、质量、GitHub 采用度与维护活跃度排序。这是决策指南，不是单一安装命令。', compare: '对比', notRightWhen: '以下情况不适合使用', needPack: '需要可直接执行的技能包？', needPackDescription: '技能包包含安装顺序、审计链接和机器可读的 Agent 计划。', browsePacks: '浏览技能包',
    packPersona: (title) => `为「${title}」准备的可审计起点：先明确任务，再选择最少且合适的技能。`,
    packBestFor: (title) => [`${title} 工作流`, '需要质量、信任和审计信号的技能选择', '可在受控工作区先行验证的任务'],
    packAvoidWhen: ['任务需要未经审查地访问敏感数据或生产凭据', '无人能够审查源码、权限或输出结果'],
    collectionPersona: (title) => `为「${title}」设计的可审查 Agent 工作流。`,
    collectionOutcomes: (title) => [`明确「${title}」的目标`, '选择匹配的能力', '在进入下一步前核验结果'],
    collectionIdealFor: (title) => [`${title} 工作流`, '需要留存审计依据的 Agent 决策', '可控工作区内的试运行'],
    collectionAvoidWhen: ['任务需要无人监督地访问敏感系统', '无法审查来源材料或结果质量'],
    packSteps: [
      { title: '明确目标', description: '在选择安装方案前，先明确任务、约束条件和所需证据。' },
      { title: '选择技能', description: '只挑选质量、信任和维护信号都足够清晰的少量技能。' },
      { title: '受控执行', description: '仅在受控工作区安装必要文件，并先审查权限和外部访问。' },
      { title: '验证结果', description: '检查输出、回传结果，并在高风险环节保留人工确认。' },
    ],
    collectionSteps: [
      { title: '界定任务', description: '将目标转成清晰、可审查的 Agent 任务。' },
      { title: '选择能力', description: '为当前阶段选择最匹配的能力，而不是浏览泛化目录。' },
      { title: '执行并检查', description: '在来源、权限和范围已核对的前提下完成最小有效步骤。' },
      { title: '核验结论', description: '在进入下一阶段前审查证据和结果。' },
    ],
  },
  ja: {
    ...englishCopy,
    packBreadcrumb: 'インストール可能な Skill Pack', collectionBreadcrumb: 'ワークフローガイド', packEyebrow: 'インストール可能な Skill Pack', collectionEyebrow: 'ワークフローガイド', selectedSkills: '選定 Skill', installOrder: 'インストール順', topAdoption: '採用シグナル', executionOrder: '実行順', packWorkflowTitle: 'Agent による Pack の使い方', goodFit: '適した用途', reviewFirstWhen: '先に確認する場合', agentInstallPlan: 'Agent インストール計画', agentInstallTitle: 'Agent が実行できる機械可読の計画。', agentInstallDescription: 'Pack API はインストール順、監査 URL、レビュー項目、結果報告契約を返します。まずこのページで文脈を把握し、正確な JSON 計画は API から取得してください。', openTextPlan: 'テキスト計画を開く', reviewChecklist: 'レビュー項目', outcomeEndpoint: '結果エンドポイント', recommendedSkills: '推奨 Skill', recommendedTitle: 'この Pack のインストール候補', openPackApi: 'Pack API を開く', sourceDescription: 'リポジトリ説明（原文）', quality: '品質', trust: '信頼', audit: '監査', stars: 'Stars', unknownLicense: 'ライセンス不明', install: 'インストール', skillPage: 'Skill ページ', auditReport: '監査レポート', compareRecommendedSkills: '推奨 Skill を比較', browseMatchingSkills: '一致する Skill を見る', expectedOutcome: '期待する結果', workflowMap: 'ワークフローマップ', followSequence: 'この順序で進める', suggestedCapabilities: '推奨能力', chooseSkills: '各ステップの Skill を選ぶ', chooseSkillsDescription: 'このワークフローへの適合性、品質、GitHub の採用、保守の新しさで順位付けしています。単一のインストール命令ではなく判断ガイドです。', compare: '比較', notRightWhen: '適さない場合', needPack: '実行可能な Pack が必要ですか？', needPackDescription: 'Skill Pack にはインストール順、監査リンク、機械可読な Agent 計画が含まれます。', browsePacks: 'Pack を見る',
    packPersona: (title) => `「${title}」のための、監査可能な出発点です。`, packBestFor: (title) => [`${title} のワークフロー`, '品質・信頼・監査シグナルを確認した選定', '管理されたワークスペースでの試行'], packAvoidWhen: ['機密データや本番認証情報への未確認アクセスが必要な場合', 'ソース、権限、出力をレビューできない場合'], collectionPersona: (title) => `「${title}」向けの、レビュー可能な Agent ワークフローです。`, collectionOutcomes: (title) => [`「${title}」の目的を明確化`, '適切な能力を選択', '次の段階の前に結果を検証'], collectionIdealFor: (title) => [`${title} のワークフロー`, '監査可能な Agent の判断', '管理されたワークスペースでの試行'], collectionAvoidWhen: ['機密システムへ無監督でアクセスする必要がある場合', '資料や出力品質を確認できない場合'],
    packSteps: [{ title: '目的を定義', description: 'インストール前に仕事、制約、必要な根拠を明確にします。' }, { title: 'Skill を選択', description: '品質、信頼、保守シグナルが明確な少数の Skill を選びます。' }, { title: '安全に実行', description: '管理されたワークスペースで必要なファイルだけを使い、権限を先に確認します。' }, { title: '結果を検証', description: '出力と結果を確認し、リスクの高い箇所には人の承認を残します。' }],
    collectionSteps: [{ title: 'タスクを整理', description: '要求を明確でレビュー可能な Agent タスクにします。' }, { title: '能力を選択', description: '広いカテゴリではなく現在の段階に合う能力を選びます。' }, { title: '実行と確認', description: 'ソース、権限、範囲を確認してから最小限の有効な作業を実行します。' }, { title: '結論を検証', description: '次の段階に進む前に根拠と結果を確認します。' }],
  },
  ko: {
    ...englishCopy,
    packBreadcrumb: '설치 가능한 Skill Pack', collectionBreadcrumb: '워크플로 가이드', packEyebrow: '설치 가능한 Skill Pack', collectionEyebrow: '워크플로 가이드', selectedSkills: '선정 Skill', installOrder: '설치 순서', topAdoption: '도입 신호', executionOrder: '실행 순서', packWorkflowTitle: 'Agent가 이 Pack을 사용하는 방법', goodFit: '적합한 경우', reviewFirstWhen: '먼저 검토할 경우', agentInstallPlan: 'Agent 설치 계획', agentInstallTitle: 'Agent가 실행할 수 있는 기계 판독 계획입니다.', agentInstallDescription: 'Pack API는 설치 순서, 감사 URL, 검토 항목, 결과 보고 규약을 반환합니다. 먼저 이 페이지에서 맥락을 확인하고 정확한 JSON 계획은 API로 가져오세요.', openTextPlan: '텍스트 계획 열기', reviewChecklist: '검토 항목', outcomeEndpoint: '결과 엔드포인트', recommendedSkills: '추천 Skill', recommendedTitle: '이 Pack의 설치 후보', openPackApi: 'Pack API 열기', sourceDescription: '저장소 설명(원문)', quality: '품질', trust: '신뢰', audit: '감사', stars: 'Stars', unknownLicense: '라이선스 알 수 없음', install: '설치', skillPage: 'Skill 페이지', auditReport: '감사 보고서', compareRecommendedSkills: '추천 Skill 비교', browseMatchingSkills: '일치하는 Skill 보기', expectedOutcome: '기대 결과', workflowMap: '워크플로 맵', followSequence: '이 순서로 진행', suggestedCapabilities: '추천 기능', chooseSkills: '단계별 Skill 선택', chooseSkillsDescription: '이 워크플로 적합성, 품질, GitHub 도입, 유지관리 최신성을 기준으로 정렬합니다. 단일 설치 명령이 아닌 판단 가이드입니다.', compare: '비교', notRightWhen: '적합하지 않은 경우', needPack: '실행 가능한 Pack이 필요하신가요?', needPackDescription: 'Skill Pack에는 설치 순서, 감사 링크, 기계 판독 Agent 계획이 포함됩니다.', browsePacks: 'Pack 보기',
    packPersona: (title) => `「${title}」을 위한 검토 가능한 출발점입니다.`, packBestFor: (title) => [`${title} 워크플로`, '품질, 신뢰, 감사 신호를 확인한 선택', '관리된 워크스페이스에서의 시험'], packAvoidWhen: ['민감한 데이터나 운영 자격 증명에 검토 없이 접근해야 하는 경우', '소스, 권한, 결과를 검토할 수 없는 경우'], collectionPersona: (title) => `「${title}」을 위한 검토 가능한 Agent 워크플로입니다.`, collectionOutcomes: (title) => [`「${title}」 목표를 명확히 함`, '일치하는 기능 선택', '다음 단계 전 결과 검증'], collectionIdealFor: (title) => [`${title} 워크플로`, '감사 가능한 Agent 의사결정', '관리된 워크스페이스의 시험'], collectionAvoidWhen: ['민감한 시스템에 감독 없이 접근해야 하는 경우', '자료나 결과 품질을 검토할 수 없는 경우'],
    packSteps: [{ title: '목표 정의', description: '설치 전 작업, 제약, 필요한 근거를 명확히 합니다.' }, { title: 'Skill 선택', description: '품질, 신뢰, 유지관리 신호가 분명한 소수의 Skill을 선택합니다.' }, { title: '안전하게 실행', description: '관리된 워크스페이스에서 필요한 파일만 설치하고 권한을 먼저 검토합니다.' }, { title: '결과 검증', description: '출력과 결과를 확인하고 높은 위험에는 사람의 승인을 남깁니다.' }],
    collectionSteps: [{ title: '작업 정의', description: '요청을 명확하고 검토 가능한 Agent 작업으로 바꿉니다.' }, { title: '기능 선택', description: '넓은 카테고리 대신 현재 단계에 맞는 기능을 선택합니다.' }, { title: '실행 및 확인', description: '출처, 권한, 범위를 확인한 뒤 최소한의 유효한 작업을 실행합니다.' }, { title: '결론 검증', description: '다음 단계로 가기 전에 근거와 결과를 검토합니다.' }],
  },
  es: {
    ...englishCopy,
    packBreadcrumb: 'Packs instalables', collectionBreadcrumb: 'Guías de flujo', packEyebrow: 'Pack instalable', collectionEyebrow: 'Guía de flujo', selectedSkills: 'Skills seleccionadas', installOrder: 'Orden de instalación', topAdoption: 'Señal de adopción', executionOrder: 'Orden de ejecución', packWorkflowTitle: 'Cómo debe usar este pack un agent', goodFit: 'Buen encaje', reviewFirstWhen: 'Revisa primero cuando', agentInstallPlan: 'Plan de instalación para agent', agentInstallTitle: 'Un plan legible por máquinas que los agents pueden ejecutar.', agentInstallDescription: 'La API del pack devuelve orden de instalación, URLs de auditoría, controles de revisión y un contrato de resultados. Usa esta página como contexto y llama a la API para obtener el plan JSON exacto.', openTextPlan: 'Abrir plan de texto', reviewChecklist: 'Lista de revisión', outcomeEndpoint: 'Endpoint de resultados', recommendedSkills: 'Skills recomendadas', recommendedTitle: 'Selección instalable para este pack', openPackApi: 'Abrir API del pack', sourceDescription: 'Descripción del repositorio (original)', quality: 'Calidad', trust: 'Confianza', audit: 'Auditoría', stars: 'stars', unknownLicense: 'Licencia desconocida', install: 'Instalar', skillPage: 'Página del skill', auditReport: 'Informe de auditoría', compareRecommendedSkills: 'Comparar skills recomendadas', browseMatchingSkills: 'Ver skills relacionadas', expectedOutcome: 'Resultado esperado', workflowMap: 'Mapa de flujo', followSequence: 'Sigue esta secuencia', suggestedCapabilities: 'Capacidades sugeridas', chooseSkills: 'Elige skills para cada paso', chooseSkillsDescription: 'Ordenadas por relevancia para este flujo, calidad, adopción en GitHub y actividad de mantenimiento. Es una guía de decisión, no un único comando de instalación.', compare: 'Comparar', notRightWhen: 'No es la ruta correcta cuando', needPack: '¿Necesitas un paquete ejecutable?', needPackDescription: 'Los packs incluyen orden de instalación, enlaces de auditoría y un plan de Agent legible por máquinas.', browsePacks: 'Ver packs',
    packPersona: (title) => `Un punto de partida auditable para el flujo de ${title}.`, packBestFor: (title) => [`Flujos de ${title}`, 'Selección con señales públicas de calidad, confianza y auditoría', 'Pruebas en un espacio de trabajo controlado'], packAvoidWhen: ['La tarea necesita acceso no revisado a datos sensibles o credenciales de producción', 'Nadie puede revisar código, permisos o resultados'], collectionPersona: (title) => `Un flujo de agent revisable para ${title}.`, collectionOutcomes: (title) => [`Aclarar el objetivo de ${title}`, 'Elegir capacidades adecuadas', 'Validar resultados antes del siguiente paso'], collectionIdealFor: (title) => [`Flujos de ${title}`, 'Decisiones de agent auditables', 'Pruebas en un entorno controlado'], collectionAvoidWhen: ['La tarea exige acceso sin supervisión a sistemas sensibles', 'No se pueden revisar las fuentes o la calidad de los resultados'],
    packSteps: [{ title: 'Definir', description: 'Aclara el trabajo, las restricciones y la evidencia necesaria antes de instalar.' }, { title: 'Seleccionar', description: 'Elige pocas skills con señales claras de calidad, confianza y mantenimiento.' }, { title: 'Ejecutar con seguridad', description: 'Instala solo los archivos necesarios en un entorno controlado y revisa permisos primero.' }, { title: 'Verificar', description: 'Comprueba la salida, informa el resultado y conserva aprobación humana para riesgos relevantes.' }],
    collectionSteps: [{ title: 'Delimitar', description: 'Convierte el resultado pedido en una tarea de agent clara y revisable.' }, { title: 'Elegir', description: 'Selecciona capacidades para la etapa actual, no una categoría genérica.' }, { title: 'Ejecutar', description: 'Completa el paso mínimo útil tras comprobar fuentes, permisos y alcance.' }, { title: 'Validar', description: 'Revisa evidencias y resultados antes de pasar a la siguiente etapa.' }],
  },
  de: {
    ...englishCopy,
    packBreadcrumb: 'Installierbare Skill Packs', collectionBreadcrumb: 'Workflow-Leitfäden', packEyebrow: 'Installierbares Skill Pack', collectionEyebrow: 'Workflow-Leitfaden', selectedSkills: 'Ausgewählte Skills', installOrder: 'Installationsreihenfolge', topAdoption: 'Adoptionssignal', executionOrder: 'Ausführungsreihenfolge', packWorkflowTitle: 'So verwendet ein Agent dieses Pack', goodFit: 'Gut geeignet für', reviewFirstWhen: 'Zuerst prüfen, wenn', agentInstallPlan: 'Agent-Installationsplan', agentInstallTitle: 'Ein maschinenlesbarer Plan, den Agents ausführen können.', agentInstallDescription: 'Die Pack-API liefert Installationsreihenfolge, Audit-URLs, Prüfschritte und einen Ergebnisvertrag. Nutze diese Seite als Kontext und rufe für den exakten JSON-Plan die API auf.', openTextPlan: 'Textplan öffnen', reviewChecklist: 'Prüfliste', outcomeEndpoint: 'Ergebnis-Endpunkt', recommendedSkills: 'Empfohlene Skills', recommendedTitle: 'Installierbare Auswahl für dieses Pack', openPackApi: 'Pack-API öffnen', sourceDescription: 'Repository-Beschreibung (Original)', quality: 'Qualität', trust: 'Trust', audit: 'Audit', stars: 'Stars', unknownLicense: 'Unbekannte Lizenz', install: 'Installieren', skillPage: 'Skill-Seite', auditReport: 'Audit-Bericht', compareRecommendedSkills: 'Empfohlene Skills vergleichen', browseMatchingSkills: 'Passende Skills ansehen', expectedOutcome: 'Erwartetes Ergebnis', workflowMap: 'Workflow-Karte', followSequence: 'Diese Reihenfolge befolgen', suggestedCapabilities: 'Vorgeschlagene Fähigkeiten', chooseSkills: 'Skills für jeden Schritt wählen', chooseSkillsDescription: 'Nach Relevanz für diesen Workflow, Qualität, GitHub-Adoption und Wartungsaktualität sortiert. Dies ist ein Entscheidungsleitfaden, kein einzelner Installationsbefehl.', compare: 'Vergleichen', notRightWhen: 'Nicht passend, wenn', needPack: 'Benötigst du ein ausführbares Bündel?', needPackDescription: 'Skill Packs enthalten Installationsreihenfolge, Audit-Links und einen maschinenlesbaren Agent-Plan.', browsePacks: 'Packs ansehen',
    packPersona: (title) => `Ein prüfbarer Ausgangspunkt für den ${title}-Workflow.`, packBestFor: (title) => [`${title}-Workflows`, 'Auswahl mit öffentlichen Qualitäts-, Trust- und Audit-Signalen', 'Tests in einem kontrollierten Arbeitsbereich'], packAvoidWhen: ['Die Aufgabe benötigt ungeprüften Zugriff auf sensible Daten oder Produktionszugänge', 'Quellcode, Berechtigungen oder Ergebnisse können nicht geprüft werden'], collectionPersona: (title) => `Ein überprüfbarer Agent-Workflow für ${title}.`, collectionOutcomes: (title) => [`Ziel für ${title} klären`, 'Passende Fähigkeiten auswählen', 'Ergebnis vor dem nächsten Schritt prüfen'], collectionIdealFor: (title) => [`${title}-Workflows`, 'Prüfbare Agent-Entscheidungen', 'Tests in kontrollierten Arbeitsbereichen'], collectionAvoidWhen: ['Die Aufgabe braucht unbeaufsichtigten Zugriff auf sensible Systeme', 'Quellen oder Ergebnisqualität können nicht geprüft werden'],
    packSteps: [{ title: 'Definieren', description: 'Kläre Aufgabe, Grenzen und benötigte Evidenz vor der Installation.' }, { title: 'Auswählen', description: 'Wähle wenige Skills mit klaren Qualitäts-, Trust- und Wartungssignalen.' }, { title: 'Sicher ausführen', description: 'Installiere nur notwendige Dateien in einem kontrollierten Arbeitsbereich und prüfe Berechtigungen zuerst.' }, { title: 'Verifizieren', description: 'Prüfe Ausgabe und Ergebnis und behalte bei relevanten Risiken eine menschliche Freigabe.' }],
    collectionSteps: [{ title: 'Aufgabe klären', description: 'Mache aus dem gewünschten Ergebnis eine klare, prüfbare Agent-Aufgabe.' }, { title: 'Fähigkeiten wählen', description: 'Wähle Fähigkeiten für die aktuelle Phase statt einer breiten Kategorie.' }, { title: 'Ausführen', description: 'Führe den kleinsten sinnvollen Schritt aus, nachdem Quellen, Berechtigungen und Umfang geprüft sind.' }, { title: 'Validieren', description: 'Prüfe Evidenz und Ergebnis vor dem nächsten Schritt.' }],
  },
  fr: {
    ...englishCopy,
    packBreadcrumb: 'Packs installables', collectionBreadcrumb: 'Guides de workflow', packEyebrow: 'Pack installable', collectionEyebrow: 'Guide de workflow', selectedSkills: 'Skills sélectionnées', installOrder: 'Ordre d’installation', topAdoption: 'Signal d’adoption', executionOrder: 'Ordre d’exécution', packWorkflowTitle: 'Comment un agent doit utiliser ce pack', goodFit: 'Bon usage', reviewFirstWhen: 'À vérifier d’abord quand', agentInstallPlan: 'Plan d’installation pour agent', agentInstallTitle: 'Un plan lisible par machine que les agents peuvent exécuter.', agentInstallDescription: 'L’API du pack renvoie l’ordre d’installation, les URL d’audit, les contrôles et un contrat de résultat. Utilisez cette page comme contexte, puis appelez l’API pour le plan JSON exact.', openTextPlan: 'Ouvrir le plan texte', reviewChecklist: 'Liste de vérification', outcomeEndpoint: 'Endpoint de résultat', recommendedSkills: 'Skills recommandées', recommendedTitle: 'Sélection installable pour ce pack', openPackApi: 'Ouvrir l’API du pack', sourceDescription: 'Description du dépôt (original)', quality: 'Qualité', trust: 'Confiance', audit: 'Audit', stars: 'stars', unknownLicense: 'Licence inconnue', install: 'Installer', skillPage: 'Page du skill', auditReport: 'Rapport d’audit', compareRecommendedSkills: 'Comparer les skills recommandées', browseMatchingSkills: 'Voir les skills correspondantes', expectedOutcome: 'Résultat attendu', workflowMap: 'Carte du workflow', followSequence: 'Suivez cette séquence', suggestedCapabilities: 'Capacités suggérées', chooseSkills: 'Choisir les skills à chaque étape', chooseSkillsDescription: 'Classées selon la pertinence du workflow, la qualité, l’adoption GitHub et la fraîcheur de maintenance. C’est un guide de décision, pas une commande unique.', compare: 'Comparer', notRightWhen: 'Pas adapté quand', needPack: 'Besoin d’un pack exécutable ?', needPackDescription: 'Les packs incluent ordre d’installation, liens d’audit et plan d’Agent lisible par machine.', browsePacks: 'Voir les packs',
    packPersona: (title) => `Un point de départ vérifiable pour le workflow ${title}.`, packBestFor: (title) => [`Workflows ${title}`, 'Sélection avec signaux publics de qualité, confiance et audit', 'Essais dans un espace de travail contrôlé'], packAvoidWhen: ['La tâche requiert un accès non revu à des données sensibles ou à des identifiants de production', 'Personne ne peut vérifier le code source, les permissions ou les résultats'], collectionPersona: (title) => `Un workflow d’agent vérifiable pour ${title}.`, collectionOutcomes: (title) => [`Clarifier l’objectif ${title}`, 'Choisir les capacités adaptées', 'Vérifier le résultat avant l’étape suivante'], collectionIdealFor: (title) => [`Workflows ${title}`, 'Décisions d’agent auditables', 'Essais dans un environnement contrôlé'], collectionAvoidWhen: ['La tâche nécessite un accès non supervisé à des systèmes sensibles', 'Les sources ou la qualité du résultat ne peuvent pas être vérifiées'],
    packSteps: [{ title: 'Définir', description: 'Clarifiez le travail, les contraintes et les preuves nécessaires avant installation.' }, { title: 'Sélectionner', description: 'Choisissez peu de skills avec des signaux clairs de qualité, confiance et maintenance.' }, { title: 'Exécuter en sécurité', description: 'Installez seulement les fichiers nécessaires dans un espace contrôlé et vérifiez les permissions.' }, { title: 'Vérifier', description: 'Contrôlez la sortie, rapportez le résultat et gardez une approbation humaine pour les risques importants.' }],
    collectionSteps: [{ title: 'Cadrer', description: 'Transformez le résultat demandé en tâche d’agent claire et vérifiable.' }, { title: 'Choisir', description: 'Sélectionnez les capacités de l’étape actuelle plutôt qu’une catégorie générale.' }, { title: 'Exécuter', description: 'Réalisez la plus petite étape utile après vérification des sources, permissions et périmètre.' }, { title: 'Valider', description: 'Examinez les preuves et le résultat avant l’étape suivante.' }],
  },
  id: {
    ...englishCopy,
    packBreadcrumb: 'Skill Pack yang dapat dipasang', collectionBreadcrumb: 'Panduan alur kerja', packEyebrow: 'Skill Pack yang dapat dipasang', collectionEyebrow: 'Panduan alur kerja', selectedSkills: 'Skill terpilih', installOrder: 'Urutan pemasangan', topAdoption: 'Sinyal adopsi', executionOrder: 'Urutan eksekusi', packWorkflowTitle: 'Cara agent menggunakan pack ini', goodFit: 'Cocok untuk', reviewFirstWhen: 'Tinjau terlebih dahulu ketika', agentInstallPlan: 'Rencana instalasi agent', agentInstallTitle: 'Rencana yang dapat dibaca mesin dan dijalankan agent.', agentInstallDescription: 'API pack mengembalikan urutan pemasangan, URL audit, pemeriksaan peninjauan, dan kontrak hasil. Gunakan halaman ini sebagai konteks lalu panggil API untuk rencana JSON yang tepat.', openTextPlan: 'Buka rencana teks', reviewChecklist: 'Daftar peninjauan', outcomeEndpoint: 'Endpoint hasil', recommendedSkills: 'Skill yang direkomendasikan', recommendedTitle: 'Pilihan installable untuk pack ini', openPackApi: 'Buka Pack API', sourceDescription: 'Deskripsi repositori (asli)', quality: 'Kualitas', trust: 'Kepercayaan', audit: 'Audit', stars: 'stars', unknownLicense: 'Lisensi tidak diketahui', install: 'Pasang', skillPage: 'Halaman skill', auditReport: 'Laporan audit', compareRecommendedSkills: 'Bandingkan skill rekomendasi', browseMatchingSkills: 'Lihat skill yang cocok', expectedOutcome: 'Hasil yang diharapkan', workflowMap: 'Peta alur kerja', followSequence: 'Ikuti urutan ini', suggestedCapabilities: 'Kemampuan yang disarankan', chooseSkills: 'Pilih skill untuk setiap langkah', chooseSkillsDescription: 'Diurutkan berdasarkan relevansi alur kerja, kualitas, adopsi GitHub, dan kebaruan pemeliharaan. Ini panduan keputusan, bukan satu perintah pemasangan.', compare: 'Bandingkan', notRightWhen: 'Bukan jalur yang tepat ketika', needPack: 'Butuh paket yang dapat dijalankan?', needPackDescription: 'Skill Pack mencakup urutan pemasangan, tautan audit, dan rencana Agent yang dapat dibaca mesin.', browsePacks: 'Lihat packs',
    packPersona: (title) => `Titik awal yang dapat diaudit untuk alur kerja ${title}.`, packBestFor: (title) => [`Alur kerja ${title}`, 'Pemilihan dengan sinyal publik kualitas, kepercayaan, dan audit', 'Uji coba dalam ruang kerja terkontrol'], packAvoidWhen: ['Tugas membutuhkan akses tanpa tinjauan ke data sensitif atau kredensial produksi', 'Tidak ada yang dapat meninjau kode sumber, izin, atau hasil'], collectionPersona: (title) => `Alur kerja agent yang dapat ditinjau untuk ${title}.`, collectionOutcomes: (title) => [`Perjelas tujuan ${title}`, 'Pilih kemampuan yang cocok', 'Validasi hasil sebelum langkah berikutnya'], collectionIdealFor: (title) => [`Alur kerja ${title}`, 'Keputusan agent yang dapat diaudit', 'Uji coba di ruang kerja terkontrol'], collectionAvoidWhen: ['Tugas memerlukan akses tanpa pengawasan ke sistem sensitif', 'Sumber atau kualitas hasil tidak dapat ditinjau'],
    packSteps: [{ title: 'Tentukan', description: 'Jelaskan pekerjaan, batasan, dan bukti yang diperlukan sebelum memasang.' }, { title: 'Pilih', description: 'Pilih sedikit skill dengan sinyal kualitas, kepercayaan, dan pemeliharaan yang jelas.' }, { title: 'Jalankan dengan aman', description: 'Pasang hanya file yang diperlukan dalam ruang kerja terkontrol dan tinjau izin terlebih dahulu.' }, { title: 'Verifikasi', description: 'Periksa keluaran, laporkan hasil, dan pertahankan persetujuan manusia untuk risiko penting.' }],
    collectionSteps: [{ title: 'Rumuskan', description: 'Ubah hasil yang diminta menjadi tugas agent yang jelas dan dapat ditinjau.' }, { title: 'Pilih', description: 'Pilih kemampuan untuk tahap saat ini, bukan kategori yang terlalu luas.' }, { title: 'Jalankan', description: 'Lakukan langkah berguna terkecil setelah memeriksa sumber, izin, dan cakupan.' }, { title: 'Validasi', description: 'Tinjau bukti dan hasil sebelum melanjutkan ke tahap berikutnya.' }],
  },
}

const collectionTitles: Record<MarketLocale, Record<string, string>> = {
  zh: { 'web-data-pipeline': '网页数据管道', 'coding-review-agent': '代码审查 Agent', 'rag-knowledge-base': 'RAG 知识库', 'browser-qa-agent': '浏览器 QA', 'frontend-product-ui': '前端与产品 UI', 'video-creation-studio': '视频制作', 'research-report-agent': '研究报告 Agent', 'content-growth-agent': '内容增长 Agent' },
  ja: { 'web-data-pipeline': 'Web データパイプライン', 'coding-review-agent': 'コードレビュー Agent', 'rag-knowledge-base': 'RAG ナレッジベース', 'browser-qa-agent': 'ブラウザ QA', 'frontend-product-ui': 'フロントエンドとプロダクト UI', 'video-creation-studio': '動画制作', 'research-report-agent': 'リサーチレポート Agent', 'content-growth-agent': 'コンテンツ成長 Agent' },
  ko: { 'web-data-pipeline': '웹 데이터 파이프라인', 'coding-review-agent': '코드 리뷰 Agent', 'rag-knowledge-base': 'RAG 지식 베이스', 'browser-qa-agent': '브라우저 QA', 'frontend-product-ui': '프론트엔드 및 제품 UI', 'video-creation-studio': '영상 제작', 'research-report-agent': '리서치 보고서 Agent', 'content-growth-agent': '콘텐츠 성장 Agent' },
  es: { 'web-data-pipeline': 'Canal de datos web', 'coding-review-agent': 'Agent de revisión de código', 'rag-knowledge-base': 'Base de conocimiento RAG', 'browser-qa-agent': 'QA de navegador', 'frontend-product-ui': 'Frontend y UI de producto', 'video-creation-studio': 'Producción de vídeo', 'research-report-agent': 'Agent de informes de investigación', 'content-growth-agent': 'Agent de crecimiento de contenido' },
  de: { 'web-data-pipeline': 'Web-Datenpipeline', 'coding-review-agent': 'Code-Review-Agent', 'rag-knowledge-base': 'RAG-Wissensbasis', 'browser-qa-agent': 'Browser-QA-Agent', 'frontend-product-ui': 'Frontend und Produkt-UI', 'video-creation-studio': 'Videoproduktion', 'research-report-agent': 'Research-Report-Agent', 'content-growth-agent': 'Content-Growth-Agent' },
  fr: { 'web-data-pipeline': 'Pipeline de données web', 'coding-review-agent': 'Agent de revue de code', 'rag-knowledge-base': 'Base de connaissances RAG', 'browser-qa-agent': 'QA navigateur', 'frontend-product-ui': 'Frontend et UI produit', 'video-creation-studio': 'Production vidéo', 'research-report-agent': 'Agent de rapport de recherche', 'content-growth-agent': 'Agent de croissance de contenu' },
  id: { 'web-data-pipeline': 'Pipeline data web', 'coding-review-agent': 'Agent tinjauan kode', 'rag-knowledge-base': 'Basis pengetahuan RAG', 'browser-qa-agent': 'QA browser', 'frontend-product-ui': 'Frontend dan UI produk', 'video-creation-studio': 'Produksi video', 'research-report-agent': 'Agent laporan riset', 'content-growth-agent': 'Agent pertumbuhan konten' },
}

const startupFounderSteps: LocalizedStep[] = [
  { title: '调研', description: '收集市场、竞争对手与用户证据，并保留可核验的来源。' },
  { title: '定位', description: '将证据转化为清晰的产品表达与可比较的角度。' },
  { title: '发布', description: '准备落地页文案、X 推文和产品发布材料。' },
  { title: '运营', description: '固化周报、反馈摘要与优先级复盘。' },
]

const packTitleSuffix: Record<Locale, string> = {
  en: 'agent pack',
  zh: 'Agent 技能包',
  ja: 'Agent パック',
  ko: 'Agent 팩',
  es: 'pack de agent',
  de: 'Agent-Paket',
  fr: 'pack d’agent',
  id: 'pack agent',
}

const collectionTitleSuffix: Record<Locale, string> = {
  en: 'workflow',
  zh: '工作流',
  ja: 'ワークフロー',
  ko: '워크플로',
  es: 'flujo de trabajo',
  de: 'Workflow',
  fr: 'workflow',
  id: 'alur kerja',
}

export function getCuratedPageCopy(locale: Locale = defaultLocale) {
  return isMarketLocale(locale) ? localizedCopy[locale] : englishCopy
}

export function getLocalizedPackReviewChecklist(locale: Locale = defaultLocale) {
  return packReviewChecklists[locale] || packReviewChecklists.en
}

export function getLocalizedAuditRiskLabel(locale: Locale, risk: string) {
  const normalized = risk.trim().toLowerCase().replace(/[_-]/g, ' ')
  const labels = auditRiskLabels[locale] || auditRiskLabels.en

  if (normalized.includes('safe')) return labels.safe
  if (normalized.includes('review')) return labels.review
  if (normalized.includes('risk')) return labels.risky
  return risk
}

export function getLocalizedPackContent(locale: Locale, pack: SkillPackDefinition): LocalizedCuratedContent & {
  persona: string
  workflowSteps: LocalizedStep[]
  bestFor: string[]
  avoidWhen: string[]
} {
  if (!isMarketLocale(locale)) {
    return {
      shortTitle: pack.shortTitle,
      title: pack.title,
      description: pack.description,
      persona: pack.persona,
      workflowSteps: pack.workflowSteps,
      bestFor: pack.bestFor,
      avoidWhen: pack.avoidWhen,
    }
  }

  const copy = getCuratedPageCopy(locale)
  const localizedPack = getLocalizedNavigationContent(locale).packs.cards[pack.slug]
  const title = localizedPack?.title || pack.shortTitle

  return {
    shortTitle: title,
    title: `${title} ${packTitleSuffix[locale]}`,
    description: localizedPack?.description || pack.description,
    persona: copy.packPersona(title),
    workflowSteps: locale === 'zh' && pack.slug === 'startup-founder-agent-pack' ? startupFounderSteps : copy.packSteps,
    bestFor: copy.packBestFor(title),
    avoidWhen: copy.packAvoidWhen,
  }
}

export function getLocalizedCollectionContent(locale: Locale, stack: SkillStackDefinition): LocalizedCuratedContent & {
  persona: string
  outcomes: string[]
  workflowSteps: LocalizedStep[]
  idealFor: string[]
  avoidWhen: string[]
} {
  if (!isMarketLocale(locale)) {
    return {
      shortTitle: stack.shortTitle,
      title: stack.title,
      description: stack.description,
      persona: stack.persona,
      outcomes: stack.outcomes,
      workflowSteps: stack.workflowSteps,
      idealFor: stack.idealFor,
      avoidWhen: stack.avoidWhen,
    }
  }

  const copy = getCuratedPageCopy(locale)
  const shortTitle = collectionTitles[locale][stack.slug] || stack.shortTitle

  return {
    shortTitle,
    title: `${shortTitle} ${collectionTitleSuffix[locale]}`,
    description: copy.collectionPersona(shortTitle),
    persona: copy.collectionPersona(shortTitle),
    outcomes: copy.collectionOutcomes(shortTitle),
    workflowSteps: copy.collectionSteps,
    idealFor: copy.collectionIdealFor(shortTitle),
    avoidWhen: copy.collectionAvoidWhen,
  }
}
