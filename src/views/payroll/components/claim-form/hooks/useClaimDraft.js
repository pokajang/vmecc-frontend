import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  enqueuePayrollDraftRetry,
  sanitizePayrollDraftPayloadForStorage,
  saveMyPayrollClaimDraftApiFirst,
} from 'src/services/payrollClaimsApi'
import {
  API_AUTOSAVE_DELAY_MS,
  API_AUTOSAVE_MAX_BACKOFF_MS,
  API_AUTOSAVE_MAX_RETRIES,
  API_AUTOSAVE_RETRY_BASE_MS,
  LOCAL_AUTOSAVE_DELAY_MS,
  formatSyncTime,
} from '../utils/claimFormUtils'

const useClaimDraft = ({
  hasHydratedDraftRef,
  currentSnapshot,
  initialSnapshot,
  buildDraftPayload,
  buildSnapshot,
  activeDraftId,
  setActiveDraftId,
  activeDraftBackendId,
  setActiveDraftBackendId,
  localAutosaveKey,
  draftType,
  userId,
  savedItems,
  navGuardKey,
  navGuardMessage,
  registerGuard,
  unregisterGuard,
  pushToast,
  saveDraftSuccessMessage,
  suppressAutosave = false,
}) => {
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(initialSnapshot)
  const [draftSyncState, setDraftSyncState] = useState('idle')
  const [draftSyncRetryCount, setDraftSyncRetryCount] = useState(0)
  const [draftSyncedAt, setDraftSyncedAt] = useState('')
  const isApiAutosaveInFlightRef = useRef(false)
  const hasUnsavedChangesRef = useRef(false)
  const autosaveRetryTimerRef = useRef(null)

  const hasUnsavedChanges = currentSnapshot !== lastSavedSnapshot
  const isClaimTypeLocked = Boolean(activeDraftId) || savedItems.length > 0

  const draftSyncSummary = useMemo(() => {
    if (draftSyncState === 'saving') return 'Draft sync: Saving...'
    if (draftSyncState === 'saved') {
      const timeLabel = formatSyncTime(draftSyncedAt)
      return timeLabel ? `Draft sync: Saved at ${timeLabel}` : 'Draft sync: Saved'
    }
    if (draftSyncState === 'error') {
      return draftSyncRetryCount > 0
        ? `Draft sync: Retry ${draftSyncRetryCount}/${API_AUTOSAVE_MAX_RETRIES} pending...`
        : 'Draft sync: Not synced. Retrying...'
    }
    return hasUnsavedChanges ? 'Draft sync: Pending changes' : 'Draft sync: Up to date'
  }, [draftSyncRetryCount, draftSyncState, draftSyncedAt, hasUnsavedChanges])

  const writeLocalBackup = useCallback(
    (payload) => {
      try {
        const redactedPayload = sanitizePayrollDraftPayloadForStorage(payload, draftType)
        localStorage.setItem(
          localAutosaveKey,
          JSON.stringify({
            ...redactedPayload,
            claimType: draftType,
          }),
        )
      } catch {
        // ignore storage errors
      }
    },
    [draftType, localAutosaveKey],
  )

  const saveDraft = useCallback(
    async ({
      showNotice = true,
      showErrorNotice = true,
      payloadOverride = null,
      syncSource = 'manual',
    } = {}) => {
      const payload =
        payloadOverride && typeof payloadOverride === 'object'
          ? payloadOverride
          : buildDraftPayload()
      setDraftSyncState('saving')
      const apiResult = await saveMyPayrollClaimDraftApiFirst(userId, draftType, payload, {
        keepalive: syncSource === 'flush',
      })
      if (!apiResult?.ok || !apiResult?.data) {
        setDraftSyncState('error')
        enqueuePayrollDraftRetry(userId, draftType, payload)
        if (showErrorNotice) {
          pushToast('Unable to save draft to backend. Please retry.', {
            title: 'Draft not saved',
            color: 'danger',
          })
        }
        if (syncSource !== 'auto') {
          writeLocalBackup(payload)
        }
        return null
      }
      setDraftSyncState('saved')
      setDraftSyncRetryCount(0)
      setDraftSyncedAt(new Date().toISOString())
      setLastSavedSnapshot(buildSnapshot(payload))
      const backendId = Number(apiResult.data.backendId || 0) || null
      if (backendId) setActiveDraftBackendId(backendId)
      if (apiResult.data.id) {
        setActiveDraftId(apiResult.data.id)
      } else if (!activeDraftId) {
        setActiveDraftId(payload.id)
      }
      if (showNotice) {
        pushToast(saveDraftSuccessMessage, {
          title: 'Draft saved',
          color: 'success',
        })
      }
      return apiResult.data
    },
    [
      activeDraftId,
      buildDraftPayload,
      buildSnapshot,
      draftType,
      pushToast,
      saveDraftSuccessMessage,
      setActiveDraftBackendId,
      setActiveDraftId,
      userId,
      writeLocalBackup,
    ],
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined
    if (process.env.NODE_ENV !== 'production') return undefined
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    registerGuard(navGuardKey, {
      active: hasUnsavedChanges,
      message: navGuardMessage,
    })
  }, [hasUnsavedChanges, navGuardKey, navGuardMessage, registerGuard])

  useEffect(
    () => () => {
      unregisterGuard(navGuardKey)
    },
    [navGuardKey, unregisterGuard],
  )

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return
    if (suppressAutosave) return
    if (!hasUnsavedChanges) {
      try {
        localStorage.removeItem(localAutosaveKey)
      } catch {
        // ignore storage errors
      }
      return
    }
    const timer = window.setTimeout(() => {
      writeLocalBackup(buildDraftPayload())
    }, LOCAL_AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [
    buildDraftPayload,
    hasHydratedDraftRef,
    hasUnsavedChanges,
    localAutosaveKey,
    suppressAutosave,
    writeLocalBackup,
  ])

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return undefined
    if (suppressAutosave) {
      setDraftSyncState('idle')
      setDraftSyncRetryCount(0)
      if (autosaveRetryTimerRef.current) {
        window.clearTimeout(autosaveRetryTimerRef.current)
        autosaveRetryTimerRef.current = null
      }
      return undefined
    }
    if (!hasUnsavedChanges) {
      setDraftSyncState('idle')
      setDraftSyncRetryCount(0)
      if (autosaveRetryTimerRef.current) {
        window.clearTimeout(autosaveRetryTimerRef.current)
        autosaveRetryTimerRef.current = null
      }
      return undefined
    }
    let cancelled = false
    let attempt = 0

    const runSave = () => {
      const delay =
        attempt === 0
          ? API_AUTOSAVE_DELAY_MS
          : Math.min(API_AUTOSAVE_MAX_BACKOFF_MS, API_AUTOSAVE_RETRY_BASE_MS * 2 ** (attempt - 1))
      autosaveRetryTimerRef.current = window.setTimeout(async () => {
        if (cancelled || !hasUnsavedChangesRef.current) return
        if (isApiAutosaveInFlightRef.current) {
          attempt += 1
          setDraftSyncRetryCount(attempt)
          if (attempt <= API_AUTOSAVE_MAX_RETRIES) runSave()
          return
        }
        isApiAutosaveInFlightRef.current = true
        const payload = buildDraftPayload()
        try {
          const saved = await saveDraft({
            showNotice: false,
            showErrorNotice: false,
            payloadOverride: payload,
            syncSource: 'auto',
          })
          if (saved) {
            setDraftSyncRetryCount(0)
            return
          }
          attempt += 1
          setDraftSyncRetryCount(attempt)
          if (attempt <= API_AUTOSAVE_MAX_RETRIES) {
            runSave()
          } else {
            writeLocalBackup(payload)
          }
        } finally {
          isApiAutosaveInFlightRef.current = false
        }
      }, delay)
    }

    runSave()
    return () => {
      cancelled = true
      if (autosaveRetryTimerRef.current) {
        window.clearTimeout(autosaveRetryTimerRef.current)
        autosaveRetryTimerRef.current = null
      }
    }
  }, [
    buildDraftPayload,
    currentSnapshot,
    hasHydratedDraftRef,
    hasUnsavedChanges,
    saveDraft,
    suppressAutosave,
    writeLocalBackup,
  ])

  useEffect(() => {
    if (suppressAutosave) return undefined
    const flushDraftNow = () => {
      if (!hasHydratedDraftRef.current || !hasUnsavedChangesRef.current) return
      const payload = buildDraftPayload()
      writeLocalBackup(payload)
      if (isApiAutosaveInFlightRef.current) return
      void saveDraft({
        showNotice: false,
        showErrorNotice: false,
        payloadOverride: payload,
        syncSource: 'flush',
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraftNow()
      }
    }

    window.addEventListener('pagehide', flushDraftNow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushDraftNow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [buildDraftPayload, hasHydratedDraftRef, saveDraft, suppressAutosave, writeLocalBackup])

  return {
    hasUnsavedChanges,
    isClaimTypeLocked,
    draftSyncSummary,
    saveDraft,
    writeLocalBackup,
    setLastSavedSnapshot,
  }
}

export default useClaimDraft
