# Creator experience — September 2026

## Public and private surfaces

- `/creators` remains the discovery directory; existing GitHub source pages and claimed-profile URLs are retained.
- The shared desktop/mobile Creators menu exposes the directory, Creator Center, Submit Skill, and Creator Kit. An authenticated profile shortcut loads only when the menu opens; email is never displayed there.
- `/creator` stays authenticated and explicitly `noindex`. Overview, profile editing, skills, works, and analytics have linkable tabs. Login preserves the destination and language.
- `/creators/[username]` is the public calling card: biography, optional links, ownership evidence, popular claimed skills, linked Gallery examples, all skills, copy link, and profile-specific OG/Twitter previews.

## Truthful attribution and metrics

- Popular skills are automatically selected by repository stars, not presented as creator-selected picks.
- Gallery examples are linked through claimed skill slugs and retain artwork attribution. A skill author is not automatically the artwork's author.
- Ownership verification never implies a safety audit, runtime execution, or confirmed installation.
- Public repository star totals normalize repository identity and count each repository once (maximum observed snapshot).
- Daily analytics cover thirty UTC calendar dates including today, paginate beyond PostgREST's 1,000-row cap, and return unavailable rather than partial totals on error or the bounded page cap.
- Install starts, confirmed receipts, and successful outcome reports are separate event sets. No fabricated cross-set conversion percentages or copy-to-install fallback.

## Editing and safety

- Live preview uses only allowlisted public fields. It never displays the sign-in email or gives a preview a verification badge.
- Saving still uses the session-scoped Supabase client and `auth.getUser()`. The row ID is derived from the session, never form data. Verified GitHub/X identifiers are retained server-side.
- Existing profile handles cannot change through this editor, preserving shared/canonical URLs. Website links accept HTTP(S) only, without embedded credentials. JSON-LD escapes `<`.
- No database migrations, service-role browser credentials, changes to publication approvals, or review-score writes.

## Verification

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
`scripts/test-creator-experience.mjs` executes the Server Action with a fake session/database, covering unauthenticated requests, verified identity tampering, handle changes, invalid URLs, and database read failures, without editing a real creator's profile.
Browser checks cover desktop dropdown/Escape, Chinese mobile navigation, login return URL, real public-profile metadata and repository deduplication, share-image rendering, and live editor preview in an isolated local fixture (removed before publication).

Custom cover uploads, creator-selected ordering, and self-service Gallery moderation remain future additions; this release does not pretend to offer those controls.
