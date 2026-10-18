import { z } from 'zod'
import { productMetadataErrors, readProductMetadata } from '@/lib/skills/product-metadata'

export const ProductMetadataSchema = z.unknown().superRefine((value, ctx) => {
  for (const key of productMetadataErrors(value)) ctx.addIssue({ code: 'custom', path: [key], message: key.endsWith('Url') ? 'Use a public HTTPS URL. Logo URLs must end in PNG, JPG, WebP, GIF or SVG.' : 'Use plain text up to 2,000 characters; unknown fields are not allowed.' })
}).transform(readProductMetadata)
