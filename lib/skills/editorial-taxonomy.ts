/** Conservative metadata inference, not a quality or safety decision. */
export function inferEditorialTaxonomy(input: { name: string; description: string; category?: string; tags: string[] }) {
  const text = `${input.name} ${input.description}`.toLowerCase()
  const poster = /\b(?:poster|posters|zine|risograph)\b|海报/.test(text)
  return {
    category: input.category || (poster ? 'design-creative' : 'developer-tools'),
    tags: [...new Set([...input.tags, ...(poster ? ['design', 'poster'] : []), ...(/\bzine\b/.test(text) ? ['zine'] : []), 'agent-skill'])].slice(0, 10),
  }
}
