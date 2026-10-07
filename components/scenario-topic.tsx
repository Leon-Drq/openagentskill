import Image from 'next/image'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing-page'
import { getScenarioExamples } from '@/lib/seo/scenario-examples'
import { getScenarioSources, getScenarioLinksForSkill, SCENARIO_UPDATED_AT, scenarioSourceUrl, scenarioProfileHref, type ScenarioTopic } from '@/lib/seo/scenario-pages'

const actionClass = 'inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-4'

export function ScenarioExamples({ ids }: { ids: string[] }) {
  const examples = getScenarioExamples(ids)
  if (!examples.length) return null
  return <section id="examples" className="scroll-mt-8 border-b border-border py-10">
    <h2 className="font-display text-3xl">Examples you can inspect</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">These original editorial fixtures demonstrate the deliverables and checks to ask for. Their production notes identify how they were made; they are separate from upstream Skill instructions.</p>
    <div className="mt-7 grid gap-6 md:grid-cols-2">
      {examples.map(example => <article key={example.id} className="overflow-hidden rounded-xl border border-border bg-card" data-scenario-example={example.id}>
        {example.video ? <video controls playsInline preload="none" poster={example.image} aria-label={example.title} className="aspect-video w-full bg-black"><source src={example.video} type="video/mp4" />Your browser cannot play this video. Use the download link below.</video> : example.image ? <Image src={example.image} alt={example.title} width={1280} height={720} className="aspect-video w-full border-b border-border bg-white object-contain" /> : null}
        <div className="p-5 sm:p-6">
          <h3 className="font-display text-xl">{example.title}</h3>
          <dl className="mt-4 space-y-3 text-sm leading-6"><div><dt className="font-semibold">Input</dt><dd className="text-secondary">{example.input}</dd></div><div><dt className="font-semibold">Output</dt><dd className="text-secondary">{example.output}</dd></div></dl>
          <p className="mt-4 text-xs leading-6 text-secondary">{example.evidence}</p>
          <p className="mt-2 text-xs leading-6 text-secondary">{example.limitations}</p>
          <div className="mt-5 flex flex-wrap gap-2">{example.links.map(link => <a key={link.href} href={link.href} className={actionClass}>{link.label} ↗</a>)}</div>
        </div>
      </article>)}
    </div>
  </section>
}

export function ScenarioSkillLinks({ slug }: { slug: string }) {
  const links = getScenarioLinksForSkill(slug)
  if (!links.length) return null
  return <section className="border-t border-border py-8" lang="en" aria-label="Task workflows">
    <h2 className="font-display text-2xl">Choose a workflow for this skill</h2>
    <p className="mt-3 text-sm leading-6 text-secondary">Compare task fit, dependencies and output checks before choosing your workflow.</p>
    <div className="mt-4 flex flex-wrap gap-3">{links.map(link => <Link key={link.href} href={link.href} className={actionClass}>{link.label} →</Link>)}</div>
  </section>
}

export function ScenarioCollectionLinks({ kind }: { kind: 'frontend' | 'video' }) {
  const frontend = kind === 'frontend'
  return <section className="border-b border-border py-8" lang="en">
    <h2 className="font-display text-2xl">{frontend ? 'Choose by page type, then review the result' : 'Choose code animation, generated footage or editing'}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">{frontend ? 'Frontend Design and Taste Skill help with visual direction; UI UX Pro Max covers product interfaces; Figma implementation requires the actual design. Review and browser testing are separate steps.' : 'Remotion creates editable code compositions. Generation workflows plan or produce new footage through a provider. Editing starts from your existing recording. Compare the output and setup before adding a workflow.'}</p>
    <div className="mt-4 flex flex-wrap gap-3"><Link href={frontend ? '/best/frontend-design-skills' : '/best/video-creation'} className={actionClass}>Compare workflows →</Link><Link href={frontend ? '/guides/frontend-design-skill-workflow' : '/guides/remotion-skills-render-workflow'} className={actionClass}>Follow a practical guide →</Link><Link href={frontend ? '/best/frontend-design-skills#examples' : '/best/remotion-skills#examples'} className={actionClass}>Inspect actual examples →</Link></div>
  </section>
}

