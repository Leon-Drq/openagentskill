export interface StaticBlogSkill {
  slug: string
  name: string
  category: string
  github_stars: number
  author_name: string
  github_repo: string
  install_command: string
  tags: string[]
}

export interface StaticBlogPost {
  id: string
  slug: string
  title: string
  summary: string
  content: string
  published_at: string
  skills: StaticBlogSkill
}

export const STATIC_BLOG_POSTS: StaticBlogPost[] = [
  {
    id: 'static-introducing-addyosmani-agent-skills',
    slug: 'introducing-addyosmani-agent-skills',
    title: 'Addy Osmani Agent Skills for Coding Agents',
    summary: 'A practical look at addyosmani/agent-skills, a production-grade skill pack for planning, building, testing, reviewing, and shipping code with AI agents.',
    published_at: '2026-06-17T12:00:00.000Z',
    skills: {
      slug: 'addyosmani-agent-skills',
      name: 'Agent Skills',
      category: 'Coding Agents',
      github_stars: 61_800,
      author_name: 'addyosmani',
      github_repo: 'addyosmani/agent-skills',
      install_command: 'npx skills add addyosmani/agent-skills',
      tags: ['agent-skills', 'coding-agents', 'claude-code', 'cursor', 'gemini-cli', 'engineering'],
    },
    content: `## Where this fits

AI coding agents are strongest when they have a repeatable engineering workflow, not just a blank prompt and repository access. [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) packages production-grade engineering practices into reusable skills for specification, planning, implementation, testing, review, simplification, and shipping.

OpenAgentSkill tracks it as a Coding Agents skill because it is less about one narrow tool call and more about giving agents a senior-engineer operating loop.

## Why agents benefit

- It gives agents named workflows like /spec, /plan, /build, /test, /review, /code-simplify, and /ship.
- It helps turn vague coding requests into scoped plans, quality gates, and reviewable output.
- It supports common coding-agent surfaces including Claude Code, Cursor, Gemini CLI, and other agents that can consume skill-style instructions.
- It is MIT licensed and actively maintained, which makes it easier to evaluate for team workflows.
- It gives teams a shared language for agent work instead of one-off prompting habits.

## Practical scenarios

### Turning a rough idea into an implementation plan

Use the planning and spec workflows when a user asks for a feature but has not yet clarified constraints, acceptance criteria, or edge cases.

### Reviewing agent-written code

Use the review workflow after an agent changes a codebase. The value is not only finding bugs, but forcing the agent to explain risk, tests, and what should be checked before shipping.

### Shipping with quality gates

Use the build, test, and ship workflows when the task needs a more disciplined path from code edit to verification. This is especially useful for production apps where “looks done” is not enough.

## Add it to your agent workflow

Start by reviewing the repository and install path:

\`\`\`bash
npx skills add addyosmani/agent-skills
\`\`\`

Then ask your agent to use the relevant workflow for the task:

\`\`\`text
Use the planning and review skills from addyosmani/agent-skills before changing this repository.
Return the implementation plan, risk notes, and tests you will run.
\`\`\`

You can also review the OpenAgentSkill profile here: https://www.openagentskill.com/skills/addyosmani-agent-skills

## Compare before adopting

Before adding any skill pack to a production workflow, compare its maintenance freshness, license, install path, supported agents, and whether the commands match your team’s engineering process. For this repo, the strongest fit is teams that already use AI coding agents and want more predictable planning, code review, and release behavior.

## Why it is worth tracking

The repository has strong adoption, a clear engineering focus, and a practical workflow model rather than a vague prompt collection. That makes it a good candidate for OpenAgentSkill’s trust and audit layer: agents can discover it, compare it against alternatives, and decide when a human should review before installation.`,
  },
]

export function getStaticBlogPostBySlug(slug: string) {
  return STATIC_BLOG_POSTS.find((post) => post.slug === slug) || null
}
