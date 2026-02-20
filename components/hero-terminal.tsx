'use client'

import { TerminalTypewriter } from './terminal-typewriter'

export function HeroTerminal() {
  const terminalLines = [
    { 
      text: '$ npx skills add web-research', 
      className: 'text-white',
      delay: 500 
    },
    { 
      text: '✓ Installing web-research skill...', 
      className: 'text-green-400',
      delay: 800 
    },
    { 
      text: '✓ Configuring agent capabilities...', 
      className: 'text-green-400',
      delay: 400 
    },
    { 
      text: '✓ Skill installed successfully', 
      className: 'text-green-400',
      delay: 400 
    },
    { 
      text: '', 
      className: 'text-transparent',
      delay: 600 
    },
    { 
      text: '$ agent.use("web-research")', 
      className: 'text-white',
      delay: 200 
    },
    { 
      text: '> Analyzing: "Latest developments in agent skills"', 
      className: 'text-blue-400',
      delay: 600 
    },
    { 
      text: '> Searching 47 sources...', 
      className: 'text-blue-400',
      delay: 800 
    },
    { 
      text: '> Synthesizing findings...', 
      className: 'text-blue-400',
      delay: 1000 
    },
    { 
      text: '', 
      className: 'text-transparent',
      delay: 400 
    },
    { 
      text: 'Result: Agent skills are becoming the standard for AI capabilities.', 
      className: 'text-yellow-300',
      delay: 200 
    },
    { 
      text: 'Open marketplaces enable cross-platform skill sharing.', 
      className: 'text-yellow-300',
      delay: 200 
    },
    { 
      text: 'Future: Skills will be composable, interoperable, and universal.', 
      className: 'text-yellow-300',
      delay: 200 
    },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 bg-black border-b border-border px-4 py-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 ml-2 font-mono">terminal — agent</span>
        </div>
      </div>
      <TerminalTypewriter lines={terminalLines} typingSpeed={25} />
    </div>
  )
}
