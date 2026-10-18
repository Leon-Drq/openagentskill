# Agent Skill Readiness: A Frozen Metadata Snapshot

Version 1; captured 2026-10-18T14:52:25.132Z; source generated 2026-10-18T14:50:46.144Z.

Report: https://www.openagentskill.com/reports/skill-readiness-2026-10-18

## Sample

The highest-ranked 1,000 approved candidates by the current quality ordering. The sample is a product audit, not a random statistical sample.

All 1000 entries from the public response's skills array are retained. The topSkills shortlist is not used. The second cohort contains the 97 rows whose upstream classification is exactly agent-skill. No stars, trust, or outcome threshold is applied by this analysis. Unit: Registry record, not unique repository, user, installation, or independent experiment.

## Measurements

- licenseRecorded: a trimmed, case-insensitive license value other than blank, unknown, none, n/a, or unlicensed. This is a metadata-presence measure, not a legal or license-text review. Other values are preserved, not inferred.
- within180Days: 0 <= referenceTime - sourceLastPushedAt <= 180 * 86400000 milliseconds; missing/invalid and future timestamps remain separate. This uses the source report generation time, not the time a reader reruns the script.
- installPathFlag: exact copy of the source boolean installReady. In the registry implementation it indicates a non-empty primary install command. Raw installation instructions are not present in this dataset, so their quality is not measured.
- allThreeSignals: the intersection of licenseRecorded, within-180-days, and installPathFlag on the same row.
- Percentages: count divided by the named cohort's record count, rounded to one decimal. Unique repository counts use lowercase exact strings; no alias resolution is attempted.
- Source lastPushedAt can fall back to registry updated_at; do not describe this measure as confirmed code maintenance.

## Results

- Quality-ranked source sample: 1000 records, 978 distinct repository strings; 822 recorded license values; 985 timestamps within 180 days; 32 install-path flags; 31 with all three.
- Source-classified agent-skill subset: 97 records, 78 distinct repository strings; 89 recorded license values; 96 timestamps within 180 days; 29 install-path flags; 28 with all three.

## Reproduce

Download source.json, manifest.json, dataset.json, records.csv, readiness-chart.svg, methods.md, and reproduce.mjs into one directory. Run Node.js 20 or later:

```sh
node reproduce.mjs --check
```

This command is offline. It checks the SHA-256 of the exact frozen source bytes, regenerates every output in memory, and compares bytes. A mismatch fails without replacing files. From the repository use `node scripts/build-skill-readiness-snapshot.mjs --check`. Running without --check rewrites derived outputs from the frozen source; --capture only creates a new capture when source.json and manifest.json do not already exist.

Source URL: https://www.openagentskill.com/reports/state-of-agent-skills-2026.json

Source SHA-256: 3b63a11f01969da621bae4555e5828339b3c309ca63f75695918dbee7a78a786

CSV formula-like strings are prefixed with an apostrophe for spreadsheet safety; JSON preserves source strings. The frozen source retains the full public response, including upstream metrics that this analysis does not validate.

## Limitations

- A quality-ranked, non-random registry sample; percentages do not estimate the wider Agent Skill ecosystem.
- Source classification is a metadata heuristic, not a manual confirmation that a repository contains a usable Skill.
- installReady is copied as installPathFlag: the registry can produce a primary install command. It does not measure README instructions, prerequisites, compatibility, installation success, or task success.
- The source lastPushedAt field may fall back from the GitHub push timestamp to the registry updated_at timestamp. Recent metadata cannot establish recent code maintenance.
- License values are copied from registry metadata; license texts, SPDX validity, permissions, and legal compatibility were not inspected.
- Multiple records may refer to one repository. Record-level observations are not independent repository-level observations.
- No third-party Skill was downloaded or executed. Trust scores and reported agent outcomes are not evaluated in this study.
- The upstream report can use a curated fallback when its live query fails; its JSON does not expose which read path ran. This study preserves the public response without claiming direct database provenance.

## Suggested citation

OpenAgentSkill (2026). Agent Skill Readiness: A Frozen Metadata Snapshot. Version 1, captured 2026-10-18. https://www.openagentskill.com/reports/skill-readiness-2026-10-18

When quoting a percentage, include the cohort and its denominator. For this site's original code, chart, and analysis, see the repository's existing MIT license (https://github.com/Leon-Drq/openagentskill/blob/be2b8d6b106de8c1b7cb5ca925501a1ae727e08b/LICENSE). This report does not grant new rights to the upstream raw dataset or third-party software. Please cite the dated report when quoting its findings.
