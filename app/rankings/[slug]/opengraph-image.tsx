import { ImageResponse } from 'next/og'
import { getRankingDefinition } from '@/lib/rankings'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const definition = getRankingDefinition(slug)
  const snapshot = await getLatestRankingSnapshot(slug)
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f7f5ef', color: '#171713', padding: '64px', fontFamily: 'serif' }}>
    <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 22, letterSpacing: 5, color: '#66706a' }}>OPENAGENTSKILL · DAILY RANKING</div>
    <div style={{ display: 'flex', marginTop: 32, fontSize: 62, lineHeight: 1.05 }}>{definition?.title || 'Agent Skill Rankings'}</div>
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 42, gap: 14 }}>
      {(snapshot?.items || []).slice(0, 3).map((item) => <div key={item.slug} style={{ display: 'flex', borderTop: '1px solid #c9c7bf', paddingTop: 14, fontSize: 30 }}><span style={{ width: 70, fontFamily: 'monospace' }}>#{item.rank}</span><span>{item.name}</span><span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 22 }}>{item.badge}</span></div>)}
    </div>
    <div style={{ display: 'flex', marginTop: 'auto', fontFamily: 'monospace', fontSize: 21 }}>Evidence-based · Updated daily · openagentskill.com</div>
  </div>, size)
}
