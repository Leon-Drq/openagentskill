# Candidate intake pipeline

OpenAgentSkill keeps discovery scale separate from public marketplace quality:

- `skill_candidates` is an internal, service-role-only queue. Candidate rows do not create public pages or sitemap entries.
- `skills` remains the installable public registry. A candidate reaches it only after deterministic or AI review.

## Scheduled capacity

| Stage | Schedule | Default bound | Daily bound |
| --- | --- | ---: | ---: |
| GitHub discovery | hourly at `:15` | 22 searches × 100 results; repositories require 20+ stars | 52,800 result slots |
| Light validation | hourly at `:20` and `:50` | 120 candidates/run | 5,760 candidates |
| Public publication | `:00`, `:10`, `:30`, and `:40` hourly | 8 fast-track + 8 AI/retry slots per run | 1,536 capacity; 1,000 rolling-24h target |

These are ceilings, not promised insert counts. Repository relevance filtering, stable identifiers, source URLs, exact content hashes, licenses, security checks, and existing registry records reduce the number of unique public skills.

The 20-star floor applies only to automatic discovery and automatic source sync. A creator or user can submit a valid zero-star repository through the public submission flow; it still must pass structure, license, security, quality, and duplicate checks.

## Fast-track policy

GitHub stars are an adoption signal, not a security guarantee. A repository with at least 100 stars is eligible only when all of the following remain true at publication time:

1. An unrestricted license is detected.
2. The repository was pushed within the last 12 months.
3. The bounded package is documentation-only and fully scanned.
4. Static analysis and instruction scanning report low risk.
5. The same source or exact SHA-256 content is not already queued or published.

The policy runs once during validation and again immediately before the public upsert. Script files, truncated packages, dangerous shell instructions, secrets, elevated privileges, command execution, and network execution all leave the fast track.

## GitHub limit protection

- Authenticated search requests are spaced by at least 2.1 seconds (under 30 requests/minute).
- Unauthenticated search requests are spaced by at least 6.1 seconds (under 10 requests/minute).
- Search stops for the current window on HTTP 403 or 429 and respects reset/retry headers.
- Validation uses two workers with pacing between chunks; publication is sequential with a 2.5-second gap and a rolling 24-hour target guard.
- Validation and publication do not run without `GITHUB_TOKEN`.
- Queue claims use leases and `FOR UPDATE SKIP LOCKED`, so overlapping invocations do not process the same row.
- Validation and publication failures have separate retry states with exponential backoff.
- Workers stop at a 210-second internal time budget, release unstarted leases, and reclaim stale `publishing` rows after interruption.
- AI review is capped at 20 seconds per candidate so one provider timeout cannot exhaust the whole cron run.

Set `CANDIDATE_PIPELINE_DISABLED=true` for an immediate pause. Cron endpoints remain authenticated by the existing automation secrets.
