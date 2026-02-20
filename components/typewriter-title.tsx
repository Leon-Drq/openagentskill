'use client'

import { useEffect, useState } from 'react'

interface TypewriterTitleProps {
  text: string
  className?: string
  speed?: number
  showCursor?: boolean
}

export function TypewriterTitle({ 
  text, 
  className = '', 
  speed = 80,
  showCursor = true 
}: TypewriterTitleProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else {
      setIsComplete(true)
    }
  }, [currentIndex, text, speed])

  return (
    <h1 className={className}>
      <span className="inline-block min-h-[1em]">
        {displayText}
        {showCursor && (
          <span 
            className={`inline-block w-1 h-[0.8em] ml-1 align-middle bg-foreground ${
              isComplete ? 'animate-pulse' : ''
            }`}
            style={{
              animation: isComplete ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          />
        )}
      </span>
    </h1>
  )
}
