export interface TaskPlaybook {
  id: string
  updatedAt: string
  title: string
  intro: string
  inputs: string[]
  brief: string
  checks: string[]
  problems: Array<{ symptom: string; action: string }>
  links: Array<{ label: string; href: string }>
}

const ppt: TaskPlaybook = {
  id: 'editable-ppt', updatedAt: '2026-11-04',
  title: 'Try one editable slide before a full deck',
  intro: 'Use a small product update to check whether a PPT skill delivers the kind of PowerPoint file your colleagues can actually edit.',
  inputs: ['Approved notes with sources for every number; audience and decision.', 'A PowerPoint template if required, plus fonts and brand assets you can use.', 'Required output: native editable PPTX, image slides or browser presentation.'],
  brief: 'Help me turn my supplied notes into an eight-slide product update. First ask for the audience, decision, missing sources and required file format. Compare the relevant presentation skills by output and setup. Read the chosen source instructions and explain any external services or costs before running it. I need a native editable PPTX: text must be editable, and charts must keep their data. Start with an outline and one representative slide containing a chart and a source note. Do not invent numbers. Open and inspect the exported file, then report editability, fonts, clipping and missing dependencies before generating the rest.',
  checks: ['Select and edit a sentence in the exported PPTX; a full-slide image does not pass this requirement.', 'Change a chart value and confirm the chart updates, if editable charts were requested.', 'Compare source numbers, fonts, line breaks and speaker notes in the actual recipient application.'],
  problems: [
    { symptom: 'The PPTX contains one picture per slide', action: 'Choose a native-object workflow or the reconstruction route. Changing the filename or exporting HTML again does not create editable objects.' },
    { symptom: 'The browser preview looks right but the PPTX shifts', action: 'Check installed fonts and the export engine on the sample slide. Keep both files for comparison before producing more slides.' },
    { symptom: 'The agent cannot find or run the skill', action: 'Check the installation route for your actual client and keep the source scripts together. A Claude Code plugin command is not automatically a Codex command.' },
  ],
  links: [{ label: 'Choose native editable PPTX', href: '/best/ppt-generation' }, { label: 'Use a Codex presentation workflow', href: '/best/codex-presentation-decks' }, { label: 'Install in Claude Code', href: '/guides/install-agent-skills-in-claude-code' }],
}

const frontend: TaskPlaybook = {
  id: 'frontend-brief', updatedAt: '2026-11-04',
  title: 'Start with one page and its difficult states',
  intro: 'A frontend design skill needs a concrete page brief. Use the examples on this page to decide whether you need visual direction, a dashboard or a Figma implementation.',
  inputs: ['Page purpose, intended audience, approved copy and assets.', 'Existing repository, framework and design system; identify what must stay unchanged.', 'For Figma to code: an accessible frame, its assets and design tokens.'],
  brief: 'Help me implement one page in this repository using its existing design system. Ask for the audience, page type, approved copy and missing assets. Choose a frontend design workflow appropriate for a landing page, dashboard or supplied Figma frame; explain the choice and dependencies. Propose one layout before implementation. Preserve existing navigation and unrelated work. Check widths 320, 390, 768 and 1440 pixels, keyboard focus, long text, and any loading, empty and error states this page needs. Report the checks actually performed and remaining issues. Do not invent customer counts, testimonials or conversion results.',
  checks: ['Long text and controls remain usable at 320 pixels without horizontal page overflow.', 'Tab navigation reaches each control and shows focus; meaningful images have text alternatives.', 'Empty, loading and failure states make sense; sample records are clearly labeled.'],
  problems: [
    { symptom: 'A good-looking landing page becomes an unusable dashboard', action: 'Choose product UI guidance and define table, filter and empty states. A marketing-page workflow may not cover those requirements.' },
    { symptom: 'Figma output differs from the approved frame', action: 'Confirm access to the intended node, assets and tokens, then compare the implementation with that frame at the same viewport.' },
    { symptom: 'The desktop version works but mobile content is cut off', action: 'Check fixed widths, long strings and table containers. Repair the component instead of hiding overflow on the whole page.' },
  ],
  links: [{ label: 'Inspect the landing-page example', href: '/best/frontend-design-skills#examples' }, { label: 'Follow the frontend workflow', href: '/guides/frontend-design-skill-workflow' }],
}

const architecture: TaskPlaybook = {
  id: 'architecture-brief', updatedAt: '2026-11-04',
  title: 'Turn a component list into a diagram you can check',
  intro: 'Start with the supplied four-component example, then replace its fictional facts with evidence from your own system. A polished diagram still needs correct relationships.',
  inputs: ['Named components, responsibilities and directed relationships.', 'For an existing system: repository files or approved architecture notes that support each relationship.', 'The audience, diagram type and required editable source or export format.'],
  brief: 'Help me diagram the system described in my supplied component and relationship list. Ask about missing boundaries and ambiguous arrows before drawing. Use an architecture diagram for components, a sequence diagram for request order, or a lifecycle diagram for states. Preserve component names and arrow direction. If using Archify, read the matching schema and its source instructions; keep the complete package and validate the candidate before delivery. Return editable source and the requested viewable output. Check every node and relationship against the input and list assumptions separately. Do not infer deployment, security or uptime guarantees from the diagram.',
  checks: ['Every drawn node and relationship has an input source; assumptions are explicit.', 'Arrow direction, labels and system boundaries survive the export.', 'The editable source is included and the final diagram remains readable without clipped labels.'],
  problems: [
    { symptom: 'The picture is attractive but shows the wrong system', action: 'Reconcile nodes and edges with the input list. Remove invented infrastructure and identify relationships that still need evidence.' },
    { symptom: 'A Mermaid conversion changes the meaning', action: 'Compare participants, branches, message order and state transitions. Treat the input as topology rather than copying only its visual style.' },
    { symptom: 'A colleague needs a Draw.io file', action: 'Specify .drawio as an independent requirement. The reviewed Archify instructions describe HTML and image/SVG export; this page does not claim native Draw.io export.' },
  ],
  links: [{ label: 'Inspect Archify and its source status', href: '/skills/tt-a1i-archify' }, { label: 'Compare design workflows', href: '/best/frontend-design-skills' }],
}

