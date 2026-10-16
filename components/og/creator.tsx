export function CreatorSocialCard({ profile }: { profile: { username: string; display_name: string | null; bio: string | null } }) {
  const name = (profile.display_name || profile.username).slice(0, 60)
  return (<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: 64, background: '#F8F7F3', color: '#171717', borderTop: '12px solid #006b4f' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}><span>OpenAgentSkill</span><span style={{ color: '#006b4f' }}>Skill Creators</span></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ fontSize: name.length > 30 ? 56 : 76, lineHeight: 1.1, letterSpacing: '-2px' }}>{name}</div>
      <div style={{ fontSize: 26, lineHeight: 1.5, color: '#626262' }}>{(profile.bio || 'Skills, work, and the person behind them.').slice(0, 160)}</div>
    </div>
    <div style={{ display: 'flex', borderTop: '1px solid #DDDBD4', paddingTop: 24, fontSize: 22 }}>openagentskill.com/creators/{profile.username}</div>
  </div>)
}
