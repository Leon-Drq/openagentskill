import { NextRequest, NextResponse } from 'next/server'
import { getIndexerRunProfile, INDEXER_RUN_PROFILES } from '@/lib/indexer/run-profiles'
import { GET as runIndexer } from '../route'

export const maxDuration = 300

function buildProfileRequest(request: NextRequest, profileKey: string) {
  const profile = getIndexerRunProfile(profileKey)
  if (!profile) return null

  const url = new URL(request.url)
  url.pathname = '/api/indexer/run'
  url.searchParams.set('domains', profile.domains.join(','))
  url.searchParams.set('targetNew', String(profile.targetNew))
  url.searchParams.set('minStars', String(profile.minStars))
  url.searchParams.set('maxSearchRequests', String(profile.maxSearchRequests))
  url.searchParams.set('strictQuality', String(profile.strictQuality))
  url.searchParams.set('includeCollections', String(profile.includeCollections))

  return {
    profile,
    request: new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    }),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profile: string }> }
) {
  const { profile: profileKey } = await params
  const configured = buildProfileRequest(request, profileKey)

  if (!configured) {
    return NextResponse.json(
      {
        error: 'Unknown indexer profile',
        profiles: INDEXER_RUN_PROFILES.map((profile) => ({
          key: profile.key,
          path: profile.path,
          domains: profile.domains,
        })),
      },
      { status: 404 }
    )
  }

  const response = await runIndexer(configured.request)
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    return response
  }

  const payload = await response.json()
  return NextResponse.json(
    {
      ...payload,
      indexer_profile: {
        key: configured.profile.key,
        label: configured.profile.label,
        domains: configured.profile.domains,
        schedule: configured.profile.schedule,
        path: configured.profile.path,
      },
    },
    { status: response.status }
  )
}
