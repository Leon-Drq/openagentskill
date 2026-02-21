import { NextRequest, NextResponse } from 'next/server'
import { getRecentActivity } from '@/lib/db/activity'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    const activities = await getRecentActivity(limit)

    return NextResponse.json({
      data: activities,
      count: activities.length,
    })
  } catch (error) {
    console.error('Failed to fetch activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}
