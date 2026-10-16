import type { RankingDefinition } from '@/lib/rankings'
import type { getRankingLanding } from '@/lib/ranking-landing-data'

export function RankingSocialCard({ definition, list }: { definition: RankingDefinition; list: Awaited<ReturnType<typeof getRankingLanding>> }) {
  return (<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f7f3', color: '#171717', padding: '64px', fontFamily: 'serif' }}>
    <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 22, letterSpacing: 4, color: '#006c52' }}>OPENAGENTSKILL · SKILL RANKINGS</div>
    <div style={{ display: 'flex', marginTop: 30, fontSize: 56, lineHeight: 1.05 }}>{definition.title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 42, gap: 14 }}>
      {list.items.slice(0, 3).map((item) => <div key={item.skill.slug} style={{ display: 'flex', borderTop: '1px solid #dddbd4', paddingTop: 14, fontSize: 28 }}><span style={{ width: 70, flexShrink: 0, fontFamily: 'monospace' }}>#{item.rank}</span><span>{item.skill.name.length > 62 ? item.skill.name.slice(0, 59) + '…' : item.skill.name}</span></div>)}
      {!list.items.length ? <div style={{ display: 'flex', fontSize: 26, color: '#626262' }}>{list.source === 'unavailable' ? 'Ranking data temporarily unavailable' : 'Explore more skill shortlists'}</div> : null}
    </div>
    <div style={{ display: 'flex', marginTop: 'auto', fontFamily: 'monospace', fontSize: 20 }}>{list.source === 'saved-directory' ? 'Saved directory data' : 'Review sources before use'} · openagentskill.com</div>
  </div>)
}
