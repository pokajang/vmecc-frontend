export const INSPECTION_SYNC_STATE_EVENT = 'vmecc:inspection-sync-state-changed'
export const INSPECTION_SYNC_CHANNEL = 'vmecc-inspection-sync-v1'

export const notifyInspectionSyncStateChanged = (detail = {}) => {
  try {
    globalThis.window?.dispatchEvent?.(new CustomEvent(INSPECTION_SYNC_STATE_EVENT, { detail }))
  } catch {
    // Same-tab notifications are an optimization; persisted state remains authoritative.
  }
  try {
    const channel = globalThis.BroadcastChannel
      ? new BroadcastChannel(INSPECTION_SYNC_CHANNEL)
      : null
    channel?.postMessage?.({ type: 'state-changed', ...detail })
    channel?.close?.()
  } catch {
    // The storage event and scheduled wake-up remain available.
  }
}
