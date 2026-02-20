'use client'

import { useEffect, useState } from 'react'

// Pixel art SVG agents
const PixelCrab = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pixel-art">
    <rect x="8" y="16" width="4" height="4" fill="currentColor"/>
    <rect x="20" y="16" width="4" height="4" fill="currentColor"/>
    <rect x="12" y="12" width="8" height="4" fill="currentColor"/>
    <rect x="8" y="20" width="4" height="4" fill="currentColor"/>
    <rect x="20" y="20" width="4" height="4" fill="currentColor"/>
    <rect x="4" y="12" width="4" height="4" fill="currentColor"/>
    <rect x="24" y="12" width="4" height="4" fill="currentColor"/>
    <rect x="12" y="20" width="8" height="4" fill="currentColor"/>
  </svg>
)

const PixelRobot = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pixel-art">
    <rect x="8" y="8" width="16" height="16" fill="currentColor"/>
    <rect x="12" y="12" width="3" height="3" fill="var(--background)"/>
    <rect x="17" y="12" width="3" height="3" fill="var(--background)"/>
    <rect x="12" y="18" width="8" height="2" fill="var(--background)"/>
    <rect x="6" y="14" width="2" height="6" fill="currentColor"/>
    <rect x="24" y="14" width="2" height="6" fill="currentColor"/>
  </svg>
)

const PixelBird = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pixel-art">
    <rect x="12" y="12" width="8" height="8" fill="currentColor"/>
    <rect x="8" y="16" width="4" height="4" fill="currentColor"/>
    <rect x="20" y="16" width="8" height="4" fill="currentColor"/>
    <rect x="14" y="14" width="2" height="2" fill="var(--background)"/>
  </svg>
)

const PixelSpider = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pixel-art">
    <rect x="12" y="14" width="8" height="6" fill="currentColor"/>
    <rect x="8" y="12" width="4" height="2" fill="currentColor"/>
    <rect x="20" y="12" width="4" height="2" fill="currentColor"/>
    <rect x="8" y="22" width="4" height="2" fill="currentColor"/>
    <rect x="20" y="22" width="4" height="2" fill="currentColor"/>
    <rect x="4" y="10" width="4" height="2" fill="currentColor"/>
    <rect x="24" y="10" width="4" height="2" fill="currentColor"/>
    <rect x="4" y="24" width="4" height="2" fill="currentColor"/>
    <rect x="24" y="24" width="4" height="2" fill="currentColor"/>
  </svg>
)

const agents = [
  { icon: PixelCrab, name: 'OpenClaw' },
  { icon: PixelRobot, name: 'AutoGPT' },
  { icon: PixelBird, name: 'Claude' },
  { icon: PixelSpider, name: 'CrewAI' },
]

export function PixelAgentsParade() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative w-full h-20 sm:h-24 overflow-hidden border-y border-border my-12 sm:my-16 lg:my-20 bg-background/50">
      {/* Scrolling agents */}
      <div className="absolute inset-0 flex items-center">
        <div className="flex gap-16 sm:gap-24 animate-scroll-left">
          {/* Duplicate agents for seamless loop */}
          {[...agents, ...agents, ...agents].map((agent, index) => {
            const Icon = agent.icon
            return (
              <div
                key={index}
                className="flex flex-col items-center gap-2 text-secondary shrink-0"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10">
                  <Icon />
                </div>
                <span className="text-xs font-mono whitespace-nowrap">{agent.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

      <style jsx global>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 20s linear infinite;
        }

        .pixel-art {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  )
}
