import Image from 'next/image'
import Link from '@/components/crawl-link'
import { MarketingPageShell } from '@/components/marketing-page'
import { SHOWCASE_CASES, getShowcaseEvidenceLabel, getShowcaseImageSrc } from '@/lib/showcase'
import {
  PRESENTATION_FORMATS,
  PRESENTATION_AGENT_GUIDES,
  PRESENTATION_PAGES,
  PRESENTATION_UPDATED_AT,
  getPresentationSources,
  presentationSourceUrl,
  presentationStructuredData,
  type PresentationPageDefinition,
} from '@/lib/seo/presentation-pages'

const linkClass = 'inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-4'

export function PresentationTopic({ page }: { page: PresentationPageDefinition }) {
  const sources = getPresentationSources(page)
  const examples = SHOWCASE_CASES.filter(item =>
    (item.slug === 'editorial-html-slides' || item.skillSlug === 'zarazhangrui-frontend-slides') &&
    sources.some(source => source.registrySlug === item.skillSlug)
  ).slice(0, 2)
  const showExamples = examples.length > 0 && sources.some(source => source.format === 'html-slides')
  const related = PRESENTATION_PAGES.filter(other => other.slug !== page.slug)
  const json = JSON.stringify(presentationStructuredData(page)).replace(/</g, '\\u003c')

  return <MarketingPageShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
    <div className="mx-auto max-w-6xl px-5 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 py-6 text-xs text-secondary">
        <Link href="/best" className="underline underline-offset-4">Best skills</Link><span aria-hidden="true">/</span><span>PPT & presentations</span>
      </nav>
      <header className="grid gap-8 border-b border-border pb-10 pt-3 lg:grid-cols-[1.45fr_0.75fr] lg:gap-12">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#006b4f]">Presentation skills / Source comparison</p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-normal leading-[1.06] tracking-tight text-balance sm:text-5xl lg:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-secondary">{page.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={page.platformGuide ? `#${page.platformGuide.id}` : '#comparison'} className={`${linkClass} border-[#006b4f] bg-[#006b4f] text-white hover:bg-[#00553f]`}>{page.platformGuide ? page.platformGuide.cta : `Compare ${sources.length} ${sources.length === 1 ? 'skill' : 'skills'}`}</a>
            <a href="#choose" className={linkClass}>{page.platformGuide ? 'Explore the community option' : 'Find your workflow'}</a>
          </div>
          <p className="mt-6 text-xs leading-5 text-secondary">By OpenAgentSkill · Source notes checked <time dateTime={PRESENTATION_UPDATED_AT}>October 6, 2026</time>{page.updatedAt && <> · Guide updated <time dateTime={page.updatedAt}>{page.updatedAt}</time></>}</p>
        </div>
        <aside className="self-start rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Choose the output first</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">A PowerPoint file can contain editable objects or just slide images. Choose the handoff your audience needs.</p>
          <ul className="mt-4 divide-y divide-border">
            {PRESENTATION_FORMATS.map(format => {
              const local = sources.find(source => source.format === format.id)
              const href = format.id === 'editable-pptx' && page.slug !== 'ppt-generation' ? format.href : local ? `#${local.id}` : `/best/presentation-generation${format.href.startsWith('#') ? format.href : ''}`
              return <li key={format.id} className="py-3"><a href={href} className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium underline-offset-4 hover:underline"><span>{format.title}</span><span className="font-mono text-xs text-secondary">{format.extension} ↗</span></a></li>
            })}
          </ul>
        </aside>
      </header>

      <nav aria-label="On this page" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border py-3 text-sm text-secondary">
        {[['Your agent', '#agents'], ...(page.platformGuide ? [[page.platformGuide.label, `#${page.platformGuide.id}`]] : []), ['Choose a skill', '#choose'], ['Comparison', '#comparison'], ['Source notes', '#sources'], ...(showExamples ? [['Examples', '#examples']] : []), ['Questions', '#questions']].map(([label, href]) => <a key={href} href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">{label}</a>)}
      </nav>

      <section id="agents" aria-labelledby="agents-heading" className="scroll-mt-8 border-b border-border py-8">
        <h2 id="agents-heading" className="font-display text-2xl">Choose your agent</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{PRESENTATION_AGENT_GUIDES.map(agent => <Link key={agent.name} href={agent.href} prefetch={false} aria-current={agent.href === `/best/${page.slug}` ? 'page' : undefined} className="rounded-xl border border-border bg-card p-5 hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4"><h3 className="font-semibold">{agent.name} ↗</h3><p className="mt-2 text-sm leading-6 text-secondary">{agent.description}</p></Link>)}</div>
      </section>

      {page.platformGuide ? <section id={page.platformGuide.id} aria-labelledby={`${page.platformGuide.id}-heading`} className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#006b4f]">{page.platformGuide.eyebrow}</p>
        <h2 id={`${page.platformGuide.id}-heading`} className="mt-3 font-display text-3xl sm:text-4xl">{page.platformGuide.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-secondary">{page.platformGuide.intro}</p>
        <ol className="mt-6 max-w-3xl list-decimal space-y-3 pl-5 text-sm leading-7">{page.platformGuide.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <div className="mt-6 max-w-3xl rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">A brief you can adapt</h3><p className="mt-3 text-sm leading-7 text-secondary">{page.platformGuide.prompt}</p></div>
        <div className="mt-6 flex flex-wrap gap-3">{page.platformGuide.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{link.label} ↗</a>)}</div>
      </section> : null}

      <section id="choose" aria-labelledby="choose-heading" className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#006b4f]">Start with your task</p>
        <h2 id="choose-heading" className="mt-3 font-display text-3xl sm:text-4xl">{page.selectionTitle}</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {page.quickPicks.map(pick => {
            const source = sources.find(item => item.id === pick.sourceId)!
            return <a key={pick.sourceId} href={`#${pick.sourceId}`} className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4">
              <h3 className="text-base font-semibold leading-6">{pick.task}</h3>
              <p className="mt-3 text-sm leading-6 text-secondary">{pick.reason}</p>
              <span className="mt-5 inline-flex min-h-8 items-center text-sm font-semibold text-[#006b4f]">Explore {source.name} ↗</span>
            </a>
          })}
        </div>
      </section>

      <section id="comparison" aria-labelledby="comparison-heading" className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <h2 id="comparison-heading" className="font-display text-3xl sm:text-4xl">Compare output, editing and setup</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">Use the output and editing columns to narrow your choice. Requirements and capabilities describe the linked source version; successful installation and runtime results have not been established by this comparison.</p>
        <div role="region" aria-label="PPT skill comparison table" tabIndex={0} className="mt-7 overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-offset-4">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <caption className="border-b border-border bg-card px-5 py-3 text-left text-xs text-secondary">{sources.length} community {sources.length === 1 ? 'workflow' : 'workflows'} · Scroll horizontally on smaller screens.</caption>
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-secondary"><tr>
              {['Skill', 'Output', 'What you can edit', 'Agent support', 'Setup', 'License'].map(heading => <th key={heading} scope="col" className="px-5 py-4 font-medium">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {sources.map(source => <tr key={source.id} className="align-top">
                <th scope="row" className="px-5 py-5 font-semibold"><a href={`#${source.id}`} className="inline-flex min-h-11 items-center text-[#006b4f] underline decoration-[#006b4f]/30 underline-offset-4">{source.name}</a></th>
                <td className="px-5 py-5 leading-6">{source.output}</td>
                <td className="px-5 py-5 leading-6 text-secondary">{source.editing}</td>
                <td className="px-5 py-5 leading-6 text-secondary">{source.agents}{source.workbuddy?.status === 'in-adaptation' ? <span className="mt-2 block">WorkBuddy: in adaptation</span> : null}</td>
                <td className="px-5 py-5 leading-6 text-secondary">{source.requirements}</td>
                <td className="px-5 py-5"><a href={`https://github.com/${source.repository}/blob/${source.commit}/LICENSE`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4">{source.license} ↗</a></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-heading" className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <h2 id="sources-heading" className="font-display text-3xl sm:text-4xl">Presentation skills, with source notes</h2>
        <p className="mt-3 text-sm leading-6 text-secondary">Read the tradeoff before opening a skill. Sources are linked to a fixed revision so you can inspect the instructions behind each recommendation.</p>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {sources.map(source => <article id={source.id} key={source.id} className="scroll-mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#006b4f]">{PRESENTATION_FORMATS.find(format => format.id === source.format)!.title}</p>
            <h3 className="mt-3 font-display text-2xl font-semibold">{source.name}</h3>
            <p className="mt-3 text-sm leading-6 text-secondary">{source.summary}</p>
            <dl className="mt-5 space-y-3 text-sm leading-6">
              <div><dt className="font-medium">Best for</dt><dd className="text-secondary">{source.bestFor}</dd></div>
              <div><dt className="font-medium">Agent setup</dt><dd className="text-secondary">{source.agents}</dd></div>
              {source.workbuddy ? <div><dt className="font-medium">WorkBuddy support</dt><dd className="text-secondary">{source.workbuddy.note} <a href={`https://github.com/${source.repository}/blob/${source.commit}/${source.workbuddy.evidencePath}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Author platform notes ↗</a></dd></div> : null}
              {source.platformSupport?.map(support => <div key={support.name}><dt className="font-medium">{support.name} support</dt><dd className="text-secondary">{support.note} <a href={`https://github.com/${source.repository}/blob/${source.commit}/${support.evidencePath}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Author platform notes ↗</a></dd></div>)}
              <div><dt className="font-medium">Costs to consider</dt><dd className="text-secondary">{source.cost}</dd></div>
              <div className="rounded-lg border border-border bg-background p-3"><dt className="font-medium">Before you choose</dt><dd className="mt-1 text-secondary">{source.limitation}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/skills/${source.registrySlug}`} prefetch={false} className={linkClass}>View skill</Link>
              <a href={presentationSourceUrl(source)} target="_blank" rel="noopener noreferrer" className={linkClass}>Read skill source ↗</a>
            </div>
            <details className="mt-4 text-xs leading-5 text-secondary"><summary className="min-h-8 cursor-pointer py-1">Source version</summary><p className="mt-2 break-all">{source.repository} / {source.path}<br />Revision {source.commit}</p></details>
          </article>)}
        </div>
      </section>

      {showExamples && examples.length > 0 ? <section id="examples" aria-labelledby="examples-heading" className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <h2 id="examples-heading" className="font-display text-3xl sm:text-4xl">See what browser slides look like</h2>
        <p className="mt-3 text-sm leading-6 text-secondary">Author examples with original sources and licenses. A web-slide preview does not demonstrate editable PowerPoint export.</p>
        <div className="mt-7 grid gap-6 sm:grid-cols-2">{examples.map(item => <Link key={item.slug} href={`/showcase/${item.slug}`} prefetch={false} className="group rounded-xl border border-border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted"><Image src={getShowcaseImageSrc(item.media[0].src, 'card')} alt={item.media[0].alt.en} fill sizes="(max-width: 639px) 100vw, 550px" className="object-contain" /></div>
          <div className="p-3"><p className="text-xs text-secondary">{getShowcaseEvidenceLabel(item, 'en')}</p><h3 className="mt-2 text-lg font-semibold group-hover:text-[#006b4f]">{item.title.en} ↗</h3><p className="mt-2 text-sm leading-6 text-secondary">{item.description.en}</p></div>
        </Link>)}</div>
      </section> : null}

      <section aria-label="Presentation workflow guide" className="grid gap-8 border-b border-border py-10 sm:py-14 lg:grid-cols-2">
        {page.sections.map(section => <div key={section.title}><h2 className="font-display text-2xl sm:text-3xl">{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-4 text-sm leading-7 text-secondary">{paragraph}</p>)}</div>)}
      </section>

      <section id="questions" aria-labelledby="questions-heading" className="scroll-mt-8 border-b border-border py-10 sm:py-14">
        <h2 id="questions-heading" className="font-display text-3xl sm:text-4xl">PPT skill questions</h2>
        <div className="mt-6 divide-y divide-border">{page.faq.map(faq => <details key={faq.question} className="group py-4"><summary className="min-h-11 cursor-pointer py-2 pr-5 text-base font-medium">{faq.question}</summary><p className="max-w-3xl pb-3 pt-2 text-sm leading-7 text-secondary">{faq.answer}</p></details>)}</div>
      </section>

      <section aria-labelledby="related-heading" className="py-10 sm:py-14">
        <h2 id="related-heading" className="font-display text-2xl">Continue your presentation workflow</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{related.map(other => <Link key={other.slug} href={`/best/${other.slug}`} prefetch={false} className="rounded-xl border border-border bg-card p-5 hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4"><h3 className="font-semibold">{other.title} ↗</h3><p className="mt-2 text-sm leading-6 text-secondary">{other.description}</p></Link>)}</div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">
          {[
            ['Install skills in Codex', '/guides/install-agent-skills-in-codex'],
            ['Install skills in Claude Code', '/guides/install-agent-skills-in-claude-code'],
            ['Resolve a presentation task', '/tasks/create-presentation-deck'],
            ['Browse presentation skills', '/skills?category=presentation'],
          ].map(([label, href]) => <Link key={href} href={href} prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">{label}</Link>)}
        </div>
      </section>
    </div>
  </MarketingPageShell>
}
