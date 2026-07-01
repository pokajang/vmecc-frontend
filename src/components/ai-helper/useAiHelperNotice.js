import { useCallback, useEffect, useRef, useState } from 'react'

const useAiHelperNotice = () => {
  const [notice, setNotice] = useState(null)
  const noticeTimerRef = useRef(null)

  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = null
    }
    setNotice(null)
  }, [])

  const showNotice = useCallback((message, timeout = 3000) => {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null)
      noticeTimerRef.current = null
    }, timeout)
  }, [])

  const showPersistentNotice = useCallback((message) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = null
    }
    setNotice(message)
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  return {
    clearNotice,
    notice,
    showNotice,
    showPersistentNotice,
  }
}

export default useAiHelperNotice
