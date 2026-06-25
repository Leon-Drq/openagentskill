import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Submit an AI Agent Skill - OpenAgentSkill',
  description:
    'Submit a reusable AI agent skill for OpenAgentSkill review, trust scoring, and agent-readable install discovery.',
  alternates: {
    canonical: 'https://www.openagentskill.com/submit',
  },
}

export default function SubmitLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return children
}
