import 'server-only'
import type {ReadDatabase} from './cloudflare-read'
import schema from './cloudflare-schema.json'
import {decodeD1Row} from './cloudflare-values'

// Every decision made before a D1 batch is rechecked inside its transaction.
// Changes to a row or to the matching set cause an atomic rollback and retry.
export async function snapshotD1Rows(db:ReadDatabase,table:keyof typeof schema,where:string,params:unknown[],order='rowid') {
 const columns=Object.keys(schema[table])
 const query=`SELECT json_group_array(json_array(${columns.map(k=>`"${k}"`).join(',')})) value FROM (SELECT * FROM "${table}" WHERE ${where} ORDER BY ${order})`
 const value=String((await db.prepare(query).bind(...params).all()).results[0].value)
 const rows=(JSON.parse(value) as unknown[][]).map(values=>decodeD1Row(Object.fromEntries(columns.map((k,i)=>[k,values[i]])),schema[table]))
 const id=crypto.randomUUID()
 return {rows,check:db.prepare(`INSERT INTO d1_write_guards(id,valid) SELECT ?,CASE WHEN (${query})=? THEN 1 ELSE 0 END`).bind(id,...params,value),
  cleanup:db.prepare('DELETE FROM d1_write_guards WHERE id=?').bind(id)}
}

export function d1Assert(db:ReadDatabase,condition:string,params:unknown[]) {
 const id=crypto.randomUUID()
 return {check:db.prepare(`INSERT INTO d1_write_guards(id,valid) SELECT ?,CASE WHEN ${condition} THEN 1 ELSE 0 END`).bind(id,...params),
  cleanup:db.prepare('DELETE FROM d1_write_guards WHERE id=?').bind(id)}
}
