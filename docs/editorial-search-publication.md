# Source-pinned editorial discovery

Search visibility and installation approval are separate decisions. Existing
AI-reviewed sitemap eligibility is unchanged. A narrow editorial pilot additionally
allows a reviewed public source to have an indexable, useful reference page without
buying a model review or claiming the Skill was executed.

Entries in `lib/seo/editorial-index.json` require a concrete repository, SKILL.md
path, immutable commit, content SHA-256, explicit license and useful original
editorial content. They must include a description of the actual output, workflow,
limitations, source attribution and genuine examples where available. No copied
marketing claims, fabricated test results, review scores or safety badges.

Eligibility matches every source identity field and requires current source sync
and a published listing status. A changed revision, license, hash or identity stops
this editorial eligibility until the new source is checked. Owner publication by
itself does not make arbitrary entries indexable. Sitemap rows and counts use the
same predicate as detail-page robots eligibility. Keep this list curated and small;
do not turn it into a bulk admission mechanism.

This policy does not change installation gates, community submissions, AI review
records, X automation or creator ownership. Gallery examples remain author examples,
not evidence of execution by OpenAgentSkill. Google ultimately chooses whether to
index or rank a page; adding a sitemap entry cannot guarantee either.

## Initial example

GC Minimal Zine Poster v0.3.1: source pinned to the commit and SKILL.md hash in the
editorial entry. Three MIT-licensed author images form one Gallery series with a
local license copy and pinned source link. Register its engagement identity using
`scripts/register-gc-zine-gallery.sql`; the idempotent seed creates no votes.
