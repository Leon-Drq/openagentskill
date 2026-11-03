# Search indexing recovery

Published database-backed articles returned 404 even when their content existed.
The public D1 adapter intentionally accepts only bounded flat reads; the legacy
`blog_posts` query still requested an embedded `skills(...)` relation. Its error
was treated as a missing post. Blog reads now fetch the post and batch its public
Skill references separately, using the same publication policy. Missing/private
references leave the published article readable. A database failure throws instead
of returning a false 404; an actually absent post still returns 404.

`/sitemaps/blog.xml` advertises the existing published article archive. It reads
beyond the 1,000-row database page boundary, excludes URLs already in the core
sitemap, uses stored publication/update dates, and caches successful complete reads.
A cold read failure returns retryable 503 rather than an incomplete XML document.
No article, review, publication state, or Skill search eligibility is changed.

The shared link policy now covers query states across the whole site, including
Gallery search, language preferences, report utilities, generic alternatives and
account links. These remain clickable; `nofollow` stops recommending them as new
crawl targets. Real Gallery pagination, canonical translated paths and attribution
links retain their existing behavior. Robots access is unchanged so previously
discovered pages can still expose their existing canonical/noindex directives.

Validation:

- `pnpm test` includes D1-backed blog detail/list reads, public/private references,
  missing versus failed reads, a 1,053-row sitemap and second-page failure.
- Native workerd/D1 business checks exercise the same article read functions.
- SEO tests cover blog sitemap completeness/error responses and crawl policy.
- `pnpm typecheck`, `pnpm lint`, and the Cloudflare production build are required
  before deployment; `pnpm check:seo https://www.openagentskill.com` checks restored
  articles and their sitemap alongside the existing public routes.

Search Console's all-known-URLs report includes historical query URLs, API
responses and image resources. Intentional exclusions are not a target to make
indexable. Deployment checks establish technical eligibility, not Google's
indexing decisions or an immediate change to historical counts.
