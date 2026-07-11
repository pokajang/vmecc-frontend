import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getInspectionQueueSummary,
  loadInspectionQueue,
  markInspectionQueueItem,
  removeInspectionQueueItem,
  toQueuedInspectionRecord,
} from 'src/views/inspection/inspectionOfflineQueue'
import { saveInspectionDraft } from 'src/views/inspection/inspectionStorage'
import {
  buildInspectionDraftPayload,
  recordToInspectionForm,
} from 'src/views/inspection/inspectionFormHelpers'
import {
  getNextInspectionSyncAt,
  runInspectionSyncCoordinator,
} from '../domain/sync/inspectionSyncCoordinator'
import {
  INSPECTION_SYNC_CHANNEL,
  INSPECTION_SYNC_STATE_EVENT,
} from '../domain/sync/inspectionSyncEvents'

const useInspectionQueueController = ({
  userId,
  queueSyncLockRef,
  isLoading,
  pushToast,
  reloadRecordsRef,
  setDraftVersion,
  setQueueConflictTarget,
}) => {
  const [queueRows, setQueueRows] = useState([])
  const [isQueueSyncing, setIsQueueSyncing] = useState(false)

  useEffect(() => {
    if (!userId) {
      setQueueRows([])
      return
    }
    setQueueRows(loadInspectionQueue(userId))
  }, [userId])

  const queuedRecordRows = useMemo(() => queueRows.map(toQueuedInspectionRecord), [queueRows])
  const queueSummary = useMemo(() => getInspectionQueueSummary(queueRows), [queueRows])

  const refreshQueueRows = useCallback(() => {
    if (!userId) {
      setQueueRows([])
      return []
    }
    const next = loadInspectionQueue(userId)
    setQueueRows(next)
    return next
  }, [userId])

  const syncQueuedSubmissions = useCallback(
    async ({ silent = false, force = false, queueId = '' } = {}) => {
      if (!userId || queueSyncLockRef.current) return []
      queueSyncLockRef.current = true
      setIsQueueSyncing(true)
      try {
        const cycle = await runInspectionSyncCoordinator({ userId, force, queueId })
        const results = cycle.generalResults || []
        const syncedCount = results.filter((row) => row.synced).length
        const failedCount = results.filter((row) => !row.synced).length
        const conflictCount = results.filter((row) => row.conflict).length
        refreshQueueRows()
        if (syncedCount > 0) {
          await reloadRecordsRef.current?.()
          if (!silent) {
            pushToast(`${syncedCount} queued inspection report synced.`, {
              title: 'Queue synced',
              color: 'success',
            })
          }
        } else if (conflictCount > 0 && !silent) {
          pushToast('Queued inspection report has a version conflict to resolve.', {
            title: 'Sync conflict',
            color: 'warning',
          })
        } else if (failedCount > 0 && !silent) {
          pushToast('Queued inspection report could not sync yet. It will remain queued.', {
            title: 'Sync failed',
            color: 'warning',
          })
        }
        return results
      } finally {
        queueSyncLockRef.current = false
        setIsQueueSyncing(false)
        refreshQueueRows()
      }
    },
    [pushToast, queueSyncLockRef, refreshQueueRows, reloadRecordsRef, userId],
  )

  useEffect(() => {
    if (!userId) return undefined
    let timerId = null
    let cancelled = false
    let channel = null
    const schedule = () => {
      if (cancelled) return
      if (timerId) window.clearTimeout(timerId)
      const nextAt = getNextInspectionSyncAt(userId)
      if (nextAt === null) return
      const delay = Math.max(250, Math.min(30 * 60 * 1000, nextAt - Date.now()))
      timerId = window.setTimeout(async () => {
        await syncQueuedSubmissions({ silent: true })
        schedule()
      }, delay)
    }
    const runNow = async ({ force = false, silent = true } = {}) => {
      await syncQueuedSubmissions({ silent, force })
      schedule()
    }
    const handleOnline = () => runNow({ force: true, silent: false })
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') runNow({ silent: true })
    }
    const handleStateChange = (event) => {
      if (event?.detail?.userId && String(event.detail.userId) !== String(userId)) return
      schedule()
    }
    runNow({ silent: true })
    window.addEventListener('online', handleOnline)
    window.addEventListener(INSPECTION_SYNC_STATE_EVENT, handleStateChange)
    document.addEventListener('visibilitychange', handleVisibility)
    try {
      channel = globalThis.BroadcastChannel ? new BroadcastChannel(INSPECTION_SYNC_CHANNEL) : null
      channel?.addEventListener?.('message', schedule)
    } catch {
      channel = null
    }
    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(INSPECTION_SYNC_STATE_EVENT, handleStateChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      channel?.close?.()
    }
  }, [isLoading, queueSummary.count, syncQueuedSubmissions, userId])

  const deleteQueuedSubmission = useCallback(
    (row) => {
      if (!userId || !row?.queueId) return
      markInspectionQueueItem(userId, row.queueId, {
        historyEvent: {
          action: 'deleted',
          message: 'Queued inspection deleted locally.',
          status: row.queueStatus || row.status || 'queued',
          attempts: row.attempts || 0,
        },
      })
      removeInspectionQueueItem(userId, row.queueId)
      refreshQueueRows()
      pushToast('Queued inspection removed.', { title: 'Queue updated', color: 'info' })
    },
    [pushToast, refreshQueueRows, userId],
  )

  const saveQueuedAsDraft = useCallback(
    async (row) => {
      if (!userId || !row) return
      const editReportId =
        row.operation === 'update'
          ? String(row.sourceReportUid || row.baseServerSnapshot?.id || '')
          : ''
      const payload = buildInspectionDraftPayload({
        form: recordToInspectionForm({
          ...row,
          id: editReportId || row.id,
        }),
        mode: editReportId ? 'edit' : 'new',
        editReportId,
      })
      const result = await saveInspectionDraft(userId, payload)
      if (result?.saved) {
        if (row.queueId) {
          markInspectionQueueItem(userId, row.queueId, {
            historyEvent: {
              action: 'saved_as_draft',
              message: 'Queued inspection saved as a local draft.',
              status: row.queueStatus || row.status || 'queued',
              attempts: row.attempts || 0,
            },
          })
          removeInspectionQueueItem(userId, row.queueId)
        }
        refreshQueueRows()
        setQueueConflictTarget(null)
        setDraftVersion((prev) => prev + 1)
        pushToast('Queued inspection saved as draft.', { title: 'Draft saved', color: 'success' })
      } else {
        pushToast('Unable to save queued inspection as draft.', {
          title: 'Draft save failed',
          color: 'danger',
        })
      }
    },
    [pushToast, refreshQueueRows, setDraftVersion, setQueueConflictTarget, userId],
  )

  const keepServerConflict = useCallback(
    (row) => {
      if (!userId || !row?.queueId) return
      markInspectionQueueItem(userId, row.queueId, {
        historyEvent: {
          action: 'deleted',
          message: 'Server version kept and local queued edit removed.',
          status: row.queueStatus || row.status || 'conflict',
          attempts: row.attempts || 0,
        },
      })
      removeInspectionQueueItem(userId, row.queueId)
      refreshQueueRows()
      setQueueConflictTarget(null)
      pushToast('Server version kept. Queued local edit removed.', {
        title: 'Conflict resolved',
        color: 'info',
      })
    },
    [pushToast, refreshQueueRows, setQueueConflictTarget, userId],
  )

  const retryConflictWithLatest = useCallback(
    async (row) => {
      if (!userId || !row?.queueId) return
      const server = row.conflictServerSnapshot || {}
      const serverStatus = String(server.status || '').trim()
      if (!['Draft', 'Submitted', 'Rejected'].includes(serverStatus)) {
        pushToast(
          'This server report is no longer editable. Save the local edit as a draft instead.',
          {
            title: 'Retry blocked',
            color: 'warning',
          },
        )
        return
      }
      markInspectionQueueItem(userId, row.queueId, {
        status: 'queued',
        baseVersion: Number(server.version || 0) || row.baseVersion,
        baseRevision: Number(server.revision || 0) || row.baseRevision,
        conflictServerSnapshot: server,
        resolutionStatus: 'retry_with_latest',
        lastError: '',
        historyEvent: {
          action: 'manual_retry',
          message: 'Conflict retry requested with latest server version.',
          status: 'queued',
          attempts: row.attempts || 0,
        },
        record: {
          ...row,
          id: String(row.sourceReportUid || server.id || '').trim(),
          version: Number(server.version || 0) || row.version,
          revision: Number(server.revision || 0) || row.revision,
          status: row.status === 'Draft' ? 'Draft' : 'Submitted',
        },
      })
      setQueueConflictTarget(null)
      refreshQueueRows()
      await syncQueuedSubmissions({ silent: false, force: true })
    },
    [pushToast, refreshQueueRows, setQueueConflictTarget, syncQueuedSubmissions, userId],
  )

  return {
    queueRows,
    queuedRecordRows,
    queueSummary,
    isQueueSyncing,
    refreshQueueRows,
    syncQueuedSubmissions,
    deleteQueuedSubmission,
    saveQueuedAsDraft,
    keepServerConflict,
    retryConflictWithLatest,
  }
}

export default useInspectionQueueController
