import Link from 'next/link'
export default function StoreNotFound() {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl">Workflow not found / 未找到工作流</h1><p className="my-5">This preview may be unavailable. 此预览可能尚未开放。</p><Link className="underline" href="/skills">Browse skills / 浏览技能</Link></main>
}
