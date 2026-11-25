'use client'
import Link from 'next/link'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { storeHref } from '@/lib/storefront/catalog'
export function StorefrontEntry({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n()
  if (process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW !== 'true') return null
  const label = locale === 'zh' ? '精选工作流' : 'Workflow store'
  return <Link href={storeHref('',locale)} prefetch={false} aria-label={`${label} · ${locale === 'zh' ? '预览' : 'Preview'}`} className={compact ? 'flex h-9 items-center gap-2 rounded-[8px] border border-[#d2ddc9] bg-[#e8eee3] px-3 text-xs text-[#305539]' : 'inline-flex min-h-11 items-center gap-2 rounded border border-[#d2ddc9] bg-[#e8eee3] px-4 py-2 text-sm text-[#305539]'}><ShoppingBag size={15} /><span className={compact ? 'hidden 2xl:inline' : ''}>{label}</span>{!compact && <ArrowUpRight size={14} />}</Link>
}
