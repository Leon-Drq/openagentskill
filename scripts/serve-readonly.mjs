import {unstable_dev} from 'wrangler'
process.env.WRANGLER_SEND_METRICS='false'
const worker=await unstable_dev('cloudflare/readonly-worker.mjs',{config:'wrangler.readonly.jsonc',local:true,ip:'127.0.0.1',port:8891,inspectorPort:0,logLevel:'error',experimental:{disableExperimentalWarning:true}})
console.log('Read-only preview: http://127.0.0.1:8891')
const stop=async()=>{await worker.stop();process.exit(0)}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
