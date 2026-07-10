import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API - OpenAgentSkill',
  description: 'Agent-friendly API for programmatic access to skills',
  alternates: {
    canonical: 'https://www.openagentskill.com/api-docs',
  },
}

export default function APIPage() {
  redirect('/api-docs')
}
