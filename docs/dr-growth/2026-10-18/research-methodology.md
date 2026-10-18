# Frozen readiness research asset

The dated report is `/reports/skill-readiness-2026-10-18`. It reuses ResourcePageShell and the site's metadata helper. It has a self-referencing canonical, visible methods, Dataset/Report structured data, row-level downloads, and a reusable SVG chart.

## Evidence and boundaries

- Source: `https://www.openagentskill.com/reports/state-of-agent-skills-2026.json`, captured once on 2026-10-18. The complete response has 1,000 row-level records, not only the 25-item shortlist. Exact bytes and source-generated/capture times are in the public asset directory.
- Unit: registry record. The full sample contains 978 distinct repository strings; its 97 source-classified agent-skill records contain 78. The source is quality-ranked and non-random.
- The export includes an installReady boolean, not raw instructions. The report measures the flag's coverage and does not claim an installation-instruction audit or successful execution.
- Exported lastPushedAt can fall back to registry updated_at. The report therefore calls this timestamp recency, not confirmed code maintenance.
- License labels are metadata. No license file, legal permission, compatibility, classifier accuracy, trust score, or reported outcome was verified.
- The source implementation can use fallback data without exposing the read path in the JSON. The snapshot reproduces the actual public response, not a claim of privileged database access.

## Frozen observations

| Observation | Full quality-ranked sample (n=1,000) | Source-classified agent-skill subset (n=97) |
| --- | ---: | ---: |
| License value recorded | 822 | 89 |
| Timestamp within 180 days | 985 | 96 |
| Install-path flag present | 32 | 29 |
| All three signals on the same record | 31 | 28 |

The useful finding is the denominator difference: 3.2% across all records versus 29.9% within the source-classified agent-skill subset have the install-path flag. Neither number measures real installation success or the global ecosystem.

## Reproduction and review

Run `node scripts/test-skill-readiness-snapshot.mjs` and `node scripts/build-skill-readiness-snapshot.mjs --check`. Both are offline. The second checks exact source bytes, regenerates outputs in memory, and compares file bytes and hashes. Source capture is explicitly opt-in with `--capture` and refuses to overwrite an existing capture.

The downloadable `reproduce.mjs` runs next to the seven downloaded files with `node reproduce.mjs --check`. CSV values that could start spreadsheet formulas are escaped; JSON preserves the original strings. Source and output integrity hashes live in `manifest.json`.

Full measurement rules and limitations are generated into `public/research/skill-readiness-2026-10-18/methods.md` from the same code as the dataset. The site's original code, chart, and analysis refer to the repository's existing MIT license; no new license is assigned to the raw upstream dataset or third-party software. Dataset structured data omits a package-wide license claim.

## Integration

Add the dated report URL to the sitemap, a visible link from the main 2026 report, and appropriate site discovery surfaces. This asset does not modify those shared files. Deploy only after repository regression checks, typecheck, and build. Do not describe this as a published study until the URL is live, or as external outreach until a message was actually sent with authorization.

For outreach, offer the denominator finding with its sample restriction, the chart, and the reproducible dataset. Do not ask editors for dofollow links or describe metadata as a verified Skill test.
