'use client'

// Download the actual response body before invoking the browser save action.
// This never treats a link click or a copied install command as a file download.
export async function downloadFile(path: string, body: unknown) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/octet-stream' }, body: JSON.stringify(body) })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'temporarily_unavailable')
  }
  if (response.headers.get('content-type') !== 'application/octet-stream') throw new Error('temporarily_unavailable')
  const blob = await response.blob()
  if (!blob.size) throw new Error('temporarily_unavailable')
  const filename = response.headers.get('content-disposition')?.match(/filename="([a-zA-Z0-9._-]+)"/)?.[1] || 'skill-download'
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
