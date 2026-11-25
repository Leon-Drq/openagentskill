'use client'
export default function StoreError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl">Preview couldn’t load / 预览加载失败</h1><p className="my-5">Please try again. 请重试。</p><button className="rounded border px-5 py-3" onClick={reset}>Try again / 重试</button></main>
}
