// Editorial source comparison. These facts describe the linked source revision;
// they do not change registry publication, review or runtime verification.
export const PRESENTATION_UPDATED_AT = '2026-10-06'
export const PRESENTATION_HUB_PATH = '/best/presentation-generation'
export const WORKBUDDY_PRESENTATION_PATH = '/best/workbuddy-ppt-skills'
export const WORKBUDDY_DOCS = {
  office: 'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/WorkBuddy-Zero-Cost-Skill-Top-10/Office-Document-Suite',
  skills: 'https://www.codebuddy.ai/docs/zh/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market',
  presentations: 'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Practice-Cases/Practice-Two',
} as const

export const PRESENTATION_PLATFORM_DOCS = {
  trae: 'https://docs.trae.cn/ide_skills',
  cursor: 'https://cursor.com/docs/skills',
  codebuddy: 'https://www.codebuddy.cn/docs/ide/Best-practice/best-practice',
} as const

export const PRESENTATION_AGENT_GUIDES = [
  { name: 'Codex', href: '/best/codex-presentation-decks', description: 'Choose a presentation workflow, supply a brief and check the exported deck.' },
  { name: 'Claude Code', href: '/guides/install-agent-skills-in-claude-code', description: 'Use the installation route documented for the selected skill or plugin.' },
  { name: 'WorkBuddy', href: WORKBUDDY_PRESENTATION_PATH, description: 'Start with the PPTX / Office skills, or inspect a community workflow with documented WorkBuddy support.' },
  { name: 'Trae / TRAE', href: '/best/trae-ppt-skills', description: 'Import a complete skill package into TraeCode and prepare an editable PowerPoint workflow.' },
  { name: 'Doubao / 豆包', href: '/best/doubao-ppt-skills', description: 'Check the office-mode requirement before using Dashi PPT in Doubao.' },
  { name: 'Cursor', href: '/best/cursor-ppt-skills', description: 'Use Agent skill discovery and choose between native PPTX, browser export and HTML slides.' },
  { name: 'CodeBuddy IDE', href: '/best/codebuddy-ppt-skills', description: 'Follow the IDE presentation guide or inspect PPT Master for native PowerPoint objects.' },
] as const

export type PresentationFormat = 'editable-pptx' | 'image-pptx' | 'html-slides'
export interface PresentationSource {
  id: string
  name: string
  registrySlug: string
  repository: string
  commit: string
  path: string
  format: PresentationFormat
  output: string
  editing: string
  bestFor: string
  summary: string
  requirements: string
  cost: string
  limitation: string
  agents: string
  license: string
  workbuddy?: { status: 'documented' | 'in-adaptation'; note: string; evidencePath: string }
  platformSupport?: readonly { name: string; note: string; evidencePath: string }[]
}

