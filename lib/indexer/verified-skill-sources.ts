import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import type { SkillRecord } from '@/lib/db/skills'
import { createPublicClient } from '@/lib/supabase/public'

const USER_AGENT = 'OpenAgentSkill-VerifiedSourceIndexer/1.0'

interface SourceReference {
  repository: string
  branch: string
  skillDirectory: string
  skillName: string
}

interface GitHubRepositoryMetadata {
  stargazers_count?: number
  forks_count?: number
  language?: string | null
  pushed_at?: string | null
}

export interface VerifiedSkillSourceSyncEntry {
  slug: string
  status: 'created' | 'updated' | 'error'
  reason?: string
}

export interface VerifiedSkillSourceSyncResult {
  status: 'completed' | 'completed_with_errors'
  verified: number
  created: number
  updated: number
  errors: number
  entries: VerifiedSkillSourceSyncEntry[]
}

interface VerifiedSkillSourceSyncOptions {
  label: string
  slugs: readonly string[]
}

function selectedSkills(options: VerifiedSkillSourceSyncOptions) {
  const wanted = new Set(options.slugs)
  const skills = CURATED_SKILL_SNAPSHOT.filter((skill) => wanted.has(skill.slug))

  if (skills.length !== options.slugs.length) {
    throw new Error(`The ${options.label} skill snapshot is incomplete.`)
  }

  return skills
}

function sourceReference(skill: SkillRecord): SourceReference {
  const url = new URL(skill.repository)
  const parts = url.pathname.split('/').filter(Boolean)
  const treeIndex = parts.indexOf('tree')

  if (url.hostname !== 'github.com' || treeIndex !== 2 || parts.length < 4) {
    throw new Error(`Expected a GitHub tree URL for ${skill.slug}.`)
  }

  const skillName = skill.install_command?.match(/(?:^|\s)--skill\s+([^\s]+)/)?.[1]
  if (!skillName) {
    throw new Error(`Expected a --skill install target for ${skill.slug}.`)
  }

  return {
    repository: `${parts[0]}/${parts[1]}`,
    branch: parts[treeIndex + 1],
    skillDirectory: parts.slice(treeIndex + 2).join('/'),
    skillName,
  }
}

function rawSkillUrl(source: SourceReference) {
  const directory = source.skillDirectory ? `${source.skillDirectory}/` : ''
  return `https://raw.githubusercontent.com/${source.repository}/${source.branch}/${directory}SKILL.md`
}

function sourceUrl(source: SourceReference) {
  const directory = source.skillDirectory ? `/${source.skillDirectory}` : ''
  return `https://github.com/${source.repository}/tree/${source.branch}${directory}`
}

function frontmatterName(source: string) {
  const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!frontmatter) return null

  return frontmatter[1]
    .match(/^name:\s*["']?([^\n"']+)["']?\s*$/m)?.[1]
    ?.trim() || null
}

function githubHeaders() {
  const token = (process.env.GITHUB_TOKEN || '').trim()
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchSkillSource(source: SourceReference) {
  const response = await fetch(rawSkillUrl(source), {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`SKILL.md fetch failed (${response.status}) for ${source.repository}/${source.skillDirectory || '.'}.`)
  }

  const document = await response.text()
  if (frontmatterName(document) !== source.skillName) {
    throw new Error(`The verified SKILL.md name no longer matches ${source.skillName}.`)
  }
}

async function fetchRepositoryMetadata(repository: string): Promise<GitHubRepositoryMetadata> {
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`GitHub repository metadata fetch failed (${response.status}) for ${repository}.`)
  }

  return response.json() as Promise<GitHubRepositoryMetadata>
}

function buildPayload(skill: SkillRecord, source: SourceReference, metadata: GitHubRepositoryMetadata) {
  return {
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    long_description: skill.long_description || skill.description,
    tagline: skill.tagline || skill.description,
    author_name: skill.author_name,
    author_url: skill.author_url,
    repository: sourceUrl(source),
    github_repo: source.repository,
    github_stars: Number(metadata.stargazers_count || skill.github_stars || 0),
    github_forks: Number(metadata.forks_count || skill.github_forks || 0),
    github_language: metadata.language || skill.github_language || null,
    github_last_pushed_at: metadata.pushed_at || skill.github_last_pushed_at || null,
    category: skill.category,
    tags: skill.tags,
    frameworks: skill.frameworks,
    version: skill.version || '1.0.0',
    license: skill.license,
    install_command: skill.install_command,
    verified: true,
    submission_source: 'official-skill-path',
    submitted_by_agent: 'verified-skill-source-indexer',
    ai_review_score: {
      ...(skill.ai_review_score && typeof skill.ai_review_score === 'object' ? skill.ai_review_score : {}),
      source: 'source-verified-skill-path',
      source_url: sourceUrl(source),
      skill_path: `${source.skillDirectory ? `${source.skillDirectory}/` : ''}SKILL.md`,
    },
    ai_review_approved: true,
    ai_review_issues: skill.ai_review_issues || [],
    ai_review_suggestions: Array.from(new Set([
      ...(skill.ai_review_suggestions || []),
      'Review the upstream SKILL.md before installation.',
      'Install in a sandbox or low-risk workspace before production use.',
    ])),
  }
}

/**
 * Imports an allowlist of explicit upstream SKILL.md files.
 * The source file and its frontmatter name are verified immediately before
 * each guarded database upsert, so repository-wide content is never treated
 * as an installable skill by accident.
 */
export async function syncVerifiedSkillSources(
  options: VerifiedSkillSourceSyncOptions
): Promise<VerifiedSkillSourceSyncResult> {
  const serverSecret = (process.env.INDEXER_SECRET || '').trim()
  if (!serverSecret) {
    throw new Error('Missing INDEXER_SECRET for controlled verified skill sync.')
  }

  const supabase = createPublicClient({ requestTimeoutMs: 20_000 })
  const metadataByRepository = new Map<string, GitHubRepositoryMetadata>()
  const entries: VerifiedSkillSourceSyncEntry[] = []
  let verified = 0
  let created = 0
  let updated = 0

  for (const skill of selectedSkills(options)) {
    try {
      const source = sourceReference(skill)
      await fetchSkillSource(source)
      verified += 1

      let metadata = metadataByRepository.get(source.repository)
      if (!metadata) {
        metadata = await fetchRepositoryMetadata(source.repository)
        metadataByRepository.set(source.repository, metadata)
      }

      const { data, error } = await supabase.rpc('upsert_indexed_skill', {
        p_server_secret: serverSecret,
        p_skill: buildPayload(skill, source, metadata),
        p_activity: {
          event_type: 'skill_published',
          actor_name: 'OpenAgentSkill Verified Sources',
          actor_type: 'agent',
          description: `Indexed the verified upstream skill: ${skill.name}.`,
          metadata: {
            source: 'official-skill-path',
            source_repo: source.repository,
            source_path: `${source.skillDirectory ? `${source.skillDirectory}/` : ''}SKILL.md`,
            source_url: sourceUrl(source),
          },
        },
      })

      if (error) throw new Error(error.message)

      if (data?.created) {
        created += 1
        entries.push({ slug: skill.slug, status: 'created' })
      } else {
        updated += 1
        entries.push({ slug: skill.slug, status: 'updated' })
      }
    } catch (error) {
      entries.push({
        slug: skill.slug,
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown sync error',
      })
    }
  }

  const errors = entries.filter((entry) => entry.status === 'error').length
  return {
    status: errors > 0 ? 'completed_with_errors' : 'completed',
    verified,
    created,
    updated,
    errors,
    entries,
  }
}
