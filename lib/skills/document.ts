/** Presentation only: never parse YAML as configuration or execute source instructions. */
export function prepareSkillDocument(source: string) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  let metadata = ''
  let body = normalized
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line))
    if (end > 1 && end <= 200 && lines.slice(1, end).some(line => /^[A-Za-z_][\w-]*\s*:/.test(line))) {
      metadata = lines.slice(1, end).join('\n')
      body = lines.slice(end + 1).join('\n').trim()
    }
  }
  return { body, metadata, isLong: body.length > 1800 || body.split('\n').length > 40 }
}

/** Links are navigation only. No server fetch, remote image embed or data URL. */
export function resolveSkillDocumentUrl(value: string | undefined, sourceUrl: string) {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined
  if (value.startsWith('#skill-doc-')) return value
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      const absolute = new URL(value)
      return ['https:', 'http:', 'mailto:'].includes(absolute.protocol) && !absolute.username && !absolute.password ? absolute.href : undefined
    }
    const base = new URL(sourceUrl)
    if (!['https:', 'http:'].includes(base.protocol)) return undefined
    if (base.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(base.pathname)) {
      base.pathname = `${base.pathname.replace(/\/$/, '')}/blob/HEAD/README.md`
    }
    // A leading slash in GitHub markdown is repository-relative, not site-relative.
    const parts = base.pathname.split('/')
    const root = base.hostname === 'github.com' && parts[3] === 'blob'
      ? `${base.origin}/${parts[1]}/${parts[2]}/blob/${parts[4]}/` : base.href
    const url = new URL(value.startsWith('/') && !value.startsWith('//') ? value.slice(1) : value, value.startsWith('/') ? root : base)
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) return undefined
    return url.href
  } catch { return undefined }
}

type DocumentNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: DocumentNode[]
}

/** Format balanced standalone source XML wrappers as Markdown quotes, not HTML.
 * This is not sanitization: the resulting document still goes through rehype-sanitize.
 * Code fences and unmatched wrappers are retained literally. */
export function quoteSourceWrappers(source: string) {
  const lines = source.split('\n')
  const stack: { tag: string; index: number }[] = []
  const pairs: [number, number][] = []
  const wrapperLines = new Set<number>()
  let fence: { char: string; length: number } | undefined
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length }
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined
      continue
    }
    if (fence || /^ {4}|^\t/.test(line)) continue
    const tag = line.match(/^ {0,3}<(\/?)([A-Za-z][A-Za-z0-9_-]*[-_][A-Za-z0-9_-]+)>\s*$/)
    if (!tag) continue
    wrapperLines.add(index)
    if (!tag[1]) stack.push({ tag: tag[2].toLowerCase(), index })
    else if (stack.at(-1)?.tag === tag[2].toLowerCase()) pairs.push([stack.pop()!.index, index])
  }
  const starts = new Set(pairs.map(([start]) => start))
  const ends = new Set(pairs.map(([, end]) => end))
  let depth = 0
  return lines.map((line, index) => {
    if (ends.has(index)) { depth--; return '> '.repeat(depth) }
    if (starts.has(index)) { const blank = '> '.repeat(depth); depth++; return blank }
    return '> '.repeat(depth) + (wrapperLines.has(index) ? `\`${line.trim()}\`` : line)
  }).join('\n')
}

/** Runs AFTER sanitization. Only namespaces anchors and normalizes heading levels. */
export function rehypeSkillDocument() {
  return (tree: DocumentNode) => {
    const headings: DocumentNode[] = []
    const links: DocumentNode[] = []
    const namedNodes: DocumentNode[] = []
    const anchors = new Map<string, string>()
    const counts = new Map<string, number>()
    const text = (node: DocumentNode): string => node.value || (node.children || []).map(text).join('')
    function visit(node: DocumentNode) {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName || '')) headings.push(node)
      if (node.tagName === 'a') links.push(node)
      if (node.type === 'element' && (node.properties?.id || node.properties?.name)) namedNodes.push(node)
      for (const child of node.children || []) visit(child)
    }
    visit(tree)
    for (const node of namedNodes) {
      const original = String(node.properties?.id || node.properties?.name).replace(/^(?:user-content-)+/, '')
      const safe = original.replace(/[^\p{L}\p{N}_-]/gu, '-') || 'anchor'
      const count = counts.get(`anchor:${safe}`) || 0
      counts.set(`anchor:${safe}`, count + 1)
      const id = `skill-doc-anchor-${safe}${count ? `-${count}` : ''}`
      if (!anchors.has(original)) anchors.set(original, id)
      node.properties!.id = id
      delete node.properties!.name
    }
    const shallowest = Math.min(...headings.map(node => Number(node.tagName?.slice(1))), 6)
    for (const node of headings) {
      const slug = text(node).trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-') || 'section'
      const count = counts.get(slug) || 0
      counts.set(slug, count + 1)
      const unique = count ? `${slug}-${count}` : slug
      const id = `skill-doc-${unique}`
      const oldId = node.properties?.id
      anchors.set(unique, id)
      if (typeof oldId === 'string') {
        for (const [key, value] of anchors) if (value === oldId) anchors.set(key, id)
      }
      node.properties = { id }
      node.tagName = `h${Math.min(6, 3 + Number(node.tagName?.slice(1)) - shallowest)}`
    }
    for (const node of links) {
      const href = node.properties?.href
      if (typeof href !== 'string' || !href.startsWith('#')) continue
      let fragment = href.slice(1)
      try { fragment = decodeURIComponent(fragment) } catch { /* Keep an invalid fragment inert/external. */ }
      const target = anchors.get(fragment.replace(/^(?:user-content-)+/, ''))
      if (target) node.properties!.href = `#${target}`
    }
  }
}
