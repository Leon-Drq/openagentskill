# Account workspace

`/profile` is a private, authenticated workspace with linkable `overview`,
`bookmarks`, `points`, and `settings` tabs. `/creator` uses the same sidebar and
retains its five studio tabs, ownership verification, analytics, and public URLs.
Both routes preserve `lang` and the selected destination through sign-in.

## Data and permissions

- Authenticate with server-side `getUser`; anonymous sessions cannot edit or save.
- Query only the signed-in ID with the session client and existing RLS. No service
  key, review changes, or schema migration is needed.
- Points use the existing `user_points` security-invoker view over the entire
  ledger. Recent events are a separate bounded page; errors display unavailable.
- GitHub bookmarks and provider engagement share one library. Exact own-user
  counts and bounded slug keyset pages handle collections above 1,000 records.
  Skillry names retain the original name and source logo. Retired entries remain
  removable without making their listing public.
- Unsave uses the directory's interaction API. Provider votes are preserved.
- Settings can update display name, bio, and website only. Public profile handles,
  verified identities, invite codes, and points are not editable through this form.
  Both workspace and creator editor invalidate the same public profile/share images.
- Creator profile/works tabs skip unrelated analytics queries. All navigation
  remains client-side Next links, with no protected-route prefetching.

## Sharing

The workspace shows a public name/bio calling-card preview and an editable X post.
Users without a public handle first create one in the existing creator editor.
The X intent opens the composer with `/creators/[username]`, never `/profile`,
email, saved skills, or points. Copy-link fallback remains available. Public
creator pages also offer X sharing and retain their OG/Twitter images, canonical
URLs, JSON-LD, and existing indexing policy. Sharing never posts automatically.

## Authentication and SEO

GitHub connection returns to the current tab/language. Signup confirmation now
supports PKCE codes and custom email token hashes at `/auth/confirm`, retaining
the destination. Safe redirects reject external URLs and backslashes. Private
workspace/auth routes are noindex; public discovery URLs and homepage/Hero are
unchanged.

## Verification

Run `pnpm test:account` plus the repository's regression, link, lint, typecheck,
and production build checks. The account test executes actual data helpers,
profile actions, points API, callback, and confirmation handlers against isolated
session-scoped mocks. It covers an 80-event ledger, 2,010 saved entries, failed
reads, malicious form fields, eight locales, and public-only X intents.

Visual/interaction verification used a temporary local fixture generated from
the real profile page, then removed before publication. Desktop/tablet/mobile
checks covered 1,440 / 1,024 / 736 / 390 / 320 px, all four tabs, eight languages,
editable X text, clipboard, save, unsave failure/success, and unavailable/empty
states. No production account was created or modified for these tests.