export function ScenarioTopicPage({ topic }: { topic: ScenarioTopic }) {
  const sources = getScenarioSources(topic)
  const url = `https://www.openagentskill.com/best/${topic.slug}`
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: topic.title, description: topic.description, url, inLanguage: 'en', dateModified: SCENARIO_UPDATED_AT, author: { '@type': 'Organization', name: 'OpenAgentSkill' }, mainEntity: { '@type': 'ItemList', itemListElement: sources.map((source, index) => ({ '@type': 'ListItem', position: index + 1, name: source.name, url: source.registrySlug ? `https://www.openagentskill.com/skills/${source.registrySlug}` : scenarioSourceUrl(source) })) } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Best skills', item: 'https://www.openagentskill.com/best' }, { '@type': 'ListItem', position: 2, name: topic.shortTitle, item: url }] },
    { '@type': 'FAQPage', mainEntity: topic.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
  ] }
  return <MarketingPageShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 py-6 text-xs text-secondary"><Link href="/best" className="underline underline-offset-4">Best skills</Link><span aria-hidden="true">/</span><span>{topic.shortTitle}</span></nav>
      <header className="border-b border-border pb-10 pt-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[#006b4f]">Choose by task and output</p>
        <h1 className="mt-5 max-w-4xl font-display text-4xl font-normal leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">{topic.title}</h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-secondary">{topic.intro}</p>
        <div className="mt-7 flex flex-wrap gap-3"><a href="#choose" className={`${actionClass} bg-[#006b4f] text-white`}>Choose a workflow</a><a href="#sources" className={actionClass}>Compare source instructions</a>{topic.exampleIds.length > 0 && <a href="#examples" className={actionClass}>See actual outputs</a>}</div>
        <p className="mt-5 text-xs text-secondary">By OpenAgentSkill · Source notes checked <time dateTime={SCENARIO_UPDATED_AT}>October 7, 2026</time></p>
      </header>
      <nav aria-label="On this page" className="flex flex-wrap gap-x-5 border-b border-border py-3 text-sm text-secondary">{[['Choose', '#choose'], ['Source comparison', '#sources'], ['How to use', '#workflow'], ...(topic.exampleIds.length ? [['Examples', '#examples']] : []), ['Your client', '#clients'], ['Questions', '#questions']].map(([label, href]) => <a key={href} href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{label}</a>)}</nav>
      <section id="choose" className="scroll-mt-8 border-b border-border py-10">
        <h2 className="font-display text-3xl">Start with the job you need done</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{topic.choices.map(choice => <a key={choice.task} href={choice.href || `#source-${choice.sourceId}`} className="rounded-xl border border-border bg-card p-5 hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4"><h3 className="font-semibold">{choice.task}</h3><p className="mt-3 text-sm leading-7 text-secondary">{choice.reason}</p><span className="mt-4 inline-block text-sm text-[#006b4f]">Explore this workflow →</span></a>)}</div>
      </section>
      <section id="sources" className="scroll-mt-8 border-b border-border py-10">
        <h2 className="font-display text-3xl">Compare the source, output and setup</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">The comparison describes the pinned upstream instructions. It does not assign new review scores or imply successful installation. Inspect the pinned instructions and available registry profiles before choosing.</p>
        <div role="region" aria-label="Skill workflow comparison" tabIndex={0} className="mt-7 overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-offset-4"><table className="w-full min-w-[940px] text-left text-sm"><caption className="border-b border-border bg-card p-4 text-left text-xs text-secondary">{sources.length} source-backed {sources.length === 1 ? 'workflow' : 'workflows'} · Scroll horizontally on smaller screens.</caption><thead className="bg-muted/50"><tr>{['Skill / task', 'Output', 'Setup', 'Limits'].map(heading => <th key={heading} scope="col" className="px-5 py-4 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{sources.map(source => <tr key={source.id} id={`source-${source.id}`} className="scroll-mt-8 align-top"><th scope="row" className="min-w-52 px-5 py-5"><Link href={scenarioProfileHref(source)} className="font-semibold underline underline-offset-4">{source.name}</Link><p className="mt-2 font-normal leading-6 text-secondary">{source.role}</p><a href={scenarioSourceUrl(source)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-xs font-medium text-[#006b4f]">Pinned SKILL.md ↗</a></th><td className="px-5 py-5 leading-7">{source.output}</td><td className="px-5 py-5 leading-7 text-secondary">{source.setup}</td><td className="px-5 py-5 leading-7 text-secondary">{source.limits}</td></tr>)}</tbody></table></div>
      </section>
      <section id="workflow" className="scroll-mt-8 border-b border-border py-10"><h2 className="font-display text-3xl">From a brief to a checked deliverable</h2><ol className="mt-6 max-w-3xl list-decimal space-y-4 pl-5 text-sm leading-7 text-secondary">{topic.steps.map(step => <li key={step}>{step}</li>)}</ol>{topic.guideSlug && <Link href={`/guides/${topic.guideSlug}`} className={`${actionClass} mt-6`}>Read the task guide →</Link>}{topic.slug === 'remotion-skills' && <div className="mt-6"><p className="text-sm leading-7 text-secondary">Official installation instructions:</p><pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm"><code>npx skills add remotion-dev/skills</code></pre><a href="https://www.remotion.dev/docs/ai/skills" target="_blank" rel="noopener noreferrer" className={`${actionClass} mt-3`}>Remotion official guide ↗</a></div>}</section>
      <ScenarioExamples ids={topic.exampleIds} />
      <section id="clients" className="scroll-mt-8 border-b border-border py-10"><h2 className="font-display text-3xl">Check your client&apos;s workflow</h2><div className="mt-6 grid gap-5 md:grid-cols-3"><div><h3 className="font-semibold">Codex, Claude Code and Cursor</h3><p className="mt-3 text-sm leading-7 text-secondary">Use the client&apos;s discovered skill name and preserve referenced scripts and files. Remotion explicitly lists these clients in its official guide; each other source has its own setup requirements.</p><div className="mt-3 space-y-2 text-sm"><Link href="/guides/install-agent-skills-in-codex" className="block underline underline-offset-4">Codex installation guide →</Link><Link href="/guides/install-agent-skills-in-claude-code" className="block underline underline-offset-4">Claude Code installation guide →</Link></div></div><div><h3 className="font-semibold">WorkBuddy, Trae and CodeBuddy</h3><p className="mt-3 text-sm leading-7 text-secondary">Check the current client&apos;s custom-skill import, shell or file access and the selected source&apos;s documented support. Keep helper files together. Test one small input before treating a community workflow as compatible.</p></div><div><h3 className="font-semibold">Doubao and chat-only workflows</h3><p className="mt-3 text-sm leading-7 text-secondary">Specify the actual product and its file or tool capabilities. A conversation can help draft a brief; producing editable files or running a local code skill requires the corresponding supported runtime.</p></div></div></section>
      <section id="questions" className="scroll-mt-8 border-b border-border py-10"><h2 className="font-display text-3xl">Common questions</h2><div className="mt-6 max-w-3xl divide-y divide-border">{topic.faq.map(item => <div key={item.question} className="py-5"><h3 className="font-semibold">{item.question}</h3><p className="mt-3 text-sm leading-7 text-secondary">{item.answer}</p></div>)}</div></section>
      <section className="py-10"><h2 className="font-display text-2xl">Continue with a focused workflow</h2><div className="mt-5 flex flex-wrap gap-3">{topic.related.map(link => <Link key={link.href} href={link.href} className={actionClass}>{link.label} →</Link>)}<Link href="/skills" className={actionClass}>Browse the Skill directory →</Link></div></section>
    </div>
  </MarketingPageShell>
}
