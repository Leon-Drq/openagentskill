import { z } from 'zod'
import { searchShowcaseWorkflows } from '@/lib/showcase-discovery'
import { locales } from '@/lib/i18n/config'

const Query = z.object({
  q: z.string().trim().max(200).default(''),
  category: z.enum(['all', 'web', 'slides', 'image', 'video', 'document']).default('all'),
  lang: z.enum(locales).default('en'),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
})

export function GET(request: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return Response.json({ error: 'Invalid workflow filters' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  const { q, lang, ...options } = parsed.data
  return Response.json(searchShowcaseWorkflows({ ...options, query: q, locale: lang }), {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex', 'Link': '<https://www.openagentskill.com/showcase>; rel="alternate"; type="text/html"' },
  })
}
