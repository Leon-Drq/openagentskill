import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export async function GET() {
  const diagnostics: Record<string, unknown> = {}

  // Check env vars (only show first 20 chars for security)
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.SUPABASE_ANON_KEY || ''
  const nextPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  diagnostics.env = {
    SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
    NEXT_PUBLIC_SUPABASE_URL: nextPublicUrl ? `${nextPublicUrl.substring(0, 30)}...` : 'NOT SET',
    SUPABASE_ANON_KEY: anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicKey ? `${nextPublicKey.substring(0, 20)}...` : 'NOT SET',
  }

  // Test public client
  try {
    const supabase = createPublicClient()
    diagnostics.clientCreated = true

    const { data, error, count } = await supabase
      .from('skills')
      .select('slug, name', { count: 'exact' })
      .eq('ai_review_approved', true)
      .limit(3)

    diagnostics.query = {
      success: !error,
      error: error?.message || null,
      errorCode: error?.code || null,
      count,
      sampleData: data?.map(s => s.slug) || [],
    }
  } catch (e: unknown) {
    diagnostics.clientCreated = false
    diagnostics.clientError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(diagnostics)
}
