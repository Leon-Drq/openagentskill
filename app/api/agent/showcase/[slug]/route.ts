import { z } from 'zod'
import { SHOWCASE_CASES } from '@/lib/showcase'
import { buildShowcaseTaskPackage, renderShowcaseTaskMarkdown, SHOWCASE_AGENT_TARGETS } from '@/lib/showcase-task'
import { locales } from '@/lib/i18n/config'

const Query = z.object({
  agent: z.enum(SHOWCASE_AGENT_TARGETS).default('auto'),
  lang: z.enum(locales).default('en'),
  format: z.enum(['json', 'text', 'markdown']).default('json'),
  download: z.enum(['1']).optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return Response.json({ error: 'Invalid task package options' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  const { slug } = await params
  const item = SHOWCASE_CASES.find(entry => entry.slug === slug)
  if (!item) return Response.json({ error: 'Workflow not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const { agent, lang, format, download } = parsed.data
  const headers: Record<string, string> = {
    'Cache-Control': 'public, max-age=300',
    'X-Robots-Tag': 'noindex',
    'X-Content-Type-Options': 'nosniff',
    'Link': `<https://www.openagentskill.com/showcase/${item.slug}>; rel="alternate"; type="text/html"`,
  }
  if (format === 'json') return Response.json(buildShowcaseTaskPackage(item, lang, agent), { headers })
  headers['Content-Type'] = format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8'
  // Filename comes from the trusted curation catalog, never request text.
  if (download) headers['Content-Disposition'] = `attachment; filename="${item.slug}-task.md"`
  return new Response(renderShowcaseTaskMarkdown(item, lang, agent), { headers })
}
