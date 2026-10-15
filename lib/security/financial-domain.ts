/** Domain classification is separate from executable financial risk detection.
 * Generic CLI options, sponsorship markets and designer portfolios are not
 * evidence of investment advice. Keep explicit financial subjects detectable. */
export function isFinancialDomainSkill(skill: {
  name?: string; category?: string; description?: string | null;
  long_description?: string | null; tagline?: string | null;
  tags?: string[] | null; frameworks?: string[] | null;
}) {
  const text = [skill.name, skill.category, skill.description, skill.long_description,
    skill.tagline, ...(skill.tags || []), ...(skill.frameworks || [])].join(' ')
  return /\b(finance|financial|quant|stocks?|equities|investment|investors?|earnings|valuation|trading|brokers?|crypto|defi)\b|\b(stock|equity|capital|securities|financial) markets?\b|\b(investment|mutual|hedge|index|pension) funds?\b|\b(stock|equity|investment) portfolio\b|\b(foreign exchange|forex|quantitative (finance|trading)|options? (trading|pricing)|derivatives? trading)\b/i.test(text)
}
