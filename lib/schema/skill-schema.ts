import { z } from 'zod'

// Skill submission schema - for validating user/agent submissions
export const SkillSubmissionSchema = z.object({
  // Basic info
  name: z.string().min(3).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic versioning (e.g., 1.0.0)'),
  description: z.string().min(20).max(500),
  longDescription: z.string().min(50).optional(),
  
  // Repository
  repository: z.string().url().refine(
    (url) => url.includes('github.com'),
    { message: 'Must be a GitHub repository URL' }
  ),
  
  // Author info
  author: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  
  // Categorization
  category: z.enum([
    'data-analysis',
    'code-generation',
    'research',
    'automation',
    'communication',
    'creative',
    'business',
    'developer-tools',
    'security',
    'integration',
  ]),
  tags: z.array(z.string()).min(1).max(10),
  
  // Technical
  license: z.enum(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'LGPL-3.0']),
  frameworks: z.array(z.string()).optional(),
  language: z.array(z.string()).min(1),
  dependencies: z.array(z.string()).optional(),
  
  // Compatibility
  compatibility: z.array(z.object({
    platform: z.string(),
    version: z.string().optional(),
    status: z.enum(['full', 'partial', 'experimental']).default('full'),
  })).min(1),
  
  // Usage
  usage: z.object({
    install: z.string(),
    example: z.string().optional(),
  }),
  
  // Submission metadata
  submissionSource: z.enum(['web', 'api', 'agent']).default('web'),
  submittedByAgent: z.string().optional(),
})

export type SkillSubmission = z.infer<typeof SkillSubmissionSchema>

// GitHub repo validation result
export const GitHubRepoSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  description: z.string().optional(),
  stars: z.number(),
  forks: z.number(),
  language: z.string().optional(),
  license: z.string().optional(),
  updatedAt: z.string(),
  defaultBranch: z.string(),
  hasReadme: z.boolean(),
  hasSkillJson: z.boolean(),
})

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>

// AI review result
export const AIReviewResultSchema = z.object({
  approved: z.boolean(),
  scores: z.object({
    security: z.number().min(0).max(10),
    quality: z.number().min(0).max(10),
    usefulness: z.number().min(0).max(10),
    compliance: z.number().min(0).max(10),
  }),
  totalScore: z.number(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  reasoning: z.string(),
  reviewedAt: z.string(),
  reviewModel: z.string(),
})

export type AIReviewResult = z.infer<typeof AIReviewResultSchema>

// Skill manifest from skill.json
export const SkillManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.union([
    z.string(),
    z.object({
      name: z.string(),
      email: z.string().optional(),
      url: z.string().optional(),
    }),
  ]),
  license: z.string(),
  repository: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
  compatibility: z.array(z.any()).optional(),
})

export type SkillManifest = z.infer<typeof SkillManifestSchema>
