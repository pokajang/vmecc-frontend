import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DELAY_MS = 1200

const useWorkflowDraftAutosave = ({
  enabled,
  snapshot,
  saveDraft,
  delayMs = DEFAULT_DELAY_MS,
  errorMessage = 'Your draft could not be saved. Your entries are still on this screen.',
}) => {
  const saveDraftRef = useRef(saveDraft)
  const latestSnapshotRef = useRef(snapshot)
  const lastSavedSnapshotRef = useRef(snapshot)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const mountedRef = useRef(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    saveDraftRef.current = saveDraft
  }, [saveDraft])

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const persist = useCallback(async () => {
    if (!enabled || typeof saveDraftRef.current !== 'function') return false
    if (inFlightRef.current) {
      queuedRef.current = true
      return false
    }

    const targetSnapshot = latestSnapshotRef.current
    if (targetSnapshot === lastSavedSnapshotRef.current) return true

    inFlightRef.current = true
    if (mountedRef.current) {
      setIsSaving(true)
      setError('')
    }
    try {
      const saved = await saveDraftRef.current({ source: 'auto' })
      if (saved === false) throw new Error(errorMessage)
      lastSavedSnapshotRef.current = targetSnapshot
      return true
    } catch (saveError) {
      if (mountedRef.current) setError(saveError?.message || errorMessage)
      return false
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsSaving(false)
      if (queuedRef.current) {
        queuedRef.current = false
        if (latestSnapshotRef.current !== lastSavedSnapshotRef.current) void persist()
      }
    }
  }, [enabled, errorMessage])

  useEffect(() => {
    if (!enabled || snapshot === lastSavedSnapshotRef.current) return undefined
    const timerId = window.setTimeout(() => void persist(), delayMs)
    return () => window.clearTimeout(timerId)
  }, [delayMs, enabled, persist, snapshot])

  useEffect(() => {
    if (!enabled) return undefined
    const flush = () => {
      if (latestSnapshotRef.current !== lastSavedSnapshotRef.current) void persist()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, persist])

  return {
    isSaving,
    error,
    retry: persist,
    feedback: error
      ? {
          kind: 'error',
          title: 'Draft not saved',
          message: error,
          action: { label: 'Retry', onAction: persist, disabled: isSaving },
        }
      : null,
  }
}

export default useWorkflowDraftAutosave
