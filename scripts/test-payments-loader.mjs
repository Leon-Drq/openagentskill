import { resolve as baseResolve } from './test-owner-publication-loader.mjs'
export { load } from './test-owner-publication-loader.mjs'
export function resolve(specifier, context, nextResolve) {
  if (/^next\/(server|headers|cache)$/.test(specifier)) return nextResolve(`${specifier}.js`, context)
  return baseResolve(specifier, context, nextResolve)
}
