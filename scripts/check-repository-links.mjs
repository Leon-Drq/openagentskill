import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const checkExternal = process.argv.includes('--external')
const markdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'GOVERNANCE.md',
  'CHANGELOG.md',
  'ROADMAP.md',
]

function githubAnchor(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function extractTargets(markdown) {
  const targets = []
  const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  const htmlSource = /<(?:img|a)\b[^>]+(?:src|href)=["']([^"']+)["']/gi

  for (const match of markdown.matchAll(markdownLink)) targets.push(match[1])
  for (const match of markdown.matchAll(htmlSource)) targets.push(match[1])
  return targets
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function collectHeadings(filePath) {
  const markdown = await readFile(filePath, 'utf8')
  return new Set(
    markdown
      .split(/\r?\n/)
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => githubAnchor(line.replace(/^#{1,6}\s+/, '')))
  )
}

async function checkLocalTarget(sourceFile, target) {
  if (!target || target.startsWith('mailto:')) return null
  if (/^https?:\/\//i.test(target)) return null

  const [rawPath, anchor] = target.split('#', 2)
  const decodedPath = decodeURIComponent(rawPath || '')
  const resolved = decodedPath
    ? path.resolve(root, path.dirname(sourceFile), decodedPath)
    : path.resolve(root, sourceFile)

  if (!(await fileExists(resolved))) return `${sourceFile}: missing ${target}`

  if (anchor && resolved.toLowerCase().endsWith('.md')) {
    const headings = await collectHeadings(resolved)
    if (!headings.has(anchor.toLowerCase())) return `${sourceFile}: missing anchor ${target}`
  }

  return null
}

async function fetchStatus(url, method) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'OpenAgentSkill-Link-Check' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function checkExternalTarget(url) {
  try {
    let response = await fetchStatus(url, 'HEAD')
    if (!response.ok && ![401, 403, 429].includes(response.status)) response = await fetchStatus(url, 'GET')
    if (response.ok || [401, 403, 429].includes(response.status)) return null
    return `${url}: HTTP ${response.status}`
  } catch {
    try {
      const response = await fetchStatus(url, 'GET')
      if (response.ok || [401, 403, 429].includes(response.status)) return null
      return `${url}: HTTP ${response.status}`
    } catch (retryError) {
      return `${url}: ${retryError instanceof Error ? retryError.message : String(retryError)}`
    }
  }
}

const failures = []
const externalTargets = new Set()

for (const sourceFile of markdownFiles) {
  const markdown = await readFile(path.resolve(root, sourceFile), 'utf8')
  for (const target of extractTargets(markdown)) {
    if (/^https?:\/\//i.test(target)) {
      externalTargets.add(target)
      continue
    }
    const failure = await checkLocalTarget(sourceFile, target)
    if (failure) failures.push(failure)
  }
}

if (checkExternal) {
  const queue = [...externalTargets]
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length > 0) {
      const target = queue.shift()
      if (!target) return
      const failure = await checkExternalTarget(target)
      if (failure) failures.push(failure)
    }
  })
  await Promise.all(workers)
}

if (failures.length > 0) {
  console.error(`Repository link check failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Repository links OK (${checkExternal ? `${externalTargets.size} external URLs, ` : ''}${markdownFiles.length} Markdown files).`)
}
