# Mysticism collection

`/topics/mysticism` is an editorial topic page, not a new publication or review policy.
The Skills dropdown links to it on desktop and mobile. The existing Skills URLs,
category taxonomy, ranking and search-index eligibility are unchanged.

The initial 15 entries are the site owner's Leon-Drq/6yao repositories. They were
published individually through `scripts/owner-publish-skill.mjs`, each pinned to
a commit with its own request ID. This does not grant AI approval, runtime
verification, creator verification or permission for unattended installation.
Current review and version evidence lives on each Skill detail page, not in this
editorial list. Do not fabricate scores to put a repository in this collection.

`lib/mysticism-collection.ts` contains names, descriptions, groups and upstream
demo paths. `lib/i18n/mysticism-copy.ts` provides an eight-language interface;
editorial Skill summaries are Chinese or English, explicitly labeled for other
languages. Counts derive from entries and are collection counts, not usage stats.

The four groups distinguish divination, chart interpretation, reflection tools,
and space/image-based traditions. Talent Discovery is explicitly non-divination.
The page discloses the owner's affiliation, limits on claims, personal-data risks
and the difference between an MIT source license and paid hosted services.
No Skill, demo API, image analysis or birth-chart calculation was executed to list
these sources. Photos cannot establish personality, intelligence, trustworthiness
or sensitive traits. This topic does not offer professional advice.

SEO: one canonical topic URL, server-rendered collection and breadcrumb schema,
one core sitemap entry. Query-language variants remain noindex/follow, consistent
with auxiliary pages. No individual Skill's indexing gate is changed.

Before changing membership, confirm publication with `/api/skills/lookup` and
verify the public detail URL. Run `node scripts/test-mysticism-collection.mjs`,
the existing regressions, typecheck and production build before deployment.
