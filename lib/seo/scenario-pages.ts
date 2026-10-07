export const SCENARIO_UPDATED_AT = '2026-10-07'

export interface ScenarioSource { id: string; name: string; repository: string; path: string; commit: string; registrySlug: string | null; role: string; output: string; setup: string; limits: string; topic: string }
export interface ScenarioTopic { slug: string; shortTitle: string; title: string; description: string; useCaseSlug: string; intro: string; sourceIds: string[]; choices: Array<{task: string; sourceId?: string; href?: string; reason: string}>; steps: string[]; exampleIds: string[]; guideSlug?: string; related: Array<{href: string; label: string}>; faq: Array<{question: string; answer: string}> }

export const SCENARIO_SOURCES: ScenarioSource[] = [
  {
    "id": "frontend",
    "repository": "anthropics/skills",
    "path": "skills/frontend-design/SKILL.md",
    "commit": "683bc88e56f3e09ba94f7055977f3d3aa499f202",
    "name": "Frontend Design",
    "registrySlug": "anthropic-frontend-design",
    "role": "Visual direction and implementation",
    "output": "Frontend code for a distinctive interface",
    "setup": "A coding agent and the target application's toolchain",
    "limits": "Choose a design direction from the brief. It does not establish accessibility or browser correctness.",
    "topic": "frontend"
  },
  {
    "id": "uiux",
    "repository": "nextlevelbuilder/ui-ux-pro-max-skill",
    "path": ".claude/skills/ui-ux-pro-max/SKILL.md",
    "commit": "477bcb28c9812b385cb51a4605ddf30d7b2266e2",
    "name": "UI UX Pro Max",
    "registrySlug": "nextlevelbuilder-ui-ux-pro-max-skill",
    "role": "UI systems and product interfaces",
    "output": "Design choices, component guidance and implementation",
    "setup": "Keep the source's data and scripts; inspect its client-specific setup",
    "limits": "Use for product UI and dashboards. Searchable design guidance is not a usability study.",
    "topic": "frontend"
  },
  {
    "id": "taste",
    "repository": "Leonxlnx/taste-skill",
    "path": "skills/taste-skill/SKILL.md",
    "commit": "e3c92037548e3e49bea8e6b906c99a8549654e71",
    "name": "Taste Skill",
    "registrySlug": "design-taste-frontend",
    "role": "Landing pages and purposeful redesigns",
    "output": "Landing pages, portfolios and editorial frontend layouts",
    "setup": "A coding agent with access to the brief and existing code",
    "limits": "The checked source excludes dashboards, data tables and multi-step product UI.",
    "topic": "frontend"
  },
  {
    "id": "figma",
    "repository": "openai/skills",
    "path": "skills/.curated/figma-implement-design/SKILL.md",
    "commit": "49f948faa9258a0c61caceaf225e179651397431",
    "name": "Figma Implement Design",
    "registrySlug": "figma-implement-design",
    "role": "Implement an approved design",
    "output": "Application code guided by Figma frames and tokens",
    "setup": "Figma MCP, an accessible design URL or selected desktop node, and repository access",
    "limits": "Requires the actual design and access. A screenshot-only reconstruction is a different task.",
    "topic": "frontend"
  },
  {
    "id": "review",
    "repository": "vercel-labs/agent-skills",
    "path": "skills/web-design-guidelines/SKILL.md",
    "commit": "063bee94c3f4df8453406c830b0a7df0f2860278",
    "name": "Web Design Guidelines",
    "registrySlug": "vercel-web-design-guidelines",
    "role": "Review an implementation",
    "output": "Findings against web interface guidelines",
    "setup": "UI files and access to the source's current guidelines",
    "limits": "Reviews existing UI. It does not generate an entire application or certify compliance.",
    "topic": "frontend"
  },
  {
    "id": "react",
    "repository": "vercel-labs/agent-skills",
    "path": "skills/react-best-practices/SKILL.md",
    "commit": "063bee94c3f4df8453406c830b0a7df0f2860278",
    "name": "Vercel React Best Practices",
    "registrySlug": "vercel-react-best-practices",
    "role": "React and Next.js performance",
    "output": "Focused implementation or refactoring guidance",
    "setup": "An existing React / Next.js project and its checks",
    "limits": "Measure affected user flows after changes. Static guidance is not a performance benchmark.",
    "topic": "frontend"
  },
  {
    "id": "remotion",
    "repository": "remotion-dev/skills",
    "path": "skills/remotion-best-practices/SKILL.md",
    "commit": "473352613039e718e46655a26df224851e84c4aa",
    "name": "Remotion Agent Skills",
    "registrySlug": "remotion-dev-skills",
    "role": "Code-driven motion graphics",
    "output": "Editable React composition and a rendered video",
    "setup": "Node.js, a Remotion project, browser rendering and current renderer license terms",
    "limits": "These are agent instructions, not a video model. Footage, voice and music need separate assets or services.",
    "topic": "video"
  },
  {
    "id": "pdf",
    "repository": "anthropics/skills",
    "path": "skills/pdf/SKILL.md",
    "commit": "683bc88e56f3e09ba94f7055977f3d3aa499f202",
    "name": "Anthropic PDF",
    "registrySlug": null,
    "role": "Read, extract, OCR and assemble PDFs",
    "output": "Extracted text or tables, searchable PDFs, or generated PDF files",
    "setup": "The source's Python / CLI dependencies; OCR needs an OCR engine",
    "limits": "Scans require OCR. Table structure and reading order must be checked against page images.",
    "topic": "documents"
  },
  {
    "id": "xlsx",
    "repository": "anthropics/skills",
    "path": "skills/xlsx/SKILL.md",
    "commit": "683bc88e56f3e09ba94f7055977f3d3aa499f202",
    "name": "Anthropic XLSX",
    "registrySlug": null,
    "role": "Clean data and create editable spreadsheets",
    "output": "XLSX files with typed cells, formulas, formatting and charts",
    "setup": "A coding runtime, spreadsheet libraries and a compatible recalculation / inspection path",
    "limits": "Check formula results and missing values. A CSV or screenshot is not an editable Excel workbook.",
    "topic": "spreadsheets"
  },
  {
    "id": "docx",
    "repository": "anthropics/skills",
    "path": "skills/docx/SKILL.md",
    "commit": "683bc88e56f3e09ba94f7055977f3d3aa499f202",
    "name": "Anthropic DOCX",
    "registrySlug": null,
    "role": "Generate and edit Word documents",
    "output": "Editable DOCX paragraphs, headings, tables and document structure",
    "setup": "A document library and a renderer for layout checks",
    "limits": "Inspect the rendered pages. Successful file creation alone does not prove a readable document.",
    "topic": "documents"
  }
]

