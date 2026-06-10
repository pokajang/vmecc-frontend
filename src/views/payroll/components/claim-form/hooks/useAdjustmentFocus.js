import { useEffect } from 'react'

const useAdjustmentFocus = ({ showForm, adjustmentFormRef, adjustmentDateInputRef }) => {
  useEffect(() => {
    if (!showForm) return undefined
    adjustmentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const timer = window.setTimeout(() => {
      adjustmentDateInputRef.current?.focus?.()
    }, 200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [adjustmentDateInputRef, adjustmentFormRef, showForm])
}

export default useAdjustmentFocus
