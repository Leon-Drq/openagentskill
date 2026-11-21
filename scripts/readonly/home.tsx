import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {HomePage} from '@/components/home-page'
import {I18nProvider} from '@/lib/i18n/context'
import type {Locale} from '@/lib/i18n/config'
import type {BrowseSkill} from '@/lib/readonly/types'
import {getGitHubOwner} from '@/lib/github-owner'

/** Render the owner's unchanged page composition, rather than a second homepage. */
export function homeBody(locale:Locale,rows:BrowseSkill[],ranked:BrowseSkill[],capturedAt:string){
  const featuredSkills=ranked.slice(0,10).map((row,index)=>({slug:row.slug,name:row.name,description:row.description,
    github_stars:row.stars||0,downloads:row.downloads||0,rank:index+1,badge:'',reason:row.description,
    category:row.category,github_repo:row.repository||'',github_owner:getGitHubOwner({github_repo:row.repository}),author_name:row.author||null}))
  return renderToStaticMarkup(<I18nProvider initialLocale={locale}><HomePage initialLocale={locale} readOnly stats={{
    totalSkills:rows.length,totalSkillsExact:false,totalSkillsAsOf:capturedAt.slice(0,10),dataPaused:true,
    totalVerifiedInstalls:0,totalOutcomes:0,provenSkills:0,evidenceExact:false,
    discoveredProjects:null,validatedSkills:null,coverageExact:false,coverageUpdatedAt:capturedAt,
  }} activities={[]} featuredSkills={featuredSkills} rankingGeneratedAt={capturedAt} rankingSource="saved-directory"/></I18nProvider>)
}
