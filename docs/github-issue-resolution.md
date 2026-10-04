# Open issue investigation: 2026-10-04

## #165 — duplicate Jev Social listings

Both `socai-io-jev-social` (created September 21) and
`socai-io-jev-social-jev-social` (September 24) record
`socai-io/jev-social` + `skills/jev-social/SKILL.md`. Both have static checks;
neither has AI approval. The established row was already synchronized to
`193213e1338f0a5cb2ed5aa61277ae8481b8983d` on September 29. Keep it rather than
overwriting it with the older `v0.1.5` submission.

The exact-path submission generated a different slug and only handled slug/hash
collisions. Full repository queries went through task expansion and full-text
search instead of a repository identity lookup.

The fix redirects the duplicate URL (including localized URLs), performs a live
exact repository search, recognizes repository matches, and links approved
duplicate submissions to the oldest public repository/path identity without
overwriting source or review evidence. A database trigger serializes concurrent
inserts for that identity; same-slug source synchronization remains supported.
The invoker-secured directory view excludes later duplicates before counts and
pagination. Historical rows, submissions, reviews and usage remain intact;
historical telemetry is not moved or presented as new runtime evidence.

Deploy `canonical_skill_sources` before the application. Run the SQL fixture
script inside a transaction and roll back. Verify a repository search returns
the canonical page, both catalog counts and pages exclude the duplicate, and
the old duplicate URL returns HTTP 308. Do not close the issue before rollout.

## #100 — bazi-skill manual review

Revision `9c6b74c743c9ff46a2af8d786fb1cc8651804d5d` has an Apache-2.0 LICENSE
and NOTICE. The latest submission is `listed` with `method=manual`,
`approved=false`, and no public Skill row. The license concern was already
resolved; the September 21 review retained two other findings.

The elevated-privilege match is a false positive at
`docs/superpowers/specs/2026-08-24-classics-knowledge-layer-design.md:43`:
the table cites the GitHub identity `Sudo-Biao/suangua`. The fix distinguishes
source identifiers from standalone `sudo`/`runas` commands, while preserving
actual privilege instructions and prose as high risk.

The coverage finding remains valid: this immutable revision has 87 blobs,
82 reviewable files within the 120,000-byte per-file limit, and one oversized
173,298-byte planning document. The 30-file scan was dominated by reference
documents and did not cover all executable scripts. No repository code was run.
Removing the false positive cannot establish complete coverage or approve the
Skill. Do not alter the original review, repeat the same paid review attempt, or
close this issue as published.

Resolution requires a complete manual inspection of the pinned bundle, or an
upstream revision with a smaller self-contained Skill package and clear setup
instructions. Keep cultural/entertainment framing in any eventual listing.
If the owner separately requests publication, use the documented owner CLI;
that publication does not become AI approval or runtime verification.

## #151 — Skillware executable bundle proposal

This is a feature request, not a broken existing submission. The author supplied
the v0 bundle contract in the September 21 comments: `manifest.yaml`, `skill.py`,
`instructions.md`, `test_skill.py`, matching `manifest.name` and folder registry
ID, and an issuer block. There is no separately versioned JSON Schema today.

The smallest useful implementation is a separate metadata adapter and a
structured bundle issue form. Keep existing Markdown submissions on their
reviewed API. Required adapter fields:

| Field | Validation/source |
| --- | --- |
| `format` | Literal `skillware`; do not infer from a repository name |
| Registry ID | `manifest.name`, matching `category/skill_name` in the bundle path |
| Source | Public GitHub repository, bundle path and resolved immutable commit SHA |
| Skill version | Exact semver from the manifest at that commit |
| Runtime version | Separate pinned PyPI `skillware` package version |
| Install extra | Published extra corresponding to this registry ID |
| Install hint | Generate `pip install "skillware[<extra>]==<runtime_version>"` from validated fields |
| License | Upstream license declaration at the same commit, with attribution link |
| Requirements | Manifest requirements; preserve constraints without executing them |
| Evidence | Pinned manifest, instructions and test-file links; presence is not a passed test |
| Maintainer disclosure | Relationship declared by submitter, independent of verified ownership |

The adapter should show a format badge, bundle/manifest links, both versions and
the upstream installation hint in the existing catalog. Do not synthesize a
`SKILL.md`, route it through `npx skills add`, mirror the bundle, install it,
execute tests, claim security review, or grant unattended installation.
Metadata validation, security review and runtime evidence must have separate
states. A valid community bundle submission enters review; metadata validation
alone does not publish it. Use the existing Git-reviewed external editorial
catalog pattern for a separately authorized maintainer listing, with an explicit
publication reason and false runtime/auto-install flags.

Before implementation, agree the adapter contract with upstream (a versioned
JSON Schema is preferable), verify the runtime extra against the pinned release,
and add fixtures for mismatched IDs, moving branches, missing licenses, shell
injection in install metadata and regression-free Markdown submission behavior.
Keep #151 open until the submission-to-catalog path is implemented and deployed.
