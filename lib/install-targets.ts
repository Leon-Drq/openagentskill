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


function getVerifiedInstallReceiptInstruction(skill: InstallableSkill, agent: string) {
  const payload = JSON.stringify({
    event_id: 'install_<unique-id>',
    skill_slug: skill.slug,
    task: `Install ${skill.name}`,
    agent,
    outcome: 'success',
    install_used: true,
  })

  return `After the install attempt, report the result to https://www.openagentskill.com/api/agent/outcome with POST JSON ${payload}. Replace event_id with a unique value and outcome with success or failed. Report success only after the skill is installed and a minimal verification passes.`
}
export function getPrimaryInstallCommand(skill: InstallableSkill) {
  return skill.install_command || `npx skills add ${getSkillRepoRef(skill)}`
}

export function getSkillInstallTargets(skill: InstallableSkill): SkillInstallTarget[] {
  const repoRef = getSkillRepoRef(skill)
  const source = skill.repository || `https://github.com/${repoRef}`
  const description = skill.description.replace(/\s+/g, ' ').trim()

  return [
    {
      id: 'openagentskill-cli',
      label: 'CLI',
      title: 'OpenAgentSkill CLI',
      kind: 'command',
      value: `npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz add ${skill.slug}`,
      description: 'Resolve policy, run the source installer safely, and report a verified install receipt.',
      copyLabel: 'Copy command',
    },
    {
      id: 'codex',
      label: 'Codex',
      title: 'Codex install prompt',
      kind: 'agent-prompt',
      value: `Install the "${skill.name}" agent skill from ${source}. Read its SKILL.md or equivalent instructions first, install only the files needed for this workspace, and summarize any required setup before using it. Skill purpose: ${description} ${getVerifiedInstallReceiptInstruction(skill, 'codex')}`,
      description: 'Give Codex a repo-aware install prompt when the skill is not available through a local CLI.',
      copyLabel: 'Copy prompt',
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      title: 'Claude Code skill prompt',
      kind: 'agent-prompt',
      value: `Add "${skill.name}" as a Claude Code skill from ${source}. Inspect the skill instructions, place the reusable skill files in the appropriate local skills location for this project, and report the activation steps. Skill purpose: ${description} ${getVerifiedInstallReceiptInstruction(skill, 'claude-code')}`,
      description: 'Use this prompt to ask Claude Code to add the skill and explain the local activation steps.',
      copyLabel: 'Copy prompt',
    },
    {
      id: 'cursor',
      label: 'Cursor',
      title: 'Cursor rule prompt',
      kind: 'agent-prompt',
      value: `Turn "${skill.name}" from ${source} into a reusable Cursor project rule or agent instruction. Preserve the core workflow, adapt paths to this repo, and keep the rule scoped to tasks where it is relevant. Skill purpose: ${description} ${getVerifiedInstallReceiptInstruction(skill, 'cursor')}`,
      description: 'Use this when installing as Cursor project rules or reusable agent instructions.',
      copyLabel: 'Copy prompt',
    },
  ]
}
