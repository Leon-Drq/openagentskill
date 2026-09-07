// Test-only TypeScript loader. No application/runtime loader configuration changes.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true }
  if (specifier.startsWith('@/') || specifier.startsWith('.')) {
    const url = specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}`, import.meta.url) : new URL(specifier, context.parentURL)
    if (!/\.[cm]?[jt]sx?$/.test(url.pathname)) {
      for (const extension of ['.ts', '.tsx', '.js']) {
        const candidate = new URL(`${url.href}${extension}`)
        if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true }
      }
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
    return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText }
  }
  return nextLoad(url, context)
}
