'use client'

import { useState } from 'react'

interface InstallCommandProps {
  command: string
  skillSlug: string
}

export function InstallCommand({ command, skillSlug }: InstallCommandProps) {
  const [copied, setCopied] = useState(false)

  const fullCommand = command || `npx skills add ${skillSlug}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[v0] Failed to copy:', err)
    }
  }

  return (
    <div className="my-8 border border-border bg-card">
      <div className="border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold">{'Install with one command'}</h3>
      </div>
      <div className="relative">
        <pre className="overflow-x-auto p-4 font-mono text-sm md:text-base">
          <code className="text-foreground">$ {fullCommand}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute right-2 top-2 rounded border border-border bg-background px-3 py-1 text-xs font-mono hover:bg-muted transition-colors"
          aria-label="Copy command"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
