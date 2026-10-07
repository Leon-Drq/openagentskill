import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseFragment } from 'parse5'

export const digest = value => createHash('sha256').update(value).digest('hex')
export const safePath = value => typeof value === 'string' && value.length <= 512 && !/[\u0000-\u001f\\?#%]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..')
export const safeRepo = value => typeof value === 'string' && /^[\w.-]+\/[\w.-]+$/.test(value) && !value.split('/').some(part => part === '.' || part === '..')
export const identity = row => digest([row.github_repo?.toLowerCase(), row.source_path || row.repository || '', row.source_ref || ''].join('\n'))
const visual = ['presentation', 'image-generation', 'design-creative', 'video-creation']
const supported = /\.(png|jpe?g|webp|gif|mp4|webm|pdf|pptx)$/i
const decorative = /(?:^|[\s/_.-])(logo|badge|banner|avatar|sponsor|donate|qrcode|qr-code|icon|appicon|wordmark|logotype|wechat|weixin|qq|star-history|shields)(?:$|[\s/_.-])/i
const example = /(?:^|[\s/_.-])(examples?|demos?|outputs?|results?|previews?|slides?|templates?|showcases?|gallery)(?:$|[\s/_.-])/i

export function selectBatch(rows, state, { limit = 150, now = new Date().toISOString(), excluded = new Set(), refresh = false } = {}) {
  const time = Date.parse(now)
  const due = rows.filter(row => !excluded.has(row.slug) && safeRepo(row.github_repo)).filter(row => {
    const prior = state[row.slug]
    return refresh || !prior || prior.identity !== identity(row) || Date.parse(prior.nextAt) <= time
  })
  const priority = row => visual.includes(row.category) ? visual.indexOf(row.category) : 4
  const ordered = due.sort((a, b) => priority(a) - priority(b) || a.slug.localeCompare(b.slug, 'en'))
  // Reserve slots for both first-time/new listings and retries/backlog. Neither
  // a popular source nor a failing endpoint can monopolize future collection.
  const newest = ordered.filter(row => !state[row.slug] && Date.parse(row.created_at) > time - 7 * 86400000)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, Math.floor(limit / 3))
  const retries = refresh ? [] : ordered.filter(row => state[row.slug]).sort((a, b) => Date.parse(state[a.slug].nextAt) - Date.parse(state[b.slug].nextAt)).slice(0, Math.floor(limit / 5))
  const batch = [...new Map([...newest, ...retries, ...ordered].map(row => [row.slug, row])).values()].slice(0, limit)
  return { batch, pending: due.length - batch.length }
}

export function documentPaths(row, tree) {
  const files = new Set(tree.filter(file => file.type === 'blob' && file.mode === '100644').map(file => file.path))
  let source = row.source_path
  // Old directory records may carry their exact directory only in repository.
  if (!source && row.repository) {
    try {
      const url = new URL(row.repository)
      const prefix = `/${row.github_repo}/tree/`
      if (url.hostname === 'github.com' && url.pathname.toLowerCase().startsWith(prefix.toLowerCase())) {
        const remainder = decodeURIComponent(url.pathname.slice(prefix.length))
        const ref = row.source_ref || remainder.split('/')[0]
        if (remainder.startsWith(ref + '/')) source = remainder.slice(ref.length + 1).replace(/\/$/, '') + '/SKILL.md'
      }
    } catch { /* Invalid source identity is handled below, without root fallback. */ }
  }
  if (source && (!safePath(source) || !files.has(source))) return []
  const folder = source ? path.posix.dirname(source) : '.'
  const sameDirectory = [...files].filter(file => path.posix.dirname(file) === folder)
  return [...new Set([source, ...sameDirectory.filter(file => /(?:^|\/)SKILL\.md$/i.test(file)), ...sameDirectory.filter(file => /(?:^|\/)readme(?:\.en)?\.md$/i.test(file))].filter(Boolean))].slice(0, 3)
}

export function resolveAsset(value, documentPath, repository, revision, ref) {
  try {
    value = value.trim().replace(/&amp;/g, '&')
    let file
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
      const prefix = `/${repository}/`
      if (!url.pathname.toLowerCase().startsWith(prefix.toLowerCase())) return null
      const tail = decodeURIComponent(url.pathname.slice(prefix.length))
      const route = url.hostname === 'github.com' ? /^(blob|raw)\//.exec(tail)?.[0] : url.hostname === 'raw.githubusercontent.com' ? '' : null
      if (route === null || route === undefined) return null
      const remainder = tail.slice(route.length)
      const selectedRef = [revision, ref, 'HEAD'].filter(Boolean).find(item => remainder.startsWith(item + '/'))
      if (!selectedRef) return null
      file = remainder.slice(selectedRef.length + 1)
    } else {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return null
      const pathname = decodeURIComponent(value.split(/[?#]/)[0])
      file = pathname.startsWith('/') ? pathname.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(documentPath), pathname))
    }
    return safePath(file) ? file : null
  } catch { return null }
}

