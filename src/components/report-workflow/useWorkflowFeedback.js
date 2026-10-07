import { useCallback, useState } from 'react'

const COLOR_TO_KIND = {
  danger: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
  primary: 'info',
  light: 'info',
  secondary: 'info',
}

const useWorkflowFeedback = () => {
  const [feedback, setFeedback] = useState(null)

  const clearFeedback = useCallback(() => setFeedback(null), [])
  const pushFeedback = useCallback((message, { title = '', color = 'light' } = {}) => {
    const visibleMessage = String(message || '').trim()
    if (!visibleMessage && !title) return
    setFeedback({
      kind: COLOR_TO_KIND[color] || 'info',
      title,
      message: visibleMessage,
    })
  }, [])

  return { feedback, setFeedback, clearFeedback, pushFeedback }
}

export default useWorkflowFeedback
