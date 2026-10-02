# Skill cards: voting and saving

The unified `/skills` directory renders Like, Dislike and Save on every card,
in a compact toolbar at the top left, including skills with examples and technical skills without a preview. Detail
pages use the same controls. Compact controls keep accessible labels/tooltips and
44-pixel touch targets. One provider requests a bounded batch of the visible
slugs; cards never individually query Auth or bookmarks.

Skill votes are one mutually exclusive vote per signed-in account and skill.
Clicking the selected direction cancels it. This is a community preference,
separate from Gallery case votes, GitHub stars and agent execution feedback.
No existing Gallery votes, bookmarks, review states or outcome records migrate.
Save uses the existing bookmarks table, so prior saved skills remain saved.

`GET /api/skills/engagement?slugs=...` shares public counts for 60 seconds only.
Account votes and bookmarks are read outside that cache; responses are private
and never stored by the CDN. At most 64 slugs are accepted, normally 16.
`PUT` validates same-origin requests, authenticated non-anonymous users, public
skills and an explicit desired vote/save state. RLS enforces vote ownership,
immutable identity and public targets, and the aggregation RPC is server-only.
Failed reads display an unavailable/retry state rather than made-up zeros.

Verify with `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:links`,
`pnpm build` and `supabase/tests/skill_votes.sql` through a privileged SQL
connection. The SQL fixtures and test votes are fully rolled back. Browser
verification covers desktop/mobile controls, guest sign-in return URLs and
network failure recovery without creating production feedback or votes.