export const PRESENTATION_SOURCES: readonly PresentationSource[] = [
  {
    id: 'ppt-master', name: 'PPT Master', registrySlug: 'hugohe3-ppt-master',
    repository: 'hugohe3/ppt-master', commit: '2d72da616cf9fa40d4dcaf59fd4c980ecf534b7d', path: 'skills/ppt-master/SKILL.md',
    format: 'editable-pptx', output: 'Native PPTX', editing: 'PowerPoint objects and templates',
    bestFor: 'Editable business decks from documents',
    summary: 'Turn source documents into PowerPoint objects, or work with an existing PPTX template. The source defines separate routes for generation, native editing and enhancement.',
    requirements: 'A local coding agent and the dependencies for the selected workflow.',
    cost: 'MIT source; agent and optional generation services may charge.',
    limitation: 'Inspect the selected workflow and check the exported deck in PowerPoint.',
    agents: 'Claude Code and Codex; author also lists Trae, Cursor and CodeBuddy IDE', license: 'MIT',
    platformSupport: [{ name: 'Trae, Cursor and CodeBuddy IDE', note: 'The author lists these IDE agents. The workflow requires local file access and command execution; this is author documentation, not a runtime test by OpenAgentSkill.', evidencePath: 'README.md' }],
  },
  {
    id: 'dashi-ppt', name: 'Dashi PPT', registrySlug: 'chuspeeism-dashi-ppt-skill',
    repository: 'chuspeeism/dashi-ppt-skill', commit: '21dc7e5fc8c3a0d7f6a94948153dd1ee954f4e64', path: 'skills/dashi-ppt/SKILL.md',
    format: 'editable-pptx', output: 'HTML, editable PPTX, PDF', editing: 'Browser editing and PPTX text objects',
    bestFor: 'Browser editing with a PowerPoint handoff',
    summary: 'Build a themed HTML deck, adjust it in the browser and export to PowerPoint. Useful when the author wants a visual editing step before sharing a PPTX.',
    requirements: 'Node.js 20+, npm and a local Chrome, Chromium or Edge for export.',
    cost: 'AGPL-3.0 source; export engine has separate proprietary terms. Optional image generation can charge.',
    limitation: 'Compare HTML and exported PPTX layouts; browser output alone does not validate export.',
    agents: 'Codex, Claude Code, WorkBuddy; Doubao office mode; Cursor with local tools', license: 'AGPL-3.0',
    workbuddy: { status: 'documented', note: 'The author lists WorkBuddy as supported; inspect the full skill package and local requirements.', evidencePath: 'README.en.md' },
    platformSupport: [
      { name: 'Doubao / 豆包', note: 'The author lists Doubao as supported only with office mode. Confirm that your mode can read files and run the required local Node.js and browser export workflow.', evidencePath: 'README.en.md' },
      { name: 'Cursor', note: 'The author labels Cursor usable with file read/write and shell access. A chat-only session does not provide these tools.', evidencePath: 'README.en.md' },
    ],
  },
  {
    id: 'image-to-editable-ppt', name: 'Image to Editable PPT', registrySlug: 'ningzimu-image-to-editable-ppt-skill',
    repository: 'ningzimu/image-to-editable-ppt-skill', commit: 'b7be494e31a0ed56ef98716891db5474606b8cdf', path: 'skills/image-to-editable-ppt/SKILL.md',
    format: 'editable-pptx', output: 'Reconstructed PPTX', editing: 'Rebuilt text, shapes and visual objects',
    bestFor: 'Reconstructing screenshots or image-based decks',
    summary: 'Reconstruct an existing visual deck as editable PowerPoint objects. Inputs can include screenshots, PDFs or image-based slides; this is a reconstruction workflow rather than new-deck authoring.',
    requirements: 'The editppt CLI, a local agent and the selected OCR/image backend.',
    cost: 'MIT source; OCR and image services can charge separately.',
    limitation: 'Check reconstructed text and geometry against the original slides.',
    agents: 'Codex workflow documented', license: 'MIT',
  },
  {
    id: 'codex-ppt', name: 'Codex PPT', registrySlug: 'ningzimu-codex-ppt-skill',
    repository: 'ningzimu/codex-ppt-skill', commit: '6d76c0eded7f8a8b0c4e304697e6f2bda7c408b2', path: 'skills/codex-ppt/SKILL.md',
    format: 'image-pptx', output: 'Image-based PPTX', editing: 'Full-slide images; not separate text objects',
    bestFor: 'A consistent visual deck when object editing is optional',
    summary: 'Generate complete slide images and assemble them into PowerPoint. Choose it for a consistent visual treatment when the receiver accepts image pages.',
    requirements: 'A supported image backend and the bundled PPTX assembly dependencies.',
    cost: 'MIT source; image generation uses a tool allowance or paid API.',
    limitation: 'Each slide is an image. Individual textboxes and charts are not natively editable.',
    agents: 'Codex and skill-compatible agents', license: 'MIT',
  },
  {
    id: 'guizang-ppt', name: 'Guizang PPT Skill', registrySlug: 'op7418-guizang-ppt-skill',
    repository: 'op7418/guizang-ppt-skill', commit: 'c91369c449d34755d320a8b81d0734000d99d1ab', path: 'SKILL.md',
    format: 'html-slides', output: 'Single-file HTML', editing: 'HTML/CSS; presenter notes and views',
    bestFor: 'Editorial presentations delivered in a browser',
    summary: 'Create an editorial or Swiss-style web presentation with slide navigation, speaker notes and presenter views. Best when the presentation will be opened in a browser.',
    requirements: 'A coding agent and browser; optional image-generation tooling.',
    cost: 'AGPL-3.0 source; agent and optional image services may charge.',
    limitation: 'HTML delivery does not imply native editable PPTX export.',
    agents: 'Codex and Claude Code; Cursor with filesystem and shell access', license: 'AGPL-3.0',
    workbuddy: { status: 'in-adaptation', note: 'The author labels WorkBuddy as in adaptation; a marketplace-ready version is being prepared separately.', evidencePath: 'README.en.md' },
    platformSupport: [{ name: 'Cursor', note: 'The author lists Cursor as working with filesystem and shell access. The documented deliverable is HTML, not native editable PowerPoint.', evidencePath: 'README.en.md' }],
  },
  {
    id: 'frontend-slides', name: 'Frontend Slides', registrySlug: 'zarazhangrui-frontend-slides',
    repository: 'zarazhangrui/frontend-slides', commit: '9906a34d640d2111f724544cbc50f7f130569ae1', path: 'SKILL.md',
    format: 'html-slides', output: 'HTML; PPTX-to-web conversion', editing: 'Web slide content and styling',
    bestFor: 'Web presentations and converting an existing PPTX to HTML',
    summary: 'Author a browser presentation or convert PowerPoint content into a web slideshow. The repository documents a Claude Code plugin and use of the core skill in other local agents.',
    requirements: 'A local coding agent and browser; conversion has additional dependencies.',
    cost: 'MIT source; coding-agent usage may charge.',
    limitation: 'PPTX input is a conversion route, not a promise of native PPTX output.',
    agents: 'Claude Code plugin; Codex core-skill use documented', license: 'MIT',
  },
  {
    id: 'html-ppt', name: 'HTML PPT Studio', registrySlug: 'lewislulu-html-ppt-skill',
    repository: 'lewislulu/html-ppt-skill', commit: 'fd1629067909ff55b36b905476de4e5f26062a1f', path: 'SKILL.md',
    format: 'html-slides', output: 'Static HTML/CSS/JS', editing: 'Template and theme source files',
    bestFor: 'Template-led HTML decks with speaker notes',
    summary: 'Compose slides from theme, layout and animation files. A practical choice for repeatable browser decks with keyboard navigation and presenter notes.',
    requirements: 'A skill-capable local agent and browser; optional fonts use a CDN.',
    cost: 'MIT source; agent usage may charge.',
    limitation: 'Its documented output is HTML. Verify any separate PowerPoint conversion workflow.',
    agents: 'Claude Code setup documented; local skill-capable agents', license: 'MIT',
  },
]

export const PRESENTATION_FORMATS = [
  { id: 'editable-pptx', title: 'Editable PowerPoint', extension: '.pptx', description: 'Choose native objects if someone must edit text, charts or shapes in PowerPoint.', href: '/best/ppt-generation' },
  { id: 'image-pptx', title: 'Image-based PowerPoint', extension: '.pptx', description: 'Choose full-slide images for visual consistency when separate object editing is optional.', href: '#codex-ppt' },
  { id: 'html-slides', title: 'Browser presentations', extension: '.html', description: 'Choose web slides for browser delivery, animation and presenter views.', href: '#guizang-ppt' },
] as const

