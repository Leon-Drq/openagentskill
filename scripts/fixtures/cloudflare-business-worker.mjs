import { createClient } from '@supabase/supabase-js'
import { createD1ReadFetch } from '../../lib/db/cloudflare-read.ts'
import { cloudflareAuthHandler } from '../../lib/auth/cloudflare-handler.ts'
import { cloudflareAccountData, cloudflareAccountSession } from '../../lib/auth/cloudflare-account-api.ts'
import { hashPassword } from 'better-auth/crypto'
import { createD1ServiceFetch } from '../../lib/db/cloudflare-service.ts'
import { createD1UserFetch } from '../../lib/db/cloudflare-user-write.ts'
import { createD1PublicFetch } from '../../lib/db/cloudflare-public-write.ts'
import { enqueueIndexNowUrls, drainIndexNowQueue } from '../../lib/indexnow-queue.ts'
import { createIndexNowRequest } from '../../lib/indexnow.ts'
import { readPublishedBlogPost, readPublishedBlogPosts, readPublishedBlogSitemap } from '../../lib/blog/read.ts'

const worker = {
  async fetch(request, env) {
    if (env.BUSINESS_TEST_ONLY !== '1' || !['localhost','127.0.0.1'].includes(new URL(request.url).hostname) || request.method !== 'POST') return new Response('Unavailable',{status:503})
    const db = env.APP_DB
    if (new URL(request.url).pathname==='/blog-check') {
      const client=createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:createD1ReadFetch(db)}})
      await db.batch([
        db.prepare("INSERT INTO blog_posts(slug,skill_id,title,summary,content,published_at) VALUES ('native-article','native-public','Preserved title','Summary','Preserved article body','2026-10-01T00:00:00Z')"),
        db.prepare("INSERT INTO blog_posts(slug,skill_id,title,summary,content,published_at) VALUES ('native-independent','native-private','Independent article','Summary','Public article, private reference','2026-10-02T00:00:00Z')"),
      ])
      const article=await readPublishedBlogPost(client,'native-article'),independent=await readPublishedBlogPost(client,'native-independent')
      const missing=await readPublishedBlogPost(client,'native-missing'),list=await readPublishedBlogPosts(client,2),sitemap=await readPublishedBlogSitemap(client)
      const checks={originalContent:article?.content==='Preserved article body',publicReference:article?.skills?.slug==='native-public',privateReference:independent?.skills===null,missing:missing===null,list:list.length===2,sitemap:sitemap.some(row=>row.slug==='native-article')}
      const passed=Object.values(checks).every(Boolean)
      return Response.json({passed,checks},{status:passed?200:500})
    }
    if (new URL(request.url).pathname==='/indexnow-check') {
      const now=Date.now(),hour=3_600_000,urls=Array.from({length:105},(_,i)=>`https://www.openagentskill.com/skills/native-${i}`)
      const notification=createIndexNowRequest(urls.slice(0,100)),payload=await notification.json()
      const requestCompatible=notification.method==='POST'&&notification.redirect==='manual'&&notification.url==='https://api.indexnow.org/indexnow'&&payload.urlList.length===100
      await enqueueIndexNowUrls(db,urls,now)
      let calls=0
      const failure=async()=>{calls++;return {success:false,status:429,retryAfter:'7200'}}
      const first=await drainIndexNowQueue(db,failure,now)
      const deferred=await drainIndexNowQueue(db,failure,now+hour)
      const recovered=await drainIndexNowQueue(db,async()=>({success:true,status:202}),now+2*hour)
      const final=await drainIndexNowQueue(db,async()=>({success:true,status:200}),now+3*hour)
      const passed=requestCompatible&&calls===1&&first.pending===105&&!deferred.attempted&&recovered.submitted.length===100&&recovered.pending===5&&final.pending===0
      return Response.json({passed,requestCompatible,calls,retained:first.pending,batch:recovered.submitted.length,remaining:final.pending},{status:passed?200:500})
    }
    if (new URL(request.url).pathname==='/account-check') {
      const id='80000000-0000-4000-8000-000000000001',now=new Date().toISOString(),origin=env.AUTH_ORIGIN
      await db.batch([
        db.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)').bind(id,'Native account','native-account@example.invalid',now,now),
        db.prepare("INSERT INTO auth_accounts(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,'credential',?,?,?,?)").bind(crypto.randomUUID(),id,id,await hashPassword('native-account-fixture-password'),now,now),
      ])
      const login=await cloudflareAuthHandler(new Request(origin+'/api/auth/sign-in/email',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.23'},body:JSON.stringify({email:'native-account@example.invalid',password:'native-account-fixture-password'})}),env)
      const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
      const session=await cloudflareAccountSession(new Request(origin+'/api/account/session',{headers:{cookie}}),env)
      const state=await session.json()
      const save=await cloudflareAccountData(new Request(origin+'/api/account/data/bookmarks',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({user_id:id,skill_slug:'native-public'})}),'bookmarks',env)
      const bookmarks=await cloudflareAccountData(new Request(origin+'/api/account/data/bookmarks?select=user_id,skill_slug',{headers:{cookie}}),'bookmarks',env)
      const rows=await bookmarks.json()
      await db.prepare('UPDATE auth_sessions SET expiresAt=? WHERE userId=?').bind(new Date(Date.now()+5*86_400_000).toISOString(),id).all()
      const renewal=await cloudflareAccountSession(new Request(origin+'/api/account/session',{headers:{cookie}}),env)
      const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}})
      const account=client(createD1UserFetch(db,id)),service=client(createD1ServiceFetch(db))
      const profile=await account.from('profiles').upsert({id,display_name:'Native updated',username:'native-stable'})
      const locked=await account.from('profiles').upsert({id,username:'native-renamed'})
      const vote=await account.rpc('set_skill_vote',{target_slug:'native-public',direction:1})
      const counts=await service.rpc('skill_vote_counts',{skill_slugs:['native-public','native-private']})
      const reserved=await service.rpc('commerce_reserve_order',{p_user:id,p_live:false,p_plan:'lifetime',p_slug:null,p_release:null,p_amount:16900,p_customer:'cus_native',p_locale:'en',p_name:'Native fixture',p_price:null})
      const order=reserved.data
      const linked=order?await service.from('commerce_orders').update({stripe_session_id:'cs_native'}).eq('id',order.id).or('stripe_session_id.is.null,stripe_session_id.eq.cs_native').select('id,stripe_session_id,livemode').single():null
      const completed=order?await service.rpc('commerce_complete_order',{p_order:order.id,p_session:'cs_native',p_intent:'pi_native',p_subscription:null,p_paid_at:now}):null
      const paid=order?await service.from('commerce_orders').select('status').eq('id',order.id).single():null
      const publicWriter=client(createD1PublicFetch(db))
      const event=await publicWriter.from('skill_events').insert({skill_slug:'native-public',event_type:'view',metadata:{},source:'web',is_verified:false})
      const eventStats=(await db.prepare("SELECT views FROM skill_event_stats WHERE skill_slug='native-public'").all()).results[0]
      const receipt=await service.rpc('record_skill_download',{p_user_id:id,p_slug:'native-public',p_sha256:'a'.repeat(64),p_kind:'paid-file'})
      const feedback=await publicWriter.rpc('record_agent_feedback',{p_skill_slug:'native-public',p_agent_id:'fixture-native',p_success:true,p_latency_ms:250})
      const score=(await db.prepare("SELECT quality_score FROM skills WHERE slug='native-public'").all()).results[0]
      const outcome=await service.rpc('record_agent_outcome',{p_event_id:'smoke-native-outcome',p_skill_slug:'native-public',p_task:'Local runtime fixture',p_agent:'fixture-native',p_outcome:'success',p_install_used:true,p_metadata:{output_quality:4,used_in_production:true}})
      const outcomeStats=(await db.prepare("SELECT total_outcomes,verified_installs,avg_output_quality FROM agent_outcome_stats WHERE skill_slug='native-public'").all()).results[0]
      const projection=await publicWriter.from('skill_directory_entries').select('slug,logo:product_metadata->>logoUrl',{count:'exact'}).eq('slug','native-public').single()
      const run=await service.rpc('record_indexer_run',{p_server_secret:env.INDEXER_SECRET,p_run:{mode:'native-fixture',metadata:{test:true}}})
      const coverage=await service.rpc('refresh_registry_coverage_stats',{})
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
      await db.prepare("INSERT INTO skill_events_daily(skill_slug,event_date,views) VALUES ('native-public',?,10)").bind(yesterday).all()
      const trending=await service.rpc('get_trending_activity_candidates',{window_end:new Date().toISOString().slice(0,10)})
      const insertedSkill=await service.from('skills').insert({slug:'native-write',name:'Image generation skill',description:'Generate an image',author_name:'Fixture',repository:'https://example.invalid',github_repo:'fixture/native-write',category:'image',license:'MIT',ai_review_approved:true}).select('id,primary_category').single()
      const changedSkill=await service.from('skills').update({name:'Document processing skill',category:'document-processing'}).eq('slug','native-write').select('id,primary_category').single()
      const assertions=(await db.prepare('SELECT count(*) n FROM d1_write_guards').all()).results[0]?.n
      const indexed=await service.rpc('upsert_indexed_skill',{p_server_secret:env.INDEXER_SECRET,p_skill:{slug:'native-indexed',name:'Video fixture skill',description:'Video',author_name:'Fixture',github_repo:'fixture/indexed',repository:'https://example.invalid',category:'video'},p_activity:{metadata:{test:true}}})
      const version=await service.rpc('record_skill_source_version',{p_server_secret:env.INDEXER_SECRET,p_skill_slug:'native-indexed',p_source_content_hash:'a'.repeat(64),p_source_path:'skills/video/SKILL.md',p_license:'MIT',p_metadata:{test:true}})
      const ownerArgs={p_request_id:crypto.randomUUID(),p_skill:{slug:'native-owner',name:'Native owner fixture',description:'A video skill fixture',author_name:'Fixture',repository:'https://github.com/fixture/owner',github_repo:'fixture/owner',category:'video',license:'MIT',version:'1.0',source_path:'SKILL.md',source_commit_sha:'c'.repeat(40),source_content_hash:'d'.repeat(64)},p_reason:'Owner requested local fixture',p_scan:{advisory:true,executed:false}}
      const ownerPublished=await service.rpc('publish_owner_skill',ownerArgs)
      const ownerReplay=await service.rpc('publish_owner_skill',ownerArgs)
      const metadata=await service.rpc('update_skill_product_metadata',{p_request_id:crypto.randomUUID(),p_repository:'fixture/owner',p_path:'SKILL.md',p_metadata:{logoUrl:'https://example.invalid/logo.svg'},p_reason:'Update local fixture logo'})
      const xConnection=await service.rpc('upsert_x_oauth_connection',{p_server_secret:env.INDEXER_SECRET,p_connection:{x_user_id:'native-fixture',username:'fixture',scope:'tweet.read',access_token:'local-fixture-access',refresh_token:'local-fixture-refresh'}})
      const xRead=await service.rpc('get_x_oauth_connection',{p_server_secret:env.INDEXER_SECRET})
      const xQueue=await service.rpc('enqueue_x_content_queue_item',{p_server_secret:env.INDEXER_SECRET,p_item:{skill_slug:'native-owner',post_text:'Local runtime fixture only'}})
      const xClaim=await service.rpc('claim_x_content_queue_item',{p_server_secret:env.INDEXER_SECRET})
      const checks={login:login.status===200,session:state.user?.id===id,profileCreated:(await db.prepare('SELECT id FROM profiles WHERE id=?').bind(id).all()).results.length===1,
        bookmark:save.status===204&&Array.isArray(rows)&&rows.length===1&&rows[0].user_id===id,
        profileSave:!profile.error&&locked.error?.code==='HANDLE_LOCKED',vote:!vote.error&&!counts.error&&counts.data.length===1&&counts.data[0].likes===1,
        commerce:!reserved.error&&!linked?.error&&linked?.data?.livemode===false&&!completed?.error&&paid?.data?.status==='paid',
        telemetry:!event.error&&eventStats?.views===1,download:!receipt.error&&receipt.data===1,
        feedback:!feedback.error&&feedback.data.success===true&&score?.quality_score===33.5,
        outcome:!outcome.error&&outcomeStats?.total_outcomes===1&&outcomeStats?.verified_installs===1&&outcomeStats?.avg_output_quality===4,
        projection:!projection.error&&projection.data?.slug==='native-public'&&projection.data?.logo===null&&projection.count===1,
        background:!run.error&&run.data?.metadata?.test===true&&!coverage.error&&coverage.data?.installable_skills===1&&!trending.error&&trending.data?.[0]?.activity?.views===10,
        catalogWrite:!insertedSkill.error&&!changedSkill.error&&insertedSkill.data?.id===changedSkill.data?.id&&changedSkill.data?.primary_category==='document-processing'&&assertions===0,
        indexer:!indexed.error&&indexed.data?.created===true&&!version.error&&version.data?.changed===false&&version.data?.license_status==='detected',
        publishing:!ownerPublished.error&&ownerPublished.data?.ai_review_approved===false&&!ownerReplay.error&&ownerReplay.data?.replayed===true&&!metadata.error&&metadata.data?.metadata_only===true,
        xAutomation:!xConnection.error&&!xRead.error&&xRead.data?.access_token==='local-fixture-access'&&!xQueue.error&&!xClaim.error&&xClaim.data?.id===xQueue.data?.id,
        renewal:renewal.headers.getSetCookie().some(c=>c.includes('oas.session_token=')),privateCache:renewal.headers.get('cache-control')==='private, no-store'}
      return Response.json({passed:Object.values(checks).every(Boolean),checks},{status:Object.values(checks).every(Boolean)?200:500})
    }
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
