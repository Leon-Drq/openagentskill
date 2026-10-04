import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeAccountNext } from '@/lib/account-workspace'
import { GET as exchangeCode } from '../callback/route'

// Signup uses PKCE by default; customized Supabase email templates may instead
// send a token hash. Both establish a server-readable session before returning.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('code')) return exchangeCode(request)
  const next = safeAccountNext(request.nextUrl.searchParams.get('next'))
  const hash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  if (hash && (type === 'email' || type === 'signup')) {
    const client = await createClient()
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type })
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin))
  }
  const failed = new URL('/auth/login', request.nextUrl.origin)
  failed.searchParams.set('next', next)
  failed.searchParams.set('error', 'confirmation-failed')
  return NextResponse.redirect(failed)
}
