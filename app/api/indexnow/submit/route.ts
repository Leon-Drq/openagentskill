import { NextRequest, NextResponse } from 'next/server'
import {
  buildIndexNowUrlsForSkill,
  getBaselineIndexNowUrls,
  normalizeIndexNowUrl,
  submitIndexNowUrls,
} from '@/lib/indexnow'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 60

function parseUrls(body: Record<string, unknown>) {
  const urls = Array.isArray(body.urls)
    ? body.urls.map((url) => String(url))
    : []
  const slugs = Array.isArray(body.slugs)
    ? body.slugs.map((slug) => String(slug)).filter(Boolean)
    : []

  for (const slug of slugs) {
    urls.push(...buildIndexNowUrlsForSkill(slug))
  }

  if (body.includeBaseline !== false) {
    urls.push(...getBaselineIndexNowUrls())
  }

  return Array.from(
    new Set(
      urls
        .map((url) => normalizeIndexNowUrl(url))
        .filter((url): url is string => Boolean(url))
    )
  )
}

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await submitIndexNowUrls(getBaselineIndexNowUrls())
  return NextResponse.json({ success: result.success, result })
}

export async function POST(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const urls = parseUrls(body)
  const result = await submitIndexNowUrls(urls)

  return NextResponse.json({ success: result.success, result }, { status: result.success ? 200 : 502 })
}
