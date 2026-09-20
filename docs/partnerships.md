# Contact and sponsorship

- `/contact` retains its URL and canonical. Email is the primary business/private channel, X is community discussion, and GitHub Issues is for public reproducible bugs.
- `/sponsor` describes opportunities, not a checkout or a promise of impressions. Terms are agreed by email before payment or publication. No paid APIs, database changes or new tracking are introduced.
- Eight languages use the existing `?lang=` preference. Base pages are indexable; parameter variants use `noindex, follow` and the base canonical. Only `/sponsor` is added to the core sitemap.
- Resources contains both links; the footer shows them outside collapsed sections. Top-level navigation and Star, Submit and language controls remain intact.
- No WeChat account or QR code has been supplied. Do not invent one. The X channel uses the same public project account as the existing footer, not an unverified personal account.
- No sponsor logos are shown. Before adding a supporter, confirm the actual relationship and obtain logo permission. Distinguish financial sponsorship, infrastructure resources/credits and a specific collaboration. Product usage, API integration and indexing a vendor's skill are not partnerships.
- Any future paid external link must use `rel="sponsored noopener noreferrer"`, with a visible sponsorship label. Do not sell natural rankings, safety badges or review approvals. A sponsorship does not change publication or safety gates.
- Add a homepage logo strip only after real relationships and permissions are confirmed; do not publish placeholder brands.

Verification: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, then `node scripts/check-partnerships.mjs <origin>` and `node scripts/check-seo.mjs <origin>`. Also inspect desktop/mobile and keyboard navigation in a browser.
