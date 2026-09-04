import { NextResponse } from 'next/server'
import { getRegistryEvidenceStats } from '@/lib/home-page-data'
import { getApprovedRegistrySkillCount } from '@/lib/registry-stats'
import { getRegistryCoverageStats } from '@/lib/registry-coverage'

export const revalidate = 300

export async function GET() {
  const [coverage, approved, evidence] = await Promise.all([
    getRegistryCoverageStats(),
    getApprovedRegistrySkillCount().catch(() => null),
    getRegistryEvidenceStats(),
  ])
  const installableSkills = coverage?.installableSkills ?? approved?.count ?? null
  const agentProvenSkills = evidence.evidenceExact
    ? evidence.provenSkills
    : coverage?.agentProvenSkills ?? null

  return NextResponse.json(
    {
      layers: {
        discovered_projects: {
          count: coverage?.discoveredProjects ?? null,
          public_pages: false,
          definition: 'Unique GitHub repositories seen by discovery or represented by an installable skill.',
        },
        validated_skills: {
          count: coverage?.validatedSkills ?? null,
          public_pages: false,
          definition: 'Installable skills plus validated candidates awaiting publication.',
        },
        installable_skills: {
          count: installableSkills,
          public_pages: true,
          definition: 'Approved skills available in the public registry and agent APIs.',
        },
        agent_proven_skills: {
          count: agentProvenSkills,
          public_pages: true,
          definition: 'Installable skills with at least one real agent outcome report.',
        },
      },
      evidence: {
        verified_installs: evidence.evidenceExact ? evidence.totalVerifiedInstalls : null,
        agent_outcomes: evidence.evidenceExact ? evidence.totalOutcomes : null,
      },
      policy: {
        candidates_are_private: true,
        candidate_pages_are_indexable: false,
        public_skill_minimum_github_stars_for_automatic_intake: 20,
        direct_creator_submissions_minimum_github_stars: 0,
      },
      meta: {
        version: 'registry-coverage-v1',
        exact: Boolean(coverage?.exact && approved?.exact && evidence.evidenceExact),
        coverage_updated_at: coverage?.updatedAt || null,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'X-Agent-Friendly': 'true',
        'X-Robots-Tag': 'noindex',
      },
    }
  )
}
