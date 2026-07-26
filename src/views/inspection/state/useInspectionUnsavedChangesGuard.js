import { useEffect, useId } from 'react'
import { useOptionalNavigationGuard } from 'src/contexts/NavigationGuardContext'

const useInspectionUnsavedChangesGuard = (
  checkDirty,
  { id = '', message = 'You have unsaved inspection changes. Update VMECC and discard them?' } = {},
) => {
  const generatedId = useId()
  const navigationGuard = useOptionalNavigationGuard()
  const registerGuard = navigationGuard?.registerGuard
  const unregisterGuard = navigationGuard?.unregisterGuard
  const guardId = id || `inspection-${generatedId}`
  const isDirty = Boolean(checkDirty())

  useEffect(() => {
    if (registerGuard && unregisterGuard) {
      registerGuard(guardId, { active: isDirty, message })
      return () => unregisterGuard(guardId)
    }

    const onBeforeUnload = (event) => {
      if (!checkDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [checkDirty, guardId, isDirty, message, registerGuard, unregisterGuard])
}

export default useInspectionUnsavedChangesGuard
