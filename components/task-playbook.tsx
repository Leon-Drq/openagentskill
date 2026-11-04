import Link from '@/components/crawl-link'
import { TaskBriefCopy } from '@/components/task-brief-copy'
import type { TaskPlaybook as Playbook } from '@/lib/seo/task-playbooks'

export function TaskPlaybook({ playbook, topic }: { playbook: Playbook; topic: string }) {
  return <section id="try-a-task" aria-labelledby="task-brief-heading" className="scroll-mt-24 border-b border-border py-10" data-task-playbook={playbook.id}>
    <h2 id="task-brief-heading" className="font-display text-3xl">{playbook.title}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">{playbook.intro}</p>
    <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Prepare these inputs</h3>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-secondary">{playbook.inputs.map(input => <li key={input}>{input}</li>)}</ul>
        <h3 className="mt-6 text-lg font-semibold">A task brief for your agent</h3>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]" data-task-brief>{playbook.brief}</p>
        <TaskBriefCopy text={playbook.brief} topic={topic} />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold">Check the result</h3>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-secondary">{playbook.checks.map(check => <li key={check}>{check}</li>)}</ol>
        <h3 className="mt-7 text-lg font-semibold">If the first attempt fails</h3>
        <div className="mt-3 divide-y divide-border">{playbook.problems.map(problem => <details key={problem.symptom} className="py-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{problem.symptom}</summary><p className="pb-3 text-sm leading-7 text-secondary">{problem.action}</p></details>)}</div>
      </div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">{playbook.links.filter(link => link.href !== `/best/${topic}`).map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">{link.label} →</Link>)}</div>
  </section>
}
