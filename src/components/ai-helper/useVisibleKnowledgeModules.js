import { useMemo } from 'react'

import navigation from 'src/_nav'
import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import { hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { getVisibleNavigationWithOptions } from 'src/utils/navigation'
import { isModuleEnabled } from 'src/utils/modules'
import { collectVisibleModuleKeys, KNOWLEDGE_MODULE_OPTIONS } from './constants'

const useVisibleKnowledgeModules = ({ authUser, moduleActivation }) => {
  const payrollEnabled = isModuleEnabled(moduleActivation, 'payroll.self_service')
  const overtimeEnabled = isModuleEnabled(moduleActivation, 'overtime.self_service')
  const isSysAdmin = isSystemAdministrator(authUser)
  const shouldResolveOvertimeEligibility =
    (overtimeEnabled && hasPermission(authUser, 'self.overtime')) ||
    (payrollEnabled && hasPermission(authUser, 'self.payroll'))
  const { eligible: overtimeEligible, isResolved: overtimeEligibilityResolved } =
    useOvertimeEligibility({ enabled: shouldResolveOvertimeEligibility })
  const overtimeEligibleForMenu = shouldResolveOvertimeEligibility
    ? isSysAdmin
      ? true
      : overtimeEligibilityResolved && overtimeEligible
    : null

  const visibleKnowledgeModules = useMemo(() => {
    const visibleNavigation = getVisibleNavigationWithOptions(navigation, authUser, 0, {
      overtimeEligible: overtimeEligibleForMenu,
      moduleActivation,
    })
    const visibleKeys = collectVisibleModuleKeys(visibleNavigation)
    return KNOWLEDGE_MODULE_OPTIONS.filter((option) => visibleKeys.has(option.key))
  }, [authUser, moduleActivation, overtimeEligibleForMenu])

  return {
    isSysAdmin,
    visibleKnowledgeModules,
  }
}

export default useVisibleKnowledgeModules
