import ts from 'typescript'
import { createHash } from 'node:crypto'
import { z } from 'zod'

export const digest = text => createHash('sha256').update(text).digest('hex')
const outputType = z.enum(['html', 'presentation', 'image', 'video'])
const media = z.string().refine(value => {
  const url = new URL(value, 'https://skillry.dev')
  return url.origin === 'https://skillry.dev' && !url.username && !url.password && !url.hash &&
    /^\/skills\/bs-[a-z0-9-]+\/media\/(?:preview-\d+\.webp|preview\.mp4)$/.test(url.pathname) &&
    [...url.searchParams.keys()].every(key => ['v', 'variant'].includes(key))
})
const sourceSkill = z.object({
  slug: z.string().regex(/^bs-[a-z0-9-]+$/), name: z.string().min(1).max(180), outputType,
  downloadCount: z.number().int().nonnegative(), priceUsdCents: z.number().int().nonnegative().max(1000000),
  isFeatured: z.boolean(), publishedAt: z.string().datetime(),
  previewImageUrls: z.array(media).min(1).max(16), previewVideoUrl: media.nullable(),
  tags: z.array(z.object({ kind: z.string(), value: z.string(), label: z.string() })).max(100),
})

// Read only literal data in the SSR payload. Never eval the source's scripts,
// call its functions, import assets, or execute a downloaded Skill package.
export function literalData(node, refs = new Map()) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) return !literalData(node.operand, refs)
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date' && node.arguments?.length === 1) {
    return new Date(literalData(node.arguments[0], refs)).toISOString()
  }
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === '$R') return refs.get(literalData(node.argumentExpression, refs))
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    if (!ts.isElementAccessExpression(node.left) || !ts.isIdentifier(node.left.expression) || node.left.expression.text !== '$R') throw Error('Unexpected source assignment')
    const result = literalData(node.right, refs)
    refs.set(literalData(node.left.argumentExpression, refs), result)
    return result
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(n => literalData(n, refs))
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) throw Error('Unexpected source property')
    if (['__proto__', 'constructor', 'prototype'].includes(p.name.text)) throw Error('Unsafe source property')
    return [p.name.text, literalData(p.initializer, refs)]
  }))
  throw Error('Unsupported source data; review the parser instead of executing scripts')
}

export function parseSkillryDirectory(html) {
  if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw Error('Directory byte limit exceeded')
  const arrays = []
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (!match[1].includes('publishedSkills:')) continue
    const ast = ts.createSourceFile('public-directory.js', match[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const visit = node => {
      if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'publishedSkills') arrays.push(literalData(node.initializer))
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  if (arrays.length !== 1) throw Error('Expected one complete published catalog')
  const rows = z.array(sourceSkill).min(1).max(2000).parse(arrays[0])
  if (new Set(rows.map(row => row.slug)).size !== rows.length) throw Error('Duplicate source slug')
  return rows
}

export function parseSkillryTerms(html) {
  const values = []
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (!match[1].includes('Terms of Service')) continue
    const ast = ts.createSourceFile('terms.js', match[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const visit = node => {
      if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'content' && ts.isStringLiteral(node.initializer)) values.push(node.initializer.text)
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  if (values.length !== 1 || values[0].length < 1000) throw Error('Terms could not be checked')
  return values[0]
}

export function selectSkillryRows(rows, paidPermitted = false) {
  return rows.filter(row => row.downloadCount > 10 && (paidPermitted || row.priceUsdCents === 0))
}

export function planSnapshot(rows, previous, { now, sourceHash, paidPermitted }) {
  if (previous?.entries?.length && rows.length < previous.sourceCount * 0.8) throw Error('Source catalog unexpectedly shrank; retain the previous release')
  const prior = new Map((previous?.entries || []).map(row => [row.sourceSlug, row]))
  const entries = selectSkillryRows(rows, paidPermitted).map(row => {
    const fields = {
      sourceSlug: row.slug, name: row.name, outputType: row.outputType, priceUsdCents: row.priceUsdCents,
      downloadCount: row.downloadCount, featured: row.isFeatured, publishedAt: row.publishedAt,
      previewImages: row.previewImageUrls.map(value => { const url = new URL(value, 'https://skillry.dev'); url.searchParams.set('variant', 'detail'); return url.href }),
      previewVideo: row.previewVideoUrl ? new URL(row.previewVideoUrl, 'https://skillry.dev').href : null,
      tags: row.tags.filter(tag => ['task', 'style', 'scenario'].includes(tag.kind)),
    }
    const old = prior.get(row.slug)
    const unchanged = old && Date.parse(now) - Date.parse(old.observedAt) < 30 * 86400000 && JSON.stringify(fields) === JSON.stringify(Object.fromEntries(Object.entries(old).filter(([key]) => !['observedAt', 'sourceDocumentSha256'].includes(key))))
    return { ...fields, observedAt: unchanged ? old.observedAt : now, sourceDocumentSha256: unchanged ? old.sourceDocumentSha256 : sourceHash }
  }).sort((a, b) => a.sourceSlug.localeCompare(b.sourceSlug, 'en'))
  // Disappeared/below-threshold entries leave discovery. Their published slug
  // and saved interactions remain in the archive, so existing links stay useful.
  const archived = [...(previous?.archived || []), ...(previous?.entries || []).filter(row => !entries.some(next => next.sourceSlug === row.sourceSlug))]
    .filter(row => !entries.some(next => next.sourceSlug === row.sourceSlug))
  return { sourceCount: rows.length, policy: { minimumExclusiveDownloads: 10, paidPermitted }, entries, archived: [...new Map(archived.map(row => [row.sourceSlug, row])).values()] }
}

export async function fetchPublicPage(url, fetcher = fetch) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'OpenAgentSkill-Discovery/1.0 (+https://www.openagentskill.com)' } })
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw Error(`Public source unavailable: ${response.status}`)
  const reader = response.body.getReader(); const chunks = []; let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break
      length += value.length
      if (length > 8 * 1024 * 1024) throw Error('Public source byte limit exceeded')
      chunks.push(Buffer.from(value))
    }
  } finally { await reader.cancel() }
  return Buffer.concat(chunks).toString('utf8')
}