export const SCENARIO_TOPICS: ScenarioTopic[] = [
  {
    "slug": "frontend-design-skills",
    "shortTitle": "Frontend design skills",
    "title": "Frontend Design Skills: UI/UX, Figma to Code and Review",
    "description": "Compare frontend design skills by task: landing pages, product dashboards, Figma implementation, accessibility review and React performance. Explore editable examples.",
    "useCaseSlug": "design-creative",
    "intro": "A landing page, a product dashboard and a Figma handoff need different kinds of help. Choose a design skill for the page you are building, then add implementation and review skills where the task calls for them.",
    "sourceIds": [
      "frontend",
      "uiux",
      "taste",
      "figma",
      "review",
      "react"
    ],
    "choices": [
      {
        "task": "Create a distinctive landing page",
        "sourceId": "frontend",
        "reason": "Start from the audience, product brief and visual direction. Taste Skill is an alternative for landing pages and redesigns."
      },
      {
        "task": "Build a dashboard or product interface",
        "sourceId": "uiux",
        "reason": "Choose product UI guidance with tables, charts and interaction rules. The checked Taste Skill source explicitly excludes dashboards."
      },
      {
        "task": "Implement a Figma frame",
        "sourceId": "figma",
        "reason": "Provide an accessible frame, its assets and tokens through Figma MCP. Verify fidelity against the source design."
      },
      {
        "task": "Review UI or React performance",
        "sourceId": "review",
        "reason": "Review the resulting interface; add React Best Practices for rendering and data-fetching concerns."
      }
    ],
    "steps": [
      "Write a brief with the audience, page type, approved content, stack and target viewports.",
      "Choose one design workflow. For a Figma implementation, supply the accessible frame and its assets.",
      "Implement a small page or representative state, then check keyboard use, mobile layout and empty / error states.",
      "Review the result and keep the design input, source revision, code and browser evidence together."
    ],
    "exampleIds": [
      "frontend-landing",
      "frontend-dashboard",
      "frontend-handoff"
    ],
    "guideSlug": "frontend-design-skill-workflow",
    "related": [
      {
        "href": "/collections/frontend-product-ui",
        "label": "Frontend workflow collection"
      },
      {
        "href": "/skills/anthropic-frontend-design",
        "label": "Frontend Design source profile"
      },
      {
        "href": "/skills/nextlevelbuilder-ui-ux-pro-max-skill",
        "label": "UI UX Pro Max source profile"
      }
    ],
    "faq": [
      {
        "question": "Which frontend design skill should I choose for a dashboard?",
        "answer": "UI UX Pro Max covers product interfaces and charts in its checked source. Taste Skill targets landing pages, portfolios and redesigns and excludes dashboards. Add browser and accessibility checks to either implementation path."
      },
      {
        "question": "Is a Figma-to-code skill the same as a design generator?",
        "answer": "No. Figma Implement Design translates an accessible design into repository code. It needs Figma MCP and a frame or selection; visual design from a brief is a different workflow."
      },
      {
        "question": "Were all compared skills run on these examples?",
        "answer": "No. The comparison describes pinned upstream instructions. The downloadable examples are original OpenAgentSkill editorial fixtures, with their own production and verification notes."
      }
    ]
  },
  {
    "slug": "video-creation",
    "shortTitle": "Video creation skills",
    "title": "Video Creation Skills: Remotion, Generation and Editing",
    "description": "Choose AI agent video skills for React motion graphics, generated footage or editing existing clips. Compare inputs, dependencies, costs and actual output formats.",
    "useCaseSlug": "video-creation",
    "intro": "Start with the material you have. Use code for precise motion graphics, a generation provider for new footage, and an editing workflow for an existing recording. A prompt-writing skill alone does not produce an MP4.",
    "sourceIds": [
      "remotion"
    ],
    "choices": [
      {
        "task": "Animate product UI or data",
        "sourceId": "remotion",
        "reason": "Remotion uses React code and deterministic frame timing, with an editable project and a rendered output."
      },
      {
        "task": "Generate new footage",
        "href": "/use-cases/video-creation",
        "reason": "Explore the source-backed Seedance production workflows. The skill plans shots; a separate video-generation provider creates footage."
      },
      {
        "task": "Edit an existing recording",
        "href": "/skills/browser-use-video-use",
        "reason": "Inspect the editing workflow and its dependencies. Preserve the original recording; review trims, captions and audio after export."
      }
    ],
    "steps": [
      "Specify the input, audience, duration, aspect ratio and output file.",
      "Choose code animation, generated footage or editing; check the selected workflow's dependencies and service charges.",
      "Make one representative scene and review readability and factual claims before expanding.",
      "Export the actual video, inspect beginning / middle / end frames and watch the full output before publishing."
    ],
    "exampleIds": [
      "remotion-demo"
    ],
    "guideSlug": "agent-skills-for-product-videos",
    "related": [
      {
        "href": "/best/remotion-skills",
        "label": "Remotion skills and a reproducible render"
      },
      {
        "href": "/collections/video-creation-studio",
        "label": "Video workflow collection"
      },
      {
        "href": "/use-cases/video-creation",
        "label": "Source-backed video workflow library"
      }
    ],
    "faq": [
      {
        "question": "Do Remotion skills generate AI footage?",
        "answer": "They guide a coding agent working in a Remotion project. React code renders motion graphics and can incorporate supplied footage. New model-generated footage needs a separate service."
      },
      {
        "question": "Are video skills free to run?",
        "answer": "Skill instructions and execution costs are different. Check renderer licensing and the fees for any voice, transcription, image or video provider you choose."
      },
      {
        "question": "Should I generate or edit a product demo?",
        "answer": "Edit an existing recording when it already shows the correct behavior. Use a coded animation for precise product stories or supplied UI assets, and generated footage when the brief needs new visual scenes."
      }
    ]
  },
  {
    "slug": "remotion-skills",
    "shortTitle": "Remotion skills",
    "title": "Remotion Skills: Install, Animate and Export a React Video",
    "description": "Understand official Remotion agent skills, their setup and limitations. Download an original React composition and MP4 example, and follow the render verification steps.",
    "useCaseSlug": "video-creation",
    "intro": "Remotion skills help a coding agent create compositions, author frame-driven motion, preview the result and export video. The runtime still needs a Remotion project, dependencies and a browser renderer.",
    "sourceIds": [
      "remotion"
    ],
    "choices": [
      {
        "task": "Start a new composition",
        "sourceId": "remotion",
        "reason": "The upstream remotion-create workflow covers project and composition setup. Specify dimensions, duration and content."
      },
      {
        "task": "Animate and export",
        "sourceId": "remotion",
        "reason": "Use frame-driven markup, inspect a preview, then follow remotion-render for the deliverable you need."
      }
    ],
    "steps": [
      "Read the official Remotion skills guide and install the upstream skill bundle with the command it currently documents.",
      "Create or open a Remotion project and identify the composition, FPS, dimensions and duration.",
      "Use useCurrentFrame and interpolate for animation. Inspect the composition in Studio before final export.",
      "Render the named composition to MP4. Keep its source, package versions, frame checks and any licensing / cost notes."
    ],
    "exampleIds": [
      "remotion-demo"
    ],
    "guideSlug": "remotion-skills-render-workflow",
    "related": [
      {
        "href": "/best/video-creation",
        "label": "Compare video workflows"
      },
      {
        "href": "/skills/remotion-dev-skills",
        "label": "Remotion registry profile"
      },
      {
        "href": "/guides/agent-skills-for-product-videos",
        "label": "Product video planning guide"
      }
    ],
    "faq": [
      {
        "question": "What is the official Remotion skills install command?",
        "answer": "The official Remotion documentation currently shows npx skills add remotion-dev/skills. Check its guide for current client setup and use the skill names your agent actually discovers."
      },
      {
        "question": "Can I run Remotion skills in Codex or Claude Code?",
        "answer": "Remotion's official skills guide names Claude Code, Codex, Kimi Code and Cursor. That is documentation support, not a successful runtime test of every client or every community workflow."
      },
      {
        "question": "What does this example prove?",
        "answer": "It provides an original, downloadable code composition and its actual local render, with verification notes. It is not a benchmark comparing all video skills or a test of each client."
      }
    ]
  },
  {
    "slug": "document-processing",
    "shortTitle": "Document skills",
    "title": "PDF, Word and Excel Skills: Choose by the File You Need",
    "description": "Compare document skills for PDF extraction, scan OCR, editable Word reports and Excel workbooks. Follow focused workflows and inspect downloadable document examples.",
    "useCaseSlug": "document-processing",
    "intro": "Choose the skill from the input and final deliverable. Reading a scanned PDF, creating an editable Word report and cleaning a spreadsheet are separate jobs, even when they share the same source material.",
    "sourceIds": [
      "pdf",
      "docx",
      "xlsx"
    ],
    "choices": [
      {
        "task": "Extract text or tables from a PDF",
        "sourceId": "pdf",
        "reason": "Check whether the document has real text or scanned images. OCR and table reconstruction require separate verification."
      },
      {
        "task": "Create an editable Word report",
        "sourceId": "docx",
        "reason": "Use native paragraphs, styles and tables. Keep the source notes and inspect the rendered layout."
      },
      {
        "task": "Clean CSV data into Excel",
        "sourceId": "xlsx",
        "reason": "Preserve original records, retain missing values and deliver typed cells and formulas in an XLSX file."
      }
    ],
    "steps": [
      "Identify input type: digital PDF, scanned page, structured notes or CSV.",
      "Choose the required output: text / markdown / table, DOCX or XLSX.",
      "Keep source material separate from generated output and record corrections or missing information.",
      "Inspect the saved file and reconcile its content or totals with the original inputs."
    ],
    "exampleIds": [
      "spreadsheet-cleanup",
      "word-brief"
    ],
    "related": [
      {
        "href": "/best/claude-code-pdf-parsing",
        "label": "PDF parsing and OCR"
      },
      {
        "href": "/best/claude-excel-skills",
        "label": "Excel / XLSX workflow"
      },
      {
        "href": "/best/docx-skills",
        "label": "Editable Word reports"
      }
    ],
    "faq": [
      {
        "question": "Is Canvas Design a PDF parsing skill?",
        "answer": "Its visual creation workflow is different from extracting text and tables. This document shortlist uses the source's actual PDF, DOCX and XLSX tasks instead of selecting a candidate only because its description mentions PDF."
      },
      {
        "question": "Can a PDF be converted to Word without losing structure?",
        "answer": "It depends on the source layout and text layer. Inspect tables, headings and reading order after conversion; scans need OCR, and exact layout preservation is not guaranteed."
      }
    ]
  },
  {
    "slug": "claude-code-pdf-parsing",
    "shortTitle": "PDF parsing skills",
    "title": "Claude PDF Skills: Parse Text, Extract Tables and OCR Scans",
    "description": "Choose a PDF skill for Claude Code by task: digital text, tables, scanned-page OCR or markdown conversion. Check dependencies and reconcile the extracted output.",
    "useCaseSlug": "document-processing",
    "intro": "First check whether the PDF contains selectable text. Digital extraction, scanned-page OCR and table reconstruction need different operations and checks. Visual PDF creation is outside this parsing shortlist.",
    "sourceIds": [
      "pdf"
    ],
    "choices": [
      {
        "task": "Read a digital report",
        "sourceId": "pdf",
        "reason": "Extract the text layer and preserve page references; spot-check reading order against the original pages."
      },
      {
        "task": "Extract a table",
        "sourceId": "pdf",
        "reason": "Compare row count, column headings and numeric totals against the page. Merged cells and multi-column layouts need review."
      },
      {
        "task": "Read a scanned page",
        "sourceId": "pdf",
        "reason": "Use OCR and check ambiguous characters, page orientation and missing rows. A scan has no usable text layer until recognized."
      }
    ],
    "steps": [
      "Inspect a representative PDF page and determine whether text is selectable.",
      "Use the source's digital extraction tools, or its OCR path for scanned images.",
      "Keep page numbers and source references with the extracted content; do not silently replace missing text.",
      "Reconcile table rows and numeric totals and check reading order before writing markdown or importing into RAG."
    ],
    "exampleIds": [],
    "guideSlug": "pdf-extraction-vs-ocr-skills",
    "related": [
      {
        "href": "/best/document-processing",
        "label": "Document output comparison"
      },
      {
        "href": "/best/docx-skills",
        "label": "Word generation"
      },
      {
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/pdf/SKILL.md",
        "label": "PDF source profile"
      }
    ],
    "faq": [
      {
        "question": "Why does PDF text extraction return nothing?",
        "answer": "The page may be an image scan rather than digital text. Check the page visually and use OCR when needed. Extraction can also fail on unusual encodings or protected files."
      },
      {
        "question": "Which skill should I use for PDF to markdown?",
        "answer": "Start with extraction that fits the input, verify its reading order and tables, then convert the result. The PDF workflow is the primary source here; a converter library is a dependency, not automatically an installable agent skill."
      },
      {
        "question": "Does this page prove OCR accuracy?",
        "answer": "No. It describes the pinned source workflow and the checks required. This release does not include a comparative OCR runtime test."
      }
    ]
  },
  {
    "slug": "claude-excel-skills",
    "shortTitle": "Excel and XLSX skills",
    "title": "Claude Excel Skills: Clean CSV and Create Editable XLSX",
    "description": "Use an XLSX skill for CSV cleanup, typed cells, formulas and editable Excel delivery. Download a messy CSV and the checked workbook example with missing values preserved.",
    "useCaseSlug": "data-analysis",
    "intro": "An Excel skill should hand you a useful workbook, not only a text explanation. Start with a small CSV cleanup task, preserve the original input and check that formulas respond to edits.",
    "sourceIds": [
      "xlsx"
    ],
    "choices": [
      {
        "task": "Clean a messy CSV",
        "sourceId": "xlsx",
        "reason": "Trim labels, normalize types, identify exact duplicates and preserve missing or invalid values for review."
      },
      {
        "task": "Build an editable analysis",
        "sourceId": "xlsx",
        "reason": "Use typed numeric cells and formulas, then verify calculations and the saved workbook."
      }
    ],
    "steps": [
      "Keep the original CSV and define a record key and explicit cleanup rules.",
      "Normalize numbers and dates, remove only duplicates allowed by the rule, and leave missing values unavailable.",
      "Create a workbook with the cleaned table, review flags and a total for known values.",
      "Reconcile record counts and totals, change an input to check recalculation, and inspect the layout before delivery."
    ],
    "exampleIds": [
      "spreadsheet-cleanup"
    ],
    "guideSlug": "csv-to-xlsx-skill-workflow",
    "related": [
      {
        "href": "/best/document-processing",
        "label": "Document task comparison"
      },
      {
        "href": "/best/docx-skills",
        "label": "Word report workflow"
      },
      {
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/xlsx/SKILL.md",
        "label": "XLSX source profile"
      }
    ],
    "faq": [
      {
        "question": "What does a Claude Excel skill produce?",
        "answer": "The source XLSX skill focuses on spreadsheet files: opening or editing them, cleaning CSV or TSV, creating formulas and formatting, and exporting a workbook. Your runtime still needs the required libraries."
      },
      {
        "question": "Should blank or invalid numbers become zero?",
        "answer": "Only when the task explicitly defines that rule. In the example, missing and invalid revenue stays blank with a review flag, and the total covers known values only."
      },
      {
        "question": "Can I use this spreadsheet workflow with Codex?",
        "answer": "The file-processing task can be adapted to another coding runtime, but inspect that client's skill setup and local libraries first. This release does not establish client-by-client runtime compatibility."
      }
    ]
  },
  {
    "slug": "docx-skills",
    "shortTitle": "Word and DOCX skills",
    "title": "DOCX Skills: Turn Source Notes into an Editable Word Report",
    "description": "Choose a Word document skill for editable headings, tables and reports. Download structured notes and the actual DOCX example, and follow content and layout checks.",
    "useCaseSlug": "document-processing",
    "intro": "Use a Word skill when the final handoff needs editable paragraphs, headings and tables. Keep claims grounded in the supplied material and inspect the rendered document, not only the ZIP file.",
    "sourceIds": [
      "docx"
    ],
    "choices": [
      {
        "task": "Draft an editable report",
        "sourceId": "docx",
        "reason": "Build a native DOCX structure from supplied notes, with real heading styles and editable tables."
      },
      {
        "task": "Revise a Word document",
        "sourceId": "docx",
        "reason": "Preserve the source document and inspect tracked changes, tables and pagination where the edit affects them."
      }
    ],
    "steps": [
      "Supply source notes, audience, purpose and the required report structure.",
      "Draft only from the input; leave missing dates or facts as open items.",
      "Create native headings, paragraphs and tables in DOCX, with a readable page layout.",
      "Render every page, inspect clipping and page breaks, then compare the saved text with the input."
    ],
    "exampleIds": [
      "word-brief"
    ],
    "guideSlug": "docx-report-skill-workflow",
    "related": [
      {
        "href": "/best/document-processing",
        "label": "Document skill comparison"
      },
      {
        "href": "/best/claude-excel-skills",
        "label": "Spreadsheet input workflow"
      },
      {
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/docx/SKILL.md",
        "label": "DOCX source profile"
      }
    ],
    "faq": [
      {
        "question": "Is DOCX generation the same as PDF extraction?",
        "answer": "No. DOCX generation creates or edits a Word document. PDF extraction reads an existing PDF; scanned inputs may need OCR before their content can be used in a report."
      },
      {
        "question": "Can the generated document remain editable?",
        "answer": "Use native DOCX paragraphs, styles and tables rather than placing page screenshots into Word. Inspect the saved file's structure and rendered layout."
      }
    ]
  }
]

export function getScenarioTopic(slug: string) { return SCENARIO_TOPICS.find(topic => topic.slug === slug) }
export function scenarioSourceUrl(source: ScenarioSource) { return `https://github.com/${source.repository}/blob/${source.commit}/${source.path}` }
export function scenarioProfileHref(source: ScenarioSource) { return source.registrySlug ? `/skills/${source.registrySlug}` : scenarioSourceUrl(source) }
export function getScenarioSources(topic: ScenarioTopic) { return topic.sourceIds.map(id => SCENARIO_SOURCES.find(source => source.id === id)!).filter(Boolean) }
export function getScenarioLinksForSkill(slug: string) {
 const source = SCENARIO_SOURCES.find(source => source.registrySlug === slug)
 if (!source) return []
 return SCENARIO_TOPICS.filter(topic => topic.sourceIds.includes(source.id)).slice(0, 3).map(topic => ({ href: `/best/${topic.slug}`, label: topic.shortTitle }))
}
