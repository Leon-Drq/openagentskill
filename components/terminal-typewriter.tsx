'use client'

import { useEffect, useState, useRef } from 'react'

interface TerminalTypewriterProps {
  lines: { text: string; delay?: number; className?: string }[]
  typingSpeed?: number
  cursorChar?: string
}

export function TerminalTypewriter({ 
  lines, 
  typingSpeed = 30,
  cursorChar = '█'
}: TerminalTypewriterProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)
    return () => clearInterval(cursorInterval)
  }, [])

  // Typing animation
  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setIsComplete(true)
      return
    }

    const currentLine = lines[currentLineIndex]
    const lineDelay = currentLine.delay || 0

    if (currentCharIndex === 0 && lineDelay > 0) {
      const delayTimeout = setTimeout(() => {
        setCurrentCharIndex(1)
      }, lineDelay)
      return () => clearTimeout(delayTimeout)
    }

    if (currentCharIndex < currentLine.text.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev]
          if (newLines[currentLineIndex] === undefined) {
            newLines[currentLineIndex] = ''
          }
          newLines[currentLineIndex] += currentLine.text[currentCharIndex]
          return newLines
        })
        setCurrentCharIndex((prev) => prev + 1)
      }, typingSpeed)
      return () => clearTimeout(timeout)
    } else {
      // Move to next line
      const lineBreakTimeout = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1)
        setCurrentCharIndex(0)
      }, 300)
      return () => clearTimeout(lineBreakTimeout)
    }
  }, [currentLineIndex, currentCharIndex, lines, typingSpeed])

  // Auto scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [displayedLines])

  return (
    <div 
      ref={terminalRef}
      className="relative w-full bg-black border border-border overflow-hidden font-mono text-sm"
      style={{ minHeight: '300px', maxHeight: '500px' }}
    >
      <div className="p-6 overflow-y-auto h-full">
        {displayedLines.map((line, index) => {
          const lineConfig = lines[index]
          return (
            <div 
              key={index} 
              className={`mb-2 ${lineConfig?.className || 'text-green-400'}`}
            >
              {line}
              {index === currentLineIndex && !isComplete && showCursor && (
                <span className="text-green-400">{cursorChar}</span>
              )}
            </div>
          )
        })}
        {isComplete && showCursor && (
          <span className="text-green-400">{cursorChar}</span>
        )}
      </div>
    </div>
  )
}
