import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCanonicalSkillSlug } from '@/lib/skill-slug-aliases'
import { publicPageRewrite, publicPageQueryVariant } from '@/lib/routing/public-page-cache'

const MARKET_LOCALE_CODES = new Set(['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'])
const DOCUMENT_LANG_BY_LOCALE: Record<string, string> = {
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  de: 'de',
  fr: 'fr',
  id: 'id',
}
const LEGACY_LOCALIZED_NAVIGATION_PATHS = new Set([
  '/',
  '/resolve',
  '/skills',
  '/tasks',
  '/skill-packs',
  '/compare',
  '/api-docs',
  '/agent-skill',
  '/agent-skills-registry',
  '/docs',
  '/submit',
])
const LOCALIZED_DEEP_ROUTE_ROOTS = new Set(['/skill-packs', '/collections'])
const SESSION_REFRESH_PATH_PREFIXES = ['/profile', '/api/claims', '/api/points']

function getLocalizedDeepPath(pathname: string, locale: string) {
  const segments = pathname.split('/').filter(Boolean)
  const [root, ...rest] = segments
  const baseRoot = `/${root || ''}`

  if (!LOCALIZED_DEEP_ROUTE_ROOTS.has(baseRoot) || rest.length === 0) return null
  return `/${locale}/${[root, ...rest].join('/')}`
}

function getLocaleFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0]
  return segment && MARKET_LOCALE_CODES.has(segment) ? segment : null
}

function getCanonicalSkillPath(pathname: string) {
  const match = pathname.match(/^\/skills\/([^/]+)(\/(?:audit|evals))?$/)
  if (!match) return null

  const [, requestedSlug, suffix = ''] = match
  const canonicalSlug = getCanonicalSkillSlug(requestedSlug)
  if (requestedSlug === canonicalSlug) return null

  return `/skills/${canonicalSlug}${suffix}`
}

function createNextResponse(locale: string | null, noindex = false) {
  const response = NextResponse.next()
  if (locale) response.headers.set('Content-Language', DOCUMENT_LANG_BY_LOCALE[locale] || locale)
  if (noindex) response.headers.set('X-Robots-Tag', 'noindex, follow')

  return response
}

async function isMissingPublicPath(pathname: string) {
  // Ordinary page/cache hits do not initialize the full Gallery, ranking and
  // external catalogs just to discover that their paths do not match.
  if (pathname.startsWith('/showcase/')) {
    const { isMissingShowcasePath } = await import('@/lib/showcase')
    return isMissingShowcasePath(pathname)
  }
  if (pathname.startsWith('/creators/github/')) {
    const { isMissingFeaturedCreatorPath } = await import('@/lib/creator-directory')
    return isMissingFeaturedCreatorPath(pathname)
  }
  if (pathname.startsWith('/rankings/')) {
    const { isMissingRankingPath } = await import('@/lib/rankings')
    return isMissingRankingPath(pathname)
  }
  if (pathname.startsWith('/skills/external/')) {
    const { isMissingExternalSkillPath } = await import('@/lib/skills/external-catalog')
    return isMissingExternalSkillPath(pathname)
  }
  return false
}

function needsSessionRefresh(pathname: string) {
  return SESSION_REFRESH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

// Fallback to hardcoded values if env vars are not set (same as public.ts)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dW9ka2N6cmxreHd3dGF4d3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTc0ODAsImV4cCI6MjA4NzE3MzQ4MH0.KlJ70ysYG78x1hwOTmePW53t_IEeLqC_PzGiBozh2Ug'

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const queryLocale = searchParams.get('lang')
  const pathLocale = getLocaleFromPath(pathname)
  const locale = pathLocale || (queryLocale && MARKET_LOCALE_CODES.has(queryLocale) ? queryLocale : null)
  const noindex = publicPageQueryVariant(pathname, searchParams)

  if (await isMissingPublicPath(pathname)) {
    return NextResponse.rewrite(new URL('/404', request.url), {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex, follow' },
    })
  }

  // Static skill pages can be served straight from the cache, so normalize
  // aliases here instead of relying on a page-level redirect.
  const canonicalSkillPath = getCanonicalSkillPath(pathname)
  if (canonicalSkillPath) {
    const url = request.nextUrl.clone()
    url.pathname = canonicalSkillPath
    return NextResponse.redirect(url, 308)
  }

  // Canonicalize query-based locale links before rendering. Core navigation
  // routes and curated deep pages both have stable locale paths, so the first
  // server render, metadata, and client navigation all share one language.
  if (queryLocale && MARKET_LOCALE_CODES.has(queryLocale)) {
    const localizedDeepPath = getLocalizedDeepPath(pathname, queryLocale)
    if (LEGACY_LOCALIZED_NAVIGATION_PATHS.has(pathname) || localizedDeepPath) {
      const url = request.nextUrl.clone()
      url.pathname = localizedDeepPath || (pathname === '/' ? `/${queryLocale}` : `/${queryLocale}${pathname}`)
      url.searchParams.delete('lang')
      return NextResponse.redirect(url, 308)
    }
  }

  const renderPath = publicPageRewrite(pathname, searchParams)
  if (renderPath) {
    const url = request.nextUrl.clone()
    url.pathname = renderPath
    return NextResponse.rewrite(url, {
      headers: {
        'X-Robots-Tag': 'noindex, follow',
        ...(locale ? { 'Content-Language': DOCUMENT_LANG_BY_LOCALE[locale] || locale } : {}),
      },
    })
  }

  const initialResponse = createNextResponse(locale, noindex)

  // Public discovery pages do not need an auth lookup on every navigation.
  // Keeping this proxy lightweight makes language changes and deep links fast.
  if (!needsSessionRefresh(pathname)) {
    return initialResponse
  }

  let supabaseResponse = initialResponse

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = createNextResponse(locale, noindex)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — do NOT add code between createServerClient and getUser
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/skills/:path*',
    '/showcase/:path+',
    '/creators/github/:path+',
    '/rankings/:path+',
    '/:locale(zh|ja|ko|es|de|fr|id)/:page(resolve|skills|tasks|skill-packs|compare|api-docs|agent-skill|agent-skills-registry|docs)',
    '/profile/:path*',
    {
      source: '/((?!api(?:/|$)|_next/|favicon.ico|robots.txt|sitemap.xml|sitemaps/).*)',
      has: [{ type: 'query', key: 'lang', value: 'zh|ja|ko|es|de|fr|id' }],
    },
    '/api/claims/:path*',
    '/api/points/:path*',
  ],
}
