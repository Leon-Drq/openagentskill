# Skill Issue review and reconciliation

Website changes do not use this workflow. This workflow processes **New Skill** Issues only; metadata corrections and safety reports require engineering/source investigation.

## Maintainer commands

On an open `[Skill]:` Issue, a collaborator with repository `write`, `maintain`, or `admin` permission can post:

```text
/oas review <full-40-character-commit-sha>
/oas reconcile
```

The **Import Skill Issue** workflow also supports manual dispatch with `issue_number`, `operation` (`review` or `reconcile`), and `revision` (required for review).

- Re-review uses the normal submission API, pinned to the requested upstream commit. It does not use owner publication or override a rejected review.
- Previous review comments and database submissions remain intact. A bot-authored attempt marker is appended **before** submission. The same repository, path, and commit is not submitted twice from one Issue, even when a workflow is retried.
- There is a six-hour per-Issue cooldown for new review attempts, in addition to the application submission limits and model budget. Reconciliation does not call a model.
- Permission is checked against GitHub, not Issue body text, claimed authorship, or upstream instructions. Workflow checkout is the maintained `main` branch, never submitted repository code. No Skill is executed.
- Reconciliation looks up the exact public repository + SKILL.md path. A confirmed existing listing is linked without a duplicate submission. A missing, pending or quarantined listing keeps the Issue open.
- An already-published different revision is not overwritten via re-review. Use the existing source-version synchronization workflow and preserve the current review history.
- Only a confirmed public URL allows automatic closure. Publication is not a runtime test, creator verification, or universal safety approval. Comments distinguish static, AI, manual and unclassified legacy review evidence.

## Recovery after interruption

The attempt marker deliberately fails closed if the network fails after submission: do not remove it and blindly repeat a paid review. Run reconciliation, then inspect the saved submission if publication is still pending. An updated source commit can be submitted after the cooldown. Large histories (300+ comments) require manual inspection.

## Version provenance

All current source-intake paths resolve versions from explicit SKILL.md frontmatter (including `metadata.version`) or a **name-matching** `.claude-plugin/plugin.json` at the same source revision. `2.2` remains `2.2`; absent/invalid declarations are `Unknown`, never invented `1.0.0`. Unrelated root package versions and moving “latest” releases are not evidence for a nested Skill.

The detail API exposes `version_provenance`, `source`, `listing_status` and `review_evidence`. Version corrections are metadata corrections, not approval. Historical records without provenance remain unclassified until checked; do not assume every legacy `1.0.0` is fabricated.

## Risk and license interpretation

Negated prose such as “does not provide trade execution” or “no API key needed” is not itself an affirmative permission claim. Separate positive statements, install commands and fenced code retain their signals. This context matching only improves displayed hints: it does not weaken the executable static scanner or publication gate. Network, subprocess, filesystem and actual environment-access risks still require review.

`PolyForm-Noncommercial-1.0.0` and CC-BY-NC are restricted licenses, not unrestricted commercial-use permission. A missing license must remain unresolved until an upstream declaration is supplied.
