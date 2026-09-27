import SkillsPage, { generateMetadata as directoryMetadata } from '@/components/skills-directory-page'

export const revalidate = 300

// The canonical directory has no request-time inputs. Query variants are
// rewritten by proxy to a separate dynamic route, preserving the public URL.
export function generateMetadata() {
  return directoryMetadata({ searchParams: Promise.resolve({}) })
}

export default function Page() {
  return <SkillsPage searchParams={Promise.resolve({})} cachePage />
}
