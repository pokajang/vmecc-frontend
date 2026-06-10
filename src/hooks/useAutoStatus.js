import { useCallback, useEffect, useRef, useState } from 'react'

const useAutoStatus = (timeoutMs = 4000) => {
  const [status, setStatus] = useState({ loading: false, message: null, type: null })
  const timerRef = useRef(null)

  const updateStatus = useCallback(
    (nextStatus) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      setStatus(nextStatus)

      // Auto-clear only non-error messages
      if (nextStatus?.message && nextStatus?.type !== 'danger') {
        timerRef.current = setTimeout(() => {
          setStatus((prev) => ({ ...prev, message: null, type: null }))
          timerRef.current = null
        }, timeoutMs)
      }
    },
    [timeoutMs],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return [status, updateStatus]
}

export default useAutoStatus
