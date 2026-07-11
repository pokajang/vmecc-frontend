import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import featureFlags from 'src/config/featureFlags'
import {
  completeInspectionSessionExtinguisher,
  createOrResumeInspectionSession,
  fetchInspectionSession,
  fetchInspectionSessionProgress,
  fetchInspectionSessionResults,
  getFireExtinguisherAssetKey,
  resetInspectionSessionExtinguisher,
} from '../../domain/api/inspectionSessionApi'
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  FIRE_EXTINGUISHER_INSPECTION_TYPE,
  getFireExtinguisherRowWorkflowState,
  isFireExtinguisherInspectionType,
} from '../../types/fire-extinguisher/helpers'
import {
  createFireExtinguisherSessionOperationId,
  enqueueFireExtinguisherSessionRetry,
  isFireExtinguisherSessionRetryableError,
  loadFireExtinguisherSessionRetryQueue,
  persistFireExtinguisherSessionOperation,
  rebaseFollowingFireExtinguisherOperations,
  removeFireExtinguisherSessionRetry,
} from './fireExtinguisherSessionRetryQueue'
import { normalizeInspectionApiError } from '../../domain/api/inspectionApiError'
import {
  getNextInspectionSyncAt,
  runInspectionSyncCoordinator,
} from '../../domain/sync/inspectionSyncCoordinator'
import { INSPECTION_SYNC_STATE_EVENT } from '../../domain/sync/inspectionSyncEvents'

const text = (value) => String(value || '').trim()

const mapSessionResults = (rows = []) => {
  const byKey = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const keys = [
      text(row?.canonicalAssetKey),
      text(row?.catalogId || row?.fireExtinguisherId)
        ? `catalog:${row.catalogId || row.fireExtinguisherId}`
        : '',
    ].filter(Boolean)
    keys.forEach((key) => byKey.set(key, row))
  })
  return byKey
}

const buildSessionCheckPatch = (checkPayload = {}) => {
  if (!checkPayload || typeof checkPayload !== 'object') return {}
  return FIRE_EXTINGUISHER_CHECK_FIELDS.reduce(
    (patch, field) => ({
      ...patch,
      [field.key]: text(checkPayload[field.key]),
      [field.remarksKey]: text(checkPayload[field.remarksKey]),
      [field.photosKey]: Array.isArray(checkPayload[field.photosKey])
        ? checkPayload[field.photosKey]
        : [],
    }),
    {
      remarks: text(checkPayload.remarks),
      photos: Array.isArray(checkPayload.photos) ? checkPayload.photos : [],
    },
  )
}

