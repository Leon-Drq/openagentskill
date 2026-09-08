import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Native behavior (including mobile pickers), with shared single-select geometry. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} data-slot="native-select" className={cn('native-select', className)} />
}
