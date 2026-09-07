'use client'

import { useI18n } from '@/lib/i18n/context'

export function OwnerPublicationNote() {
  const { locale } = useI18n()
  return <div className="rounded-md border border-border bg-background p-4 text-sm leading-6">
    <p className="font-semibold">{locale === 'zh' ? '站点方发布' : 'Published by the site owner'}</p>
    <p className="text-secondary">{locale === 'zh'
      ? '此条目由站点方直接上架，未表示通过 AI 安全审核或运行验证。安装前请查看源码及审查说明。'
      : 'This listing was published directly by the site owner. AI review approval and runtime verification are not implied. Review the source and audit notes before installing.'}</p>
  </div>
}
