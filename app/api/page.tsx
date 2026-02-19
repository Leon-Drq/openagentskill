import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API - Open Agent Skill',
  description: 'Agent-friendly API for programmatic access to skills',
}

export default function APIPage() {
  redirect('/api-docs')
}
