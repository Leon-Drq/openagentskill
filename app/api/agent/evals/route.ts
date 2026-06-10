import { NextResponse } from 'next/server'
import { getAllSkills } from '@/lib/db/skills'
import { REGISTRY_EVAL_CASES, runRegistryEvals } from '@/lib/registry-evals'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const skills = await getAllSkills('quality')
    const evals = runRegistryEvals(skills, REGISTRY_EVAL_CASES)

    return NextResponse.json({
      ...evals,
      meta: {
        endpoint: '/api/agent/evals',
        purpose: 'Regression checks for task-to-skill recommendation quality.',
        skills_evaluated: skills.length,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Registry eval API error:', error)
    return NextResponse.json({ error: 'Failed to run registry evals' }, { status: 500 })
  }
}
