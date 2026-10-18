import type { Metadata } from 'next'
import Image from 'next/image'
import Link from '@/components/crawl-link'
import { MarketingButtonLink, MarketingHero } from '@/components/marketing-page'
import { ResourceContents, ResourcePageShell } from '@/components/resource-page'
import { jsonLd, resourceMetadata, RESOURCE_SITE } from '@/lib/seo/resource-pages'
import {
  readinessPercent,
  SKILL_READINESS_ASSETS as ASSETS,
  SKILL_READINESS_PATH as REPORT_PATH,
  skillReadinessSnapshot as report,
} from '@/lib/research/skill-readiness-snapshot'

const title = 'Agent Skill Readiness: A Frozen Metadata Snapshot'
const description = 'A reproducible audit of 1,000 quality-ranked registry records and the 97 source-classified agent skills within them. Download the frozen source, CSV, chart, hashes, and analysis script.'
const [sample, skills] = report.groups
const citation = `OpenAgentSkill (2026). ${title}. Version 1, captured ${report.capturedAt.slice(0, 10)}. ${report.reportUrl}`
const inlineLink = 'underline decoration-border underline-offset-4 hover:decoration-foreground'

export const metadata: Metadata = resourceMetadata({
  title,
  description,
  path: REPORT_PATH,
  article: true,
  publishedTime: report.capturedAt,
})

const measurements = [
  { key: 'licenseRecorded', label: 'License value recorded', meaning: 'A non-empty license value outside the unknown-value list. License texts and permissions were not reviewed.' },
  { key: 'within180Days', label: 'Timestamp within 180 days', meaning: 'The exported timestamp is within 180 days of source generation. It can reflect a registry edit rather than a repository push.' },
  { key: 'installPathFlag', label: 'Install-path flag present', meaning: 'The registry records a primary install command. Instructions, dependencies, compatibility, and installation success were not tested.' },
  { key: 'allThreeSignals', label: 'All three signals on one record', meaning: 'The intersection of these three metadata observations. This is not a readiness certification.' },
] as const

