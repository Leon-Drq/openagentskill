import 'server-only'
import { createHash } from 'node:crypto'
import { fetchRepositoryCommitSha, validateGitHubRepo } from '@/lib/github/api'
import { discoverGitHubSkills, fetchSkillPackageSnapshot, parseGitHubSkillReference } from '@/lib/github/skill-source'
import { analyzeCode } from '@/lib/security/static-analysis'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMcpOnlySkillRecord } from '@/lib/skills/registry-scope'
import type { OwnerPublicationInput } from '@/lib/skills/owner-publication-schema'
import { OWNER_PUBLICATION_NOTICE } from '@/lib/skills/publication'

export class OwnerPublicationError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message)
  }
}

export async function prepareOwnerPublication(input: OwnerPublicationInput) {
  const reference = parseGitHubSkillReference(input.repository)
  if (!reference) throw new OwnerPublicationError('Enter a public GitHub repository or SKILL.md URL.', 400)
  const repository = await validateGitHubRepo(`${reference.owner}/${reference.repo}`, { checkReadme: false, checkSkillJson: false })
  if (repository.isPrivate) throw new OwnerPublicationError('Only public repositories can be listed.', 422)
  const ref = input.sourceRef || reference.ref || repository.defaultBranch
  const commit = await fetchRepositoryCommitSha(reference.owner, reference.repo, ref)
  if (!commit) throw new OwnerPublicationError('Could not resolve the source revision. Retry after GitHub is available.', 503)
  const discovery = await discoverGitHubSkills({ ...reference, ref: commit, path: input.skillPath || reference.path }, repository)
  if (discovery.skills.length !== 1 || discovery.truncated) {
    throw new OwnerPublicationError('Select exactly one valid SKILL.md using skillPath.', 422,
      { paths: discovery.skills.map(skill => skill.path) })
  }
  const skill = discovery.skills[0]
  // Never execute repository code. Persist the scope of this advisory scan.
  const snapshot = await fetchSkillPackageSnapshot(skill, { maxFiles: 12, repositoryTree: discovery.tree })
  const staticAnalysis = analyzeCode(snapshot.files)
  const hash = createHash('sha256').update(skill.document).digest('hex')
  const slugPart = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const base = `${slugPart(repository.owner)}-${slugPart(repository.repo)}`
  const slug = (skill.directory ? `${base}-${slugPart(skill.frontmatter.name)}` : base).slice(0, 150).replace(/-+$/, '')
  if (!slug) throw new OwnerPublicationError('Could not create a stable skill identifier.', 422)
  const encodedDirectory = skill.directory.split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)).join('/')
  const installSource = `https://github.com/${repository.fullName}/tree/${commit}${skill.directory ? `/${encodedDirectory}` : ''}`
  // Names outside this shell-safe set remain installable via the CLI picker.
  const skillSelector = /^[\p{L}\p{N} ._-]+$/u.test(skill.frontmatter.name) ? ` --skill "${skill.frontmatter.name}"` : ''
  const metadata = {
    slug,
    name: skill.frontmatter.name,
    description: skill.frontmatter.description,
    long_description: skill.document.slice(0, 12000),
    author_name: skill.frontmatter.author || repository.owner,
    author_url: `https://github.com/${repository.owner}`,
    repository: skill.sourceUrl,
    github_repo: repository.fullName,
    github_stars: repository.stars,
    github_forks: repository.forks,
    github_language: repository.language || null,
    github_last_pushed_at: repository.pushedAt || repository.updatedAt,
    category: skill.frontmatter.category || 'developer-tools',
    tags: [...new Set([...skill.frontmatter.tags, 'agent-skill'])].slice(0, 10),
    frameworks: skill.frontmatter.frameworks,
    version: skill.frontmatter.version || '1.0.0',
    license: skill.frontmatter.license || repository.license || 'Unknown',
    // Quote values sourced from untrusted repository metadata before handing
    // this command to a shell. The source is pinned to the recorded commit.
    install_command: `npx skills add ${installSource}${skillSelector}`,
    source_ref: commit,
    source_path: skill.path,
    source_commit_sha: commit,
    source_content_hash: hash,
  }
  if (isMcpOnlySkillRecord(metadata)) throw new OwnerPublicationError('This registry entry must describe an Agent Skill.', 422)
  return {
    skill: metadata,
    scan: {
      ...staticAnalysis,
      advisory: true,
      executed: false,
      files_scanned: snapshot.files.map(file => file.path),
      scope: 'First 12 supported text files up to 120 KB each; generated/vendor directories and binary assets are excluded.',
      truncated: snapshot.truncated,
      unread_files: snapshot.files.filter(file => !file.content).map(file => file.path),
      unreviewed_paths: snapshot.unreviewedPaths,
      notice: OWNER_PUBLICATION_NOTICE,
    },
  }
}

export async function publishOwnerSkill(input: OwnerPublicationInput) {
  const prepared = await prepareOwnerPublication(input)
  if (input.dryRun) return { dry_run: true, ...prepared, publication_channel: 'owner', ai_review_approved: false }
  const { data, error } = await createAdminClient({ requestTimeoutMs: 15000 }).rpc('publish_owner_skill', {
    p_request_id: input.requestId,
    p_skill: prepared.skill,
    p_reason: input.reason,
    p_scan: prepared.scan,
  })
  if (error) {
    const status = error.code === '23505' || error.code === '22023' ? 409 : 503
    throw new OwnerPublicationError(status === 409 ? error.message : 'Publication could not be saved. Retry using the same requestId.', status)
  }
  return { ...data, dry_run: false, url: `https://www.openagentskill.com/skills/${data.slug}`, scan: prepared.scan }
}
