import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const SubscribeSchema = z.object({
  email: z.string().email().max(320).transform((value) => value.toLowerCase()),
  cadence: z.enum(['daily', 'weekly']).default('weekly'),
  topics: z.array(z.string().min(1).max(80)).max(12).default([]),
  source: z.string().min(1).max(80).default('website'),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = SubscribeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid subscription payload',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { email, cadence, topics, source } = parsed.data
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email,
          cadence,
          topics,
          source,
          metadata: {
            user_agent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('[subscribe] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[subscribe] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
