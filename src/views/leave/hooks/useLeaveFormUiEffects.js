import { useEffect } from 'react'

export default function useLeaveFormUiEffects({
  activeSection,
  isFormDirty,
  activeFieldRule,
  setFieldErrors,
}) {
  useEffect(() => {
    if (activeSection !== 'new-leave') return undefined
    const onBeforeUnload = (event) => {
      if (!isFormDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [activeSection, isFormDirty])

  useEffect(() => {
    if (!activeFieldRule.showCoverage) {
      setFieldErrors((prev) => {
        if (!prev.coverBy) return prev
        const next = { ...prev }
        delete next.coverBy
        return next
      })
    }
    if (!activeFieldRule.showAttachment) {
      setFieldErrors((prev) => {
        if (!prev.attachment) return prev
        const next = { ...prev }
        delete next.attachment
        return next
      })
    }
  }, [activeFieldRule.showAttachment, activeFieldRule.showCoverage, setFieldErrors])
}
