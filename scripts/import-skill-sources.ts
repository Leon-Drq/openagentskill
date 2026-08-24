import { syncRepositorySkills } from '../lib/indexer/repository-skill-sync'

async function main() {
  const references = process.argv.slice(2).filter((value) => /^https:\/\/github\.com\//i.test(value))

  if (!references.length) {
    throw new Error('Pass one or more exact GitHub SKILL.md URLs.')
  }

  for (const reference of references) {
    const result = await syncRepositorySkills({
      reference,
      discoverySource: 'x-skill-radar',
      maxSkills: 1,
      refreshExisting: true,
    })

    const entry = result.entries[0]
    console.log(JSON.stringify({
      reference,
      status: entry?.status || 'skipped',
      slug: entry?.slug || null,
      reason: entry?.reason || null,
    }))
  }
}

void main()
