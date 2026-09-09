// Next's Data Cache has a 2 MB item ceiling. Preserve source/risk evidence
// losslessly, with room for the cache envelope, instead of dropping fields.
// Use Web Streams: this data module is also imported by Edge OG routes.
export const PACKED_CACHE_MAX_BYTES = 1_500_000
export const PACKED_CACHE_MAX_RAW_BYTES = 16_000_000

async function readBounded(stream: ReadableStream<Uint8Array>, limit: number, label: string) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel().catch(() => undefined)
        throw new Error(`Directory cache ${label} payload exceeds budget`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

export async function packCacheJson(value: unknown): Promise<string> {
  const json = JSON.stringify(value)
  if (typeof json !== 'string') throw new Error('Directory cache requires JSON data')
  const raw = new TextEncoder().encode(json)
  if (raw.byteLength > PACKED_CACHE_MAX_RAW_BYTES) throw new Error('Directory cache raw payload exceeds budget')
  const stream = new Response(raw).body!.pipeThrough(new CompressionStream('gzip'))
  const compressed = await readBounded(stream, Math.floor(PACKED_CACHE_MAX_BYTES * 3 / 4), 'packed')
  const chunks: string[] = []
  for (let i = 0; i < compressed.length; i += 32768) chunks.push(String.fromCharCode(...compressed.subarray(i, i + 32768)))
  const packed = btoa(chunks.join(''))
  if (packed.length > PACKED_CACHE_MAX_BYTES) throw new Error('Directory cache packed payload exceeds budget')
  return packed
}

export async function unpackCacheJson<T>(packed: string): Promise<T> {
  if (packed.length > PACKED_CACHE_MAX_BYTES) throw new Error('Directory cache packed payload exceeds budget')
  const raw = Uint8Array.from(atob(packed), char => char.charCodeAt(0))
  const stream = new Response(raw).body!.pipeThrough(new DecompressionStream('gzip'))
  const json = await readBounded(stream, PACKED_CACHE_MAX_RAW_BYTES, 'raw')
  return JSON.parse(new TextDecoder().decode(json)) as T
}
