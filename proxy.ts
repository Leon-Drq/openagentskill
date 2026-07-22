import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MARKET_LOCALE_CODES = new Set(['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'])
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

function getLocalizedDeepPath(pathname: string, locale: string) {
  const segments = pathname.split('/').filter(Boolean)
  const [root, ...rest] = segments
  const baseRoot = `/${root || ''}`

  if (!LOCALIZED_DEEP_ROUTE_ROOTS.has(baseRoot) || rest.length === 0) return null
  return `/${locale}/${[root, ...rest].join('/')}`
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
  const locale = searchParams.get('lang')

  // Canonicalize query-based locale links before rendering. Core navigation
  // routes and curated deep pages both have stable locale paths, so the first
  // server render, metadata, and client navigation all share one language.
  if (locale && MARKET_LOCALE_CODES.has(locale)) {
    const localizedDeepPath = getLocalizedDeepPath(pathname, locale)
    if (LEGACY_LOCALIZED_NAVIGATION_PATHS.has(pathname) || localizedDeepPath) {
      const url = request.nextUrl.clone()
      url.pathname = localizedDeepPath || (pathname === '/' ? `/${locale}` : `/${locale}${pathname}`)
      url.searchParams.delete('lang')
      return NextResponse.redirect(url, 308)
    }
  }

  if (LEGACY_LOCALIZED_NAVIGATION_PATHS.has(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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
    '/skill-packs/:path*',
    '/collections/:path*',
    '/profile/:path*',
    '/api/claims/:path*',
    '/api/points/:path*',
  ],
}
