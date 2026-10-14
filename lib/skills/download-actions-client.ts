'use client'

export type DownloadAction = 'command-copy' | 'external-open'
let memorySession: string | undefined
export function downloadSessionId() {
  const key = 'openagentskill.sessionId'
  try {
    const saved = window.localStorage.getItem(key)
    if (saved && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(saved)) return saved
    memorySession ||= crypto.randomUUID()
    window.localStorage.setItem(key, memorySession)
  } catch { memorySession ||= crypto.randomUUID() }
  return memorySession
}

// Called only after a successful clipboard write or an explicit source click.
// keepalive lets an outbound navigation finish without awaiting telemetry.
export async function trackDownloadAction(slug: string, action: DownloadAction) {
  try {
    await fetch(`/api/skills/${encodeURIComponent(slug)}/download-action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: downloadSessionId() }), keepalive: true,
    })
  } catch { /* Counting must never prevent copying or opening the source. */ }
}
