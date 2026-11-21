import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler'))('esbuild')
const adapters={
  'next/navigation':'useRouter,usePathname,useSearchParams',
  'next/link':'StaticLink as default,useLinkStatus',
  'next/image':'StaticImage as default',
  'editorial-link':'EditorialLink','creator-menu-profile':'CreatorMenuProfile',
  'nav-user-menu':'NavUserMenu','mobile-nav':'MobileNav','language-switcher':'LanguageSwitcher',
  'github-star-button':'GitHubStarButton','connect-ai-inline':'ConnectAiInline',
}
export async function buildReadonlyHome(buildRoot){
  const adapter=path.resolve('scripts/readonly/home-adapters.tsx').replaceAll('\\','/')
  const outfile=path.resolve(buildRoot,'home.cjs')
  const result=await build({entryPoints:['scripts/readonly/home.tsx'],outfile,bundle:true,platform:'node',format:'cjs',target:'node22',loader:{'.css':'local-css'},metafile:true,logLevel:'warning',plugins:[{name:'offline-home',setup(api){
    api.onResolve({filter:/^(next\/(navigation|link|image))$|(?:^|\/)(editorial-link|creator-menu-profile|nav-user-menu|mobile-nav|language-switcher|github-star-button|connect-ai-inline)$/},args=>{
      if(args.importer===adapter)return
      const key=args.path.startsWith('next/')?args.path:args.path.split('/').at(-1)
      return {path:key,namespace:'offline-home'}
    })
    api.onLoad({filter:/.*/,namespace:'offline-home'},args=>({contents:`export {${adapters[args.path]}} from ${JSON.stringify(adapter)}`,loader:'js',resolveDir:process.cwd()}))
  }}]})
  for(const input of Object.keys(result.metafile.inputs))if(/(?:cloudflare\/|lib\/supabase|lib\/analytics|@opennextjs\/|next\/dist\/)/.test(input))throw new Error('Dynamic runtime must not be part of the static home: '+input)
  const postcss=require('postcss'),tailwind=require('@tailwindcss/postcss')
  const source=await fs.readFile('app/globals.css','utf8')
  const compiled=await postcss([tailwind({base:process.cwd(),optimize:true})]).process(source,{from:path.resolve('app/globals.css')})
  const moduleCss=await fs.readFile(path.resolve(buildRoot,'home.css'),'utf8')
  const behaviorCss=await fs.readFile('components/readonly/home.css','utf8')
  return {render:require(outfile),css:(compiled.css+'\n'+moduleCss+'\n'+behaviorCss).replaceAll('\r\n','\n')}
}
