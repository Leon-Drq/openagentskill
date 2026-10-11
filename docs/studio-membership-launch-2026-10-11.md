# Original Skill and membership preview

## Public release scope

- `/studio/launch-card-studio`: one original product example, three real SVG outputs, format switching and free sample downloads. Desktop preview left / access options right; mobile preview, access, details.
- `/membership`: free directory, planned Pro subscription and standalone purchase. Planned USD prices: 9.99 single, 9.99 monthly, 79 yearly, with the full annual amount shown.
- Both routes have English, Chinese, Japanese, Korean, Spanish, German, French and Indonesian versions, shared navigation language selection, canonical/hreflang, WebPage JSON-LD and sitemap entries.
- Skills keeps its established layout and actual paid count. A preview card appears only in a healthy, empty paid filter. Navigation and footer provide membership discovery.

## Actual commercial state

This is a **preview**, not a functioning paid store. No merchant account, payment credentials, checkout, purchase entitlements or protected download delivery have been configured. Payment buttons are disabled, the page discloses this, and metadata contains no sale Offer or invented review/install evidence. The next commercial release needs merchant configuration, payment lifecycle/fulfillment implementation and end-to-end payment tests before selling anything.

The public repository contains only website code and three sample SVGs. The original SKILL.md, renderer and brief template are kept in the owner's ignored local artifacts directory, packaged as `launch-card-studio-1.0.0.zip`. They are not published as a free repository asset or falsely counted as a reviewed community submission.

## Reproducible sample evidence

- Renderer v1.0.0 ran locally on Node.js 24.19.0 and produced 1200×630, 1080×1080 and 1080×1350 SVG files from the same brand brief.
- Local renderer checks cover real output, Chinese text, escaping markup, invalid colors/lengths, text bounds and refusal to overwrite existing files.
- The Skill creator's frontmatter validator passes. No installation in every supported Agent is claimed.
- ZIP SHA-256: `1F9C9DB2E64742DCA4A969BCC86B16FD6C880E5AC5DE9524C857E8328A7275F1`.

## Verification

- Browser: 16 localized pages × 320 / 390 / 768 / 1440px = 64 checks; no horizontal overflow, duplicate H1 or broken preview images.
- Interaction: preview selection updates the download, switching single/Pro and monthly/yearly updates the displayed amount, FAQs expand, header language switching retains the membership route.
- `pnpm test:studio` covers catalog state, eight dictionaries, cross-language paths, 16 canonical/sitemap entries and inert SVG assets. It runs in the full regression suite through `test:resource-pages`.
- `node scripts/check-studio-pages.mjs` checks the live release. Set `STUDIO_CHECK_BASE_URL` for local/staging: HTTP, headings, canonical/alternates, disabled checkout, language redirects, SVG downloads and sitemap.
- Full regression suite, typecheck, repository link checks and production build passed locally. ESLint has zero errors; existing warnings remain outside the new implementation. Local HTTP checks passed; the same HTTP checks must pass after deployment.
