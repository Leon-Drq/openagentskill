import type { GrowthGuideDefinition } from './growth-guides'

export const SCENARIO_GUIDES: GrowthGuideDefinition[] = [
  {
    "slug": "frontend-design-skill-workflow",
    "shortTitle": "Frontend design skills workflow",
    "title": "Frontend Design Skill Workflow: Brief, Build and Review",
    "eyebrow": "Practical task guide",
    "description": "Compare frontend design skills by task: landing pages, product dashboards, Figma implementation, accessibility review and React performance. Explore editable examples.",
    "intent": "standard",
    "updatedAt": "2026-10-07",
    "heroPrompt": "Help me create a distinctive landing page. Ask for missing inputs, choose by output, explain dependencies, and deliver a checked file without inventing results.",
    "useCaseSlug": "design-creative",
    "skillKeywords": [
      "Frontend Design",
      "UI UX Pro Max",
      "Taste Skill",
      "Figma Implement Design",
      "Web Design Guidelines",
      "Vercel React Best Practices"
    ],
    "primarySkillSlugs": [
      "anthropic-frontend-design",
      "nextlevelbuilder-ui-ux-pro-max-skill",
      "design-taste-frontend",
      "figma-implement-design",
      "vercel-web-design-guidelines",
      "vercel-react-best-practices"
    ],
    "curatedOnly": true,
    "sections": [
      {
        "title": "Choose the input and output",
        "body": "A landing page, a product dashboard and a Figma handoff need different kinds of help. Choose a design skill for the page you are building, then add implementation and review skills where the task calls for them.",
        "bullets": [
          "Create a distinctive landing page: Start from the audience, product brief and visual direction. Taste Skill is an alternative for landing pages and redesigns.",
          "Build a dashboard or product interface: Choose product UI guidance with tables, charts and interaction rules. The checked Taste Skill source explicitly excludes dashboards.",
          "Implement a Figma frame: Provide an accessible frame, its assets and tokens through Figma MCP. Verify fidelity against the source design.",
          "Review UI or React performance: Review the resulting interface; add React Best Practices for rendering and data-fetching concerns."
        ]
      },
      {
        "title": "Keep evidence with the deliverable",
        "body": "Source review, an editorial example and a successful runtime test answer different questions. Record which one you actually have.",
        "bullets": [
          "Keep the supplied input, selected source revision, runtime and output file together.",
          "Check the saved artifact and record any limitations or failures.",
          "The examples identify how they were produced; they are not a comparative benchmark."
        ]
      }
    ],
    "steps": [
      {
        "title": "Prepare",
        "description": "Write a brief with the audience, page type, approved content, stack and target viewports."
      },
      {
        "title": "Choose",
        "description": "Choose one design workflow. For a Figma implementation, supply the accessible frame and its assets."
      },
      {
        "title": "Create",
        "description": "Implement a small page or representative state, then check keyboard use, mobile layout and empty / error states."
      },
      {
        "title": "Verify",
        "description": "Review the result and keep the design input, source revision, code and browser evidence together."
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
    ],
    "relatedGuideSlugs": [
      "remotion-skills-render-workflow",
      "pdf-extraction-vs-ocr-skills",
      "csv-to-xlsx-skill-workflow"
    ],
    "resources": [
      {
        "title": "Compare workflows",
        "href": "/best/frontend-design-skills",
        "description": "Task fit, source instructions, setup and limitations."
      },
      {
        "title": "Frontend Design source profile",
        "href": "/skills/anthropic-frontend-design",
        "description": "Visual direction and implementation"
      },
      {
        "title": "UI UX Pro Max source profile",
        "href": "/skills/nextlevelbuilder-ui-ux-pro-max-skill",
        "description": "UI systems and product interfaces"
      },
      {
        "title": "Taste Skill source profile",
        "href": "/skills/design-taste-frontend",
        "description": "Landing pages and purposeful redesigns"
      },
      {
        "title": "Figma Implement Design source profile",
        "href": "/skills/figma-implement-design",
        "description": "Implement an approved design"
      }
    ]
  },
  {
    "slug": "remotion-skills-render-workflow",
    "shortTitle": "Remotion skills workflow",
    "title": "Remotion Skills Tutorial: React Composition to Checked MP4",
    "eyebrow": "Practical task guide",
    "description": "Understand official Remotion agent skills, their setup and limitations. Download an original React composition and MP4 example, and follow the render verification steps.",
    "intent": "standard",
    "updatedAt": "2026-10-07",
    "heroPrompt": "Help me start a new composition. Ask for missing inputs, choose by output, explain dependencies, and deliver a checked file without inventing results.",
    "useCaseSlug": "video-creation",
    "skillKeywords": [
      "Remotion Agent Skills"
    ],
    "primarySkillSlugs": [
      "remotion-dev-skills"
    ],
    "curatedOnly": true,
    "sections": [
      {
        "title": "Choose the input and output",
        "body": "Remotion skills help a coding agent create compositions, author frame-driven motion, preview the result and export video. The runtime still needs a Remotion project, dependencies and a browser renderer.",
        "bullets": [
          "Start a new composition: The upstream remotion-create workflow covers project and composition setup. Specify dimensions, duration and content.",
          "Animate and export: Use frame-driven markup, inspect a preview, then follow remotion-render for the deliverable you need."
        ]
      },
      {
        "title": "Keep evidence with the deliverable",
        "body": "Source review, an editorial example and a successful runtime test answer different questions. Record which one you actually have.",
        "bullets": [
          "Keep the supplied input, selected source revision, runtime and output file together.",
          "Check the saved artifact and record any limitations or failures.",
          "The examples identify how they were produced; they are not a comparative benchmark."
        ]
      }
    ],
    "steps": [
      {
        "title": "Prepare",
        "description": "Read the official Remotion skills guide and install the upstream skill bundle with the command it currently documents."
      },
      {
        "title": "Choose",
        "description": "Create or open a Remotion project and identify the composition, FPS, dimensions and duration."
      },
      {
        "title": "Create",
        "description": "Use useCurrentFrame and interpolate for animation. Inspect the composition in Studio before final export."
      },
      {
        "title": "Verify",
        "description": "Render the named composition to MP4. Keep its source, package versions, frame checks and any licensing / cost notes."
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
    ],
    "relatedGuideSlugs": [
      "frontend-design-skill-workflow",
      "pdf-extraction-vs-ocr-skills",
      "csv-to-xlsx-skill-workflow"
    ],
    "resources": [
      {
        "title": "Compare workflows",
        "href": "/best/remotion-skills",
        "description": "Task fit, source instructions, setup and limitations."
      },
      {
        "title": "Remotion Agent Skills source profile",
        "href": "/skills/remotion-dev-skills",
        "description": "Code-driven motion graphics"
      }
    ]
  },
  {
    "slug": "pdf-extraction-vs-ocr-skills",
    "shortTitle": "PDF parsing skills workflow",
    "title": "PDF Extraction vs OCR: Choose and Verify a Document Skill",
    "eyebrow": "Practical task guide",
    "description": "Choose a PDF skill for Claude Code by task: digital text, tables, scanned-page OCR or markdown conversion. Check dependencies and reconcile the extracted output.",
    "intent": "standard",
    "updatedAt": "2026-10-07",
    "heroPrompt": "Help me read a digital report. Ask for missing inputs, choose by output, explain dependencies, and deliver a checked file without inventing results.",
    "useCaseSlug": "document-processing",
    "skillKeywords": [
      "Anthropic PDF"
    ],
    "primarySkillSlugs": [],
    "curatedOnly": true,
    "sections": [
      {
        "title": "Choose the input and output",
        "body": "First check whether the PDF contains selectable text. Digital extraction, scanned-page OCR and table reconstruction need different operations and checks. Visual PDF creation is outside this parsing shortlist.",
        "bullets": [
          "Read a digital report: Extract the text layer and preserve page references; spot-check reading order against the original pages.",
          "Extract a table: Compare row count, column headings and numeric totals against the page. Merged cells and multi-column layouts need review.",
          "Read a scanned page: Use OCR and check ambiguous characters, page orientation and missing rows. A scan has no usable text layer until recognized."
        ]
      },
      {
        "title": "Keep evidence with the deliverable",
        "body": "Source review, an editorial example and a successful runtime test answer different questions. Record which one you actually have.",
        "bullets": [
          "Keep the supplied input, selected source revision, runtime and output file together.",
          "Check the saved artifact and record any limitations or failures.",
          "The examples identify how they were produced; they are not a comparative benchmark."
        ]
      }
    ],
    "steps": [
      {
        "title": "Prepare",
        "description": "Inspect a representative PDF page and determine whether text is selectable."
      },
      {
        "title": "Choose",
        "description": "Use the source's digital extraction tools, or its OCR path for scanned images."
      },
      {
        "title": "Create",
        "description": "Keep page numbers and source references with the extracted content; do not silently replace missing text."
      },
      {
        "title": "Verify",
        "description": "Reconcile table rows and numeric totals and check reading order before writing markdown or importing into RAG."
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
    ],
    "relatedGuideSlugs": [
      "frontend-design-skill-workflow",
      "remotion-skills-render-workflow",
      "csv-to-xlsx-skill-workflow"
    ],
    "resources": [
      {
        "title": "Compare workflows",
        "href": "/best/claude-code-pdf-parsing",
        "description": "Task fit, source instructions, setup and limitations."
      },
      {
        "title": "Anthropic PDF pinned source",
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/pdf/SKILL.md",
        "description": "Read, extract, OCR and assemble PDFs"
      }
    ]
  },
  {
    "slug": "csv-to-xlsx-skill-workflow",
    "shortTitle": "Excel and XLSX skills workflow",
    "title": "CSV to XLSX Skill Workflow: Clean Data and Check Formulas",
    "eyebrow": "Practical task guide",
    "description": "Use an XLSX skill for CSV cleanup, typed cells, formulas and editable Excel delivery. Download a messy CSV and the checked workbook example with missing values preserved.",
    "intent": "standard",
    "updatedAt": "2026-10-07",
    "heroPrompt": "Help me clean a messy csv. Ask for missing inputs, choose by output, explain dependencies, and deliver a checked file without inventing results.",
    "useCaseSlug": "data-analysis",
    "skillKeywords": [
      "Anthropic XLSX"
    ],
    "primarySkillSlugs": [],
    "curatedOnly": true,
    "sections": [
      {
        "title": "Choose the input and output",
        "body": "An Excel skill should hand you a useful workbook, not only a text explanation. Start with a small CSV cleanup task, preserve the original input and check that formulas respond to edits.",
        "bullets": [
          "Clean a messy CSV: Trim labels, normalize types, identify exact duplicates and preserve missing or invalid values for review.",
          "Build an editable analysis: Use typed numeric cells and formulas, then verify calculations and the saved workbook."
        ]
      },
      {
        "title": "Keep evidence with the deliverable",
        "body": "Source review, an editorial example and a successful runtime test answer different questions. Record which one you actually have.",
        "bullets": [
          "Keep the supplied input, selected source revision, runtime and output file together.",
          "Check the saved artifact and record any limitations or failures.",
          "The examples identify how they were produced; they are not a comparative benchmark."
        ]
      }
    ],
    "steps": [
      {
        "title": "Prepare",
        "description": "Keep the original CSV and define a record key and explicit cleanup rules."
      },
      {
        "title": "Choose",
        "description": "Normalize numbers and dates, remove only duplicates allowed by the rule, and leave missing values unavailable."
      },
      {
        "title": "Create",
        "description": "Create a workbook with the cleaned table, review flags and a total for known values."
      },
      {
        "title": "Verify",
        "description": "Reconcile record counts and totals, change an input to check recalculation, and inspect the layout before delivery."
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
    ],
    "relatedGuideSlugs": [
      "frontend-design-skill-workflow",
      "remotion-skills-render-workflow",
      "pdf-extraction-vs-ocr-skills"
    ],
    "resources": [
      {
        "title": "Compare workflows",
        "href": "/best/claude-excel-skills",
        "description": "Task fit, source instructions, setup and limitations."
      },
      {
        "title": "Anthropic XLSX pinned source",
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/xlsx/SKILL.md",
        "description": "Clean data and create editable spreadsheets"
      }
    ]
  },
  {
    "slug": "docx-report-skill-workflow",
    "shortTitle": "Word and DOCX skills workflow",
    "title": "DOCX Skill Workflow: Source Notes to an Editable Word Report",
    "eyebrow": "Practical task guide",
    "description": "Choose a Word document skill for editable headings, tables and reports. Download structured notes and the actual DOCX example, and follow content and layout checks.",
    "intent": "standard",
    "updatedAt": "2026-10-07",
    "heroPrompt": "Help me draft an editable report. Ask for missing inputs, choose by output, explain dependencies, and deliver a checked file without inventing results.",
    "useCaseSlug": "document-processing",
    "skillKeywords": [
      "Anthropic DOCX"
    ],
    "primarySkillSlugs": [],
    "curatedOnly": true,
    "sections": [
      {
        "title": "Choose the input and output",
        "body": "Use a Word skill when the final handoff needs editable paragraphs, headings and tables. Keep claims grounded in the supplied material and inspect the rendered document, not only the ZIP file.",
        "bullets": [
          "Draft an editable report: Build a native DOCX structure from supplied notes, with real heading styles and editable tables.",
          "Revise a Word document: Preserve the source document and inspect tracked changes, tables and pagination where the edit affects them."
        ]
      },
      {
        "title": "Keep evidence with the deliverable",
        "body": "Source review, an editorial example and a successful runtime test answer different questions. Record which one you actually have.",
        "bullets": [
          "Keep the supplied input, selected source revision, runtime and output file together.",
          "Check the saved artifact and record any limitations or failures.",
          "The examples identify how they were produced; they are not a comparative benchmark."
        ]
      }
    ],
    "steps": [
      {
        "title": "Prepare",
        "description": "Supply source notes, audience, purpose and the required report structure."
      },
      {
        "title": "Choose",
        "description": "Draft only from the input; leave missing dates or facts as open items."
      },
      {
        "title": "Create",
        "description": "Create native headings, paragraphs and tables in DOCX, with a readable page layout."
      },
      {
        "title": "Verify",
        "description": "Render every page, inspect clipping and page breaks, then compare the saved text with the input."
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
    ],
    "relatedGuideSlugs": [
      "frontend-design-skill-workflow",
      "remotion-skills-render-workflow",
      "pdf-extraction-vs-ocr-skills"
    ],
    "resources": [
      {
        "title": "Compare workflows",
        "href": "/best/docx-skills",
        "description": "Task fit, source instructions, setup and limitations."
      },
      {
        "title": "Anthropic DOCX pinned source",
        "href": "https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/docx/SKILL.md",
        "description": "Generate and edit Word documents"
      }
    ]
  }
]
