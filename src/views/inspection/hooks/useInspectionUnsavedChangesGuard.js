import { useEffect } from 'react'

const useInspectionUnsavedChangesGuard = (checkDirty) => {
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!checkDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [checkDirty])
}

export default useInspectionUnsavedChangesGuard
