import 'server-only'

import { betterAuth } from 'better-auth'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { compare } from 'bcryptjs'

/** Private binding only. This database is never exposed as a public SQL API. */
export interface AuthDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): ReturnType<AuthDatabase['prepare']>
    all<T = Record<string, unknown>>(): Promise<{ results: T[]; meta: { changes: number; last_row_id: number } }>
  }
  batch<T = unknown>(statements: ReturnType<AuthDatabase['prepare']>[]): Promise<{
    results: T[]; meta: { changes: number; last_row_id: number }
  }[]>
  exec(sql: string): Promise<unknown>
}

export interface AuthMail {
  to: string
  url: string
  purpose: 'verify-email' | 'reset-password'
}

export interface CloudflareAuthOptions {
  database: AuthDatabase
  origin: string
  secret: string
  github?: { clientId: string; clientSecret: string }
  sendMail?: (mail: AuthMail) => Promise<void>
  registrationEnabled?: boolean
}

// Imported Supabase accounts retain their bcrypt verifier. New and reset
// passwords use Better Auth's scrypt format, without bcrypt's 72-byte limit.
export async function verifyMigratedPassword(input: { hash: string; password: string }) {
  if (/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(input.hash)) {
    return compare(input.password, input.hash)
  }
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(input.hash)) return false
  return verifyPassword(input)
}

export function createCloudflareAuth(options: CloudflareAuthOptions) {
  const origin = new URL(options.origin)
  if (origin.protocol !== 'https:' || origin.origin !== options.origin
    || !['www.openagentskill.com', 'openagentskill-migration.qudongqi2023.workers.dev'].includes(origin.hostname)) {
    throw new Error('Unapproved authentication origin')
  }
  if (options.secret.length < 32) throw new Error('Authentication secret is missing or too short')
  if (options.registrationEnabled && !options.sendMail) throw new Error('Registration requires verified email delivery')
  const sendMail = async (mail: AuthMail) => {
    if (!options.sendMail) throw new Error('Authentication email delivery is not configured')
    await options.sendMail(mail)
  }

  return betterAuth({
    appName: 'OpenAgentSkill',
    database: options.database,
    baseURL: options.origin,
    basePath: '/api/auth',
    secret: options.secret,
    trustedOrigins: [options.origin],
    // Authentication internals may contain identifiers, tokens or provider
    // responses. Routes surface generic failures; never log their payloads.
    logger: { disabled: true },
    advanced: {
      useSecureCookies: true,
      cookiePrefix: 'oas',
      database: { generateId: () => crypto.randomUUID() },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    user: { modelName: 'auth_users', deleteUser: { enabled: false }, changeEmail: { enabled: false } },
    session: {
      modelName: 'auth_sessions',
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: 'auth_accounts',
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, disableImplicitLinking: true, allowDifferentEmails: false },
    },
    verification: { modelName: 'auth_verifications' },
    rateLimit: { enabled: true, storage: 'database', modelName: 'auth_rate_limits', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 3 },
        '/request-password-reset': { window: 60, max: 3 }, '/send-verification-email': { window: 60, max: 3 } } },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.registrationEnabled,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyMigratedPassword },
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendMail({ to: user.email, url, purpose: 'reset-password' }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: ({ user, url }) => sendMail({ to: user.email, url, purpose: 'verify-email' }),
    },
    socialProviders: options.github ? {
      github: { ...options.github, scope: ['read:user', 'user:email'], disableSignUp: !options.registrationEnabled },
    } : {},
  })
}
