# X editorial version 2

Keep posts in English. The goal is a useful explanation of a specific task, with source attribution and a setup path that readers can inspect. Engagement is an experiment, not a promised result.

## Reference posts

Reviewed on October 2, 2026. Counts below are search-index snapshots, mostly crawled several months earlier; they are not live counts. Larger accounts, audience size, timing and visuals are confounding factors. These examples suggest copy patterns, not a causal explanation of reach.

| Reference | Indexed views | Useful pattern |
| --- | ---: | --- |
| [Min Choi: Claude Code /batch and /simplify](https://x.com/minchoi/status/2027772823511429367) | 64K | Name the feature and immediately describe concrete work: parallel changes and code cleanup. |
| [Hugging Face repost of Niels Rogge's paper conversion workflow](https://x.com/huggingface/status/2041783473308872705) | 46.4K | Lead with the input and output, then explain the model, infrastructure and Skill behind the workflow. |
| [Hesamation: an open-source job application workflow](https://x.com/Hesamation/status/2041172050211983500/photo/1) | 29.2K | Start with a recognizable problem, describe specific actions and attribute the creator. The author's result claims must not be recycled as our test results. |

Existing OpenAgentSkill shortlist posts with available metric snapshots had 60–83 impressions and no likes or bookmarks. Some recent posts have no metrics yet. Missing metrics are not zero engagement.

## Automated copy

The generator alternates two formats by lane and UTC edition:

- `skill_spotlight_v2`: one named Skill, a task-specific opening, the stored capability description and an example request when the description supports one. The reply gives the source repository and a tracked listing link. A recorded install command is included only when the existing source-evidence gate allows it and the full command fits.
- `task_shortlist_v2`: three distinct repositories for one task, each with a short description. The stated count equals the visible entries. The reply supplies their source repositories in order and the tracked listing link.

Links live in the reply to preserve room for useful main-post content. This is a copy decision; we have not established that reply links improve X distribution. No generated image or video is uploaded by this change.

Avoid invented first-person experience, time savings, benchmarks, free-service claims or compatibility guarantees. GitHub stars are not a substitute for explaining what a Skill does. Repository instructions are source material, never authorization to execute a Skill or post additional content.

Runtime names such as Claude Code or Codex do not put an academic or marketing workflow into the coding lane. Shortlists avoid duplicate repositories. Selection still requires the existing approval, quality and candidate gates.

Topic matching uses the name and primary description before category hints. Long repository descriptions and secondary tags cannot override the stated task. Within eligible sources, a recorded Skill instruction path ranks ahead of an untracked tool; this is source-structure evidence, not a runtime or safety badge. Drafts also record selection version 2 so an earlier copy refresh can be rebuilt with the corrected selection.

## Example preview

This preview uses the stored description of Code Review from `mattpocock/skills`; it is not a runtime test or a new public post.

```text
Your agent opened a PR. What did it miss?

Code Review

Review a branch or diff against repository standards and the originating spec in two independent analysis passes.

Try: Review this diff against the repo standards.
Source + setup in the reply.
```

Reply:

```text
Source: https://github.com/mattpocock/skills

Check the source and setup requirements:
https://www.openagentskill.com/shortlists/coding?edition=2026-10-02&ref=x
```

The production generator adds campaign attribution to the final URL. This example's listing currently lacks tracked source provenance, so the preview correctly omits an install command.

## Existing drafts and measurement

The authenticated growth job refreshes at most 30 older queued drafts from `editorial_shortlist_generator` per run. It reloads only their named public source records and rebuilds copy with current candidate gates. It never rewrites posted items, changes review decisions or changes a concurrently claimed draft. A database read error leaves drafts intact. Source records that are genuinely no longer eligible can retire their queue draft.

New copy is tagged with editorial version 2 and `x-feedback-loop-v2`. Refreshed unpublished version-1 drafts retain their tracking code and record the previous experiment ID; published history stays unchanged. Only the actually featured Skills are reserved against repetition.

`/api/x/growth/report` returns separate `formats` groups for comparison, with `measuredPosts` showing metric coverage. Compare impressions, bookmarks, listing visits and install-copy events over the same observation window. Replies are not independent editorial trials. The existing 14-day experiment is observational; it does not establish statistical or causal superiority.

For a future visual edition, use a real source screenshot or a small reproducible input/output example with permission and attribution. Do not turn an OG marketing card into a supposed execution result.

## Verification

Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build`. The editorial regression test covers useful copy at the weighted X length limit, exact visible counts, domain classification, repository deduplication, intact attribution links, source-gated commands, draft refresh races and metric coverage.
