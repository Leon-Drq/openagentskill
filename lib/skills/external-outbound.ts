// Keep source evidence and our canonical URLs clean. Tracking belongs only on
// outbound links to the provider authorized by the site owner.
export function externalSourceHref(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl)
    if (url.protocol !== 'https:' || url.username || url.password ||
      !['skillry.dev', 'www.skillry.dev'].includes(url.hostname)) return sourceUrl
    url.searchParams.set('via', 'openagentskill')
    return url.toString()
  } catch { return sourceUrl }
}

export function externalSourceRel(sourceUrl: string): string {
  return externalSourceHref(sourceUrl) !== sourceUrl ||
    /^(https:\/\/)(www\.)?skillry\.dev(?:\/|\?|$)/.test(sourceUrl)
    ? 'sponsored noopener noreferrer' : 'noopener noreferrer'
}
