import { NextRequest, NextResponse } from 'next/server'
import { getRankingDefinition } from '@/lib/rankings'
import { getRankingSnapshotHistory } from '@/lib/ranking-snapshots'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const definition = getRankingDefinition(slug)
  if (!definition) return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days') || 30), 1), 90)
  const history = await getRankingSnapshotHistory(slug, days)
  const movements = new Map<string, { name: string; first_rank: number; latest_rank: number; change: number }>()
  const first = history[0]
  const latest = history.at(-1)
  for (const item of latest?.items || []) {
    const previous = first?.items.find((candidate) => candidate.slug === item.slug)
    movements.set(item.slug, { name: item.name, first_rank: previous?.rank || item.rank, latest_rank: item.rank, change: previous ? previous.rank - item.rank : 0 })
  }
  return NextResponse.json({ ranking: { slug, title: definition.title, url: `https://www.openagentskill.com/rankings/${slug}` }, days, snapshots: history, movements: [...movements.entries()].map(([skill_slug, value]) => ({ skill_slug, ...value })), meta: { methodology_version: latest?.methodology_version || null, update_cadence: 'daily at 02:55 UTC' } }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } })
}
