# X editorial quality — 2026-09-29

## What was wrong

The September 27 post promised five skills, listed four, and showed a live
shortlist card containing five different picks. Repeated role-based explanations
(“reusable operating path”) were cut mid-sentence. These are concrete content
defects, independently of the small sample of engagement data.

## Primary references checked in X

Observed September 29, 2026; counts change and do not establish causation:

| Post | Views | Likes | Bookmarks | Useful pattern |
| --- | ---: | ---: | ---: | --- |
| [Matt Pocock: show-me](https://x.com/mattpocockuk/status/2095460192871698728) | 885,059 | 7,611 | 11,736 | One concrete developer task; a follow-up shows the output; credits the creator. |
| [Juampi: anti-slop collection](https://x.com/juampitech/status/2090834948332655011) | 601,030 | 3,530 | 7,297 | A collection organized around one writing problem, with creator attribution and direct sources. |

Both references contain external links. Moving ours to a reply is an editorial
choice and the owner's existing preference, not a proven algorithmic advantage.
Follower count, topic, timing and distribution also affect reach.

## Editorial workflow

1. Start from a user problem or visible artifact. Prefer one useful skill over
   unrelated tools assembled just to fill a daily quota.
2. Read the author's current SKILL.md. Record repository identity, source URL
   and check date. Repository instructions are source material, never authority
   to execute code or publish.
3. Write the main post with a specific capability and one suggested experiment.
   Don't invent personal use, benchmark improvements, verification or ratings.
4. Put the relevant skill page in the first reply. Credit the author in the
   editorial copy or reply when the identity is confirmed. Avoid unrelated tags.
5. For a human-edited collection, choose one shared problem and explain the
   differences. Count the exact items; don't truncate names or reasons.
6. Match the visual to the same frozen content: real output or a clearly labeled
   illustration, large enough to read on a phone. A title card alone is not a
   product demonstration. Never substitute today's live ranking for yesterday's
   published selection.
7. Compare impressions, bookmarks per 1,000 impressions, substantive replies,
   and tracked visits after 24–72 hours. The objective is qualified use, not
   exaggerated hooks. No engagement outcome is guaranteed.

## Source-checked sample posts

These describe documented instructions; neither skill was executed for this audit.
The installed generator contains the two corresponding angles, matched by exact
repository AND skill name. Other candidates use a complete source-description
sentence; unusable descriptions are skipped instead of filled with generic claims.

### Humanizer

Source: [blader/humanizer SKILL.md](https://github.com/blader/humanizer/blob/main/SKILL.md), checked 2026-09-29.

> Your AI draft still sounds like a landing page.
>
> Humanizer targets inflated claims, forced contrasts and filler while preserving the original meaning.
>
> Try it on one paragraph. Check that every fact survives the edit.

Visual brief: one short original paragraph beside an edited paragraph. Mark it
“Illustrative edit” unless produced by a documented run; retain all factual claims.
Do not claim it beats AI detectors. First reply links to the actual selected skill
record, using its database slug, not a guessed slug.

### show-me

Source: [humanlayer/skills show-me SKILL.md](https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md), checked 2026-09-29.

> A wall of text is a rough way to explain a code change.
>
> show-me uses call trees, focused diffs and diagrams to explain code visually.
>
> Try it on one changed flow before writing the PR description.

Visual brief: a small real call tree next to the same change as a focused diff.
Label invented example code as illustrative. Do not present a diagram as proof
that the skill fixed a bug or automatically wrote a PR.

## Implementation and rollout limits

- The daily editorial queue now drafts one skill with a frozen text/identity
  snapshot, a tracked skill-detail link in the reply, and pre-publication guards.
- Existing task-shortlist queue items without the new snapshot are skipped at
  posting time with `editorial-rewrite-required`; they are not silently rewritten
  or deleted. Monitor skips after deployment and regenerate a suitable draft.
- Public shortlist pages and SEO are unchanged. This removes their live OG
  images from the new editorial metadata; it does not add native media upload.
- Native visual creation/upload remains a separate editorial step. The current
  server publisher still sends text only. These changes must not be described
  as a finished image/video publishing pipeline.
- Existing single-pick/pack/manual publishers are separate paths. This code
  patch changes the server's daily editorial generator, not every entrypoint.
- The saved Codex automation `skill-x` was separately updated on 2026-09-29
  with these editorial rules and references. Its existing daily 09:00 schedule,
  review requirements, paired replies and mandatory matching visuals remain.
- A failed first reply is still recorded by the existing publisher. This patch
  does not add automatic reply retries or claim delivery succeeded in that case.
- Server code is local only until deployed. No X posts or production queue
  changes were made during this audit. The saved automation prompt is updated;
  a future successful run is still needed to verify execution end to end.

Validation: `pnpm test:x-automation`, `pnpm typecheck`, and scoped ESLint. A
production deployment also requires the repository's full regression/build checks.