export function discoverAssets(documents, tree, { repository, revision, ref, sourcePath, exclusions = [] }) {
  const byPath = new Map(tree.filter(file => file.type === 'blob' && file.mode === '100644').map(file => [file.path, file]))
  const candidates = new Map(), skipped = []
  const add = (url, label, documentPath, explicit = true) => {
    const asset = resolveAsset(url, documentPath, repository, revision, ref)
    if (!asset) { if (/\.(png|jpe?g|gif|webp|mp4|webm|pdf|pptx)(?:[?#]|$)/i.test(url)) skipped.push({ reason: 'external-or-unresolved-source', documentPath }); return }
    if (!supported.test(asset)) return
    if (decorative.test(asset + ' ' + label)) return
    const brandName = path.posix.basename(asset).replace(/\.[^.]+$/, '').replace(/[-_](?:dark|light|white|black)$/i, '').toLowerCase()
    if (brandName === repository.split('/')[1].toLowerCase() || exclusions.some(item => item.repository.toLowerCase() === repository.toLowerCase() && item.asset === asset)) return
    if (!byPath.has(asset)) { skipped.push({ reason: 'missing-asset', asset }); return }
    const parents = asset.split('/').slice(0, -1)
    const nested = [...byPath.keys()].some(file => /(?:^|\/)(?:license|copying|notice)(?:\.[^/]*)?$/i.test(file) && parents.some((_, i) => path.posix.dirname(file) === parents.slice(0, i + 1).join('/')))
    if (nested) { skipped.push({ reason: 'nested-license', asset }); return }
    if (!candidates.has(asset)) candidates.set(asset, {
      asset, documentPath, explicit, size: byPath.get(asset).size,
      kind: example.test(asset + ' ' + label) ? 'example' : 'reference',
      label: label.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
    })
  }
  for (const { path: documentPath, text } of documents) {
    // Ignore fenced code and HTML comments: example syntax is not actual media.
    const body = text.replace(/```[^\n]*\n[\s\S]*?```|~~~[^\n]*\n[\s\S]*?~~~/g, '').replace(/<!--[\s\S]*?-->/g, '')
    const definitions = new Map([...body.matchAll(/^\s*\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+["'].*)?$/gm)].map(match => [match[1].toLowerCase(), match[2]]))
    for (const match of body.matchAll(/!?\[([^\]\n]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g)) {
      const heading = [...body.slice(0, match.index).matchAll(/^#{1,6}\s+(.+)$/gm)].at(-1)?.[1] || ''
      if (/sponsors?|donat|supporters?|赞助|鸣谢|捐赠|赞赏|合作伙伴/i.test(heading)) continue
      add(match[2] || match[3], match[1], documentPath)
    }
    for (const match of body.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) { const url = definitions.get((match[2] || match[1]).toLowerCase()); if (url) add(url, match[1], documentPath) }
    const visit = node => {
      if (['img', 'video', 'source'].includes(node.tagName)) {
        const attrs = Object.fromEntries(node.attrs.map(attr => [attr.name, attr.value]))
        if (attrs.src) add(attrs.src, attrs.alt || attrs.title || '', documentPath)
        if (attrs.poster) add(attrs.poster, 'Video preview', documentPath)
      }
      for (const child of node.childNodes || []) visit(child)
    }
    visit(parseFragment(body))
  }
  // For an exact Skill directory, author-named example folders are additional
  // evidence. Root monorepo folders are never sprayed onto sibling Skills.
  if (sourcePath && safePath(sourcePath)) {
    const dir = path.posix.dirname(sourcePath)
    const prefix = dir === '.' ? '' : dir + '/'
    const hasSiblingSkills = tree.some(file => file.path !== sourcePath && /(?:^|\/)SKILL\.md$/i.test(file.path) && file.path.startsWith(prefix))
    if (!hasSiblingSkills) for (const file of byPath.keys()) {
      const relative = file.slice(prefix.length)
      if (file.startsWith(prefix) && /^(examples?|previews?|screenshots?|outputs?|results?|assets\/previews?)\//i.test(relative) && relative.split('/').length <= 3 && supported.test(file)) {
        add(path.posix.relative(dir, file), path.posix.basename(file), sourcePath, false)
      }
    }
  }
  return { candidates: [...candidates.values()].sort((a, b) => Number(b.kind === 'example') - Number(a.kind === 'example') || Number(b.explicit) - Number(a.explicit) || a.asset.localeCompare(b.asset, 'en')), skipped }
}
