# Owner/developer publishing channel

The site's owner can publish a valid public GitHub Skill without waiting for an
AI review or a minimum star count. Ordinary community submissions still use the
existing static-analysis and AI-review gates. Website code development is unrelated
to Skill submission review and follows the normal Git/CI/deployment workflow.

## Usage

The local CLI reads `OWNER_PUBLISH_TOKEN` from the environment or ignored
`.env.owner.local`. The matching token is configured only on the production server.
It is separate from GitHub, Supabase, cron and indexer credentials. There is no
localhost bypass, account-name allowlist or public form switch.

```sh
# Check the server credential and database connection without publishing.
pnpm owner:publish --check

# Optional preview: fetch metadata and advisory findings without database writes.
pnpm owner:publish --repository owner/repo --path SKILL.md --reason "Owner requested this listing" --dry-run

# Publish immediately under owner authority.
pnpm owner:publish --repository owner/repo --path SKILL.md --reason "Owner requested this listing"

# Publish a nested skill or a specific revision.
pnpm owner:publish --repository owner/repo --path skills/example/SKILL.md --ref COMMIT_SHA --reason "Owner requested this source update"
```

The direct equivalent is `node scripts/owner-publish-skill.mjs` with the same flags.
For a timeout, retain the printed request ID and resolved commit, then retry using
`--request-id UUID --ref COMMIT_SHA`. Reusing an ID with a different source/reason
returns a conflict. Never put credentials in command-line flags or query strings.
Publishing many skills requires one explicit path/request per skill, not an
unreviewed whole-repository bulk promotion.

## What publication means

- A public detail URL, on-site search and manual installation handoff are available.
- `listing_status=owner_published` is separate from `ai_review_approved`.
- The source is pinned to a Git commit and SKILL.md SHA-256 hash. Repository/path
  identity and a public content-hash uniqueness constraint prevent duplicate listings.
- A bounded, non-executing static scan is advisory. Its scope, missing/truncated
  files and findings are retained. No LLM review API is called by this channel.
- The UI says **Published by the site owner** and requires review before unattended
  installation. High-risk scan findings still block automatic installation.
- It does not grant creator ownership, official certification or runtime verification.
- Existing AI decisions/issues and submission records are retained. When changing
  a revision, old scores are archived, not represented as a score for the new code.
- Every request records its reason, source, prior review and result atomically in
  an append-only private publication log. No publication if audit persistence fails.
- Ordinary automated X distribution retains its existing review requirements.
  Search-engine eligibility preserves the legacy reviewed-page rules and also
  permits explicitly curated, version-pinned editorial entries described in
  `docs/editorial-search-publication.md`. Owner publication alone does not qualify.
  Search visibility never means “safe”, “AI approved” or permission to auto-install.

If the source later changes, call the channel again to publish the new pinned
revision. A previously approved revision does not transfer its approval to new code.

## Permissions and operation

`POST /api/admin/skills/publish` requires the dedicated bearer token, a reason of
10–2,000 characters and a UUID `requestId`. It rejects caller-supplied review fields.
The database publication function is callable only by the internal service role;
anonymous and signed-in users cannot invoke it or read the private audit log.

Deploy the database migration before the application. Generate a random token
of at least 32 characters, configure `OWNER_PUBLISH_TOKEN` as a sensitive production
environment variable, and store the same value in ignored `.env.owner.local` for
the owner's local developer tools. Do not distribute this file to contributors.
Do not use a `NEXT_PUBLIC_` variable. No secrets belong in the repository.

To disable the channel, remove the server token and redeploy. For rotation, replace
it in both production and the local secret file, then redeploy. Existing listings
are not removed and existing audit history is not rewritten.

## Verification

```sh
pnpm test:owner-publish
pnpm typecheck
pnpm test
pnpm build
```

`scripts/test-owner-publication.sql` exercises the publication transaction,
idempotency, permissions and audit preservation using fixtures, then rolls back
all fixture rows. It does not publish a real Skill or edit an existing review.
