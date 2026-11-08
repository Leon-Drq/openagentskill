import { checkPublicDirectoryCache } from './public-directory-cache-checks.mjs'
const worker = {
  async fetch(request, env) {
    if (env.LOCAL_CACHE_TEST !== '1') return new Response(null, { status: 404 })
    const db = env.TAGS
    await db.prepare('CREATE TABLE IF NOT EXISTS revalidations (tag TEXT PRIMARY KEY,revalidatedAt INTEGER,stale INTEGER,expire INTEGER)').run()
    const cache = await caches.open('oas-directory-native-test')
    const setTag = (tag, v) => db.prepare('INSERT INTO revalidations(tag,revalidatedAt,stale,expire) VALUES (?,?,?,?) ON CONFLICT(tag) DO UPDATE SET revalidatedAt=excluded.revalidatedAt,stale=excluded.stale,expire=excluded.expire')
      .bind(tag, v.revalidatedAt, v.stale, v.expire).run()
    try { return Response.json({ passed: true, ...await checkPublicDirectoryCache({ db, cache, setTag }) }) }
    catch (error) { return Response.json({ passed: false, error: error.stack }, { status: 500 }) }
  },
}
export default worker
