import snapshot from '@/public/research/skill-readiness-2026-10-18/dataset.json'

export const SKILL_READINESS_PATH = '/reports/skill-readiness-2026-10-18'
export const SKILL_READINESS_ASSETS = '/research/skill-readiness-2026-10-18'
export const skillReadinessSnapshot = snapshot

export function readinessPercent(count: number, denominator: number) {
  return `${denominator ? (Math.round(count / denominator * 1000) / 10).toFixed(1) : '0.0'}%`
}
