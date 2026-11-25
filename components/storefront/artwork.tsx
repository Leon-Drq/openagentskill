import styles from './storefront.module.css'

// Original interface illustrations for concept products, not scraped examples
// or claimed outputs. Decorative text is hidden from assistive technology.
export function WorkflowArtwork({ art, variant = 0 }: { art: string; variant?: number }) {
  return <div className={`${styles.art} ${styles[art]} ${variant ? styles.artAlternate : ''}`} aria-hidden="true">
    {art === 'portfolio' ? <div className={styles.miniSite}>
      <div className={styles.miniNav}><b>morrow®</b><span>Selected work &nbsp; About &nbsp; Contact ↗</span></div>
      <div className={styles.portfolioHeading}><small>INDEPENDENT DESIGN STUDIO</small><strong>Make room<br />for <em>good things.</em></strong><p>Objects, identities & digital experiences.</p></div>
      <div className={styles.portfolioObjects}><div className={styles.abstractVase}><i /><i /><i /></div><div className={styles.poster}><small>FORM / 026</small><b>less,<br />but<br /><em>better.</em></b></div></div>
      <div className={styles.miniFooter}><span>Design with intention.</span><span>2026 — SELECTED WORK</span></div>
    </div> : art === 'deck' ? <div className={styles.deckScene}><small>THE NEXT CHAPTER / 2026</small><strong>A small idea.<br /><em>A big beginning.</em></strong><div className={styles.deckOrb} /><span>PRODUCT LAUNCH &nbsp; — &nbsp; 01 / 12</span></div>
      : art === 'video' ? <div className={styles.videoScene}><div className={styles.videoFrame}><small>THE CONVERSATION</small><b>Ideas worth<br /><em>passing on.</em></b><span className={styles.playShape}>▶</span><span className={styles.caption}>Start with the moment that matters.</span></div><div className={styles.timeline}>{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 13) % 25)}px` }} />)}</div></div>
      : art === 'research' ? <div className={styles.paperScene}><div className={styles.paper}><small>FIELDNOTES / RESEARCH BRIEF</small><strong>Find the signal.</strong><p>What we know.<br />What we don’t. What comes next.</p><div className={styles.chart}>{[38, 58, 46, 73, 88, 65, 96].map((n, i) => <i key={i} style={{ height: `${n}%` }} />)}</div><span>SOURCES → EVIDENCE → INSIGHT</span></div></div>
      : art === 'visual' ? <div className={styles.visualScene}><div className={styles.visualPoster}><small>STUDIO NOTES &nbsp; VOL. 01</small><strong>ideas<br />in <em>bloom.</em></strong><div className={styles.flower}>✳</div><span>A DIFFERENT POINT OF VIEW.</span></div></div>
      : <div className={styles.articleScene}><small>THE WEEKEND EDIT</small><strong>Something<br />worth <em>reading.</em></strong><div className={styles.articleColumns}><p>A good story begins with a question. Follow the thread. Make room for what matters.</p><p>From a page of notes to one clear idea. Your next draft starts here.</p></div><span>WORDS WITH A POINT OF VIEW &nbsp; ↗</span></div>}
  </div>
}
