import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import { hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { isModuleEnabled } from 'src/utils/modules'

const useOnboardingVisibilityOptions = () => {
  const authUser = useSelector((state) => state.authUser)
  const moduleActivation = useSelector((state) => state.moduleActivation)
  const payrollEnabled = isModuleEnabled(moduleActivation, 'payroll.self_service')
  const overtimeEnabled = isModuleEnabled(moduleActivation, 'overtime.self_service')
  const canClaim = payrollEnabled && hasPermission(authUser, 'self.payroll')
  const canOvertimePermission = hasPermission(authUser, 'self.overtime')
  const isSysAdmin = isSystemAdministrator(authUser)
  const shouldResolveOvertimeEligibility = canClaim || (overtimeEnabled && canOvertimePermission)
  const { eligible: overtimeEligible, isResolved: overtimeEligibilityResolved } =
    useOvertimeEligibility({ enabled: shouldResolveOvertimeEligibility })

  return useMemo(
    () => ({
      moduleActivation,
      overtimeEligibilityResolved,
      overtimeEligible: shouldResolveOvertimeEligibility
        ? isSysAdmin
          ? true
          : overtimeEligibilityResolved && overtimeEligible
        : null,
    }),
    [
      isSysAdmin,
      moduleActivation,
      overtimeEligible,
      overtimeEligibilityResolved,
      shouldResolveOvertimeEligibility,
    ],
  )
}

export default useOnboardingVisibilityOptions
