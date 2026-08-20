import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'

type Props = { params: Promise<{ username: string }> }

async function loadCreator(username: string) {
  const supabase = createPublicClient()
  const { data: profile } = await supabase.from('profiles').select('id,username,display_name,bio,website,github_username,x_username').eq('username', username).maybeSingle()
  if (!profile) return null
  const { data: claims } = await supabase.from('skill_claims').select('skill_slug').eq('user_id', profile.id).eq('status', 'approved')
  const slugs = (claims || []).map((claim) => claim.skill_slug)
  const { data: skills } = slugs.length
    ? await supabase.from('skills').select('slug,name,description,category,github_stars').in('slug', slugs).order('github_stars', { ascending: false })
    : { data: [] }
  return { profile, skills: skills || [] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) return { title: 'Creator not found' }
  const name = creator.profile.display_name || creator.profile.username
  return { title: `${name} — Agent Skill Creator`, description: creator.profile.bio || `Verified skills published by ${name} on OpenAgentSkill.` }
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) notFound()
  const { profile, skills } = creator
  const name = profile.display_name || profile.username
  const sameAs = [profile.website, profile.github_username ? `https://github.com/${profile.github_username}` : null, profile.x_username ? `https://x.com/${profile.x_username}` : null].filter(Boolean)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name, url: `https://www.openagentskill.com/creators/${profile.username}`, sameAs, description: profile.bio || undefined }

  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">Verified creator</p>
    <h1 className="mt-4 font-display text-5xl font-semibold">{name}</h1>
    {profile.bio ? <p className="mt-4 max-w-2xl text-lg text-secondary">{profile.bio}</p> : null}
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      {profile.website ? <a className="border border-border px-3 py-2" href={profile.website}>Website</a> : null}
      {profile.github_username ? <a className="border border-border px-3 py-2" href={`https://github.com/${profile.github_username}`}>GitHub @{profile.github_username}</a> : null}
      {profile.x_username ? <a className="border border-border px-3 py-2" href={`https://x.com/${profile.x_username}`}>X @{profile.x_username}</a> : null}
    </div>
    <section className="mt-12">
      <h2 className="font-display text-2xl">Verified skills ({skills.length})</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {skills.map((skill) => <Link key={skill.slug} href={`/skills/${skill.slug}`} className="border border-border p-5 hover:border-foreground">
          <p className="font-mono text-xs uppercase text-secondary">{skill.category} · ★ {Number(skill.github_stars || 0).toLocaleString()}</p>
          <h3 className="mt-2 font-display text-xl">{skill.name}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-secondary">{skill.description}</p>
        </Link>)}
      </div>
    </section>
  </main>
}
