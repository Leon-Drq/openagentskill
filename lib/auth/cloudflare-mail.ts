import 'server-only'
import type {AuthMail} from './cloudflare'

export interface AuthEmailBinding {
 send(message:{from:string;to:string;subject:string;text:string;html:string}):Promise<{messageId:string}>
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))

/** The provider receives only the account email and its first-party action URL.
 * Tokens and recipient addresses are never logged or returned to API callers. */
export function createCloudflareAuthMailer(binding:AuthEmailBinding,origin:string) {
 if(!['https://www.openagentskill.com','https://openagentskill-migration.qudongqi2023.workers.dev'].includes(origin))throw new Error('Invalid mail origin')
 return async(mail:AuthMail)=>{
  const url=new URL(mail.url)
  if(url.origin!==origin||url.username||url.password||!/^\/api\/auth\/(?:verify-email|reset-password(?:\/[^/]+)?)$/.test(url.pathname)
   ||mail.to.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(mail.to)||/[\r\n<>]/.test(mail.to))throw new Error('Invalid authentication mail')
  const verify=mail.purpose==='verify-email'
  const subject=verify?'Verify your OpenAgentSkill email':'Reset your OpenAgentSkill password'
  const action=verify?'Verify email':'Reset password'
  const text=`${subject}\n\n${action}: ${url.toString()}\n\nIf you did not request this, you can ignore this email.\nOpenAgentSkill`
  try{
   const result=await binding.send({from:'noreply@openagentskill.com',to:mail.to,subject,text,
    html:`<h1>${subject}</h1><p><a href="${escape(url.toString())}">${action}</a></p><p>If you did not request this, you can ignore this email.</p><p>OpenAgentSkill</p>`})
   if(!result?.messageId)throw new Error('Missing mail receipt')
  }catch{throw new Error('Authentication email delivery failed')}
 }
}
