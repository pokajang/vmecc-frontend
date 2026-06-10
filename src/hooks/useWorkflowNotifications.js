import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  getWorkflowUnreadCount,
  getWorkflowNotificationsForViewer,
  markAllWorkflowNotificationsReadForViewer,
  markWorkflowNotificationAsRead,
  deleteWorkflowNotificationById,
  deleteAllWorkflowNotificationsForViewer,
} from 'src/services/workflowNotifications'

const POLL_INTERVAL_MS = 30 * 1000
const REFRESH_DEBOUNCE_MS = 300
const READ_SETTLE_MS = 1500

// Piggybacks the fresh count on the event so useWorkflowNotificationCounts
// can update its badge without making a redundant API call.
const notify = (count) =>
  window.dispatchEvent(
    new CustomEvent(
      'workflow-notifications-updated',
      typeof count === 'number' ? { detail: { count } } : undefined,
    ),
  )

const countUnreadItems = (items = []) =>
  items.reduce((total, item) => total + (item?.unread ? 1 : 0), 0)

const useWorkflowNotifications = ({ unreadOnly = false } = {}) => {
  const user = useSelector((state) => state.authUser)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const paramsRef = useRef({ unreadOnly })
  const userIdRef = useRef(user?.id)
  const itemsRef = useRef([])
  const refreshTimerRef = useRef(null)
  const pendingDeletesRef = useRef(new Set())
  const pendingReadsRef = useRef(new Set())
  const pendingReadReleaseTimerRef = useRef(null)
  useEffect(() => {
    paramsRef.current = { unreadOnly }
  }, [unreadOnly])
  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // broadcast=true fires notify() with the fresh count after the fetch completes,
  // so listeners (e.g. the count badge) can update without a separate API call.
  const fetchData = useCallback(async (silent = false, broadcast = false) => {
    if (!userIdRef.current) {
      setItems([])
      setUnreadCount(0)
      if (broadcast) notify(0)
      return
    }
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { unreadOnly: uo } = paramsRef.current
      const [itemsResult, countResult] = await Promise.all([
        getWorkflowNotificationsForViewer({ unreadOnly: uo, limit: 100 }),
        getWorkflowUnreadCount(),
      ])
      if (itemsResult?.ok) {
        const data = Array.isArray(itemsResult.data) ? itemsResult.data : []
        const pendingDeletes = pendingDeletesRef.current
        const pendingReads = pendingReadsRef.current
        const visibleItems =
          pendingDeletes.size > 0 ? data.filter((item) => !pendingDeletes.has(item.id)) : data

        visibleItems.forEach((item) => {
          if (pendingReads.has(item.id) && !item.unread) {
            pendingReads.delete(item.id)
          }
        })

        setItems(
          visibleItems.map((item) =>
            pendingReads.has(item.id) && item.unread
              ? { ...item, read: true, unread: false }
              : item,
          ),
        )
      }
      let count
      if (countResult?.ok) {
        count = Number(countResult.count || 0) || 0
        setUnreadCount(count)
      }
      if (broadcast) notify(count)
    } catch (err) {
      if (!silent) setError(err?.message || 'Failed to load notifications.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Coalesces rapid back-to-back calls (e.g. burst deleteOne) into one trailing refresh.
  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = window.setTimeout(() => fetchData(true, true), REFRESH_DEBOUNCE_MS)
  }, [fetchData])

  const schedulePendingReadRelease = useCallback(() => {
    window.clearTimeout(pendingReadReleaseTimerRef.current)
    pendingReadReleaseTimerRef.current = window.setTimeout(() => {
      pendingReadsRef.current.clear()
      fetchData(true, true)
    }, READ_SETTLE_MS)
  }, [fetchData])

  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  useEffect(() => {
    const timer = window.setInterval(() => fetchData(true, true), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [fetchData])

  // Clean up any pending debounced refresh on unmount.
  useEffect(
    () => () => {
      window.clearTimeout(refreshTimerRef.current)
      window.clearTimeout(pendingReadReleaseTimerRef.current)
    },
    [],
  )

  const refresh = useCallback(() => fetchData(false, true), [fetchData])

  const markRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return false
      setError(null)
      let changed = false
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== notificationId || !item.unread) return item
          changed = true
          pendingReadsRef.current.add(item.id)
          return { ...item, read: true, unread: false }
        }),
      )
      if (changed) {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1)
          notify(next)
          return next
        })
      }
      const result = await markWorkflowNotificationAsRead(notificationId)
      if (!result?.ok) {
        pendingReadsRef.current.delete(notificationId)
        setError('Failed to mark notification as read.')
        await fetchData(true, true)
      } else {
        scheduleRefresh()
        schedulePendingReadRelease()
      }
      return result?.ok ?? false
    },
    [fetchData, schedulePendingReadRelease, scheduleRefresh],
  )

  const markAllRead = useCallback(async () => {
    const snapshot = itemsRef.current
    const nextUnreadCount = countUnreadItems(snapshot)
    const snapshotUnreadIds = snapshot.filter((item) => item.unread).map((item) => item.id)
    setSubmitting(true)
    setError(null)
    if (nextUnreadCount > 0) {
      snapshotUnreadIds.forEach((id) => pendingReadsRef.current.add(id))
      setItems((prev) =>
        prev.map((item) => (item.unread ? { ...item, read: true, unread: false } : item)),
      )
      setUnreadCount(0)
      notify(0)
    }
    try {
      const result = await markAllWorkflowNotificationsReadForViewer()
      if (!result?.ok) {
        snapshotUnreadIds.forEach((id) => pendingReadsRef.current.delete(id))
        setItems(snapshot)
        setUnreadCount(nextUnreadCount)
        notify(nextUnreadCount)
        setError('Failed to mark all notifications as read.')
        await fetchData(true, true)
        return false
      }
      scheduleRefresh()
      schedulePendingReadRelease()
      return result?.ok ?? false
    } finally {
      setSubmitting(false)
    }
  }, [fetchData, schedulePendingReadRelease, scheduleRefresh])

  const deleteOne = useCallback(
    async (notificationId) => {
      setError(null)
      const target = itemsRef.current.find((item) => item.id === notificationId) || null
      pendingDeletesRef.current.add(notificationId)
      pendingReadsRef.current.delete(notificationId)
      setItems((prev) => prev.filter((item) => item.id !== notificationId))
      if (target?.unread) {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1)
          notify(next)
          return next
        })
      }
      const result = await deleteWorkflowNotificationById(notificationId)
      pendingDeletesRef.current.delete(notificationId)
      if (!result?.ok) {
        setError('Failed to delete notification.')
        await fetchData(true, true)
      } else {
        scheduleRefresh() // coalesced: N rapid deletes → 1 trailing refresh
      }
      return result?.ok ?? false
    },
    [fetchData, scheduleRefresh],
  )

  const deleteAll = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    const snapshot = itemsRef.current
    const nextUnreadCount = countUnreadItems(snapshot)
    pendingReadsRef.current.clear()
    setItems([])
    if (nextUnreadCount > 0) {
      setUnreadCount(0)
      notify(0)
    }
    try {
      const result = await deleteAllWorkflowNotificationsForViewer()
      if (!result?.ok) {
        setItems(snapshot)
        setUnreadCount(nextUnreadCount)
        notify(nextUnreadCount)
        setError('Failed to delete all notifications.')
      } else {
        await fetchData(true, true)
      }
      return result?.ok ?? false
    } finally {
      setSubmitting(false)
    }
  }, [fetchData])

  return {
    items,
    unreadCount,
    loading,
    submitting,
    error,
    refresh,
    markRead,
    markAllRead,
    deleteOne,
    deleteAll,
  }
}

export default useWorkflowNotifications
