import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getWorkflowUnreadCount } from 'src/services/workflowNotifications'

const POLL_INTERVAL_MS = 30 * 1000

const useWorkflowNotificationCounts = () => {
  const user = useSelector((state) => state.authUser)
  const [unread, setUnread] = useState(0)

  const fetchCounts = useCallback(async () => {
    if (!user?.id) { setUnread(0); return }
    try {
      const result = await getWorkflowUnreadCount()
      setUnread(Number(result?.count || 0) || 0)
    } catch {
      // silent
    }
  }, [user?.id])

  useEffect(() => {
    const timer = window.setTimeout(fetchCounts, 0)
    return () => window.clearTimeout(timer)
  }, [fetchCounts])

  useEffect(() => {
    const timer = window.setInterval(fetchCounts, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [fetchCounts])

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
