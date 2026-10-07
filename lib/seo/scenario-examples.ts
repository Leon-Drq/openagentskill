export interface ScenarioExample {
  id: string
  title: string
  input: string
  output: string
  evidence: string
  limitations: string
  image?: string
  video?: string
  links: Array<{ label: string; href: string }>
}

const root = '/examples/scenarios'
export const SCENARIO_EXAMPLES: ScenarioExample[] = [
  {
    id: 'frontend-landing', title: 'A landing page from a product brief',
    input: 'A fictional task-management product, approved sample copy and an accessible single-page layout.',
    output: 'A responsive HTML landing page with keyboard-visible navigation and an FAQ.',
    evidence: 'Original OpenAgentSkill editorial example. Browser layout checked at desktop and mobile widths; local links and headings inspected.',
    limitations: 'Sample copy and figures are fictional. This is not a comparative run of the listed design skills.',
    image: `${root}/landing-preview.png`,
    links: [{ label: 'Open the page', href: `${root}/landing.html` }, { label: 'Download the input brief', href: `${root}/frontend-briefs.json` }],
  },
  {
    id: 'frontend-dashboard', title: 'A product dashboard with useful states',
    input: 'A fictional operations dashboard with a task table, status labels and an empty-state specification.',
    output: 'Responsive HTML with sample records, an accessible filter and a meaningful empty state.',
    evidence: 'Original editorial example. Filter interaction and the empty state checked in a browser; sample records remain local.',
    limitations: 'No live backend or customer metrics. It demonstrates product UI requirements, not backend integration or a usability study.',
    image: `${root}/dashboard-preview.png`,
    links: [{ label: 'Try the dashboard', href: `${root}/dashboard.html` }, { label: 'Download the input brief', href: `${root}/frontend-briefs.json` }],
  },
  {
    id: 'frontend-handoff', title: 'A design-token handoff to code',
    input: 'A local component specification with explicit colors, spacing, type and card dimensions.',
    output: 'An HTML component implementation and its machine-readable design tokens.',
    evidence: 'Original editorial fixture. The implemented colors, spacing and card width are compared with the supplied local token specification.',
    limitations: 'The source is a local design specification, not a private Figma file. A real Figma fidelity check requires your accessible frame and Figma MCP.',
    image: `${root}/handoff-preview.png`,
    links: [{ label: 'Inspect the implementation', href: `${root}/design-handoff.html` }, { label: 'Download design tokens', href: `${root}/design-tokens.json` }],
  },
  {
    id: 'remotion-demo', title: 'A React composition rendered to MP4',
    input: 'Original OpenAgentSkill copy and a frame-driven, silent title-card composition; no stock media or external generation APIs.',
    output: 'A 6-second, 1280 × 720 MP4 at 30 FPS, plus the editable React source.',
    evidence: 'Local Remotion render. The exported file is decoded and beginning, middle and end frames are inspected. Production versions and checks are recorded with the example.',
    limitations: 'A small code-animation example, not AI footage or a client compatibility benchmark. Renderer licensing remains a separate consideration.',
    image: `${root}/remotion-preview.png`, video: `${root}/remotion-demo.mp4`,
    links: [{ label: 'Download the MP4', href: `${root}/remotion-demo.mp4` }, { label: 'Download React source', href: `${root}/remotion-composition.tsx.txt` }, { label: 'Download entry point', href: `${root}/remotion-index.ts.txt` }, { label: 'Production notes', href: `${root}/production-notes.json` }],
  },
  {
    id: 'spreadsheet-cleanup', title: 'Messy CSV to an editable Excel workbook',
    input: 'Six synthetic sales rows: padded labels, currency strings, one exact duplicate, a blank value and an invalid revenue value.',
    output: 'Five unique records with typed dates and numbers, two review flags, a formula total and the preserved original CSV.',
    evidence: 'Known revenue reconciles to $2,650.50. Editing one revenue updates the total; missing values stay unavailable. Workbook structure and both sheet previews are checked.',
    limitations: 'Produced with a spreadsheet authoring library, not a claimed runtime test of every listed XLSX skill. Native Excel was not executed.',
    image: `${root}/spreadsheet-preview.png`,
    links: [{ label: 'Download messy CSV', href: `${root}/messy-sales.csv` }, { label: 'Download cleaned XLSX', href: `${root}/cleaned-sales.xlsx` }, { label: 'Production notes', href: `${root}/production-notes.json` }],
  },
  {
    id: 'word-brief', title: 'Structured notes to an editable Word brief',
    input: 'A fictional product launch brief in JSON, with supplied changes and unresolved publication items.',
    output: 'An editable DOCX with native headings, paragraphs and a project-context table.',
    evidence: 'Saved paragraphs and table rows are compared with the input; the rendered page is inspected for layout problems.',
    limitations: 'Original editorial fixture made with a document library. No real launch date or business result is invented, and this is not a comparative Skill benchmark.',
    image: `${root}/word-preview.png`,
    links: [{ label: 'Download input notes', href: `${root}/launch-brief-input.json` }, { label: 'Download editable DOCX', href: `${root}/editable-launch-brief.docx` }, { label: 'Production notes', href: `${root}/production-notes.json` }],
  },
]

export function getScenarioExamples(ids: string[]) {
  return ids.map(id => SCENARIO_EXAMPLES.find(example => example.id === id)!).filter(Boolean)
}
