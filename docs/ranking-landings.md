# Ranking landing pages

The 36 general `/rankings/[slug]` destinations use one server-rendered layout, matching the Trending page: compact heading, ranking links, a scrollable ranking picker, single-column rows, source owner avatars and expandable signals. The separate `/rankings/agent-proven` evidence report is preserved, including its richer report sections. The English titles, descriptions, slugs and canonical URLs remain unchanged. Eight locales translate interface text; repository names and descriptions remain source material.

The existing ranking definitions and scoring are retained. `new-agent-skills-this-week` now filters genuine directory records to the preceding seven rolling days before ranking; invalid/future dates and fallback records cannot count as new additions. This is the date OpenAgentSkill indexed the entry, not the repository creation date. The date-based rows distinguish actual repository pushes from directory updates.

The shared server loader reads at most 480 directory candidates, returns at most 30 results and caches the result for five minutes. The page identifies this bounded scope rather than claiming a global top 30. The underlying directory's saved-data fallback is explicitly labeled. Failed outcome reads do not become zero-risk evidence. Empty and unavailable lists are distinct.

The previous page calculated live results while labeling them with unrelated daily snapshot timestamps and 30-day movement. Those misleading labels and history reads are removed. The historical data API remains linked for the core rankings; use-case rankings have no daily snapshot job and do not advertise nonexistent history. No database schema or publication/review states change.

The Star ranking displays repository stars rather than adding duplicate repository totals. Rankings with new/update intent display the appropriate date. Supporting scores remain inside native disclosure controls and are described as signals, not installation approvals. Installation is handed off to the Skill detail page; the list does not invent install commands.

SEO: one H1, real anchor links, an ordered list, CollectionPage + ItemList/ListItem + BreadcrumbList, escaped JSON-LD, Open Graph and Twitter metadata. General ranking share images read the same cached list instead of mixing historical snapshot leaders with current results. Preference/query variants use noindex/follow and canonicalize to the original English URL. No new model calls or duplicate landing routes are introduced. Rankings and traffic can still fluctuate after a redesign.

Verification: `node scripts/test-ranking-landings.mjs`, full regressions, typecheck, production build, desktop/mobile ranking picker, representative ranking kinds, all locale variants and unknown-route 404.
