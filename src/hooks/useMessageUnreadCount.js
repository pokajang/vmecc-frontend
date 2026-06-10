import { useMemo } from 'react'
import useMessageThreads from './useMessageThreads'

const useMessageUnreadCount = () => {
  const { threads } = useMessageThreads()
  return useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0),
    [threads],
  )
}

export default useMessageUnreadCount
