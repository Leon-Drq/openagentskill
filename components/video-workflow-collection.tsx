import Link from '@/components/crawl-link'
import sources from '@/lib/video-workflow-sources.json'
import { findVideoWorkflowListing, VIDEO_RELATED_GUIDES, VIDEO_WORKFLOWS, videoSourceUrl, type VideoWorkflowListing } from '@/lib/video-workflows'

export function VideoWorkflowCollection({ listings }: { listings: VideoWorkflowListing[] }) {
  return (
    <section id="video-workflows" aria-labelledby="video-workflows-title" className="scroll-mt-24 border-b border-border py-10 sm:py-14">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-secondary">Creator workflow collection</p>
        <h2 id="video-workflows-title" className="mt-3 font-display text-3xl font-semibold sm:text-4xl">What do you want to make?</h2>
        <p className="mt-4 text-base leading-relaxed text-secondary">Start with the output: a motion demo, a whiteboard explainer, a wedding story, an editable draft, or a shot plan. Compare five workflows and the tools each needs.</p>
        <p className="mt-3 text-sm text-secondary">Source documents checked October 6, 2026. These workflows have not been run by OpenAgentSkill; each registry detail page shows its own publication and review status.</p>
      </div>

      <nav aria-label="Video workflow outputs" className="my-7 flex flex-wrap gap-2">
        {VIDEO_WORKFLOWS.map((workflow) => <a key={workflow.id} href={`#${workflow.id}`} className="border border-border px-3 py-2 text-sm transition-colors hover:border-foreground hover:text-foreground">{workflow.label}</a>)}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {VIDEO_WORKFLOWS.map((workflow, index) => {
          const source = sources.find((item) => item.repository === workflow.repository && item.path === workflow.path)!
          const listing = findVideoWorkflowListing(source, listings)
          const entries = sources.filter((item) => item.repository === workflow.repository)
          return (
            <article key={workflow.id} id={workflow.id} className={`min-w-0 scroll-mt-24 border border-border bg-card p-5 sm:p-7 ${entries.length > 1 ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-secondary"><span>{workflow.label}</span><span className="font-mono">0{index + 1}</span></div>
              <h3 className="mt-3 break-words font-display text-2xl font-semibold">{workflow.name}</h3>
              <p className="mt-1 text-sm text-secondary">By {workflow.creator}</p>
              <dl className="mt-5 space-y-4 text-sm leading-relaxed">
                {[
                  ['Bring', workflow.input], ['Make', workflow.output], ['Tools & setup', workflow.setup], ['Before you start', workflow.limit],
                ].map(([label, value]) => <div key={label}><dt className="font-medium text-foreground">{label}</dt><dd className="mt-1 text-secondary">{value}</dd></div>)}
              </dl>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
                {listing && <Link href={`/skills/${listing.slug}`} prefetch={false} className="font-medium underline underline-offset-4">View Skill details →</Link>}
                <a href={videoSourceUrl(source)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Read source Skill ↗</a>
                <a href={workflow.tutorial} target="_blank" rel="noopener noreferrer" className="text-secondary underline underline-offset-4">Creator’s tutorial ↗</a>
              </div>
              {entries.length > 1 && (
                <details className="mt-6 border-t border-border pt-5">
                  <summary className="cursor-pointer text-sm font-medium">Explore all {entries.length} Seedance Skills</summary>
                  <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map((entry) => {
                      const registered = findVideoWorkflowListing(entry, listings)
                      const name = entry.path.split('/').at(-2)!.replace(/^seedance-/, '').replaceAll('-', ' ')
                      return <li key={entry.path}><a href={registered ? `/skills/${registered.slug}` : videoSourceUrl(entry)} className="capitalize underline underline-offset-4">{name} {registered ? '→' : '↗'}</a></li>
                    })}
                  </ul>
                  <p className="mt-4 text-xs leading-relaxed text-secondary">Arrows marked ↗ open the pinned GitHub source; → opens a matching public registry entry. The collection includes prompt guides as well as production workflows.</p>
                </details>
              )}
            </article>
          )
        })}
      </div>

      <details className="mt-7 border border-border p-5 sm:p-7">
        <summary className="cursor-pointer font-display text-xl font-semibold">More creator tutorials & existing tools</summary>
        <p className="mt-4 text-sm leading-relaxed text-secondary">These five articles explain workflows or collect references. Follow the source and compare the tools already in the registry.</p>
        <ul className="mt-5 divide-y divide-border">
          {VIDEO_RELATED_GUIDES.map((guide) => (
            <li key={guide.url} className="flex flex-wrap items-baseline justify-between gap-3 py-4 text-sm">
              <a href={guide.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{guide.title} · {guide.creator} ↗</a>
              {guide.href && <a href={guide.href} className="text-secondary underline underline-offset-4">{guide.linkLabel} →</a>}
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-5 text-xs leading-relaxed text-secondary">Discovery credit: <a href="https://x.com/jedeeai/status/2107358191432405329" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">@jedeeai’s creator roundup</a>. Summaries are based on the linked source documents. Original media and prompts remain subject to their authors’ terms.</p>
    </section>
  )
}
