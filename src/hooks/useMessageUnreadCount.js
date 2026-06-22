import { useMemo } from 'react'
import useMessageThreads from './useMessageThreads'

const useMessageUnreadCount = ({ enabled = true } = {}) => {
  const { threads } = useMessageThreads({ enabled })
  return useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0),
    [threads],
  )
}

export default useMessageUnreadCount