export default function SkillReadinessSnapshotPage() {
  const structuredData = [{
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${report.reportUrl}#dataset`,
    name: title,
    description,
    url: report.reportUrl,
    datePublished: report.capturedAt,
    dateModified: report.capturedAt,
    version: '1',
    creator: { '@id': `${RESOURCE_SITE}/#organization` },
    isAccessibleForFree: true,
    measurementTechnique: 'Offline analysis of a frozen public registry JSON response; quality-ranked non-random sample; no Skill execution.',
    variableMeasured: ['Recorded license value', 'Exported timestamp recency', 'Registry install-path flag', 'Intersection of these three metadata fields'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${RESOURCE_SITE}${ASSETS}/dataset.json` },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${RESOURCE_SITE}${ASSETS}/records.csv` },
    ],
    isBasedOn: { '@type': 'Dataset', url: report.sourceUrl },
  }, {
    '@context': 'https://schema.org',
    '@type': 'Report',
    headline: title,
    description,
    url: report.reportUrl,
    datePublished: report.capturedAt,
    dateModified: report.capturedAt,
    inLanguage: 'en',
    author: { '@id': `${RESOURCE_SITE}/#organization` },
    publisher: { '@id': `${RESOURCE_SITE}/#organization` },
    mainEntity: { '@id': `${report.reportUrl}#dataset` },
  }]

  return <ResourcePageShell page="research" detail={{ title: 'Readiness snapshot · October 18', path: REPORT_PATH }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
    <MarketingHero
      eyebrow="Open research · Frozen October 18, 2026"
      title={title}
      description={<>Among {skills.records} source-classified agent-skill records in a quality-ranked sample, {skills.installPathFlag} have an install-path flag. The denominator matters—and that flag alone does not establish a successful installation.</>}
      actions={<>
        <MarketingButtonLink href={`${ASSETS}/records.csv`} variant="primary" prefetch={false}>Download row-level CSV</MarketingButtonLink>
        <MarketingButtonLink href={`${ASSETS}/dataset.json`} prefetch={false}>Download analysis JSON</MarketingButtonLink>
        <MarketingButtonLink href="#methods" variant="text">Read the methods</MarketingButtonLink>
      </>}
    />

    <article className="mx-auto max-w-6xl px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-12 text-base leading-[1.9]">
        <div className="text-sm text-secondary">
          <p>By OpenAgentSkill · Version 1 · Captured <time dateTime={report.capturedAt}>{report.capturedAt}</time></p>
          <p>Source generated <time dateTime={report.referenceTime}>{report.referenceTime}</time>. This dated page stays fixed when the live registry changes.</p>
        </div>

        <ResourceContents items={[
          { id: 'findings', label: 'What the data shows' },
          { id: 'comparison', label: 'Compare the two cohorts' },
          { id: 'methods', label: 'Methods and boundaries' },
          { id: 'reproduce', label: 'Download and reproduce' },
          { id: 'citation', label: 'Cite and reuse' },
        ]} />

        <section id="findings" aria-labelledby="findings-heading" className="space-y-5">
          <h2 id="findings-heading" className="text-3xl">The denominator changes the finding.</h2>
          <p>The source report exposes {sample.records.toLocaleString('en-US')} quality-ranked records, including tools, workflows, collections, and generic projects. Only {skills.records} have the source classification <code className="font-mono text-sm">agent-skill</code>. We retained every row and analyzed that narrower cohort separately.</p>
          <p>Across the full sample, {sample.installPathFlag}/{sample.records.toLocaleString('en-US')} ({readinessPercent(sample.installPathFlag, sample.records)}) have an install-path flag. Within the agent-skill subset, the figure is <strong>{skills.installPathFlag}/{skills.records} ({readinessPercent(skills.installPathFlag, skills.records)})</strong>. Applying the first percentage to agent skills alone would mix unlike records.</p>
          <p>In that subset, {skills.licenseRecorded}/{skills.records} ({readinessPercent(skills.licenseRecorded, skills.records)}) have a recorded license value, but only {skills.allThreeSignals}/{skills.records} ({readinessPercent(skills.allThreeSignals, skills.records)}) combine a recorded license, a timestamp within 180 days, and an install-path flag. Those are metadata observations, not results from running the Skills.</p>
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <p><strong>What a missing flag means:</strong> the exported registry field is false. It does not prove the repository lacks installation instructions or cannot be installed. This snapshot identifies gaps in registry evidence that a reader or maintainer can investigate.</p>
          </div>
        </section>

        <section id="comparison" aria-labelledby="comparison-heading" className="space-y-5">
          <h2 id="comparison-heading" className="text-3xl">Two cohorts, explicit denominators.</h2>
          <p>The {sample.records.toLocaleString('en-US')} records reference {sample.uniqueRepositories} distinct repository strings. The {skills.records} agent-skill records reference {skills.uniqueRepositories}. Several records can belong to one repository; these counts measure records, not independent projects.</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm leading-6">
              <caption className="sr-only">Metadata signal counts in the complete quality-ranked sample and its source-classified agent-skill subset.</caption>
              <thead className="bg-card">
                <tr><th scope="col" className="p-4">Metadata observation</th><th scope="col" className="p-4">Full sample (n={sample.records})</th><th scope="col" className="p-4">Agent-skill subset (n={skills.records})</th></tr>
              </thead>
              <tbody>{measurements.map(({ key, label }) => <tr key={key} className="border-t border-border">
                <th scope="row" className="p-4 font-normal">{label}</th>
                <td className="p-4">{sample[key]} ({readinessPercent(sample[key], sample.records)})</td>
                <td className="p-4">{skills[key]} ({readinessPercent(skills[key], skills.records)})</td>
              </tr>)}</tbody>
            </table>
          </div>
          <figure className="space-y-3">
            <Image src={`${ASSETS}/readiness-chart.svg`} width={1200} height={780} className="h-auto w-full rounded-xl border border-border" alt={`Metadata comparison: full sample n=${sample.records}; agent-skill subset n=${skills.records}. Exact figures appear in the table above.`} />
            <figcaption className="text-sm text-secondary">A chart with source and denominator labels for reuse. <a className={inlineLink} href={`${ASSETS}/readiness-chart.svg`} download>Download SVG</a>.</figcaption>
          </figure>
          <p>Inside the agent-skill subset, {skills.licenseAndInstallPath} records have both a recorded license and an install-path flag; {skills.licenseWithoutInstallPath} have a license value without that flag; {skills.installPathWithoutLicense} has the flag without a recorded license; and {skills.neitherLicenseNorInstallPath} have neither. The CSV preserves the underlying field values so each observation can be checked.</p>
        </section>

        <section id="methods" aria-labelledby="methods-heading" className="space-y-5">
          <h2 id="methods-heading" className="text-3xl">Methods and boundaries</h2>
          <p><strong>Selection.</strong> {report.sourceSampleDescription} This analysis uses the complete <code className="font-mono text-sm">skills</code> array, not the 25-entry <code className="font-mono text-sm">topSkills</code> shortlist. Classification is copied from the source; we did not manually validate the classifier.</p>
          <dl className="space-y-5">{measurements.map(({ key, label, meaning }) => <div key={key}>
            <dt className="font-semibold">{label}</dt>
            <dd className="mt-1 text-secondary">{meaning}</dd>
          </div>)}</dl>
          <p><strong>License rule.</strong> After trimming and lowercasing, blank, unknown, none, n/a, and unlicensed are treated as not recorded. Other values remain metadata labels; they do not establish permissions or compatibility.</p>
          <p><strong>Time rule.</strong> The exported timestamp must be between zero and exactly 180 days before source generation. The reference time is fixed at {report.referenceTime}. Missing or invalid dates and future dates remain separate. There are {sample.unknownDate} unknown dates and {sample.futureDate} future dates in this capture.</p>
          <p><strong>Installation instructions cannot be assessed from this export.</strong> The JSON contains a boolean, not the README, installation command, prerequisite list, or execution log. This report deliberately measures that boolean&apos;s coverage instead of claiming to test instructions.</p>
          <ul className="list-disc space-y-3 pl-6 text-secondary">{report.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul>
          <p>The reviewed source definitions are pinned to repository revision <code className="font-mono text-sm">be2b8d6</code>: the <a className={inlineLink} href="https://github.com/Leon-Drq/openagentskill/blob/be2b8d6b106de8c1b7cb5ca925501a1ae727e08b/lib/research/state-of-agent-skills.ts">report generator</a> and <a className={inlineLink} href="https://github.com/Leon-Drq/openagentskill/blob/be2b8d6b106de8c1b7cb5ca925501a1ae727e08b/lib/supply.ts">supply profile</a>. The API response does not identify its deployed code revision; the preserved response below is the observed evidence.</p>
        </section>

        <section id="reproduce" aria-labelledby="reproduce-heading" className="space-y-5">
          <h2 id="reproduce-heading" className="text-3xl">Download the evidence and reproduce it offline.</h2>
          <p>The raw source was fetched once from the <a className={inlineLink} href={report.sourceUrl}>public report JSON</a>. Its exact bytes are preserved alongside the capture time and SHA-256 digest. Reproduction makes no network requests and runs no third-party Skill.</p>
          <ul className="grid gap-3 sm:grid-cols-2">{[
            ['source.json', 'Frozen source JSON'],
            ['manifest.json', 'Capture record and SHA-256 hashes'],
            ['dataset.json', 'Analysis and row-level JSON'],
            ['records.csv', 'Row-level CSV'],
            ['readiness-chart.svg', 'Reusable SVG chart'],
            ['methods.md', 'Full methods in Markdown'],
            ['reproduce.mjs', 'Standalone Node.js script'],
          ].map(([file, label]) => <li key={file}><a className={`inline-flex min-h-11 items-center ${inlineLink}`} href={`${ASSETS}/${file}`} download>{label}</a></li>)}</ul>
          <p>Save all seven files in one folder, then run this command with Node.js 20 or later:</p>
          <pre className="border border-border bg-card p-4 text-sm"><code>node reproduce.mjs --check</code></pre>
          <p>The script verifies the frozen source hash, regenerates the derived files in memory, and fails if any output differs. Dates do not move when it is rerun.</p>
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <p className="font-semibold">Frozen source SHA-256</p>
            <code className="mt-2 block break-all font-mono text-xs leading-6">{report.sourceSha256}</code>
          </div>
        </section>

        <section id="citation" aria-labelledby="citation-heading" className="space-y-5">
          <h2 id="citation-heading" className="text-3xl">Cite this version.</h2>
          <blockquote className="rounded-xl border border-border bg-card p-5 text-sm">{citation}</blockquote>
          <p>When quoting a percentage, include the cohort and denominator—for example, “29 of 97 source-classified agent-skill records in OpenAgentSkill&apos;s quality-ranked snapshot had an install-path flag.” This sample does not support a claim about all Agent Skills.</p>
          <p>For this site&apos;s original code, chart, and analysis, see the repository&apos;s existing <a className={inlineLink} href="https://github.com/Leon-Drq/openagentskill/blob/be2b8d6b106de8c1b7cb5ca925501a1ae727e08b/LICENSE">MIT license</a>. This report does not grant new rights to the upstream raw dataset or third-party software. Please cite the dated report when quoting its findings; a citation is not an endorsement or a verification badge.</p>
          <p>For the live registry context, see <Link href="/reports/state-of-agent-skills-2026" className={inlineLink}>State of Agent Skills 2026</Link>. Maintainers can use the <Link href="/creator-kit" className={inlineLink}>Creator Kit</Link> to document a real case and supply clearer installation information.</p>
        </section>
      </div>
    </article>
  </ResourcePageShell>
}
