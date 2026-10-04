import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from '@/components/profile-client'
import { AccountWorkspaceShell } from '@/components/account-workspace-shell'
import { AccountPublicCard } from '@/components/account-public-card'
import { AccountSettingsForm } from '@/components/account-settings-form'
import { AccountCopyLink } from '@/components/account-copy-link'
import { AccountRetry } from '@/components/account-retry'
import { CreatorIdentityConnections } from '@/components/creator-identity-connections'
import { accountCopy, type AccountCopyKey } from '@/lib/i18n/account-copy'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { accountTab, accountHref, savedCursor } from '@/lib/account-workspace'
import { readSavedCount, readSavedPage } from '@/lib/account-data'
import { readAccountPoints } from '@/lib/account-points'
import styles from '@/components/account-workspace.module.css'
import { updateAccountProfile } from './actions'

export const metadata: Metadata = { title: 'My Workspace', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; lang?: string; after?: string; saved?: string; connected?: string; error?: string }> }) {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang) || 'en'
  const tab = accountTab(params.tab)
  const after = tab === 'bookmarks' ? savedCursor(params.after) : null
  const next = accountHref(tab, locale, after)
  const c = (key: AccountCopyKey) => accountCopy(locale, key)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) redirect(`/auth/login?next=${encodeURIComponent(next)}&lang=${locale}`)
  const libraryTab = tab === 'overview' || tab === 'bookmarks'
  const [{ data: profile, error: profileError }, totalPoints, savedCount, savedPage, claims, history] = await Promise.all([
    supabase.from('profiles').select('username,display_name,bio,avatar_url,website,invite_code,github_username,github_verified_at,x_username,x_verified_at').eq('id', user.id).abortSignal(AbortSignal.timeout(8000)).maybeSingle(),
    tab === 'overview' || tab === 'points' ? readAccountPoints(supabase, user.id) : Promise.resolve(null),
    libraryTab ? readSavedCount(supabase, user.id) : Promise.resolve(null),
    libraryTab ? readSavedPage(supabase, user.id, locale, after, tab === 'overview' ? 4 : 24) : Promise.resolve(null),
    tab === 'overview' ? supabase.from('skill_claims').select('skill_slug', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved').abortSignal(AbortSignal.timeout(8000)) : Promise.resolve({ count: null, error: null }),
    tab === 'points' ? supabase.from('point_events').select('id,amount,event_type,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20).abortSignal(AbortSignal.timeout(8000)) : Promise.resolve({ data: [], error: null }),
  ])
  const name = profile?.display_name || profile?.username || c('member')
  const metric = (value: number | null) => value === null ? '—' : value.toLocaleString(locale)
  const inviteUrl = profile?.invite_code ? `https://www.openagentskill.com/ref/${encodeURIComponent(profile.invite_code)}?lang=${locale}` : null
  const unavailable = <div role="alert" className={styles.notice}>{c('unavailable')} <AccountRetry locale={locale} /></div>
  return <AccountWorkspaceShell locale={locale} active={tab} name={name} avatarUrl={profile?.avatar_url}>
    <header><p className={styles.eyebrow}>OpenAgentSkill / Workspace</p><h1 className={styles.heading}>{c(tab === 'overview' ? 'workspace' : tab)}</h1><p className={styles.intro}>{c(tab === 'overview' ? 'intro' : tab === 'bookmarks' ? 'savedIntro' : tab === 'settings' ? 'settingsIntro' : 'pointsIntro')}</p></header>
    {profileError ? unavailable : null}
    {params.saved === '1' && <p role="status" className={styles.notice}>{c('saved')}</p>}
    {params.connected === 'github' && profile?.github_verified_at && <p role="status" className={styles.notice}>{c('verified')}</p>}
    {params.error && <p role="alert" className={styles.notice}>{c('unavailable')}</p>}
    {tab === 'overview' && <>
      <div className={styles.stats}>
        <Link href={accountHref('bookmarks', locale)} prefetch={false}><small>{c('bookmarks')}</small><strong>{metric(savedCount)}</strong></Link>
        <Link href={accountHref('points', locale)} prefetch={false}><small>{c('totalPoints')}</small><strong>{metric(totalPoints)}</strong></Link>
        <Link href={getLocalizedNavigationHref('/creator?tab=skills', locale)} prefetch={false}><small>{c('claimed')}</small><strong>{metric(claims.error ? null : claims.count)}</strong></Link>
      </div>
      {!profileError && <AccountPublicCard username={profile?.username || null} name={name} bio={profile?.bio || null} locale={locale} />}
    </>}
    {libraryTab && <section className={styles.section}>
      <div className={styles.sectionTop}><h2 className={styles.sectionHeading}>{c('bookmarks')}{tab === 'bookmarks' && savedCount !== null ? ` · ${metric(savedCount)}` : ''}</h2>{tab === 'overview' && <Link className={styles.textLink} href={accountHref('bookmarks', locale)}>{c('allSaved')} →</Link>}</div>
      {!savedPage || savedCount === null ? unavailable : savedPage.items.length ? <ProfileClient items={savedPage.items} locale={locale} /> : <div className={styles.empty}>{c('emptySaved')}<div className={styles.actions}><Link className={styles.primary} href={getLocalizedNavigationHref('/skills', locale)}>{c('browse')} →</Link></div></div>}
      {tab === 'bookmarks' && <nav className={styles.pagination} aria-label={c('bookmarks')}>{after ? <Link className={styles.secondary} href={accountHref('bookmarks', locale)}>{c('first')}</Link> : <span />}{savedPage?.next && <Link className={styles.primary} href={accountHref('bookmarks', locale, savedPage.next)}>{c('next')} →</Link>}</nav>}
    </section>}
    {tab === 'settings' && <>
      {!profileError && <AccountSettingsForm locale={locale} email={user.email || ''} initial={{ display_name: profile?.display_name || '', bio: profile?.bio || '', website: profile?.website || '' }} action={updateAccountProfile} />}
      <section className={styles.section}><CreatorIdentityConnections locale={locale} returnTo={accountHref('settings', locale)} githubUsername={profile?.github_username} githubVerifiedAt={profile?.github_verified_at} xUsername={profile?.x_username} xVerifiedAt={profile?.x_verified_at} githubOAuthEnabled={process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === 'true'} githubAppInstallUrl={process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || null} /></section>
      <Link className={styles.textLink} href={getLocalizedNavigationHref('/creator?tab=profile', locale)}>{c('editPublic')} →</Link>
    </>}
    {tab === 'points' && <>
      <section className={styles.section}><p className="text-sm text-secondary">{c('totalPoints')}</p><p className={styles.heading}>{metric(totalPoints)}</p>{totalPoints === null && unavailable}</section>
      <section className={styles.section}><h2 className={styles.sectionHeading}>{c('recent')}</h2>{history.error ? unavailable : history.data?.length ? <div className={styles.ledger}>{history.data.map(event => <div key={event.id} className={styles.event}><div>{event.description || event.event_type}<time dateTime={event.created_at}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(event.created_at))}</time></div><b>{event.amount > 0 ? '+' : ''}{event.amount}</b></div>)}</div> : <p className={`${styles.empty} mt-5`}>{c('noEvents')}</p>}</section>
      <section className={styles.section}><h2 className={styles.sectionHeading}>{c('invite')}</h2><p className={styles.intro}>{c('inviteNote')}</p>{inviteUrl ? <AccountCopyLink locale={locale} url={inviteUrl} /> : profileError ? unavailable : null}</section>
    </>}
  </AccountWorkspaceShell>
}