const useFireExtinguisherSessionSync = ({
  enabled = true,
  inspectionType = FIRE_EXTINGUISHER_INSPECTION_TYPE,
  formInspectionSessionUid = '',
  inspectedAt = '',
  zone = '',
  mainLocation = '',
  subLocation = '',
  visibleRows = [],
  currentUserId = '',
  pushToast,
} = {}) => {
  const [session, setSession] = useState(null)
  const [results, setResults] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const [pendingRetryCount, setPendingRetryCount] = useState(0)
  const [pendingRetryAssetKeys, setPendingRetryAssetKeys] = useState([])
  const [activeSyncCount, setActiveSyncCount] = useState(0)
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0)
  const syncingKeysRef = useRef(new Set())
  const autoCompletedKeysRef = useRef(new Set())
  const locallyResetAssetKeysRef = useRef(new Set())
  const retryingQueueRef = useRef(false)
  const forceNewSessionRef = useRef(false)
  const previousFormSessionUidRef = useRef(text(formInspectionSessionUid))
  const sessionEnabled =
    enabled &&
    featureFlags.inspectionSessionFireExtinguisherEnabled &&
    isFireExtinguisherInspectionType(inspectionType)
  const resultByKey = useMemo(() => mapSessionResults(results), [results])
  const pendingRetryKeySet = useMemo(
    () =>
      new Set((Array.isArray(pendingRetryAssetKeys) ? pendingRetryAssetKeys : []).filter(Boolean)),
    [pendingRetryAssetKeys],
  )
  const hasVisibleScope = text(zone) !== '' || text(mainLocation) !== ''
  const currentUserIdKey = text(currentUserId)
  const normalizedFormInspectionSessionUid = text(formInspectionSessionUid)
  const inspectionDate = text(inspectedAt).slice(0, 10)
  const shouldPreferSessionResult = useCallback(
    (sessionResult = {}) => {
      if (sessionResult?.status !== 'completed') return false
      const checkedByUserId = text(
        sessionResult?.checkedByUserId || sessionResult?.checked_by_user_id,
      )
      return Boolean(currentUserIdKey && checkedByUserId && checkedByUserId !== currentUserIdKey)
    },
    [currentUserIdKey],
  )

  const applySessionMeta = useCallback((nextMeta) => {
    if (!nextMeta) return
    setMeta((currentMeta) => {
      const currentVersion = Math.max(0, Number(currentMeta?.sessionVersion || 0) || 0)
      const nextVersion = Math.max(0, Number(nextMeta?.sessionVersion || 0) || 0)
      return currentVersion > nextVersion ? currentMeta : nextMeta
    })
  }, [])

  const clearSessionState = useCallback(() => {
    syncingKeysRef.current.clear()
    setActiveSyncCount(0)
    autoCompletedKeysRef.current.clear()
    locallyResetAssetKeysRef.current.clear()
    setSession(null)
    setResults([])
    setMeta(null)
    setError(null)
    setSessionError(null)
    setIsHydrating(false)
    setPendingRetryCount(0)
    setPendingRetryAssetKeys([])
  }, [])

  const retrySession = useCallback(() => {
    setError(null)
    setSessionError(null)
    setSessionRefreshKey((current) => current + 1)
  }, [])

  const refreshPendingRetryCount = useCallback(() => {
    if (!session?.sessionUid) {
      setPendingRetryCount(0)
      setPendingRetryAssetKeys([])
      return 0
    }
    const queuedRows = loadFireExtinguisherSessionRetryQueue({
      userId: currentUserIdKey,
      sessionUid: session.sessionUid,
    })
    const assetKeys = Array.from(
      new Set(queuedRows.map((item) => text(item?.assetKey)).filter(Boolean)),
    )
    setPendingRetryCount(queuedRows.length)
    setPendingRetryAssetKeys(assetKeys)
    return queuedRows.length
  }, [currentUserIdKey, session?.sessionUid])

  const mergeSessionStatus = useCallback(
    (rows = []) =>
      (Array.isArray(rows) ? rows : []).map((row) => {
        const assetKey = getFireExtinguisherAssetKey(row)
        const sessionResult = assetKey ? resultByKey.get(assetKey) : null
        const isSyncPending = assetKey ? pendingRetryKeySet.has(assetKey) : false
        if (assetKey && locallyResetAssetKeysRef.current.has(assetKey)) {
          return {
            ...row,
            ...buildSessionCheckPatch({}),
            sessionResult: null,
            sessionStatus: '',
            sessionCheckedBy: '',
            sessionCheckedAt: null,
            sessionResultVersion: null,
            sessionSyncPending: false,
          }
        }
        const checkPayload =
          sessionResult?.checkPayload && typeof sessionResult.checkPayload === 'object'
            ? sessionResult.checkPayload
            : {}
        if (!sessionResult && !isSyncPending) return row

        const sessionDecorations = {
          sessionResult: sessionResult || row?.sessionResult || null,
          sessionStatus:
            sessionResult?.status || (isSyncPending ? 'sync_pending' : row?.sessionStatus),
          sessionCheckedBy: sessionResult?.checkedBy || row?.sessionCheckedBy || '',
          sessionCheckedAt: sessionResult?.checkedAt || row?.sessionCheckedAt || null,
          sessionResultVersion: sessionResult?.version ?? row?.sessionResultVersion,
          sessionSyncPending: isSyncPending,
        }
        if (!sessionResult) {
          return {
            ...row,
            ...sessionDecorations,
          }
        }
        return shouldPreferSessionResult(sessionResult)
          ? {
              ...row,
              ...buildSessionCheckPatch(checkPayload),
              ...sessionDecorations,
            }
          : {
              ...buildSessionCheckPatch(checkPayload),
              ...row,
              ...sessionDecorations,
            }
      }),
    [pendingRetryKeySet, resultByKey, shouldPreferSessionResult],
  )

  const refreshResults = useCallback(async () => {
    if (!sessionEnabled || !session?.sessionUid || !hasVisibleScope) {
      setResults([])
      if (!hasVisibleScope) setMeta(null)
      return null
    }
    try {
      const response = await fetchInspectionSessionResults({
        sessionUid: session.sessionUid,
        zone,
        mainLocation,
      })
      setResults(response.rows)
      applySessionMeta(response.meta)
      setError(null)
      return response
    } catch (nextError) {
      setError(nextError)
      return null
    }
  }, [applySessionMeta, hasVisibleScope, mainLocation, session?.sessionUid, sessionEnabled, zone])

  const refreshProgressContext = useCallback(async () => {
    if (!sessionEnabled || !session?.sessionUid) return null
    try {
      const progress = await fetchInspectionSessionProgress({ sessionUid: session.sessionUid })
      applySessionMeta(progress)
      setError(null)
      return progress
    } catch (nextError) {
      setError(nextError)
      return null
    }
  }, [applySessionMeta, session?.sessionUid, sessionEnabled])

  useEffect(() => {
    if (!sessionEnabled) {
      clearSessionState()
      return undefined
    }
    if (!hasVisibleScope) {
      setResults([])
      setMeta(null)
      setIsHydrating(false)
      return undefined
    }
    let cancelled = false
    setIsHydrating(true)
    const shouldResumeFormSession =
      normalizedFormInspectionSessionUid && !forceNewSessionRef.current
    const sessionRequest = shouldResumeFormSession
      ? fetchInspectionSession({ sessionUid: normalizedFormInspectionSessionUid })
      : createOrResumeInspectionSession({
          inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
          forceNew: forceNewSessionRef.current,
          scope:
            featureFlags.inspectionSessionScopeV2Enabled && inspectionDate
              ? { scopeVersion: 'v2', inspectionDate }
              : null,
        })
    sessionRequest
      .then((nextSession) => {
        if (cancelled) return
        forceNewSessionRef.current = false
        setResults(Array.isArray(nextSession?.results) ? nextSession.results : [])
        setMeta(nextSession?.progress || null)
        setSession(nextSession)
        setError(null)
        setSessionError(null)
      })
      .catch((nextError) => {
        if (cancelled) return
        const normalizedError = normalizeInspectionApiError(nextError)
        setError(normalizedError)
        setSessionError(normalizedError)
      })
      .finally(() => {
        if (cancelled) return
        setIsHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    clearSessionState,
    hasVisibleScope,
    inspectionDate,
    normalizedFormInspectionSessionUid,
    sessionEnabled,
    sessionRefreshKey,
  ])

  useEffect(() => {
    const previousFormInspectionSessionUid = previousFormSessionUidRef.current
    if (previousFormInspectionSessionUid && !normalizedFormInspectionSessionUid) {
      forceNewSessionRef.current = true
      clearSessionState()
      setSessionRefreshKey((current) => current + 1)
    }
    previousFormSessionUidRef.current = normalizedFormInspectionSessionUid
  }, [clearSessionState, normalizedFormInspectionSessionUid])

  useEffect(() => {
    refreshResults()
  }, [refreshResults, session?.sessionUid])

  const completeRow = useCallback(
    async (row, options = {}) => {
      const assetKey = getFireExtinguisherAssetKey(row)
      if (!sessionEnabled || !session?.sessionUid || !assetKey) return null
      locallyResetAssetKeysRef.current.delete(assetKey)
      const existing = resultByKey.get(assetKey)
      if (existing?.status === 'completed' && options.allowCompletedUpdate !== true) {
        return existing
      }
      if (syncingKeysRef.current.has(assetKey)) return null

      const operationId = text(options.operationId) || createFireExtinguisherSessionOperationId()
      const baseVersion = Math.max(0, Number(options.baseVersion ?? existing?.version ?? 0) || 0)
      try {
        await persistFireExtinguisherSessionOperation({
          userId: currentUserIdKey,
          sessionUid: session.sessionUid,
          row,
          options: {
            operationId,
            operationType: 'complete',
            baseVersion,
            forceRecheck: options.forceRecheck === true,
          },
        })
      } catch (storageError) {
        setError(storageError)
        pushToast?.(storageError.message, { title: 'Cannot save safely', color: 'danger' })
        return { __failed: true, assetKey, operationId, error: storageError }
      }
      refreshPendingRetryCount()
      syncingKeysRef.current.add(assetKey)
      setActiveSyncCount(syncingKeysRef.current.size)
      try {
        const response = await completeInspectionSessionExtinguisher({
          sessionUid: session.sessionUid,
          row,
          clientResultId: operationId,
          operationId,
          baseVersion,
          forceRecheck: options.forceRecheck === true,
        })
        const saved = response?.row || null
        if (saved) {
          rebaseFollowingFireExtinguisherOperations({
            userId: currentUserIdKey,
            sessionUid: session.sessionUid,
            operationId,
            resultVersion: saved.version,
          })
          removeFireExtinguisherSessionRetry({
            userId: currentUserIdKey,
            sessionUid: session.sessionUid,
            operationId,
          })
          refreshPendingRetryCount()
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            byId.set(saved.id, saved)
            return Array.from(byId.values())
          })
          applySessionMeta(response?.meta)
        }
        refreshProgressContext()
        return saved
      } catch (nextError) {
        const normalizedError = normalizeInspectionApiError(nextError)
        const conflictResult = nextError?.payload?.data
        if (normalizedError.conflict) {
          enqueueFireExtinguisherSessionRetry({
            userId: currentUserIdKey,
            sessionUid: session.sessionUid,
            row,
            options: {
              operationId,
              operationType: 'complete',
              baseVersion,
              forceRecheck: options.forceRecheck === true,
              state: 'conflict',
            },
            error: nextError,
          })
          refreshPendingRetryCount()
          if (conflictResult) {
            setResults((current) => {
              const byId = new Map(
                (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
              )
              byId.set(conflictResult.id, conflictResult)
              return Array.from(byId.values())
            })
          }
          pushToast?.(
            normalizedError.message ||
              `${text(row?.idLocNo || row?.barcodeNo || 'This extinguisher')} could not be synced because the server result changed.`,
            { title: 'Sync conflict', color: 'warning' },
          )
          refreshProgressContext()
          return { ...(conflictResult || {}), __conflict: true, operationId }
        } else {
          setError(nextError)
          if (isFireExtinguisherSessionRetryableError(nextError)) {
            const queued = enqueueFireExtinguisherSessionRetry({
              userId: currentUserIdKey,
              sessionUid: session.sessionUid,
              row,
              options: {
                operationId,
                operationType: 'complete',
                baseVersion,
                forceRecheck: options.forceRecheck === true,
              },
              error: nextError,
            })
            if (queued) {
              refreshPendingRetryCount()
              if (options.fromRetryQueue !== true) {
                pushToast?.(
                  'Saved on this device. Backend session sync will retry automatically.',
                  {
                    title: 'Sync pending',
                    color: 'warning',
                  },
                )
              }
              refreshProgressContext()
              return { __queued: true, assetKey, operationId }
            }
          } else {
            enqueueFireExtinguisherSessionRetry({
              userId: currentUserIdKey,
              sessionUid: session.sessionUid,
              row,
              options: {
                operationId,
                operationType: 'complete',
                baseVersion,
                forceRecheck: options.forceRecheck === true,
                state: 'conflict',
              },
              error: nextError,
            })
            refreshPendingRetryCount()
          }
          pushToast?.(
            nextError?.message ||
              'Backend rejected this extinguisher save. Reopen the row and check required evidence.',
            {
              title: 'Sync failed',
              color: 'danger',
            },
          )
          refreshProgressContext()
          return { __failed: true, assetKey, operationId, error: nextError }
        }
        refreshProgressContext()
        return null
      } finally {
        syncingKeysRef.current.delete(assetKey)
        setActiveSyncCount(syncingKeysRef.current.size)
      }
    },
    [
      applySessionMeta,
      currentUserIdKey,
      pushToast,
      refreshPendingRetryCount,
      refreshProgressContext,
      resultByKey,
      session?.sessionUid,
      sessionEnabled,
    ],
  )

  const resetRow = useCallback(
    async (row) => {
      const assetKey = getFireExtinguisherAssetKey(row)
      if (!sessionEnabled || !session?.sessionUid || !assetKey) return null
      const existing = resultByKey.get(assetKey)
      const operationId = createFireExtinguisherSessionOperationId()
      const baseVersion = Math.max(0, Number(existing?.version || 0) || 0)
      locallyResetAssetKeysRef.current.add(assetKey)
      try {
        await persistFireExtinguisherSessionOperation({
          userId: currentUserIdKey,
          sessionUid: session.sessionUid,
          row,
          options: {
            operationId,
            operationType: 'reset',
            baseVersion,
          },
        })
      } catch (storageError) {
        setError(storageError)
        pushToast?.(storageError.message, { title: 'Cannot reset safely', color: 'danger' })
        return { __failed: true, assetKey, operationId, error: storageError }
      }
      refreshPendingRetryCount()
      if (syncingKeysRef.current.has(assetKey)) {
        return { localOnly: true, syncPending: true, operationId }
      }

      syncingKeysRef.current.add(assetKey)
      setActiveSyncCount(syncingKeysRef.current.size)
      setResults((current) =>
        (Array.isArray(current) ? current : []).map((item) =>
          getFireExtinguisherAssetKey(item) === assetKey ||
          text(item?.canonicalAssetKey) === assetKey
            ? {
                ...item,
                status: 'in_progress',
                checkPayload: row || {},
                checkedBy: '',
                checkedAt: null,
                checkedByUserId: null,
                clientResultId: '',
                version: Number(item?.version || 0) + 1,
              }
            : item,
        ),
      )

      try {
        const response = await resetInspectionSessionExtinguisher({
          sessionUid: session.sessionUid,
          row,
          operationId,
          baseVersion,
        })
        const saved = response?.row || null
        rebaseFollowingFireExtinguisherOperations({
          userId: currentUserIdKey,
          sessionUid: session.sessionUid,
          operationId,
          resultVersion: saved?.version,
        })
        removeFireExtinguisherSessionRetry({
          userId: currentUserIdKey,
          sessionUid: session.sessionUid,
          operationId,
        })
        refreshPendingRetryCount()
        if (saved) {
          setResults((current) =>
            (Array.isArray(current) ? current : []).map((item) =>
              item.id === saved.id ||
              getFireExtinguisherAssetKey(item) === assetKey ||
              text(item?.canonicalAssetKey) === assetKey
                ? saved
                : item,
            ),
          )
        }
        applySessionMeta(response?.meta)
        setError(null)
        autoCompletedKeysRef.current.delete(assetKey)
        locallyResetAssetKeysRef.current.delete(assetKey)
        refreshProgressContext()
        return saved
      } catch (nextError) {
        const normalizedError = normalizeInspectionApiError(nextError)
        const conflictResult = nextError?.payload?.data
        enqueueFireExtinguisherSessionRetry({
          userId: currentUserIdKey,
          sessionUid: session.sessionUid,
          row,
          options: {
            operationId,
            operationType: 'reset',
            baseVersion,
            state: normalizedError.retryable ? 'retryable' : 'conflict',
          },
          error: nextError,
        })
        refreshPendingRetryCount()
        if (normalizedError.conflict && conflictResult) {
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            byId.set(conflictResult.id, conflictResult)
            return Array.from(byId.values())
          })
          pushToast?.(
            normalizedError.message ||
              `${text(row?.idLocNo || row?.barcodeNo || 'This extinguisher')} changed before the reset could be applied.`,
            { title: 'Reset conflict', color: 'warning' },
          )
        } else {
          setError(nextError)
          pushToast?.(
            normalizedError.retryable
              ? 'Reset saved on this device and will retry when the connection recovers.'
              : normalizedError.message,
            {
              title: normalizedError.retryable ? 'Reset pending' : 'Reset failed',
              color: normalizedError.retryable ? 'warning' : 'danger',
            },
          )
        }
        refreshProgressContext()
        return {
          __queued: normalizedError.retryable,
          __conflict: normalizedError.conflict,
          operationId,
        }
      } finally {
        syncingKeysRef.current.delete(assetKey)
        setActiveSyncCount(syncingKeysRef.current.size)
      }
    },
    [
      applySessionMeta,
      pushToast,
      currentUserIdKey,
      refreshPendingRetryCount,
      refreshProgressContext,
      resultByKey,
      session?.sessionUid,
      sessionEnabled,
    ],
  )

  useEffect(() => {
    if (!sessionEnabled || !session?.sessionUid || !subLocation) return
    ;(Array.isArray(visibleRows) ? visibleRows : []).forEach((row) => {
      const assetKey = getFireExtinguisherAssetKey(row)
      if (!assetKey || resultByKey.get(assetKey)?.status === 'completed') return
      if (autoCompletedKeysRef.current.has(assetKey)) return
      if (!getFireExtinguisherRowWorkflowState(row).isComplete) return
      autoCompletedKeysRef.current.add(assetKey)
      completeRow(row).then((saved) => {
        if (!saved) autoCompletedKeysRef.current.delete(assetKey)
      })
    })
  }, [completeRow, resultByKey, session?.sessionUid, sessionEnabled, subLocation, visibleRows])

  useEffect(() => {
    refreshPendingRetryCount()
  }, [refreshPendingRetryCount])

  useEffect(() => {
    if (!sessionEnabled || !session?.sessionUid) return undefined
    let cancelled = false
    let timerId = null
    const retryQueuedRows = async ({ force = false } = {}) => {
      if (cancelled || retryingQueueRef.current) return
      retryingQueueRef.current = true
      try {
        const cycle = await runInspectionSyncCoordinator({
          userId: currentUserIdKey,
          force,
        })
        if (cancelled) return
        const syncResults = (cycle.feResults || []).filter(
          (result) => result.sessionUid === session.sessionUid,
        )
        const savedRows = syncResults.map((result) => result.row).filter(Boolean)
        if (savedRows.length > 0) {
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            savedRows.forEach((row) => byId.set(row.id, row))
            return Array.from(byId.values())
          })
        }
        syncResults
          .filter((result) => result.synced && result.operationType === 'reset')
          .forEach((result) => locallyResetAssetKeysRef.current.delete(result.assetKey))
        await refreshProgressContext()
        refreshPendingRetryCount()
      } finally {
        retryingQueueRef.current = false
      }
    }
    const schedule = () => {
      if (cancelled) return
      if (timerId) window.clearTimeout(timerId)
      const nextAt = getNextInspectionSyncAt(currentUserIdKey)
      if (nextAt === null) return
      timerId = window.setTimeout(
        async () => {
          await retryQueuedRows()
          schedule()
        },
        Math.max(250, Math.min(30 * 60 * 1000, nextAt - Date.now())),
      )
    }
    const handleOnline = async () => {
      await retryQueuedRows({ force: true })
      schedule()
    }
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return
      await retryQueuedRows()
      schedule()
    }
    const handleStateChange = (event) => {
      if (event?.detail?.userId && String(event.detail.userId) !== currentUserIdKey) return
      schedule()
    }
    schedule()
    window.addEventListener?.('online', handleOnline)
    window.addEventListener?.(INSPECTION_SYNC_STATE_EVENT, handleStateChange)
    document.addEventListener?.('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
      window.removeEventListener?.('online', handleOnline)
      window.removeEventListener?.(INSPECTION_SYNC_STATE_EVENT, handleStateChange)
      document.removeEventListener?.('visibilitychange', handleVisibility)
    }
  }, [
    currentUserIdKey,
    refreshPendingRetryCount,
    refreshProgressContext,
    retrySession,
    session?.sessionUid,
    sessionEnabled,
  ])

  return {
    enabled: sessionEnabled,
    error,
    sessionError,
    isHydrating,
    activeSyncCount,
    pendingRetryCount,
    meta,
    session,
    results,
    mergeSessionStatus,
    refreshResults,
    refreshProgressContext,
    completeRow,
    resetRow,
  }
}

export default useFireExtinguisherSessionSync
