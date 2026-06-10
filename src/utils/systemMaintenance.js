export const isGracePhase = (setting = {}) =>
  Boolean(setting?.enabled) && String(setting?.phase || '').toLowerCase() === 'grace'

export const isEnforcedPhase = (setting = {}) =>
  Boolean(setting?.enabled) && String(setting?.phase || '').toLowerCase() === 'enforced'

export const shouldShowMaintenancePage = ({
  setting = {},
  authUser = null,
  isSystemAdministratorFn = () => false,
} = {}) => {
  if (!isEnforcedPhase(setting)) return false
  return !Boolean(isSystemAdministratorFn(authUser))
}
