'use client'

import { useEffect, useState } from 'react'

interface TerminalLine {
  text: string
  type: 'command' | 'output' | 'success' | 'error' | 'info'
  delay?: number
}

interface TerminalTypewriterProps {
  lines: TerminalLine[]
  typingSpeed?: number
  onComplete?: () => void
}

export function TerminalTypewriter({ 
  lines, 
  typingSpeed = 30,
  onComplete 
}: TerminalTypewriterProps) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string }[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  // Cursor blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Typing animation
  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      if (onComplete) onComplete()
      return
    }

    const currentLine = lines[currentLineIndex]
    
    // Apply delay before starting this line
    if (currentCharIndex === 0 && currentLine.delay) {
      const delayTimeout = setTimeout(() => {
        setCurrentCharIndex(1)
      }, currentLine.delay)
      return () => clearTimeout(delayTimeout)
    }

    if (currentCharIndex < currentLine.text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + currentLine.text[currentCharIndex])
        setCurrentCharIndex(prev => prev + 1)
      }, typingSpeed)
      return () => clearTimeout(timeout)
    } else {
      // Line complete, move to next
      setDisplayedLines(prev => [...prev, { text: currentText, type: currentLine.type }])
      setCurrentText('')
      setCurrentCharIndex(0)
      setCurrentLineIndex(prev => prev + 1)
    }
  }, [currentLineIndex, currentCharIndex, lines, typingSpeed, currentText, onComplete])

  const getLineStyle = (type: string) => {
    switch (type) {
      case 'command':
        return 'text-foreground'
      case 'output':
        return 'text-secondary'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-foreground'
    }
  }

  const getLinePrefix = (type: string) => {
    if (type === 'command') return '$ '
    if (type === 'success') return '✓ '
    if (type === 'error') return '✗ '
    if (type === 'info') return 'ℹ '
    return '  '
  }

  return (
    <div className="font-mono text-xs sm:text-sm leading-relaxed">
      {displayedLines.map((line, index) => (
        <div key={index} className={`${getLineStyle(line.type)} whitespace-pre-wrap break-all`}>
          {getLinePrefix(line.type)}{line.text}
        </div>
      ))}
      {currentLineIndex < lines.length && (
        <div className={`${getLineStyle(lines[currentLineIndex].type)} whitespace-pre-wrap break-all`}>
          {getLinePrefix(lines[currentLineIndex].type)}{currentText}
          <span className={`inline-block w-2 h-4 bg-foreground ml-0.5 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      )}
    </div>
  )
}
