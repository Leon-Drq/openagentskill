import 'server-only'
import type {ReadDatabase} from './cloudflare-read'

export async function recordD1Download(db:ReadDatabase,name:string,args:Record<string,unknown>) {
  const {p_user_id:user,p_slug:slug,p_kind:kind}=args
  const action=name==='record_skill_download_action'
  const visitor=action?args.p_visitor_key:null,sha=action?null:args.p_sha256
  if(typeof slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)
    ||(action?!['command-copy','external-open'].includes(String(kind)):!['skill-document','paid-file'].includes(String(kind)))
    ||(user!==null&&(typeof user!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(user)))
    ||(action?(user===null?typeof visitor!=='string'||!/^[a-f0-9]{64}$/.test(visitor):visitor!==null):user===null||typeof sha!=='string'||!/^[a-f0-9]{64}$/.test(sha)))throw new Error('invalid_download')
  // The receipt trigger updates totals and the displayed count in the same
  // transaction. Separate user actions remain separate executions, as before.
  const result=await db.batch([
    db.prepare('INSERT INTO skill_download_receipts(user_id,visitor_key,skill_slug,artifact_kind,artifact_sha256) VALUES (?,?,?,?,?)').bind(user,visitor,slug,kind,sha),
    db.prepare('SELECT downloads FROM skill_download_totals WHERE skill_slug=?').bind(slug),
  ])
  if(!result[1].results[0])throw new Error('download_total_missing')
  return result[1].results[0].downloads
}
