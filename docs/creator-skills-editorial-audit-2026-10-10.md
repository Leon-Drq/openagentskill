# Creator workflow article: source and publication record

This is an original OpenAgentSkill editorial guide, prompted by the owner's
request to evaluate [想风's roundup](https://x.com/xaiwind/status/2108205644033806837)
and publish a multilingual blog article. Source inspection date: 2026-10-10.
It does not republish the original article, its images, or its marketing claims.

## Scope and evidence

- Twelve exact Skill paths and immutable Git commits are recorded in
  `lib/blog/creator-workflow-sources.json`. Each article entry links to that file
  in GitHub. Repository documentation and relevant license files were inspected.
- Original full text is supplied for English, Chinese, Japanese, Korean, Spanish,
  German, French and Indonesian. Product names and source paths stay unchanged.
- Seven existing registry entries are linked. Their current review status and
  pinned revision are not overwritten or represented as approval of the revision
  examined for this article.
- Five missing entries received owner-publishing **dry runs only**. No records
  were published, no review scores changed, and no third-party code was executed.
  The owner's request asks whether they are worth listing; this editorial release
  does not treat that question as permission for a bulk registry publication.
- No API credits, paid accounts, browser logins, platform publishing, generated
  media or runtime outcomes were tested. All usage claims describe source docs.

## Missing registry candidates

| Repository / path | Advisory result | Editorial recommendation |
| --- | --- | --- |
| imlewc/video-to-subtitle-summary-skill / SKILL.md | Medium; environment access and subprocess use; truncated scan | Worth evaluating for a listing with explicit local/tool/API requirements; not a runtime pass |
| oil-oil/video-publisher-skill / video-publisher/SKILL.md | Low; no rule alerts; truncated scan | Worth evaluating as a draft-preparation workflow; account access and final publishing remain separate |
| imraywang/wewrite / skills/wewrite/SKILL.md | Low; no rule alerts; selected directory only | Worth evaluating; companion Skills and CLI are outside this narrow scan |
| otter1101/blogger-distiller / SKILL.md | Critical rule classification for deletion operations | Hold installation recommendation until installer target paths and script behavior are reviewed |
| xaiwind/x-article-publisher / SKILL.md | High; dynamic execution, process access, dynamic fetch URL | Hold installation recommendation for script/profile review; author documents macOS testing only |

Advisory scans read up to twelve supported text files of at most 120 KB each;
they exclude generated/vendor directories and binary assets. A rule match is
not proof of malicious behavior, and a low result is not proof of safety.
Any subsequent owner publication must use the documented owner channel with
the selected path and commit; it must not create AI approval or runtime badges.

## Selection decisions

The article separates individual Skills from collections, runtimes and apps.
In particular, the inspected `fxyadela/write-then-publish` commit
`6ff00b06ae0f04aa119449a037a4a1c83e03c8ae` has no SKILL.md and its license
restricts commercial use. The article links that source rather than presenting
it as an unrestricted, interchangeable Skill. Seedance writes prompts, not
rendered videos. HyperFrames needs its runtime and companion workflow.

The article includes the two higher-concern candidates to explain their role
and limitations, with explicit caveats; it does not present all twelve as
approved installations. It does not copy unsupported promises about revenue,
team replacement, platform account safety, or zero-cost commercial usage.

## Release checks

`pnpm test:creator-blog` checks translation coverage, pinned source identities,
language navigation, metadata, structured data and sitemap entries. The suite
is included in `test:seo` and the full regression run. Proxy regressions cover
query-language redirects without inventing translated legacy blog URLs.

`node scripts/check-creator-blog.mjs [origin]` inspects the served HTML for all
eight bodies, canonical URLs, reciprocal hreflang, BlogPosting data, real 404s,
seven locale redirects, sitemap inclusion and crawlable blog-hub links.
Browser release QA also checks mobile overflow and real language-link clicks.

The change adds article routes, a blog-hub entry and shared route recognition.
It does not change Skill directory or detail page UI.