export interface PresentationPageDefinition {
  updatedAt?: string
  slug: string
  title: string
  description: string
  intro: string
  selectionTitle: string
  sourceIds: readonly string[]
  quickPicks: readonly { task: string; sourceId: string; reason: string }[]
  sections: readonly { title: string; paragraphs: readonly string[] }[]
  faq: readonly { question: string; answer: string }[]
  platformGuide?: {
    id: string
    label: string
    eyebrow: string
    cta: string
    platform: string
    title: string
    intro: string
    steps: readonly string[]
    prompt: string
    links: readonly { label: string; href: string }[]
  }
}

export const PRESENTATION_PAGES: readonly PresentationPageDefinition[] = [
  {
    slug: 'presentation-generation', title: 'Best PPT Skills for AI Agents',
    updatedAt: '2026-10-09',
    description: 'Compare PPT skills for Codex, Claude Code, WorkBuddy, Trae, Doubao, Cursor and CodeBuddy. Find editable PPTX or HTML slides with setup guides and sources.',
    intro: 'Find a PPT workflow for Codex, Claude Code, WorkBuddy, Trae, Doubao, Cursor or CodeBuddy IDE. Choose the file you need to hand over, then compare seven community skills by output, editing ability and setup requirements. Follow your agent’s guide for the right installation or office-mode route.',
    selectionTitle: 'Which PPT skill fits your task?',
    sourceIds: PRESENTATION_SOURCES.map(source => source.id),
    quickPicks: [
      { task: 'Create an editable deck from a document', sourceId: 'ppt-master', reason: 'Start with a workflow built around native PowerPoint objects and templates.' },
      { task: 'Edit visually, then hand over a PPTX', sourceId: 'dashi-ppt', reason: 'Use a browser editing step before exporting a PowerPoint file.' },
      { task: 'Turn slide screenshots into editable objects', sourceId: 'image-to-editable-ppt', reason: 'Choose reconstruction when the starting point is an existing visual deck.' },
      { task: 'Present an editorial story in a browser', sourceId: 'guizang-ppt', reason: 'Use an HTML presentation when browser delivery is the intended result.' },
    ],
    sections: [
      { title: 'Prepare a brief that produces the right file', paragraphs: ['Specify the audience, decision, source documents, slide count and exact deliverable before choosing a skill. Ask for native editable text and charts when colleagues need to revise the deck; choose HTML only when browser delivery is acceptable.', 'A useful starting brief is: “Create an eight-slide product update from these approved notes. Separate facts from assumptions, propose an outline and one sample slide, and list missing dependencies or paid services before generation. Deliver an editable PPTX and check it in the recipient’s presentation software.” Adapt the file requirement to the workflow selected below.'] },
      { title: 'Check one slide before generating the whole deck', paragraphs: ['Test a representative slide containing the hardest material: a chart, dense table, multilingual text or a brand template. Open the actual exported file, edit its text, inspect chart data and check fonts and clipping.', 'If the slide is flattened, select a native generation or reconstruction workflow. If browser output looks correct but PPTX shifts, inspect the export dependencies and font availability. Record the source revision and unresolved limitations; do not infer export quality from an author preview.'] },
      { title: 'What are PPT skills?', paragraphs: ['A PPT skill gives a coding agent reusable instructions and, sometimes, scripts for preparing slides. The name does not guarantee a PowerPoint file: some produce HTML, some assemble slide images into PPTX, and others create native PowerPoint objects.', 'Start with your audience, source material and required output. A deck that looks polished but cannot be edited is the wrong handoff when a colleague needs to change its charts or text.'] },
      { title: 'How we choose a presentation skill', paragraphs: ['Every choice below has presentation-specific instructions in a linked SKILL.md. We compare the documented workflow and exact output rather than ranking general libraries because their names contain “deck”.', 'GitHub adoption can help you discover a project, but it does not demonstrate output quality or install safety. These are source-based recommendations; a repository review and a completed deck test are separate evidence.'] },
    ],
    faq: [
      { question: 'Why does my exported PowerPoint look different from the browser preview?', answer: 'Browser rendering and PPTX export are separate steps. Check the exporter requirements, available fonts, slide dimensions and unsupported effects. Compare the actual exported file against the preview and try one representative slide before generating the entire deck.' },
      { question: 'Which PPT skill should I choose for editable PowerPoint?', answer: 'Shortlist PPT Master for new native decks and Dashi PPT for browser editing followed by PPTX export. For existing screenshots or image-based slides, inspect Image to Editable PPT. Check exported objects in PowerPoint before treating the handoff as complete.' },
      { question: 'Is an image-based PPTX editable?', answer: 'You can move or replace a slide image, but its text and charts are not separate PowerPoint objects. For object editing, choose native PPTX generation or a reconstruction workflow.' },
      { question: 'Can I use an HTML PPT skill to create a PowerPoint file?', answer: 'Only when the selected workflow documents a PPTX export route. Guizang PPT and HTML PPT Studio primarily deliver HTML. Dashi PPT documents a separate editable PPTX export step; check its dependencies and exported layout.' },
      { question: 'Do these PPT skills work with Codex and Claude Code?', answer: 'Compatibility varies. Frontend Slides documents a Claude Code plugin and core-skill use in Codex; Dashi and Guizang document both agents. Read each source’s setup instructions instead of assuming every agent shares the same slash command or plugin format.' },
      { question: 'Which PPT skills should I use with WorkBuddy?', answer: 'Start with WorkBuddy’s PPTX / Office skills for an existing PowerPoint or presentation task. For browser editing and PPTX export, Dashi PPT explicitly documents WorkBuddy support. Guizang PPT marks WorkBuddy as in adaptation. Use the WorkBuddy guide to inspect the setup and sources.' },
      { question: 'Can Trae, Cursor and CodeBuddy create PowerPoint with skills?', answer: 'PPT Master names all three as local IDE agents. Use a session that can read and write files and run the selected workflow. Cursor also appears in Dashi and Guizang’s platform notes. Follow the agent guides below to choose the output and setup.' },
      { question: 'Can I use PPT skills with Doubao (豆包)?', answer: 'Dashi PPT explicitly lists Doubao support with office mode. That does not mean every Doubao chat can execute a local skill. Check mode availability, Node.js and browser export access before using this route.' },
      { question: 'Are open-source PPT skills free to run?', answer: 'The source license and running costs are different. Coding-agent plans, image generation, OCR and hosted APIs may charge. The comparison lists documented requirements; exact provider prices depend on your setup.' },
      { question: 'Has OpenAgentSkill tested every generated deck?', answer: 'No. This guide compares the linked source instructions. Examples are labeled with their author and source; they do not imply an OpenAgentSkill installation, successful run or security certification.' },
    ],
  },
  {
    slug: 'ppt-generation', title: 'Best Skills for Editable PowerPoint (PPTX)',
    description: 'Choose skills for native editable PPTX, browser-to-PowerPoint export or rebuilding slide images. Compare editing limits and check your exported deck.',
    intro: 'Choose a workflow for the starting material you actually have: a document, a browser deck or screenshots. These three choices document editable PowerPoint output, but solve different jobs.',
    selectionTitle: 'Start from your input', sourceIds: ['ppt-master', 'dashi-ppt', 'image-to-editable-ppt'],
    quickPicks: [
      { task: 'Brief, PDF or existing brand template', sourceId: 'ppt-master', reason: 'Use native generation or the documented template/editing route.' },
      { task: 'A deck you want to adjust in the browser', sourceId: 'dashi-ppt', reason: 'Edit visually, then use the documented PowerPoint export.' },
      { task: 'Screenshots, PDF slides or flattened PPTX', sourceId: 'image-to-editable-ppt', reason: 'Rebuild visual slides as editable objects instead of authoring a new deck.' },
    ],
    sections: [
      { title: 'Editable PPTX means editable objects', paragraphs: ['A .pptx extension says how the file is packaged, not how its content is represented. A full-slide image inside PowerPoint remains one image. If your handoff requires changes to text, formulas, charts or shapes, specify those objects explicitly in your brief.', 'Generation creates a new deck from source material; reconstruction tries to recover objects from an existing visual deck. Choose the route before choosing a style.'] },
      { title: 'Check the export before handing it over', paragraphs: ['Open the exported file in the presentation software your recipient uses. Edit a heading, move a shape and check whether charts contain editable data. Review font substitutions, overflow, speaker notes and slide dimensions.', 'Compare a reconstructed slide with its original for text accuracy, object placement and visual fidelity. Keep the source revision and record what you checked; an author preview alone does not establish the quality of your export.'] },
    ],
    faq: [
      { question: 'Which skill creates native PowerPoint objects?', answer: 'PPT Master documents native PPTX generation and editing. Dashi PPT documents editable export from browser decks. Read the relevant route and verify the actual object types in your exported file.' },
      { question: 'How do I make slide screenshots editable?', answer: 'Use a reconstruction workflow such as Image to Editable PPT. It accepts existing visual slides and rebuilds their content; check text recognition and object placement against the original.' },
      { question: 'Can I reuse my company’s PowerPoint template?', answer: 'PPT Master documents a native template-filling route. Supply an approved template and your real content, then check fonts, masters, layouts and brand elements in the resulting PPTX.' },
      { question: 'Why does my PPTX contain only images?', answer: 'The selected workflow may assemble complete slide images into a PowerPoint container. That can be suitable for delivery, but choose native generation or reconstruction when individual objects must remain editable.' },
    ],
  },
  {
    slug: 'workbuddy-ppt-skills', title: 'WorkBuddy PPT Skills: Create and Edit Slides',
    description: 'Use WorkBuddy PPTX / Office skills for presentation tasks, or inspect Dashi PPT for browser editing and PowerPoint export. Follow setup and output checks.',
    intro: 'Start with WorkBuddy’s PPTX / Office skills for office presentations. If you want a browser editing step and PPTX export, inspect Dashi PPT, whose author explicitly lists WorkBuddy support. These are different setup routes.',
    selectionTitle: 'A community workflow documented for WorkBuddy',
    sourceIds: ['dashi-ppt'],
    quickPicks: [
      { task: 'Edit slides in a browser, then export PowerPoint', sourceId: 'dashi-ppt', reason: 'Dashi documents WorkBuddy support and an editable PPTX export route. Check its Node.js and browser requirements first.' },
    ],
    platformGuide: {
      id: 'workbuddy-pptx', label: 'WorkBuddy PPTX', eyebrow: 'WorkBuddy / Native document workflow', cta: 'Start with WorkBuddy PPTX', platform: 'WorkBuddy',
      title: 'WorkBuddy PPTX / Office skills',
      intro: 'Tencent’s Office Document Suite guide identifies PPTX as a built-in document skill for reading slides, summarizing their content, shortening a deck and rebuilding a presentation. Use the original file when revising an existing deck.',
      steps: [
        'Open Skills in WorkBuddy, find the PPTX / Office skill and check that it is enabled. Read the selected skill’s description in your installed version.',
        'Provide the source file or notes, audience, slide count and desired output. Review the outline or proposed changes before generating the full deck.',
        'Open the resulting file and check text, layout, notes and required editing ability. Continue the conversation with specific revisions.',
      ],
      prompt: 'Use the PPTX skill to turn these verified project notes into an eight-slide review deck. Show an outline first. Keep text and charts editable, preserve the source figures and flag anything that needs confirmation.',
      links: [
        { label: 'Official PPTX / Office skill guide', href: WORKBUDDY_DOCS.office },
        { label: 'WorkBuddy skill settings', href: WORKBUDDY_DOCS.skills },
        { label: 'Official presentation example', href: WORKBUDDY_DOCS.presentations },
      ],
    },
    sections: [
      { title: 'Use Dashi PPT with WorkBuddy', paragraphs: ['The linked author README lists WorkBuddy in its platform support table. Inspect the complete skill package, including its scripts and project files, and use the import route in your installed WorkBuddy client. Do not assume a Codex or Claude Code plugin command applies.', 'Dashi requires a local Node.js 20+ environment and a supported browser for export. Its source is AGPL-3.0, while the export engine has separate proprietary terms. Check the documented setup, any image service costs and the exported layout.'] },
      { title: 'Check the actual PowerPoint handoff', paragraphs: ['A browser preview and a PowerPoint export are separate deliverables. If the recipient must edit objects, request an editable PPTX and verify headings, shapes and chart data in the exported file.', 'WorkBuddy and CodeBuddy IDE are different clients. Use the WorkBuddy documentation linked here for its native skill controls; a shared brand does not make another client’s installation instructions interchangeable.'] },
    ],
    faq: [
      { question: 'Does WorkBuddy have a PPT skill?', answer: 'Tencent documents PPTX in its Office Document Suite. The guide describes reading existing slides, summarizing content, shortening structure and rebuilding presentations.' },
      { question: 'Which community PPT skill documents WorkBuddy support?', answer: 'Dashi PPT explicitly lists WorkBuddy as supported in its linked author README. This comparison has not established an OpenAgentSkill installation or runtime result.' },
      { question: 'Can I use Guizang PPT in WorkBuddy?', answer: 'The inspected Guizang README labels WorkBuddy as in adaptation. Check for a completed WorkBuddy release before treating it as a supported option.' },
      { question: 'Does a PPTX file guarantee editable text and charts?', answer: 'No. Specify the required objects and check the actual file. A full-slide image inside PPTX does not provide separate editable text or chart data.' },
      { question: 'Should I use a Claude Code plugin command in WorkBuddy?', answer: 'Follow the skill controls in your installed WorkBuddy client and the selected package’s instructions. A Claude Code plugin namespace is not automatically a WorkBuddy command.' },
    ],
  },
  {
    slug: 'codex-presentation-decks', title: 'Codex PPT Skills: Create, Edit and Check Slides',
    updatedAt: '2026-10-09',
    description: 'Build a Codex presentation workflow: choose editable PPTX, image-based slides or HTML, review the skill source, approve a sample and check the export.',
    intro: 'Give Codex a concrete presentation brief and choose the output before generating a full deck. Compare five documented workflow options, then use the step-by-step brief below.',
    selectionTitle: 'Choose a Codex workflow', sourceIds: ['ppt-master', 'codex-ppt', 'image-to-editable-ppt', 'dashi-ppt', 'guizang-ppt'],
    quickPicks: [
      { task: 'Create an editable PowerPoint from research', sourceId: 'ppt-master', reason: 'Choose the native generation route and supply verified source material.' },
      { task: 'Create a visually consistent image deck', sourceId: 'codex-ppt', reason: 'Use full-slide image generation when separate object editing is optional.' },
      { task: 'Reconstruct a deck from screenshots', sourceId: 'image-to-editable-ppt', reason: 'Keep this separate from new-deck authoring and compare against the input.' },
    ],
    sections: [
      { title: 'A practical Codex presentation workflow', paragraphs: ['1. Prepare the brief: audience, decision, slide count, source documents, brand assets and required file format. Use verified figures and images you can share.', '2. Ask Codex to inspect the selected skill’s instructions and local requirements. Agree on any image or OCR service needed for that workflow.', '3. Approve an outline and one representative slide. Check content density, visual style and required editability before producing the rest.', '4. Generate and export the deck. Open the exported file, check clipping, facts, fonts and speaker notes, and record the source revision and unresolved issues.'] },
      { title: 'Diagnose the first blocked step', paragraphs: ['If Codex cannot find the skill, check the installed directory and the source’s supported installation route. If the skill loads but cannot export, inspect local dependencies and the actual error before reinstalling the skill.', 'If image generation or OCR needs an external service, confirm the provider, credentials and budget in your local environment. Never paste API keys into a public prompt or example. Start with one slide; a successful script exit still needs a visual check of the exported file.'] },
      { title: 'Use a task brief, not an assumed slash command', paragraphs: ['Codex can use installed skills through its skill discovery and natural-language requests. A Claude Code plugin command is not automatically a Codex command. Follow the installation guide for your actual agent, then name the selected skill and required output.', 'For example: “Use PPT Master to turn these verified research notes into an eight-slide editable PPTX for our product team. Keep charts and text editable. Propose an outline and one sample slide first, then check the exported file in PowerPoint.”'] },
    ],
    faq: [
      { question: 'Which Codex PPT skill should I start with?', answer: 'Start from the deliverable. Inspect PPT Master for editable native PowerPoint, Codex PPT for full-slide image decks, Guizang PPT for browser delivery, and Image to Editable PPT for reconstructing an existing visual deck.' },
      { question: 'What should I include in a Codex presentation prompt?', answer: 'Specify the audience, decision, verified source material, slide count, brand assets and required format. State whether text and charts must be editable. Ask for an outline and a representative sample before the complete deck, then review the exported file.' },
      { question: 'Does copying an install command mean the presentation skill works?', answer: 'No. Copying is a preparation step. Installation, dependency setup, generation and export verification are separate stages. Record which stage succeeded and what remains unresolved.' },
      { question: 'Does Codex PPT produce separate editable textboxes?', answer: 'Its documented output assembles complete slide images into PPTX. Choose another workflow when individual textboxes, shapes or charts must be editable.' },
      { question: 'Should I use the Claude Code plugin command in Codex?', answer: 'Use the setup and invocation supported by your installed Codex client. Claude Code plugin namespaces and slash commands are agent-specific; the linked installation guides explain the different handoffs.' },
      { question: 'What should I give Codex before making slides?', answer: 'Supply the audience, desired decision, slide count, verified source content, approved brand assets, output format and editing requirements. Check one sample before generating a full deck.' },
    ],
  },
  {
    slug: 'trae-ppt-skills', title: 'Trae PPT Skills: Install and Create PowerPoint',
    description: 'Use PPT Master with Trae: import the full skill package, prepare a slide brief and check editable PowerPoint output. Includes TraeCode setup and source notes.',
    intro: 'Use Trae as a local presentation agent when you need a PowerPoint file from source documents or a company template. PPT Master explicitly names Trae among its IDE agents. Start with skill discovery and the workflow’s dependencies before asking for a full deck.',
    selectionTitle: 'A source-documented PowerPoint workflow for Trae',
    sourceIds: ['ppt-master'],
    quickPicks: [{ task: 'Turn a company brief into editable PowerPoint', sourceId: 'ppt-master', reason: 'Choose the native generation or template route; preserve the complete package and check the PowerPoint objects.' }],
    platformGuide: {
      id: 'trae-setup', label: 'Trae setup', eyebrow: 'Trae / Local skill workflow', cta: 'Set up PPT skills in Trae', platform: 'Trae',
      title: 'Add a PPT skill to TraeCode',
      intro: 'Trae’s Chinese documentation describes importing an external SKILL.md or a ZIP with its resources. PPT Master needs supporting files, so preserve its complete package and follow the repository’s setup instructions.',
      steps: [
        'Open Settings → Skills & Commands → Skills → Create in TraeCode. Choose project or global scope and import the selected package. Keep the scripts, templates and referenced resources, not just SKILL.md.',
        'Check that the skill is enabled and visible. The documented project directory is .trae/skills/<skill-name>/; the Chinese client’s global location is ~/.trae-cn/skills. Follow the documentation for your client and region.',
        'Ask the local agent to inspect the package’s dependencies, then supply verified content and an approved template. Request an outline and sample before generating the deck; check the exported PPTX in PowerPoint.',
      ],
      prompt: 'Use PPT Master to turn this product brief into an eight-slide editable PPTX. Use our approved template, keep text and charts editable, propose the outline first, and flag any export problems. 中文示例：用 PPT Master 把这份资料做成 8 页可编辑 PPT，先给大纲和一页样张。',
      links: [{ label: 'Official TraeCode skills guide', href: PRESENTATION_PLATFORM_DOCS.trae }],
    },
    sections: [
      { title: 'Keep installation and presentation inputs together', paragraphs: ['A presentation skill can reference scripts, templates and workflow files beyond SKILL.md. Importing a lone instruction file can leave these references missing. Inspect PPT Master’s setup and the selected route before running it.', 'Put the source documents and approved brand assets in the project, and name the intended audience and decision. If the output must remain editable, specify that requirement before generation.'] },
      { title: 'TraeCode and Trae CLI have different setup routes', paragraphs: ['This guide uses TraeCode’s IDE skill controls. Follow the corresponding client documentation when using Trae CLI or another regional edition; do not copy an IDE path into a different client without checking its discovery rules.'] },
    ],
    faq: [
      { question: 'Which PPT skill documents Trae support?', answer: 'PPT Master lists Trae among local IDE agents. Its general requirements include file access and command execution. This is an author compatibility statement; OpenAgentSkill has not run an installation test in Trae.' },
      { question: 'Where do I add a skill in TraeCode?', answer: 'The official Chinese guide uses Settings → Skills & Commands, where you can create or import a project or global skill. Project packages are stored under .trae/skills. Keep the full package when the workflow needs supporting resources.' },
      { question: 'Will an HTML slide deck be editable in PowerPoint?', answer: 'HTML and PPTX are different outputs. Select PPT Master’s native PowerPoint route and verify the exported objects when you need an editable file.' },
      { question: 'How do I ask Trae to use the PPT skill?', answer: 'Name the installed skill in your request and provide source content, audience, slide count and output format. Ask for an outline and sample first rather than assuming another agent’s plugin command works in Trae.' },
    ],
  },
  {
    slug: 'doubao-ppt-skills', title: 'Doubao (豆包) PPT Skills: Office Mode Guide',
    description: 'Use Dashi PPT with Doubao office mode for browser editing and PowerPoint export. Check mode access, Node.js, browser dependencies and editable PPTX output.',
    intro: 'Looking for a Doubao PPT skill? Dashi PPT’s author explicitly lists 豆包 / Doubao as supported with office mode. Use this guide to check that requirement and the local export environment before choosing the workflow.',
    selectionTitle: 'A community PPT workflow documented for Doubao office mode',
    sourceIds: ['dashi-ppt'],
    quickPicks: [{ task: 'Edit in a browser, then export a PPTX', sourceId: 'dashi-ppt', reason: 'Dashi names Doubao office mode in its platform table. Inspect the package, local dependencies and export terms first.' }],
    platformGuide: {
      id: 'doubao-office-mode', label: 'Doubao office mode', eyebrow: 'Doubao / Office-mode requirement', cta: 'Check Doubao office mode', platform: 'Doubao',
      title: 'Check the office-mode requirement before starting',
      intro: 'This setup condition comes from Dashi’s author README. It does not establish a universal Doubao skill installer or guarantee that office mode is available in every account, region or client version.',
      steps: [
        'Check whether your Doubao client offers office mode and can access the selected skill package. If that mode is unavailable, use another documented local agent from the main comparison.',
        'Preserve the full Dashi package and confirm that the session can use its local file, Node.js 20+ and browser requirements. Ask it to inspect the instructions before generation; a pasted SKILL.md alone does not supply the export tools.',
        'Supply the audience, verified notes, desired slide count and required output. Review the HTML deck, export PPTX, and open that file to check layout and editable text separately.',
      ],
      prompt: '豆包做 PPT：使用 Dashi PPT，将这份已核对的项目资料做成 8 页汇报，先给大纲和一页样张。最终需要可编辑 PPTX，请先检查办公模式、Node.js 和浏览器导出条件，并说明导出后的文字和图表是否可编辑。',
      links: [{ label: 'Dashi’s Doubao platform notes', href: 'https://github.com/chuspeeism/dashi-ppt-skill/blob/21dc7e5fc8c3a0d7f6a94948153dd1ee954f4e64/README.en.md' }],
    },
    sections: [
      { title: 'A chat answer is different from a local PPT workflow', paragraphs: ['Dashi generates a browser deck and uses a local export workflow. Its author does not recommend ordinary web chatbots for this generator. Being able to draft slide text in chat does not establish the ability to run the package or export a PowerPoint file.', 'If your mode cannot meet the requirements, use a supported local agent such as Codex, Claude Code or WorkBuddy instead of assuming the missing tools are available.'] },
      { title: 'Review export terms and the resulting file', paragraphs: ['Dashi’s repository source uses AGPL-3.0; its export engine has separate proprietary terms. Review those terms and any image-generation costs before choosing it for a commercial workflow.', 'Check headings, fonts and layout after exporting. An editable text object does not prove that every image or chart is also a native editable PowerPoint object.'] },
    ],
    faq: [
      { question: 'Can Doubao (豆包) use Dashi PPT?', answer: 'The inspected author README lists Doubao as supported with office mode. Confirm that your installed client has that mode and provides the local tools the generator needs.' },
      { question: 'Can I paste the skill into any Doubao chat?', answer: 'A pasted instruction file does not provide Node.js, scripts or browser export. The author’s support claim is scoped to office mode; ordinary chat-only access is not established as a supported execution route.' },
      { question: 'Why is there no universal Doubao installation command here?', answer: 'The inspected source establishes an office-mode requirement, not a universal plugin command or skill directory for all Doubao clients. Follow your installed client’s actual controls and the package instructions.' },
      { question: 'Does Dashi make editable PowerPoint?', answer: 'It documents an editable PPTX export route from an HTML deck. Open the export to check which text, shapes and charts are editable; do not use the browser preview alone as proof.' },
    ],
  },
  {
    slug: 'cursor-ppt-skills', title: 'Cursor PPT Skills: Editable PowerPoint or HTML',
    description: 'Choose PPT Master, Dashi PPT or Guizang PPT in Cursor Agent. Check skill discovery, local tool access and the difference between editable PPTX and HTML slides.',
    intro: 'Use Cursor Agent to create a presentation from files in your workspace. Choose native PowerPoint objects, browser editing with PPTX export, or a browser-only HTML deck. The three choices below explicitly name Cursor in their author documentation.',
    selectionTitle: 'Choose the presentation handoff for Cursor',
    sourceIds: ['ppt-master', 'dashi-ppt', 'guizang-ppt'],
    quickPicks: [
      { task: 'Deliver native editable PowerPoint', sourceId: 'ppt-master', reason: 'Start with native generation or a PowerPoint template when colleagues will edit the file.' },
      { task: 'Edit in a browser, then export PowerPoint', sourceId: 'dashi-ppt', reason: 'Use the browser editing workflow and check the separate PPTX export.' },
      { task: 'Present an editorial HTML story', sourceId: 'guizang-ppt', reason: 'Choose a browser deliverable when native PowerPoint is not required.' },
    ],
    platformGuide: {
      id: 'cursor-setup', label: 'Cursor Agent setup', eyebrow: 'Cursor / Local Agent skills', cta: 'Set up Cursor PPT skills', platform: 'Cursor',
      title: 'Discover and invoke the skill in Cursor Agent',
      intro: 'Cursor’s official skills guide describes automatic discovery at startup and manual selection through the slash picker in Agent chat. Each selected workflow still needs its supporting files and local tools.',
      steps: [
        'Follow the current Cursor skills guide to add the complete package in a supported skill directory. Retain its scripts and templates; check that Cursor discovers the skill when it starts.',
        'In Agent chat, type / and search for the discovered skill name, or describe the presentation task so Agent can select the relevant skill. Follow your installed version’s controls rather than another client’s plugin namespace.',
        'Confirm local file and shell access and the selected workflow’s dependencies. Request an outline and sample, then inspect the exported PowerPoint or final HTML at presentation size.',
      ],
      prompt: 'Use the selected PPT skill to turn these product notes into an eight-slide deck for our customer team. We need editable PowerPoint text and charts. Propose the outline and one sample first; tell me if the chosen workflow only produces HTML or slide images.',
      links: [{ label: 'Official Cursor Agent Skills guide', href: PRESENTATION_PLATFORM_DOCS.cursor }],
    },
    sections: [
      { title: 'Choose a local Agent session for generation', paragraphs: ['PPT Master lists Cursor as an IDE-native agent. Dashi and Guizang explicitly require local file and shell capabilities for Cursor. Check these capabilities in the session where you will create the deck.', 'A skill can describe a process without supplying the runtime tools. Review dependencies before generation, particularly Dashi’s local browser export and any optional image service.'] },
      { title: 'Match the output to the handoff', paragraphs: ['Use native PowerPoint for later object editing, Dashi for a visual editing step before export, or Guizang for HTML presentation. If someone asks for a .pptx file, a polished HTML preview does not satisfy that request.'] },
    ],
    faq: [
      { question: 'Which PPT skills document Cursor compatibility?', answer: 'PPT Master names Cursor as an IDE agent. Dashi lists Cursor as usable with local file and shell access, and Guizang describes the same requirements. These are source statements, not installation tests by OpenAgentSkill.' },
      { question: 'How do I invoke a PPT skill in Cursor?', answer: 'The official guide supports automatic selection from context and manual selection by typing / in Agent chat and finding the skill name. First check that the full package is installed and discovered.' },
      { question: 'Which Cursor option creates editable PowerPoint?', answer: 'Inspect PPT Master’s native generation route or Dashi’s PPTX export. Guizang’s documented output is HTML. Check actual object editing in the exported PowerPoint file.' },
      { question: 'Can a chat-only Cursor session run the workflow?', answer: 'The listed workflows require access to local files and, where documented, shell commands and export dependencies. Confirm those capabilities in the chosen Agent session.' },
    ],
  },
  {
    slug: 'codebuddy-ppt-skills', title: 'CodeBuddy PPT Skills: IDE Setup and PowerPoint',
    description: 'Create presentations in CodeBuddy IDE using its official PPT guide or PPT Master. Check skill setup, templates and editable PowerPoint output.',
    intro: 'CodeBuddy IDE can serve as a local presentation workspace. Tencent publishes a PPT writing guide using document skills, and PPT Master names CodeBuddy IDE among its supported agent environments. Choose a route based on the output you need.',
    selectionTitle: 'A community native-PowerPoint route for CodeBuddy IDE',
    sourceIds: ['ppt-master'],
    quickPicks: [{ task: 'Create native PowerPoint from a brand template', sourceId: 'ppt-master', reason: 'Choose PPT Master’s documented generation or template route, then check the exported objects.' }],
    platformGuide: {
      id: 'codebuddy-setup', label: 'CodeBuddy IDE setup', eyebrow: 'CodeBuddy IDE / Presentation workflow', cta: 'Set up CodeBuddy PPT skills', platform: 'CodeBuddy IDE',
      title: 'Start with Tencent’s CodeBuddy PPT writing guide',
      intro: 'Tencent’s best-practice guide includes a PPT writing walkthrough using the document-skills package. It describes presentation creation, editing and analysis. Follow that IDE workflow when starting with document skills.',
      steps: [
        'Open a local presentation workspace in CodeBuddy IDE. In the official best-practice guide, follow the PPT writing walkthrough and its document-skills setup for your installed client.',
        'Alternatively, inspect PPT Master’s complete package and repository setup. Its author names CodeBuddy IDE and requires agent capabilities for reading files, writing output and executing the selected workflow.',
        'Supply verified content, the audience, slide count and approved template. Ask for an outline and sample, then inspect fonts, layout and required object editing in the final PowerPoint.',
      ],
      prompt: 'Use the selected presentation skill to create an eight-slide editable PPTX from these project notes and our approved template. Keep text and charts editable, review the outline first, and report any unsupported export requirements.',
      links: [{ label: 'Official CodeBuddy PPT best-practice guide', href: PRESENTATION_PLATFORM_DOCS.codebuddy }],
    },
    sections: [
      { title: 'CodeBuddy IDE and WorkBuddy use separate instructions', paragraphs: ['This page covers CodeBuddy IDE. WorkBuddy has its own skill controls and Office / PPTX documentation. Use the WorkBuddy page when that is your client; sharing Tencent branding does not make their installers or invocation commands interchangeable.'] },
      { title: 'Choose a template route for brand-sensitive decks', paragraphs: ['If you need consistent fonts and layouts, supply the approved PowerPoint template and ask the chosen workflow to preserve it. PPT Master documents native template filling as a route distinct from new-deck generation.', 'Check the resulting file in PowerPoint. The author’s compatibility statement is not a guarantee of successful installation, layout fidelity or chart editability on your machine.'] },
    ],
    faq: [
      { question: 'Can CodeBuddy IDE create and edit PPT files with skills?', answer: 'Tencent’s official best-practice guide includes a PPT writing walkthrough using document skills for presentation creation, editing and analysis. Follow that guide for your installed IDE.' },
      { question: 'Which community PPT skill names CodeBuddy IDE?', answer: 'PPT Master names CodeBuddy IDE among local IDE agents. Review its selected workflow and dependencies; this comparison does not establish an OpenAgentSkill runtime test.' },
      { question: 'Is CodeBuddy IDE’s PPT setup the same as WorkBuddy?', answer: 'They are separate clients. Use CodeBuddy’s IDE guide here, or the dedicated WorkBuddy guide for WorkBuddy’s PPTX / Office skills and skill controls.' },
      { question: 'How do I get an editable branded PowerPoint?', answer: 'Use a workflow that documents native PowerPoint or editable PPTX export, provide an approved template, and check the actual exported text, charts, fonts and layouts.' },
    ],
  },
]

