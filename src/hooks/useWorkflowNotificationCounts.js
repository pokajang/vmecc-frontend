import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getWorkflowUnreadCount } from 'src/services/workflowNotifications'

const POLL_INTERVAL_MS = 30 * 1000

const isAuthBlockedResult = (result) => {
  const status = Number(result?.error?.status)
  return status === 401 || status === 403
}

const useWorkflowNotificationCounts = () => {
  const user = useSelector((state) => state.authUser)
  const userId = user?.id ?? user?.email
  const [unread, setUnread] = useState(0)
  const [blockedUserId, setBlockedUserId] = useState(null)

  const fetchCounts = useCallback(async () => {
    if (!userId) {
      setUnread(0)
      return
    }
    if (blockedUserId === userId) return
    try {
      const result = await getWorkflowUnreadCount()
      if (!result?.ok) {
        setUnread(0)
        if (isAuthBlockedResult(result)) setBlockedUserId(userId)
        return
      }
      setUnread(Number(result?.count || 0) || 0)
    } catch {
      // silent
    }
  }, [blockedUserId, userId])

  useEffect(() => {
    if (!userId || blockedUserId === userId) return undefined

    const refresh = async () => {
      await fetchCounts()
    }

    void refresh()
  }, [blockedUserId, fetchCounts, userId])

  useEffect(() => {
    if (!userId || blockedUserId === userId) return undefined

    const timer = window.setInterval(() => {
      void fetchCounts()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [blockedUserId, fetchCounts, userId])

  useEffect(() => {
    const handler = (e) => {
      const count = e?.detail?.count
      if (typeof count === 'number') {
        setUnread(count)
      } else {
        fetchCounts()
      }
    }
    window.addEventListener('workflow-notifications-updated', handler)
    return () => window.removeEventListener('workflow-notifications-updated', handler)
  }, [fetchCounts])

  return unread
}

export default useWorkflowNotificationCounts
