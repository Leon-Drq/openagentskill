import 'server-only'

export function encodeD1Value(value:unknown,type:string) {
  if(value===null)return null
  if(type==='bool'){if(typeof value!=='boolean')throw new Error('invalid_boolean');return Number(value)}
  if(['int2','int4','int8','numeric'].includes(type)){
    if(typeof value!=='number'||!Number.isFinite(value)||(type!=='numeric'&&!Number.isSafeInteger(value))
      ||(type==='int2'&&(value< -32768||value>32767))||(type==='int4'&&(value< -2147483648||value>2147483647)))throw new Error('invalid_number')
    return value
  }
  if(type==='jsonb'||type==='_text'){
    if(type==='_text'&&(!Array.isArray(value)||value.some(v=>typeof v!=='string')))throw new Error('invalid_array')
    return JSON.stringify(value)
  }
  if(typeof value!=='string'||value.includes('\0'))throw new Error('invalid_text')
  if(type==='uuid'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw new Error('invalid_id')
  if(type==='timestamptz'){
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value)||!Number.isFinite(new Date(value).getTime()))throw new Error('invalid_date')
    return value.replace(/(?:\.(\d+))?Z$/,(_,digits='')=>`.${digits.padEnd(6,'0')}Z`)
  }
  return value
}
export function decodeD1Row(row:Record<string,unknown>,types:Record<string,string>) {
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v===null?null:types[k]==='bool'?v===1:['jsonb','_text'].includes(types[k])?JSON.parse(String(v)):v]))
}

