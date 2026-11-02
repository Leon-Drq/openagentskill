import 'server-only'
import {isDeepStrictEqual} from 'node:util'
import type {ReadDatabase} from './cloudflare-read'
import {snapshotD1Rows,d1Assert} from './cloudflare-snapshot'
import {prepareD1SkillChange,isD1WriteConflict} from './cloudflare-skill-write'
import {encodeD1Value} from './cloudflare-values'
import {validateEditorialDraft,editorialWeek,type EditorialDraft} from '@/lib/blog/editorial-policy'

const repoPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('invalid_object');return v as Record<string,unknown>}
const reasonValid=(v:unknown)=>typeof v==='string'&&v.trim().length>=10&&v.trim().length<=2000
const nullable=(row:Record<string,unknown>|undefined,key:string)=>row?.[key]??null
const stamp="(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
const ownerFields=['name','description','long_description','author_name','author_url','repository','github_repo','github_stars','github_forks','github_language','github_last_pushed_at','category','tags','frameworks','version','license','install_command']

export async function executeD1PublishingRPC(db:ReadDatabase,name:string,a:Record<string,unknown>):Promise<{handled:boolean;data?:unknown}> {
 if(!['publish_owner_skill','update_skill_product_metadata','publish_seo_editorial'].includes(name))return {handled:false}
 for(let attempt=0;attempt<3;attempt++){
  try {
   if(name==='publish_owner_skill'){
    const id=encodeD1Value(a.p_request_id,'uuid'),p=record(a.p_skill),scan=record(a.p_scan)
    const repo=String(p.github_repo??''),previous=String(p.previous_github_repo??''),path=String(p.source_path??''),hash=String(p.source_content_hash??''),commit=String(p.source_commit_sha??'')
    if(!id||!reasonValid(a.p_reason)||!repoPattern.test(repo)||(previous&&!repoPattern.test(previous))||!/(^|\/)SKILL\.md$/.test(path)||!/^[a-f0-9]{40}$/.test(commit)||!/^[a-f0-9]{64}$/.test(hash)||!/^[a-z0-9][a-z0-9-]{0,149}$/.test(String(p.slug??''))||!p.name||!p.description)throw new Error('invalid_owner_publication')
    const history=await snapshotD1Rows(db,'owner_skill_publications','request_id=?',[id])
    if(history.rows.length){
     const h=history.rows[0]
     if(String(h.github_repo).toLowerCase()!==repo.toLowerCase()||h.source_path!==path||h.source_commit_sha!==commit||h.source_content_hash!==hash||h.reason!==a.p_reason)throw new Error('publication_request_conflict')
     return {handled:true,data:{...record(h.result),replayed:true}}
    }
    const sources=await snapshotD1Rows(db,'skills',"((lower(github_repo)=lower(?) OR lower(github_repo)=lower(?)) AND coalesce(source_path,'SKILL.md')=?) OR (source_content_hash=? AND (ai_review_approved=1 OR listing_status='owner_published'))",[repo,previous,path,hash])
    const sameSource=(r:Record<string,unknown>)=>[repo.toLowerCase(),previous.toLowerCase()].includes(String(r.github_repo).toLowerCase())&&(r.source_path??'SKILL.md')===path
    const ordered=sources.rows.filter(sameSource).sort((x,y)=>Number(y.source_path===path&&y.source_content_hash===hash)-Number(x.source_path===path&&x.source_content_hash===hash)||Number(y.source_path===path)-Number(x.source_path===path)||Number(y.ai_review_approved)-Number(x.ai_review_approved)||String(x.created_at).localeCompare(String(y.created_at)))
    let existing=ordered[0]
    const conflict=sources.rows.find(r=>r.source_content_hash===hash&&(r.ai_review_approved||r.listing_status==='owner_published')&&r.id!==existing?.id)
    let result:Record<string,unknown>|undefined
    if(conflict){existing=conflict;result={slug:existing.slug,status:'duplicate',ai_review_approved:existing.ai_review_approved}}
    const slug=existing?.slug??p.slug,same=Boolean(existing&&existing.source_commit_sha===commit&&existing.source_content_hash===hash)
    const previousReview:Record<string,unknown>=existing?Object.fromEntries(Object.entries({approved:'ai_review_approved',scores:'ai_review_score',issues:'ai_review_issues',suggestions:'ai_review_suggestions',github_repo:'github_repo',author_name:'author_name',author_url:'author_url',source_commit_sha:'source_commit_sha',source_content_hash:'source_content_hash'}).map(([to,from])=>[to,existing[from]])):{}
    if(!result&&same&&(existing.ai_review_approved||existing.listing_status==='owner_published')&&encodeD1Value(p.github_last_pushed_at??null,'timestamptz')===encodeD1Value(existing.github_last_pushed_at,'timestamptz')&&Object.entries(p).filter(([k])=>!['slug','github_last_pushed_at','previous_github_repo'].includes(k)).every(([k,v])=>isDeepStrictEqual(v,existing[k])))result={slug,status:'unchanged',ai_review_approved:existing.ai_review_approved}
    const submissions=await snapshotD1Rows(db,'skill_submissions',"(lower(github_repo)=lower(?) OR lower(github_repo)=lower(?)) AND coalesce(skill_path,'SKILL.md')=?",[repo,previous,path])
    previousReview.submissions=submissions.rows.map(r=>({id:r.id,status:r.status,review:r.ai_review_result}))
    const snapshots=[history,sources,submissions],statements=snapshots.map(s=>s.check)
    if(!result){
     const input:Record<string,unknown>={...Object.fromEntries(ownerFields.map(k=>[k,p[k]??(['tags','frameworks'].includes(k)?[]:null)])),slug,tagline:p.description,
      source_ref:commit,source_path:path,source_commit_sha:commit,source_content_hash:hash,source_sync_status:'current',
      owner_publication:{channel:'owner',published_at:new Date().toISOString(),source_commit_sha:commit,source_content_hash:hash,static_analysis:scan,notice:'Published by the site owner. Automated review approval and runtime verification are not implied.'}}
     if(existing)Object.assign(input,{listing_status:same?existing.listing_status:'owner_published',ai_review_approved:same?existing.ai_review_approved:false,ai_review_score:same?existing.ai_review_score:null})
     else Object.assign(input,{submission_source:'owner',listing_status:'owner_published',ai_review_approved:false,verified:false,publisher_verified:false})
     const change=await prepareD1SkillChange(db,input,existing?'update':'insert','slug')
     statements.push(...change.statements)
     result={slug,status:existing?'updated':'published',ai_review_approved:same?Boolean(existing.ai_review_approved):false,publication_channel:'owner'}
    }
    statements.push(db.prepare('INSERT INTO owner_skill_publications(request_id,skill_slug,github_repo,source_path,source_commit_sha,source_content_hash,reason,previous_review,source_scan,result) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,slug,repo,path,commit,hash,a.p_reason,JSON.stringify(previousReview),JSON.stringify(scan),JSON.stringify(result)),...snapshots.map(s=>s.cleanup))
    await db.batch(statements)
    return {handled:true,data:result}
   }
   if(name==='update_skill_product_metadata'){
    const id=encodeD1Value(a.p_request_id,'uuid'),submissionId=encodeD1Value(a.p_submission_id??null,'uuid'),repo=String(a.p_repository??''),path=String(a.p_path??''),metadata=record(a.p_metadata)
    if(!id||!repoPattern.test(repo)||!/(^|\/)SKILL\.md$/.test(path)||path.length>500||!reasonValid(a.p_reason)||Buffer.byteLength(JSON.stringify(metadata))>32000||Object.entries(metadata).some(([k,v])=>!['websiteUrl','documentationUrl','logoUrl','exampleUrl','prerequisites','runtimeNotes'].includes(k)||typeof v!=='string'))throw new Error('invalid_product_metadata')
    const history=await snapshotD1Rows(db,'skill_product_metadata_changes','request_id=?',[id])
    if(history.rows.length){const h=history.rows[0];if(String(h.github_repo).toLowerCase()!==repo.toLowerCase()||h.source_path!==path||h.submission_id!==submissionId||!isDeepStrictEqual(h.product_metadata,metadata)||h.reason!==a.p_reason)throw new Error('metadata_request_conflict');return {handled:true,data:{...record(h.result),replayed:true}}}
    const submissions=await snapshotD1Rows(db,'skill_submissions','id=?',[submissionId]),sub=submissions.rows[0]
    if(submissionId&&(!sub||String(sub.github_repo).toLowerCase()!==repo.toLowerCase()||sub.skill_path!==path||sub.status==='processing'))throw new Error('submission_identity_conflict')
    const sources=await snapshotD1Rows(db,'skills','lower(github_repo)=lower(?) AND source_path=?',[repo,path])
    const skill=sources.rows.sort((x,y)=>Number(y.id===sub?.skill_id)-Number(x.id===sub?.skill_id)||String(x.created_at).localeCompare(String(y.created_at))||String(x.id).localeCompare(String(y.id)))[0]
    if(!skill&&!sub)throw new Error('source_not_found')
    const result={slug:nullable(skill,'slug'),listing_status:nullable(skill,'listing_status'),ai_review_approved:nullable(skill,'ai_review_approved'),submission_status:nullable(sub,'status'),product_metadata:metadata,metadata_only:true,dry_run:a.p_dry_run===true}
    if(a.p_dry_run===true)return {handled:true,data:result}
    const prior={skill_metadata:nullable(skill,'product_metadata'),submission_metadata:(sub?.validation_result as Record<string,unknown>|null)?.product_metadata??null,listing_status:result.listing_status,ai_review_approved:result.ai_review_approved,submission_status:result.submission_status}
    const snapshots=[history,submissions,sources],statements=snapshots.map(s=>s.check)
    if(skill)statements.push(db.prepare('UPDATE skills SET product_metadata=? WHERE id=?').bind(JSON.stringify(metadata),skill.id))
    if(sub)statements.push(db.prepare('UPDATE skill_submissions SET validation_result=? WHERE id=?').bind(JSON.stringify({...((sub.validation_result??{}) as Record<string,unknown>),product_metadata:metadata}),sub.id))
    statements.push(db.prepare('INSERT INTO skill_product_metadata_changes(request_id,github_repo,source_path,submission_id,skill_id,reason,previous,product_metadata,result) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,repo,path,submissionId,skill?.id??null,a.p_reason,JSON.stringify(prior),JSON.stringify(metadata),JSON.stringify(result)),...snapshots.map(s=>s.cleanup))
    await db.batch(statements);return {handled:true,data:result}
   }
   const id=encodeD1Value(a.p_id,'uuid'),snapshot=await snapshotD1Rows(db,'seo_editorial_queue','id=?',[id]),q=snapshot.rows[0]
   if(!q)throw new Error('editorial_not_found')
   const draft=q.draft as EditorialDraft
   if(q.status==='published')return {handled:true,data:{published:true,slug:draft.slug,duplicate:true}}
   if(!['draft','approved'].includes(String(q.status))||!validateEditorialDraft(draft).passed)throw new Error('editorial_quality_gate')
   let normalized='content'
   for(const char of [' ','\t','\n','\r','\v','\f','\u00a0','\u1680','\u2000','\u2001','\u2002','\u2003','\u2004','\u2005','\u2006','\u2007','\u2008','\u2009','\u200a','\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff'])normalized=`replace(${normalized},char(${char.charCodeAt(0)}),'')`
   const cap=d1Assert(db,'(SELECT count(*) FROM seo_editorial_queue WHERE published_at>=?)<20',[editorialWeek()+'T00:00:00.000000Z'])
   const duplicate=d1Assert(db,`NOT EXISTS(SELECT 1 FROM blog_posts WHERE lower(title)=lower(?) OR ${normalized}=?)`,[draft.title,draft.content.replace(/\s+/g,'')])
   await db.batch([snapshot.check,cap.check,duplicate.check,
    db.prepare(`INSERT INTO blog_posts(slug,title,summary,content,published_at) VALUES (?,?,?,?,${stamp})`).bind(draft.slug,draft.title,draft.summary,draft.content),
    db.prepare(`UPDATE seo_editorial_queue SET status='published',published_at=${stamp} WHERE id=?`).bind(id),snapshot.cleanup,cap.cleanup,duplicate.cleanup])
   return {handled:true,data:{published:true,slug:draft.slug}}
  }catch(e){if(attempt===2||!isD1WriteConflict(e))throw e}
 }
 throw new Error('publication_conflict')
}
