/** Public product information, separate from source identity and review decisions. */
export const PRODUCT_FIELDS = ['websiteUrl', 'documentationUrl', 'logoUrl', 'exampleUrl', 'prerequisites', 'runtimeNotes'] as const
export type ProductField = typeof PRODUCT_FIELDS[number]
export type SkillProductMetadata = Partial<Record<ProductField, string>>

export function isPublicProductUrl(value: string) {
  if (value.length > 1000 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    // These URLs are links/images only. Never fetch them from the application server.
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)
      && !/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host)
  } catch { return false }
}

export function productMetadataErrors(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['productMetadata']
  const input = value as Record<string, unknown>
  const errors = Object.keys(input).filter(key => !PRODUCT_FIELDS.includes(key as ProductField))
  for (const key of PRODUCT_FIELDS) {
    const raw = input[key]
    if (raw === undefined || raw === '') continue
    if (typeof raw !== 'string') { errors.push(key); continue }
    const text = raw.trim()
    if (!text) continue
    if (key.endsWith('Url')) {
      if (!isPublicProductUrl(text) || (key === 'logoUrl' && !/\.(png|jpe?g|webp|gif|svg)$/i.test(new URL(text).pathname))) errors.push(key)
    } else if (text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) errors.push(key)
  }
  return errors
}

/** Defensive reads also cover old records; invalid fields never become href/src. */
export function readProductMetadata(value: unknown): SkillProductMetadata {
  const result: SkillProductMetadata = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const key of PRODUCT_FIELDS) {
    const raw = (value as Record<string, unknown>)[key]
    if (typeof raw === 'string' && raw.trim() && !productMetadataErrors({ [key]: raw }).length) result[key] = raw.trim()
  }
  return result
}
