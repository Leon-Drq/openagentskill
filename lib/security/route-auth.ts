import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// Keep the supported automation secrets statically referenced. Deployment
// bundlers can omit dynamically accessed environment variables from functions.
const automationSecrets = {
  INDEXER_SECRET: process.env.INDEXER_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  INDEXER_TRIGGER_SECRET: process.env.INDEXER_TRIGGER_SECRET,
} as const

function isLocalDevelopment() {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim()
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isAutomationAuthorized(
  request: NextRequest,
  envNames: Array<keyof typeof automationSecrets> = ['INDEXER_SECRET', 'CRON_SECRET']
): boolean {
  const configuredSecrets = envNames
    .map((name) => automationSecrets[name])
    .filter((value): value is string => Boolean(value))

  if (configuredSecrets.length === 0) {
    return isLocalDevelopment()
  }

  const token = getBearerToken(request)
  if (!token) return false

  return configuredSecrets.some((secret) => safeEqual(token, secret))
}
