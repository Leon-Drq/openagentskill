// Browser-only availability information, never an entitlement decision.
export interface PurchaseStatus {
  ready: boolean
  membershipReady: boolean
  owned: boolean
  membership?: 'lifetime' | 'subscription' | null
  reason?: string
}

const unavailable: PurchaseStatus = {
  ready: false, membershipReady: false, owned: false, membership: null, reason: 'payment_maintenance',
}

export async function readPurchaseStatus(slug?: string, signal?: AbortSignal, timeoutMs = 10_000): Promise<PurchaseStatus> {
  signal?.throwIfAborted()
  const controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', cancel, { once: true })
  let onAbort = () => {}
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(controller.signal.reason)
    controller.signal.addEventListener('abort', onAbort, { once: true })
  })
  // Bound both headers and JSON. A stalled response must not leave paid options
  // in their initial loading state, even when a fetch wrapper ignores abort.
  const timeout = setTimeout(() => controller.abort(new Error('purchase_status_timeout')), timeoutMs)
  try {
    const request = async () => {
      const response = await fetch(`/api/payments/status${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, {
        signal: controller.signal, cache: 'no-store',
      })
      if (!response.ok) throw new Error('purchase_status_unavailable')
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object') throw new Error('invalid_purchase_status')
      const value = data as PurchaseStatus
      if (typeof value.ready !== 'boolean' || typeof value.membershipReady !== 'boolean' || typeof value.owned !== 'boolean'
        || (value.membership != null && !['lifetime', 'subscription'].includes(value.membership))
        || (value.reason !== undefined && typeof value.reason !== 'string')) throw new Error('invalid_purchase_status')
      return value.reason === 'payment_maintenance' ? { ...unavailable } : value
    }
    return await Promise.race([request(), aborted])
  } catch (error) {
    if (signal?.aborted) throw error // Unmount/navigation is not a service error.
    return { ...unavailable } // Drop stale ready/owned flags after a failed refresh.
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
    controller.signal.removeEventListener('abort', onAbort)
  }
}
