'use client'

import { useEffect, useState } from 'react'

/** Decorative examples only: never changes the input value or its accessible label. */
export function AnimatedSearchHint({ active, placeholder, examples }: { active: boolean; placeholder: string; examples: readonly string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active || examples.length === 0) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setInterval> | undefined
    const sync = () => {
      clearInterval(timer)
      if (!motion.matches && !document.hidden) {
        timer = setInterval(() => setIndex((current) => current % examples.length + 1), 4000)
      }
    }
    sync()
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(timer)
      motion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [active, examples])

  if (!active) return null

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex min-w-0 items-center px-2 text-base text-[#8b857b] motion-reduce:hidden">
      <span key={index} className="block truncate animate-in fade-in duration-500">
        {index === 0 ? placeholder : examples[(index - 1) % examples.length]}
      </span>
    </span>
  )
}
