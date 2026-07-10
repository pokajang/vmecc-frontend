import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import featureFlags from 'src/config/featureFlags'
import {
  completeInspectionSessionExtinguisher,
  createOrResumeInspectionSession,
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
  enqueueFireExtinguisherSessionRetry,
  isFireExtinguisherSessionRetryableError,
  loadFireExtinguisherSessionRetryQueue,
  removeFireExtinguisherSessionRetry,
} from './fireExtinguisherSessionRetryQueue'

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

const clientResultIdFor = (sessionUid, assetKey) =>
  `fe-session:${text(sessionUid).slice(-36)}:${text(assetKey).slice(0, 120)}`

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
  const [isHydrating, setIsHydrating] = useState(false)
  const [pendingRetryCount, setPendingRetryCount] = useState(0)
  const [pendingRetryAssetKeys, setPendingRetryAssetKeys] = useState([])
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0)
  const syncingKeysRef = useRef(new Set())
  const autoCompletedKeysRef = useRef(new Set())
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

  const clearSessionState = useCallback(() => {
    syncingKeysRef.current.clear()
    autoCompletedKeysRef.current.clear()
    setSession(null)
    setResults([])
    setMeta(null)
    setError(null)
    setIsHydrating(false)
    setPendingRetryCount(0)
    setPendingRetryAssetKeys([])
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
      setMeta(response.meta)
      setError(null)
      return response
    } catch (nextError) {
      setError(nextError)
      return null
    }
  }, [hasVisibleScope, mainLocation, session?.sessionUid, sessionEnabled, zone])

  const refreshProgressContext = useCallback(async () => {
    if (!sessionEnabled || !session?.sessionUid) return null
    try {
      const progress = await fetchInspectionSessionProgress({ sessionUid: session.sessionUid })
      if (progress) setMeta(progress)
      setError(null)
      return progress
    } catch (nextError) {
      setError(nextError)
      return null
    }
  }, [session?.sessionUid, sessionEnabled])

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
    createOrResumeInspectionSession({
      inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
      forceNew: forceNewSessionRef.current,
    })
      .then((nextSession) => {
        if (cancelled) return
        forceNewSessionRef.current = false
        setResults(Array.isArray(nextSession?.results) ? nextSession.results : [])
        setMeta(nextSession?.progress || null)
        setSession(nextSession)
        setError(null)
      })
      .catch((nextError) => {
        if (cancelled) return
        setError(nextError)
      })
      .finally(() => {
        if (cancelled) return
        setIsHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [clearSessionState, hasVisibleScope, sessionEnabled, sessionRefreshKey])

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
      const existing = resultByKey.get(assetKey)
      if (existing?.status === 'completed' && options.allowCompletedUpdate !== true) {
        return existing
      }
      if (syncingKeysRef.current.has(assetKey)) return null

      syncingKeysRef.current.add(assetKey)
      try {
        const response = await completeInspectionSessionExtinguisher({
          sessionUid: session.sessionUid,
          row,
          clientResultId: clientResultIdFor(session.sessionUid, assetKey),
          baseVersion: Number(existing?.version || 0) || 0,
        })
        const saved = response?.row || null
        if (saved) {
          removeFireExtinguisherSessionRetry({
            userId: currentUserIdKey,
            sessionUid: session.sessionUid,
            assetKey,
          })
          refreshPendingRetryCount()
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            byId.set(saved.id, saved)
            return Array.from(byId.values())
          })
          if (response?.meta) setMeta(response.meta)
        }
        refreshProgressContext()
        return saved
      } catch (nextError) {
        const conflictResult = nextError?.payload?.data
        if (nextError?.status === 409 && conflictResult) {
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            byId.set(conflictResult.id, conflictResult)
            return Array.from(byId.values())
          })
          removeFireExtinguisherSessionRetry({
            userId: currentUserIdKey,
            sessionUid: session.sessionUid,
            assetKey,
          })
          refreshPendingRetryCount()
          pushToast?.(
            `${text(row?.idLocNo || row?.barcodeNo || 'This extinguisher')} was already inspected by ${
              text(conflictResult.checkedBy) || 'another user'
            }.`,
            { title: 'Already inspected', color: 'warning' },
          )
          refreshProgressContext()
          return { ...conflictResult, __conflict: true }
        } else {
          setError(nextError)
          if (isFireExtinguisherSessionRetryableError(nextError)) {
            const queued = enqueueFireExtinguisherSessionRetry({
              userId: currentUserIdKey,
              sessionUid: session.sessionUid,
              row,
              options,
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
              return { __queued: true, assetKey }
            }
          } else if (options.fromRetryQueue === true) {
            removeFireExtinguisherSessionRetry({
              userId: currentUserIdKey,
              sessionUid: session.sessionUid,
              assetKey,
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
          return { __failed: true, assetKey, error: nextError }
        }
        refreshProgressContext()
        return null
      } finally {
        syncingKeysRef.current.delete(assetKey)
      }
    },
    [
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
      if (!existing) return { localOnly: true }
      if (syncingKeysRef.current.has(assetKey)) return null

      syncingKeysRef.current.add(assetKey)
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
        })
        const saved = response?.row || null
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
        if (response?.meta) setMeta(response.meta)
        setError(null)
        autoCompletedKeysRef.current.delete(assetKey)
        refreshProgressContext()
        return saved
      } catch (nextError) {
        const conflictResult = nextError?.payload?.data
        if (nextError?.status === 409 && conflictResult) {
          setResults((current) => {
            const byId = new Map(
              (Array.isArray(current) ? current : []).map((item) => [item.id, item]),
            )
            byId.set(conflictResult.id, conflictResult)
            return Array.from(byId.values())
          })
          pushToast?.(
            nextError?.message ||
              `${text(row?.idLocNo || row?.barcodeNo || 'This extinguisher')} changed before the reset could be applied.`,
            { title: 'Reset conflict', color: 'warning' },
          )
        } else {
          setError(nextError)
          refreshResults()
        }
        refreshProgressContext()
        return null
      } finally {
        syncingKeysRef.current.delete(assetKey)
      }
    },
    [
      pushToast,
      refreshProgressContext,
      refreshResults,
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
    const retryQueuedRows = () => {
      if (cancelled) return
      const queuedRows = loadFireExtinguisherSessionRetryQueue({
        userId: currentUserIdKey,
        sessionUid: session.sessionUid,
      })
      queuedRows.forEach((item) => {
        if (cancelled || syncingKeysRef.current.has(item.assetKey)) return
        completeRow(item.row, {
          ...item.options,
          allowCompletedUpdate: true,
          fromRetryQueue: true,
        })
      })
      setPendingRetryCount(queuedRows.length)
    }

    const timerId = window.setTimeout(retryQueuedRows, 500)
    const intervalId = window.setInterval(retryQueuedRows, 60 * 1000)
    window.addEventListener?.('online', retryQueuedRows)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
      window.clearInterval(intervalId)
      window.removeEventListener?.('online', retryQueuedRows)
    }
  }, [completeRow, currentUserIdKey, session?.sessionUid, sessionEnabled])

  return {
    enabled: sessionEnabled,
    error,
    isHydrating,
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
