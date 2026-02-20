'use client'

import { useState, useEffect } from 'react'

interface TypewriterTitleProps {
  text: string
  delay?: number
  speed?: number
  className?: string
}

export function TypewriterTitle({ 
  text, 
  delay = 500, 
  speed = 80,
  className = '' 
}: TypewriterTitleProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayedText((prev) => prev + text[currentIndex])
          setCurrentIndex((prev) => prev + 1)
        }, speed)
        return () => clearTimeout(timeout)
      } else {
        setIsComplete(true)
      }
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [currentIndex, text, delay, speed])

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-[0.8em] bg-foreground ml-1 animate-pulse" />
      )}
    </span>
  )
}
