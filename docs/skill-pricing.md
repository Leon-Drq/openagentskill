# Skill pricing pilot

## Gallery discovery

Gallery uses the same reviewed prices as Skills. It exposes only Free and Paid
filters plus the unfiltered All state. Free-plus-paid editions belong to Paid,
with an explicit disclosure. Unconfirmed or expired entries have no price badge
and remain visible under All; a license alone does not prove free acquisition.
Prices concern skill access, not the sale of an artwork. Runtime/model costs
remain separate. Filters apply before pagination and combine with format,
creator, search and use case. Filtered URLs remain noindex with the original
Gallery canonical; clearing filters retains language and sort preferences.

This release is a discovery layer, not a payment processor. Existing free source
links, installation paths, safety checks, rankings and canonical URLs stay intact.
There are no model calls or database migrations for commerce metadata.

## Evidence and scope

`lib/skills/commerce.ts` contains a small, owner-reviewed offer register keyed by
the existing canonical skill slug. Unknown is the default: a public repository,
an SPDX license, star count or an install command is not price evidence. Initial
entries are the existing Anthropic frontend-design, Obra using-superpowers and
Hypit listings. Their official sources were inspected on 2026-09-28; repository
instructions were not executed. Hypit explicitly distinguishes free acquisition
from optional model services. No paid products or seller endorsements are invented.

The UI supports free acquisition, paid acquisition, free-plus-paid editions and
unconfirmed pricing. An external paid API does NOT make a free skill a paid skill.
License and runtime costs are separate disclosures. Price labels do not change
review status, install eligibility, certification, natural ranking or outcomes.

Sources:
- https://github.com/anthropics/skills/tree/main/skills/frontend-design
- https://github.com/obra/superpowers
- https://github.com/hypit-ai/hypit#install-once

## Add or revise a commercial offer

Creators use the existing Contact entry. Collect:
1. Existing skill URL and repository ownership/claim evidence.
2. Official pricing URL and official HTTPS checkout URL (no arbitrary redirects,
   URL shorteners, tracking credentials, affiliate links or third-party copy).
3. Price, ISO currency, and billing period: one-time, monthly, yearly, usage-based
   or contact. Do not quote a per-unit price without explaining the unit at source.
4. Exact deliverables, preview/examples, compatibility and runtime charges.
5. Seller identity, license, update/support scope and refund terms.

A maintainer verifies these facts and submits a reviewed change to
`reviewedSkillOffers`. Paid/freemium entries require an official purchase URL;
numeric prices require a positive amount and currency. Contact-only offers have
no fabricated amount. Entries expire to unknown after 90 days until rechecked.
Automated structure tests cannot establish ownership or commercial accuracy.
Do not publish a repository or alter its review using this register. New skill
listings still follow the documented owner or community publication workflow.

No seller payment accounts, platform subscription, lifetime deal, escrow,
entitlements, commission or refunds are implemented in this phase. A seller
checkout opens off-site, is labelled, and is hidden when the skill is safety-blocked.
Agent metadata explicitly requires user consent for purchases. Never treat an
outbound click as a completed order. Validate demand before building payouts.

## Implementation and SEO

Known-offer filters use a bounded, reviewed slug list in the existing SQL query
BEFORE ordering, counting and pagination. Unknown excludes only current known
offers. Search augments its bounded candidates with matching known-offer slugs.
The registry remains the source of publication eligibility. Do not expand this
static register indefinitely: migrate to indexed pricing data if the pilot grows
beyond 100 listings, with equivalent publication/RLS and before-limit semantics.

Cache keys include the effective offer-slug filter, so expiry does not leave old
filtered counts in the data cache. Existing five-minute public ISR remains; query
variants remain noindex and canonicalize to the original directory. No fabricated
Offer schema, product reviews or aggregate ratings are added. Unknown records do
not claim zero price in the shared manifest anymore. All eight UI locales have
price and cost copy. Default navigation and Gallery categories are unchanged.

## Verification

Run `pnpm test:commerce`, the full regression suite, typecheck, lint and production
build. Check desktop and mobile `/skills`, `/skills?pricing=free`,
`/skills?view=all&pricing=free`, paid empty state, reset, language, pagination and
Hypit's detail costs. Unknown prices must remain unknown. Check the cached default
directory and canonical/noindex query metadata after deployment. Paid fixtures in
unit tests are synthetic test data and must never be listed in production.
