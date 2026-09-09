/** Presentation hints only. Never use prose denials to bypass executable/static review gates. */
export const FINANCIAL_EXECUTION_PATTERN = /\b(place orders?|order execution|execute trades?|trade execution|live trading|brokerage|broker account|exchange connectivity|wallet|private key|swap(?:ping)?|withdraw(?:al)?|deposit(?:ing)?|margin trading|perpetual futures?|api trading)\b/i
export const SECRET_ACCESS_PATTERN = /\b(secrets?|tokens?|credentials?|api[ _-]?keys?|oauth|auth|env|environment variables?|passwords?)\b/i

export function hasAffirmativeRiskText(text: string, pattern: RegExp) {
  const matches = (value: string) => [...value.matchAll(new RegExp(pattern.source, `${pattern.ignoreCase ? 'i' : ''}g`))]
  // Executable examples retain their risk even when the surrounding prose denies it.
  for (const block of text.matchAll(/```[^\n]*\n([\s\S]*?)(?:```|$)|~~~[^\n]*\n([\s\S]*?)(?:~~~|$)/g)) {
    if (matches(block[1] || block[2] || '').length) return true
  }
  const prose = text.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, '\n')
  const clauses = prose.split(/[.!?;](?:\s|$)|\n\s*\n|\n(?=\s*(?:[-*]|\d+\.)\s|#{1,6}\s)|\b(?:but|however|instead|although|yet)\b/i)
  for (const clause of clauses) {
    for (const match of matches(clause)) {
      const before = clause.slice(0, match.index).replace(/\s+/g, ' ')
      const after = clause.slice((match.index || 0) + match[0].length).replace(/\s+/g, ' ')
      const denial = before.match(/\b(?:(?:does|do|will|can) not (?:provide|perform|support|require|use|access|execute|read|collect)|never (?:uses?|requires?|accesses?|executes?)|no)\b([^.!?;]{0,220})$/i)
      // Do not let a denial of one requirement swallow another affirmative action.
      const denialHasNewAction = denial && /\b(?:need(?:s|ed)?|required|then|read|reads|write|writes|execute|executes|use|uses|access|accesses|collect|collects|upload|uploads|send|sends|must|can)\b/i.test(denial[1])
      const deniedBefore = /\b(?:(?:does|do|will|can) not|never)\s*$/i.test(before) || Boolean(denial && !denialHasNewAction && !/\bnot only\b/i.test(before))
      const deniedAfter = /^\s*(?:,?\s*(?:or|and)\s+[^.;!?]{1,70})?\s+(?:(?:is|are)\s+)?(?:not (?:required|needed|used|supported)|unnecessary)\b/i.test(after)
      if (!deniedBefore && !deniedAfter) return true
    }
  }
  return false
}

export function hasSkillRiskHint(skill: {
  name?: string | null; description?: string | null; long_description?: string | null
  tagline?: string | null; category?: string | null; install_command?: string | null
  github_repo?: string | null; repository?: string | null; npm_package?: string | null
  tags?: string[] | null; frameworks?: string[] | null
}, pattern: RegExp) {
  // Check fields separately: a disclaimer cannot cancel an install command or another field.
  const direct = [skill.install_command, skill.github_repo, skill.repository, skill.npm_package, ...(skill.tags || []), ...(skill.frameworks || [])]
  if (direct.some(value => value && new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).test(value))) return true
  return [skill.name, skill.description, skill.long_description, skill.tagline, skill.category]
    .some(value => value && hasAffirmativeRiskText(value, pattern))
}
