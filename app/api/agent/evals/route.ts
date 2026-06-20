import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getRelatedSkills, getSkillEventStats } from '@/lib/db/skills'
import { REGISTRY_EVAL_CASES, runRegistryEvals } from '@/lib/registry-evals'
import { buildSkillEvalProfile, formatSkillEvalText } from '@/lib/skill-evals'
import { getSkillBySlugOrFallback, isCuratedSkillFallback, normalizeSkillSlug } from '@/lib/skill-fallbacks'

export const dynamic = 'force-dynamic'

const EVAL_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug') || request.nextUrl.searchParams.get('skill_slug')
    const format = request.nextUrl.searchParams.get('format') || 'json'
    const task = request.nextUrl.searchParams.get('task') || undefined
    const maxRisk = request.nextUrl.searchParams.get('max_risk') || 'medium'

    if (slug) {
      const skill = await getSkillBySlugOrFallback(slug)

      if (!skill) {
        return NextResponse.json(
          {
            error: `Skill not found: ${slug}`,
            normalized_slug: normalizeSkillSlug(slug),
          },
          { status: 404 }
        )
      }

      const [eventStats, relatedSkills] = isCuratedSkillFallback(skill)
        ? [null, []]
        : await Promise.all([
            getSkillEventStats(skill.slug).catch(() => null),
            getRelatedSkills(skill.id, skill.category, 4).catch(() => []),
          ])
      const evalProfile = buildSkillEvalProfile(skill, {
        eventStats,
        alternatives: relatedSkills,
        task,
        maxRisk,
      })

      if (format === 'text') {
        return new NextResponse(formatSkillEvalText(evalProfile), {
          headers: {
            ...EVAL_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        })
      }

      return NextResponse.json(
        {
          eval: evalProfile,
          meta: {
            endpoint: '/api/agent/evals',
            mode: 'skill_eval',
            purpose:
              'Pre-install eval contract for a single skill. Agents should read this before installing a reusable skill.',
            generated_at: new Date().toISOString(),
          },
        },
        { headers: EVAL_CACHE_HEADERS }
      )
    }

    const skills = await getAllSkills('quality')
    const evals = runRegistryEvals(skills, REGISTRY_EVAL_CASES)

    return NextResponse.json(
      {
        ...evals,
        meta: {
          endpoint: '/api/agent/evals',
          purpose:
            'Registry regression checks. Add ?slug={skill} for a per-skill pre-install Trust + Eval contract.',
          examples: {
            per_skill_json: '/api/agent/evals?slug=crawl4ai',
            per_skill_text: '/api/agent/evals?slug=crawl4ai&format=text',
            task_specific: '/api/agent/evals?slug=crawl4ai&task=scrape%20pricing%20pages&max_risk=medium',
          },
          skills_evaluated: skills.length,
          generated_at: new Date().toISOString(),
        },
      },
      { headers: EVAL_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Registry eval API error:', error)
    return NextResponse.json({ error: 'Failed to run registry evals' }, { status: 500 })
  }
}
