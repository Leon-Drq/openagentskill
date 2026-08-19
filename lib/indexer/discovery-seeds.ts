export interface SkillDiscoverySeed {
  sourceUrl: string
  discoverySource: string
  note: string
}

// High-signal public references are explicit SKILL.md paths, not endorsements.
// Each source still passes static analysis and the normal automated review gate.
export const HIGH_SIGNAL_SKILL_SOURCES: readonly SkillDiscoverySeed[] = [
  {
    sourceUrl: 'https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me',
    discoverySource: 'x-skill-radar',
    note: 'High-signal X workflow recommendation, 2026-08-18',
  },
  {
    sourceUrl: 'https://github.com/bholmesdev/skills/tree/main/skills/taste-review',
    discoverySource: 'x-skill-radar',
    note: 'High-signal X workflow recommendation, 2026-08-18',
  },
  {
    sourceUrl: 'https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices',
    discoverySource: 'x-skill-radar',
    note: 'High-signal X workflow recommendation, 2026-08-18',
  },
  {
    sourceUrl: 'https://github.com/bholmesdev/skills/tree/main/skills/simplify',
    discoverySource: 'x-skill-radar',
    note: 'High-signal X workflow recommendation, 2026-08-18',
  },
  {
    sourceUrl: 'https://github.com/bholmesdev/hubble.md/tree/main/.agents/skills/test-desktop-app',
    discoverySource: 'x-skill-radar',
    note: 'High-signal X workflow recommendation, 2026-08-18',
  },
]
