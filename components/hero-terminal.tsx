'use client'

import { useState } from 'react'
import { TerminalTypewriter } from './terminal-typewriter'

export function HeroTerminal() {
  const [isComplete, setIsComplete] = useState(false)

  const terminalLines = [
    { text: 'npx skills add openagentskill/web-research', type: 'command' as const, delay: 500 },
    { text: 'Downloading skill: Advanced Web Research v2.3.1', type: 'output' as const, delay: 600 },
    { text: 'Installing dependencies...', type: 'output' as const, delay: 300 },
    { text: 'Skill installed successfully', type: 'success' as const, delay: 400 },
    { text: '', type: 'output' as const, delay: 800 },
    { text: 'agent --use web-research "Find the latest AI research papers"', type: 'command' as const, delay: 400 },
    { text: 'Loading skill: Advanced Web Research', type: 'info' as const, delay: 300 },
    { text: 'Searching 15 academic databases...', type: 'output' as const, delay: 800 },
    { text: 'Found 47 recent papers on AI research', type: 'output' as const, delay: 600 },
    { text: 'Analyzing relevance and citations...', type: 'output' as const, delay: 700 },
    { text: 'Top 5 papers identified and summarized', type: 'success' as const, delay: 500 },
    { text: '', type: 'output' as const, delay: 400 },
    { text: 'Skills empower agents to do more. Install yours today.', type: 'info' as const, delay: 300 },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Terminal Window */}
      <div className="border border-border bg-background shadow-lg">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="text-xs text-secondary ml-2 font-mono">agent-terminal</div>
        </div>

        {/* Terminal Content */}
        <div className="p-6 sm:p-8 min-h-[300px] sm:min-h-[400px] overflow-x-auto">
          <TerminalTypewriter 
            lines={terminalLines}
            typingSpeed={25}
            onComplete={() => setIsComplete(true)}
          />
        </div>
      </div>

      {/* Restart Button */}
      {isComplete && (
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-secondary hover:text-foreground transition-colors underline"
          >
            Replay animation
          </button>
        </div>
      )}
    </div>
  )
}
