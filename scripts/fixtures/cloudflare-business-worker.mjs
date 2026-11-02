import { createClient } from '@supabase/supabase-js'
import { createD1ReadFetch } from '../../lib/db/cloudflare-read.ts'

const worker = {
  async fetch(request, env) {
    if (env.BUSINESS_TEST_ONLY !== '1' || !['localhost','127.0.0.1'].includes(new URL(request.url).hostname) || request.method !== 'POST') return new Response('Unavailable',{status:503})
    const db = env.APP_DB
    const owner = '50000000-0000-4000-8000-000000000001', other = '50000000-0000-4000-8000-000000000002'
    await db.batch([
      db.prepare('INSERT INTO account_identities(id) VALUES (?),(?)').bind(owner,other),
      db.prepare('INSERT INTO profiles(id,username) VALUES (?,?),(?,?)').bind(owner,'native-alice',other,'native-bob'),
      db.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved,quality_score,taxonomy_tags)
        VALUES ('native-public','native-public','Native video skill','video workflow','Fixture','https://example.invalid','owner/long-repository-long-repository-long-repository-long-repository','development','MIT',1,70,'["video"]'),
        ('native-private','native-private','Private video skill','video workflow','Fixture','https://example.invalid','owner/private','development','MIT',0,90,'[]')`),
      db.prepare("INSERT INTO directory_skill_ids(id) VALUES ('native-public'),('native-private')"),
      db.prepare("INSERT INTO bookmarks(user_id,skill_slug) VALUES (?,'native-public'),(?,'native-public')").bind(owner,other),
    ])
    const client = userId => createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},db:{retry:false},global:{fetch:createD1ReadFetch(db,{userId})}})
    const publicClient = client(null), signedIn = client(owner)
    const results = await Promise.all([
      publicClient.from('skills').select('slug,ai_review_approved,taxonomy_tags',{count:'exact'}),
      publicClient.rpc('search_public_skills',{p_query:'video',p_limit:20}).select('slug'),
      publicClient.from('skill_directory_entries').select('slug').contains('taxonomy_tags',['video']),
      publicClient.from('bookmarks').select('*'),
      signedIn.from('bookmarks').select('user_id'),
      signedIn.from('bookmarks').select('*').eq('user_id',other),
      publicClient.from('auth_users').select('*'),
      publicClient.from('skills').select('slug').ilike('github_repo','owner/long-repository-long-repository-long-repository-long-repository'),
      publicClient.from('skills').select('slug',{count:'exact',head:true}),
    ])
    const checks = {
      publication: !results[0].error && results[0].data.length===1 && results[0].count===1,
      codecs: results[0].data?.[0]?.ai_review_approved===true && results[0].data?.[0]?.taxonomy_tags?.[0]==='video',
      fullText: !results[1].error && results[1].data.length===1 && results[1].data[0].slug==='native-public',
      directory: !results[2].error && results[2].data.length===1,
      anonymous: !results[3].error && results[3].data.length===0,
      ownership: !results[4].error && results[4].data.length===1 && results[4].data[0].user_id===owner,
      crossAccount: !results[5].error && results[5].data.length===0,
      privateTables: results[6].error?.code==='42501',
      longRepository: !results[7].error && results[7].data.length===1,
      exactHeadCount: !results[8].error && results[8].count===1 && results[8].data===null,
    }
    return Response.json({passed:Object.values(checks).every(Boolean),checks},{status:Object.values(checks).every(Boolean)?200:500})
  },
}
export default worker
