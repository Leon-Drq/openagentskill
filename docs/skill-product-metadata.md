# Product details on Skill submissions

The repository submission form accepts an optional `productMetadata` object per
selected SKILL.md. Website, setup documentation, original product logo, example
link, prerequisites and runtime/license notes are stored with the private receipt.
The worker carries them to the catalog only after the existing review gates pass.
Duplicate submissions never overwrite an established listing's source, review or
product information. These fields do not confer author ownership or approval.

`POST /api/skills/submit` accepts the same object from web, API and agent clients:

```json
{
  "productMetadata": {
    "websiteUrl": "https://example.com/product",
    "documentationUrl": "https://example.com/setup",
    "logoUrl": "https://example.com/logo.svg",
    "exampleUrl": "https://example.com/demo",
    "prerequisites": "Node.js 20+, plugin dependencies and a connected MCP server.",
    "runtimeNotes": "Copying SKILL.md alone is not a complete installation."
  }
}
```

All fields are optional. URLs must be public HTTPS, at most 1,000 characters, with
no credentials, IP literals or local hostnames. Logos must have an image extension
(PNG/JPG/JPEG/WebP/GIF/SVG). Text fields allow 2,000 characters each and render as
plain text. Do not submit keys or other secrets. Logos use browser image contexts,
never inline SVG/HTML or server-side downloads; failed images show a neutral
initial. Original artwork and author avatars remain distinct. Example links are
references, not runtime verification or automatic gallery previews.

Catalog list queries select only the logo URL; prerequisite text is loaded on
detail/agent requests. Existing caches and directory layouts are retained.

## Correct existing records

Use the owner CLI's metadata-only mode. It changes no review, publication,
source revision, score, verification badge or installation command. A pending
submission remains pending; this operation cannot create a new listing.

```sh
pnpm owner:publish --metadata-only --repository owner/repo --path skills/example/SKILL.md --submission-id RECEIPT_UUID --metadata-file product.json --reason "Owner requested author-supplied product details" --dry-run
# Remove --dry-run after checking the result.
```

The metadata file contains the complete `productMetadata` object (without the
wrapper). This replaces product information only; omitted fields are removed.
The optional submission ID must match the exact repository/path. Without it,
only an existing catalog entry can be updated. Running reviews reject corrections
until their worker finishes. The dedicated owner credential is sent only to the
configured first-party endpoint. Each change atomically records previous values
in a private audit log. Retries use the same `--request-id`; conflicting reuse is
rejected. Ordinary submitters cannot call this operation.

Apply the `skill_product_metadata` migration before deploying application code.
Verification: `pnpm test:submission-flow`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, and `scripts/test-product-metadata.sql` (transaction rolled back).
