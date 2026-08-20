export interface OpenAgentSkillOptions { baseUrl?: string; fetch?: typeof fetch }
export interface ResolveOptions { agent?: string; limit?: number; maxRisk?: string }
export interface SearchOptions { limit?: number }
export declare class OpenAgentSkill {
  constructor(options?: OpenAgentSkillOptions)
  search(query: string, options?: SearchOptions): Promise<unknown>
  resolve(task: string, options?: ResolveOptions): Promise<unknown>
  skill(slug: string): Promise<unknown>
  installPlan(slug: string): Promise<unknown>
  rankings(slug?: string, limit?: number): Promise<unknown>
  rankingHistory(slug?: string, days?: number): Promise<unknown>
  reportOutcome(outcome: Record<string, unknown>): Promise<unknown>
}
export declare function createOpenAgentSkill(options?: OpenAgentSkillOptions): OpenAgentSkill
