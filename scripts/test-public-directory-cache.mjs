import { checkPublicDirectoryCache } from './fixtures/public-directory-cache-checks.mjs'
const tags = new Map(), entries = new Map()
const db = { prepare: () => ({ bind: (...keys) => ({ all: async () => ({ results: keys.filter(key => tags.has(key)).map(key => ({ tag: key, ...tags.get(key) })) }) }) }) }
const cache = { match: async key => entries.get(key.url)?.clone(), put: async (key, value) => { entries.set(key.url, new Response(await value.arrayBuffer(), value)) } }
console.log(await checkPublicDirectoryCache({ db, cache, setTag: async (tag, value) => { tags.set(tag, value) } }))
