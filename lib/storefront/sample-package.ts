import type { StoreProduct, StoreLocale } from './catalog'

// Tiny standards-compliant ZIP (stored entries, UTF-8). Contains only first-party
// demonstration text; there are no private assets or commercial deliverables.
export function createSampleZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff
    for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0) }
    return (crc ^ 0xffffffff) >>> 0
  }
  for (const [name, text] of Object.entries(files)) {
    const filename = encoder.encode(name), data = encoder.encode(text), crc = crc32(data)
    const header = new Uint8Array(30), h = new DataView(header.buffer)
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true)
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, filename.length, true)
    const directory = new Uint8Array(46), d = new DataView(directory.buffer)
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x800, true); d.setUint16(14, 33, true)
    d.setUint32(16, crc, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, filename.length, true); d.setUint32(42, offset, true)
    parts.push(header, filename, data); central.push(directory, filename); offset += header.length + filename.length + data.length
  }
  const directorySize = central.reduce((n, part) => n + part.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, Object.keys(files).length, true); e.setUint16(10, Object.keys(files).length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true)
  const result = new Uint8Array(offset + directorySize + 22)
  let cursor = 0
  for (const part of [...parts, ...central, end]) { result.set(part, cursor); cursor += part.length }
  return result
}
export function sampleFiles(product: StoreProduct, locale: StoreLocale, edition: 'basic' | 'full') {
  const note = locale === 'zh' ? '这是 OpenAgentSkill 前端演示示例，不是商业商品或已验证的技能输出。' : 'This is an OpenAgentSkill UI demonstration sample, not a commercial product or verified skill output.'
  return {
    'README.md': `# ${product.title[locale]} — DEMO\n\n${note}\n\nEdition: ${edition}\n\n${product.description[locale]}\n\nInput: ${product.input[locale]}\n\nOutput: ${product.output[locale]}\n\nRunning costs: ${product.runtime[locale]}\n\nRead SKILL.md before use. This sample is for evaluation of the delivery format only. No commercial entitlement is implied.\n`,
    'SKILL.md': `---\nname: ${product.slug}-demo\ndescription: A local demonstration worksheet for ${product.title.en}; not the full commercial workflow.\n---\n\n# Demonstration workflow\n\n${note}\n\n1. Ask the user for the desired outcome and source material.\n2. List available inputs and missing information.\n3. Produce a short outline for: ${product.output.en}\n4. Identify assumptions and ask the user to review the outline.\n\nDo not install dependencies, use credentials, purchase services, or publish anything based on this sample. Do not claim the workflow has been verified.\n`,
  }
}
export function starterPrompt(product: StoreProduct, locale: StoreLocale) {
  return locale === 'zh'
    ? `我下载了 ${product.title.zh} 的本地演示包。请先阅读我提供的 README.md 和 SKILL.md，说明它的作用和限制，再根据我提供的素材拟一份简短方案。不要安装依赖、使用付费服务或发布内容。`
    : `I downloaded a local demonstration package for ${product.title.en}. Read the README.md and SKILL.md I provide, explain its purpose and limits, then draft a short plan from my material. Do not install dependencies, use paid services or publish anything.`
}
