import { localizeShowcase, type ShowcaseCase } from '@/lib/showcase-shared'

export function ExampleReproduction({ example, locale }: { example: ShowcaseCase; locale: string }) {
  if (!example.reproduction) return null
  const zh = locale === 'zh'
  return <section lang={zh ? 'zh' : 'en'} className="my-7 min-w-0 rounded-lg border border-border bg-muted/30 p-5" aria-label={zh ? '复现此案例' : 'Reproduce this example'}>
    <h3 className="font-display text-xl">{zh ? '复现此案例' : 'Reproduce this example'}</h3>
    <p className="mt-3 text-sm leading-relaxed text-secondary">{zh ? '下载输入素材与时间点 JSON，使用本案例固定版本的脚本运行下方命令。运行记录只描述这个演示，不代表通用兼容性或安全认证。' : 'Download the input and timestamps, then run the command with the source revision used for this example. The run record describes this demonstration only; it is not a general compatibility or safety certification.'}</p>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#006b4f]">
      {example.reproduction.resources.map(resource => <a key={resource.href} href={resource.href} className="inline-flex min-h-11 items-center underline underline-offset-4">{localizeShowcase(resource.label, locale)}</a>)}
    </div>
    <pre tabIndex={0} className="mt-4 max-w-full overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6" aria-label={zh ? '复现命令' : 'Reproduction command'}><code>{example.reproduction.command}</code></pre>
  </section>
}
