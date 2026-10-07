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
records, X automation or creator ownership. Gallery examples label their actual
origin: author examples or scoped platform demonstrations with production notes.
Neither grants general runtime or safety approval. Google ultimately chooses whether to
index or rank a page; adding a sitemap entry cannot guarantee either.

## Initial example

GC Minimal Zine Poster v0.3.1: source pinned to the commit and SKILL.md hash in the
editorial entry. Three MIT-licensed author images form one Gallery series with a
local license copy and pinned source link. Register its engagement identity using
`scripts/register-gc-zine-gallery.sql`; the idempotent seed creates no votes.

The canonical listing is `liamgvchi-gc-minimal-zine-poster-v0-3`, the existing
source-pinned record. The older repo-only URL redirects permanently to it and is
excluded from sitemap rows/counts. Both historical database records are retained.

## Native Subtitle Quote Image (2026-10-06)

The repository was already in the registry as a reviewed Skill; its recorded
quality score was 39.23. This change does not alter that score, its approval or
installation policy. The editorial entry matches the existing cataloged v2.1.1
revision `f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd` and SKILL.md hash exactly.
Upstream has newer revisions; this example does not cover them.

The worked example uses NASA's 28-second archival clip of JFK's 1962 Rice
University speech, preserved byte-for-byte. Six quotation lines were checked
against the JFK Library transcript and rendered onto representative real frames
with the pinned Skill's script-subtitle mode. The text is explicitly labeled as
post-production subtitles; word-level audio alignment was not verified. This
replaces the earlier graphic workflow-tip demo with the Skill's intended speech
quote-card scenario. NASA footage and the JFK Library transcript are credited
separately from OpenAgentSkill's selection and rendering. The actual JPG, input,
script, sources, environment and artifact hashes are stored in
`public/media/examples/native-subtitle`. The local builder is
`scripts/render-native-subtitle-example.py`; the Skill and Gallery pages both
expose reproduction files and the command.

This adds useful original reference content, a descriptive title, source/version
attribution and image alt text through existing canonical/sitemap/index rules.
It does not promise Google indexing or rankings and has no Search Console outcome
measurement yet. Any catalog source/license change revokes the editorial match.
The complete October 2 sitemap fallback and its original capture date are retained;
the new source-matched editorial URL is added and the policy fingerprint updated.
This is a bounded amendment to a stale fallback, not a new full database capture.
