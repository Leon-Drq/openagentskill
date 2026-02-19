'use client'

import { useState } from 'react'
import { Skill } from '@/lib/types'

type LeaderboardTab = 'all-time' | 'trending' | 'hot'

interface LeaderboardTabsProps {
  skills: Skill[]
  onFilterChange?: (tab: LeaderboardTab) => void
}

export function LeaderboardTabs({ skills, onFilterChange }: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all-time')

  const handleTabChange = (tab: LeaderboardTab) => {
    setActiveTab(tab)
    onFilterChange?.(tab)
  }

  const totalDownloads = skills.reduce((sum, skill) => sum + skill.stats.downloads, 0)

  return (
    <div className="my-8 border-t border-b border-border py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{'Skills Leaderboard'}</h2>
          <p className="text-secondary text-sm md:text-base">
            {totalDownloads.toLocaleString()} total installs across {skills.length} skills
          </p>
        </div>
        
        <nav className="flex gap-2 text-sm">
          <button
            onClick={() => handleTabChange('all-time')}
            className={`px-4 py-2 border border-border transition-colors ${
              activeTab === 'all-time'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-background text-foreground hover:bg-muted'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => handleTabChange('trending')}
            className={`px-4 py-2 border border-border transition-colors ${
              activeTab === 'trending'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-background text-foreground hover:bg-muted'
            }`}
          >
            Trending (24h)
          </button>
          <button
            onClick={() => handleTabChange('hot')}
            className={`px-4 py-2 border border-border transition-colors ${
              activeTab === 'hot'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-background text-foreground hover:bg-muted'
            }`}
          >
            Hot
          </button>
        </nav>
      </div>
    </div>
  )
}
