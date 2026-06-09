import type { SkillRecord } from '@/lib/db/skills'

export type InstallTargetId = 'openagentskill-cli' | 'codex' | 'claude-code' | 'cursor'
export type InstallTargetKind = 'command' | 'agent-prompt'

export interface SkillInstallTarget {
  id: InstallTargetId
  label: string
  title: string
  kind: InstallTargetKind
  value: string
  description: string
  copyLabel: string
}

type InstallableSkill = Pick<
  SkillRecord,
  'slug' | 'name' | 'description' | 'install_command' | 'github_repo' | 'repository'
>

export function getSkillRepoRef(skill: InstallableSkill) {
  if (skill.github_repo) return skill.github_repo
  if (skill.repository) return skill.repository.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')
  return skill.slug
}

export function getPrimaryInstallCommand(skill: InstallableSkill) {
  return skill.install_command || `npx skills add ${getSkillRepoRef(skill)}`
}

export function getSkillInstallTargets(skill: InstallableSkill): SkillInstallTarget[] {
  const repoRef = getSkillRepoRef(skill)
  const source = skill.repository || `https://github.com/${repoRef}`
  const primaryCommand = getPrimaryInstallCommand(skill)
  const description = skill.description.replace(/\s+/g, ' ').trim()

  return [
    {
      id: 'openagentskill-cli',
      label: 'CLI',
      title: 'OpenAgentSkill CLI',
      kind: 'command',
      value: primaryCommand,
      description: 'Use the registry command when your workflow supports the OpenAgentSkill installer.',
      copyLabel: 'Copy command',
    },
    {
      id: 'codex',
      label: 'Codex',
      title: 'Codex install prompt',
      kind: 'agent-prompt',
      value: `Install the "${skill.name}" agent skill from ${source}. Read its SKILL.md or equivalent instructions first, install only the files needed for this workspace, and summarize any required setup before using it. Skill purpose: ${description}`,
      description: 'Give Codex a repo-aware install prompt when the skill is not available through a local CLI.',
      copyLabel: 'Copy prompt',
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      title: 'Claude Code skill prompt',
      kind: 'agent-prompt',
      value: `Add "${skill.name}" as a Claude Code skill from ${source}. Inspect the skill instructions, place the reusable skill files in the appropriate local skills location for this project, and report the activation steps. Skill purpose: ${description}`,
      description: 'Use this prompt to ask Claude Code to add the skill and explain the local activation steps.',
      copyLabel: 'Copy prompt',
    },
    {
      id: 'cursor',
      label: 'Cursor',
      title: 'Cursor rule prompt',
      kind: 'agent-prompt',
      value: `Turn "${skill.name}" from ${source} into a reusable Cursor project rule or agent instruction. Preserve the core workflow, adapt paths to this repo, and keep the rule scoped to tasks where it is relevant. Skill purpose: ${description}`,
      description: 'Use this when installing as Cursor project rules or reusable agent instructions.',
      copyLabel: 'Copy prompt',
    },
  ]
}
