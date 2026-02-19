// Core type definitions for Open Agent Skill platform

export interface Skill {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  longDescription: string
  category: SkillCategory
  tags: string[]
  author: Author
  stats: SkillStats
  technical: TechnicalDetails
  pricing: PricingInfo
  compatibility: Compatibility[]
  createdAt: string
  updatedAt: string
  featured: boolean
  verified: boolean
}

export interface Author {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  reputation: number
  skillCount: number
  verified: boolean
}

export interface SkillStats {
  downloads: number
  stars: number
  forks: number
  usedBy: number
  rating: number
  reviewCount: number
  trending24h?: number // Trending score in last 24h
  weeklyGrowth?: number // Weekly growth percentage
}

export interface TechnicalDetails {
  version: string
  language: string[]
  frameworks: string[]
  dependencies: string[]
  apiEndpoint?: string
  documentation: string
  repository?: string
  license: string
  size: string
  lastUpdated: string
  installCommand?: string // Modern CLI install command
  npmPackage?: string // NPM package name if applicable
  githubRepo?: string // org/repo format
}

export interface PricingInfo {
  type: 'free' | 'freemium' | 'paid'
  price?: number
  currency?: string
  pricingModel?: 'one-time' | 'subscription' | 'usage-based'
}

export interface Compatibility {
  platform: AgentPlatform
  version: string
  status: 'full' | 'partial' | 'experimental'
}

export type AgentPlatform = 
  | 'langchain'
  | 'autogpt'
  | 'crewai'
  | 'openai-assistants'
  | 'anthropic-claude'
  | 'llamaindex'
  | 'semantic-kernel'
  | 'haystack'
  | 'agentgpt'
  | 'superagi'

export type SkillCategory =
  | 'data-analysis'
  | 'code-generation'
  | 'research'
  | 'automation'
  | 'communication'
  | 'creative'
  | 'business'
  | 'developer-tools'
  | 'security'
  | 'integration'

export interface SearchFilters {
  category?: SkillCategory
  platform?: AgentPlatform
  pricing?: PricingInfo['type']
  tags?: string[]
  verified?: boolean
  featured?: boolean
  sortBy?: 'popular' | 'recent' | 'stars' | 'downloads' | 'rating'
}

// Agent-readable structured data
export interface AgentSkillManifest {
  '@context': 'https://schema.org'
  '@type': 'SoftwareApplication'
  name: string
  description: string
  applicationCategory: string
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: number
    reviewCount: number
  }
  operatingSystem: string[]
  softwareVersion: string
  datePublished: string
  dateModified: string
  author: {
    '@type': 'Person' | 'Organization'
    name: string
  }
  downloadUrl?: string
  codeRepository?: string
}

// MCP (Model Context Protocol) integration
export interface MCPResource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// Workflow composition
export interface WorkflowNode {
  id: string
  skillId: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface WorkflowEdge {
  source: string
  target: string
  condition?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  author: Author
  public: boolean
  createdAt: string
}
