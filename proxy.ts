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

  // Older language switches used `?lang=xx`. Canonicalize these URLs before
  // rendering so people and crawlers land on the actual localized route.
  if (LEGACY_LOCALIZED_NAVIGATION_PATHS.has(pathname)) {
    const locale = searchParams.get('lang')
    if (locale && MARKET_LOCALE_CODES.has(locale)) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
      url.searchParams.delete('lang')
      return NextResponse.redirect(url, 308)
    }

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
    '/profile/:path*',
    '/api/claims/:path*',
    '/api/points/:path*',
  ],
}
