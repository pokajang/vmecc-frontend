import { isErAuxInspectionType } from 'src/views/inspection/types/er-aux/helpers'
import { isFireExtinguisherInspectionType } from 'src/views/inspection/types/fire-extinguisher/helpers'
import { isFrtDailyInspectionType } from 'src/views/inspection/types/frt-daily/helpers'
import { isHighAngleInspectionType } from 'src/views/inspection/types/high-angle/helpers'
import { isHseInspectionType } from 'src/views/inspection/types/hse/helpers'
import { isScbaInspectionType } from 'src/views/inspection/types/scba/helpers'
import { ROLE_ABBREVIATIONS } from 'src/constants/roles'
import { getPrimaryRoleLabel } from 'src/utils/authz'

export const getInspectionSessionActor = (user = {}) =>
  [user?.name, user?.full_name, user?.fullName, user?.display_name, user?.displayName, user?.email]
    .map((value) => String(value || '').trim())
    .find(Boolean) || ''

export const getInspectionSessionActorRole = (user = {}) =>
  String(user?.primary_role || user?.primaryRole || getPrimaryRoleLabel(user) || '').trim()

export const getInspectionSessionActorRoleCode = (user = {}) => {
  const role = getInspectionSessionActorRole(user)
  return String(
    user?.primary_role_code || user?.primaryRoleCode || ROLE_ABBREVIATIONS[role] || '',
  ).trim()
}

export const formatInspectionRole = (role = '', roleCode = '') => {
  const normalizedRole = String(role || '').trim()
  const normalizedRoleCode = String(roleCode || '').trim()
  if (normalizedRole && normalizedRoleCode) return `${normalizedRole} (${normalizedRoleCode})`
  return normalizedRole || normalizedRoleCode
}

export const getInspectionSessionActorSnapshot = (user = {}) => ({
  userId: user?.id ?? null,
  name: getInspectionSessionActor(user),
  email: String(user?.email || '').trim(),
  role: getInspectionSessionActorRole(user),
  roleCode: getInspectionSessionActorRoleCode(user),
})

export const getInspectionInspectorField = (inspectionType = '') => {
  if (isErAuxInspectionType(inspectionType)) return 'erAuxInspectedBy'
  if (isFireExtinguisherInspectionType(inspectionType)) return 'fireExtinguisherInspectedBy'
  if (isFrtDailyInspectionType(inspectionType)) return 'frtInspectedBy'
  if (isHighAngleInspectionType(inspectionType)) return 'highAngleInspectedBy'
  if (isScbaInspectionType(inspectionType)) return 'scbaInspectedBy'
  if (isHseInspectionType(inspectionType)) return 'hseInspectedBy'
  return ''
}