export function getPresentationPage(slug: string) {
  return PRESENTATION_PAGES.find(page => page.slug === slug)
}

export function getPresentationSources(page: PresentationPageDefinition) {
  return page.sourceIds.map(id => PRESENTATION_SOURCES.find(source => source.id === id)!).filter(Boolean)
}

export function presentationSourceUrl(source: PresentationSource) {
  return `https://github.com/${source.repository}/blob/${source.commit}/${source.path}`
}

export function presentationStructuredData(page: PresentationPageDefinition) {
  const url = `https://www.openagentskill.com/best/${page.slug}`
  const sources = getPresentationSources(page)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': url, url, name: page.title, description: page.description,
        dateModified: page.updatedAt || PRESENTATION_UPDATED_AT, inLanguage: 'en',
        publisher: { '@type': 'Organization', name: 'OpenAgentSkill', url: 'https://www.openagentskill.com' },
        mainEntity: { '@id': `${url}#comparison` } },
      { '@type': 'ItemList', '@id': `${url}#comparison`, numberOfItems: sources.length,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: sources.map((source, index) => ({ '@type': 'ListItem', position: index + 1,
          name: source.name, url: `https://www.openagentskill.com/skills/${source.registrySlug}` })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Best skills', item: 'https://www.openagentskill.com/best' },
        { '@type': 'ListItem', position: 2, name: page.title, item: url },
      ] },
    ],
  }
}
