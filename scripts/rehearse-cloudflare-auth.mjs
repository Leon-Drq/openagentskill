import { DatabaseSync } from 'node:sqlite'
import { readFileSync, openSync, closeSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { commerceTimestamp } from './rehearse-cloudflare-commerce.mjs'

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const iso = value => new Date(commerceTimestamp(value)).toISOString()
const digest = rows => createHash('sha256').update(rows.map(row => JSON.stringify(row)+'\n').join('')).digest('hex')

// Deliberately exclude provider tokens, refresh tokens, old sessions, recovery
// tokens, confirmation tokens and administrative metadata from the new service.
export function convertAuthRows(users, identities, profiles) {
  const result = { users: [], accounts: [] }
  const ids = new Set(), emails = new Set(), providers = new Set(), accountIds = new Set()
  for (const user of users) {
    if (!uuid.test(user.id) || ids.has(user.id)) throw new Error('Invalid or duplicate source identity')
    ids.add(user.id)
    if (user.deleted_at || user.banned_until || user.is_anonymous === 'true'
      || user.is_super_admin === 'true' || user.is_sso_user === 'true') {
      throw new Error('Source account needs explicit status migration')
    }
    const email = user.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || emails.has(email)) throw new Error('Invalid or duplicate email mapping')
    emails.add(email)
    const profile = profiles.find(p => p.id === user.id)
    if (!profile) throw new Error('Source profile missing')
    const methods = identities.filter(i => i.user_id === user.id)
    if (!methods.length) throw new Error('Source login method missing')
    result.users.push({ id: user.id, name: profile.display_name || profile.username || 'OpenAgentSkill user',
      email, emailVerified: Number(Boolean(user.email_confirmed_at)), image: profile.avatar_url || null,
      createdAt: iso(user.created_at), updatedAt: iso(user.updated_at) })
    for (const identity of methods) {
      if (!uuid.test(identity.id) || accountIds.has(identity.id)) throw new Error('Invalid or duplicate account identity')
      accountIds.add(identity.id)
      if (!['email','github'].includes(identity.provider)) throw new Error('Unmapped source authentication provider')
      const providerId = identity.provider === 'email' ? 'credential' : 'github'
      const accountId = providerId === 'credential' ? user.id : identity.provider_id
      if (providerId === 'github' && !/^[1-9][0-9]*$/.test(accountId)) throw new Error('GitHub identity is not a stable numeric ID')
      const providerKey = `${providerId}:${accountId}`
      if (providers.has(providerKey)) throw new Error('Provider identity mapped more than once')
      providers.add(providerKey)
      const password = providerId === 'credential' ? user.encrypted_password : null
      if (providerId === 'credential' && !/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(password || '')) {
        throw new Error('Unsupported legacy password verifier')
      }
      result.accounts.push({ id: identity.id, accountId, providerId, userId: user.id,
        accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null, scope: null, password,
        createdAt: iso(identity.created_at), updatedAt: iso(identity.updated_at) })
    }
  }
  if (identities.some(identity => !ids.has(identity.user_id))) throw new Error('Orphan source login identity')
  return result
}

export function rehearseAuth(source, destination) {
  if (resolve(source) === resolve(destination)) throw new Error('Source must remain read-only')
  const input = new DatabaseSync(source, { readOnly: true })
  let output
  try {
    if (input.prepare('SELECT count(*) AS n FROM auth__mfa_factors').get().n) throw new Error('MFA migration requires explicit handling')
    // Read bytes to preserve embedded NULs: Node SQLite's text reader can
    // truncate them. Never let a truncated identity silently pass verification.
    const sourceRows = table => {
      const columns = input.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name)
      const decoder = new TextDecoder('utf-8',{fatal:true})
      return input.prepare(`SELECT ${columns.map(n=>`CAST("${n}" AS BLOB) AS "${n}"`).join(',')} FROM ${table}`).all()
        .map(row=>Object.fromEntries(columns.map(n=>[n,row[n]===null?null:decoder.decode(row[n])])))
    }
    const material = convertAuthRows(sourceRows('auth__users'),sourceRows('auth__identities'),sourceRows('public__profiles'))
    closeSync(openSync(destination, 'wx', 0o600))
    output = new DatabaseSync(destination)
    output.exec('PRAGMA foreign_keys=ON')
    for (const name of ['0001_commerce.sql','0002_auth.sql']) {
      output.exec(readFileSync(new URL(`../cloudflare/migrations/data/${name}`, import.meta.url), 'utf8'))
    }
    const report = { at: new Date().toISOString(), purpose: 'Archived auth rehearsal, NOT current production or active login',
      timestampPrecision: 'Auth timestamps normalized to UTC milliseconds; source archive retains microseconds', tables: [] }
    output.exec('BEGIN IMMEDIATE')
    for (const [table, rows] of [['auth_users', material.users], ['auth_accounts', material.accounts]]) {
      if (!rows.length) throw new Error('Source authentication inventory is empty')
      const names = Object.keys(rows[0])
      const insert = output.prepare(`INSERT INTO ${table} (${names.map(n=>`"${n}"`).join(',')}) VALUES (${names.map(()=>'?').join(',')})`)
      try { for (const row of rows) insert.run(...names.map(n=>row[n])) } catch { throw new Error('Authentication import constraint failed') }
      const target = output.prepare(`SELECT ${names.map(n=>`"${n}"`).join(',')} FROM ${table} ORDER BY id`).all()
      const expected = [...rows].sort((a,b)=>a.id.localeCompare(b.id))
      if (digest(target) !== digest(expected)) throw new Error('Authentication round-trip mismatch')
      report.tables.push({table, rows: rows.length, semanticSha256: digest(target)})
    }
    if (output.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Authentication ownership mismatch')
    output.exec('COMMIT')
    report.integrity = output.prepare('PRAGMA integrity_check').get().integrity_check
    if (report.integrity !== 'ok') throw new Error('Authentication integrity failure')
    report.passwordAccounts = material.accounts.filter(a=>a.providerId==='credential').length
    report.githubAccounts = material.accounts.filter(a=>a.providerId==='github').length
    report.verifiedEmails = material.users.filter(u=>u.emailVerified).length
    report.importedSessions = 0
    report.importedProviderTokens = 0
    report.foreignKeyViolations = 0
    return report
  } finally { output?.close(); input.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, destination, reportPath] = process.argv.slice(2)
  if (!source || !destination || !reportPath) throw new Error('Usage: SOURCE_ARCHIVE_SQLITE NEW_AUTH_SQLITE NEW_REPORT_JSON')
  const report = rehearseAuth(resolve(source), resolve(destination))
  writeFileSync(resolve(reportPath), JSON.stringify(report,null,2)+'\n', {flag:'wx',mode:0o600})
  console.log(JSON.stringify(report))
}
