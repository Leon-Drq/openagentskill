import { z } from 'zod'

export const OwnerPublicationSchema = z.object({
  repository: z.string().trim().min(1).max(500),
  skillPath: z.string().trim().min(1).max(500).optional(),
  sourceRef: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().min(10).max(2000),
  requestId: z.string().uuid(),
  dryRun: z.boolean().default(false),
}).strict()

export type OwnerPublicationInput = z.infer<typeof OwnerPublicationSchema>
