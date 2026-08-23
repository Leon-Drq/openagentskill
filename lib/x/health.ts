export type XConnectionErrorCode =
  | 'secret_mismatch'
  | 'reauthorization_required'
  | 'connection_check_failed'

export type XConnectionErrorStatus = {
  code: XConnectionErrorCode
  reason: string
  reauthorizationRequired: boolean
  action: string
  actionUrl?: string
}

export function classifyXConnectionError(error: unknown): XConnectionErrorStatus {
  const message = error instanceof Error ? error.message : String(error || '')
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid server secret')) {
    return {
      code: 'secret_mismatch',
      reason: 'The application and database automation secrets are out of sync.',
      reauthorizationRequired: false,
      action: 'Apply the latest database migrations before running X automation.',
    }
  }

  if (
    normalized.includes('wrong key or corrupt data') ||
    normalized.includes('decrypt') ||
    normalized.includes('pgp_sym_decrypt')
  ) {
    return {
      code: 'reauthorization_required',
      reason: 'The stored X OAuth token was encrypted with a previous automation secret.',
      reauthorizationRequired: true,
      action: 'Reconnect @openagentskill once to store fresh OAuth tokens.',
      actionUrl: '/api/x/auth',
    }
  }

  return {
    code: 'connection_check_failed',
    reason: 'The X OAuth connection could not be verified.',
    reauthorizationRequired: false,
    action: 'Inspect the X automation and database logs.',
  }
}