const spreadsheet: TaskPlaybook = {
  id: 'csv-cleanup', updatedAt: '2026-11-04',
  title: 'Try the six-row CSV cleanup task',
  intro: 'The linked downloadable example has an exact duplicate, mixed number formats and missing values. It gives you a small, inspectable first task for an Excel or XLSX skill.',
  inputs: ['The original CSV, preserved unchanged.', 'A record key and explicit rules for duplicates, currencies, dates and missing values.', 'A workbook specification: sheet names, editable inputs, formulas and required charts.'],
  brief: 'Use the supplied messy-sales.csv to create a new editable XLSX workbook. Keep the original input unchanged. Trim labels, parse valid dates and currency values, and remove only exact duplicate records. Do not replace missing or invalid revenue with zero; flag those rows for review. Keep the cleaned table, a review explanation and a formula total for known revenue. Reconcile input and output record counts. Save the workbook, reopen it, verify formulas with a calculation engine when available, and inspect its layout. State if recalculation or native Excel testing was not performed.',
  checks: ['For this fixture only: six input rows become five unique records, with two revenue values requiring review.', 'Known revenue totals $2,650.50; blank and invalid revenue remain distinguishable from real zero.', 'Edit an input and check the recalculated total. A written formula without a calculated result is not sufficient.'],
  problems: [
    { symptom: 'The total is blank when another tool opens the file', action: 'The workbook may lack cached formula results. Recalculate in a compatible engine, reopen the saved file and verify both formula and value.' },
    { symptom: 'The total looks right but records disappeared', action: 'Compare row counts and the duplicate key. Similar names are not necessarily duplicate records.' },
    { symptom: 'Missing revenue became zero', action: 'Restore missingness and add review flags. A zero is a real value and changes the interpretation of the report.' },
  ],
  links: [{ label: 'Download the original CSV', href: '/examples/scenarios/messy-sales.csv' }, { label: 'Inspect the existing XLSX example', href: '/examples/scenarios/cleaned-sales.xlsx' }, { label: 'Read the CSV-to-XLSX guide', href: '/guides/csv-to-xlsx-skill-workflow' }],
}

const pdf: TaskPlaybook = {
  id: 'pdf-table', updatedAt: '2026-11-04',
  title: 'Extract one PDF table and reconcile it',
  intro: 'Try the linked original, synthetic service-usage PDF. Its selectable text and three-row table provide a reproducible extraction task before you tackle a long report or scanned document.',
  inputs: ['A PDF you can process, plus the page range and required columns.', 'Whether text is selectable; image-only scans need a separate OCR step.', 'A target format and a rule for keeping page references, units and unreadable values.'],
  brief: 'Extract the service-usage table from the supplied PDF into CSV and JSON. First determine whether the page has selectable text. Keep the service name, requests, error count and source page for each data row; keep the Total row separate from the records. Preserve units and report ambiguous or missing values rather than guessing. Reconcile the number of rows and both totals against the PDF, and visually compare the table with the page. If OCR is required, disclose that step and its uncertain characters. Return the original file, extracted data and a short validation report.',
  checks: ['For this fixture: three service records, 1,500 requests and seven errors; the Total row is not a fourth service.', 'Each extracted record retains source page 1 and the correct column meanings.', 'Compare the original page with the CSV and JSON. This example does not establish OCR accuracy on scans.'],
  problems: [
    { symptom: 'Text extraction returns nothing', action: 'Check whether the page is an image. Use OCR for a scan, and inspect uncertain digits and page orientation.' },
    { symptom: 'Numbers move into the wrong columns', action: 'Compare the table grid and headings with the page. Multi-column layouts and merged cells need explicit reconstruction.' },
    { symptom: 'Totals double after extraction', action: 'Check whether the summary row was included as a normal record. Keep totals separate and reconcile once.' },
  ],
  links: [{ label: 'Download the sample PDF', href: '/examples/topic-growth/service-usage.pdf' }, { label: 'Inspect the extracted CSV', href: '/examples/topic-growth/service-usage.csv' }, { label: 'Compare extraction and OCR', href: '/guides/pdf-extraction-vs-ocr-skills' }],
}

export const TASK_PLAYBOOKS: Readonly<Record<string, TaskPlaybook>> = {
  'presentation-generation': ppt,
  'ppt-generation': ppt,
  'codex-presentation-decks': { ...ppt, id: 'codex-ppt', title: 'Give Codex a brief with a verifiable handoff', links: [{ label: 'Install a skill in Codex', href: '/guides/install-agent-skills-in-codex' }, { label: 'Compare all PPT workflows', href: '/best/presentation-generation' }] },
  'architecture-diagram-skills': architecture,
  'frontend-design-skills': frontend,
  'claude-excel-skills': spreadsheet,
  'claude-code-pdf-parsing': pdf,
}

export function getTaskPlaybook(slug: string): TaskPlaybook | undefined { return TASK_PLAYBOOKS[slug] }
