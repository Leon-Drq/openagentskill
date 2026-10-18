const ORIGIN = 'https://www.openagentskill.com'

export function creatorCitation(input: string, name: string) {
  let slug = input.trim()
  if (slug.length > 500) return null
  if (slug.startsWith('https://')) {
    try {
      const url = new URL(slug)
      if (!['openagentskill.com', 'www.openagentskill.com'].includes(url.hostname) || url.username || url.password || url.port) return null
      const match = url.pathname.match(/^\/skills\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)
      if (!match) return null
      slug = match[1]
    } catch { return null }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return null
  const title = name.trim().replace(/[\r\n\t]+/g, ' ').slice(0, 120) || 'Skill listing'
  const label = `${title} on OpenAgentSkill`
  const url = `${ORIGIN}/skills/${slug}`
  const markdownLabel = label.replace(/[\\`*_[\]<>]/g, '\\$&')
  const htmlLabel = label.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!)
  return { slug, url, label, markdown: `[${markdownLabel}](${url})`, html: `<a href="${url}">${htmlLabel}</a>` }
}
