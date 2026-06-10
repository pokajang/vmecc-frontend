import React from 'react'
import { CContainer } from '@coreui/react'
import { useSelector } from 'react-redux'
import { hasAnyPermission } from 'src/utils/authz'
import WorkShift from '../settings/components/WorkShift'

const SHIFT_SETTINGS_ALLOWED_PERMISSIONS = [
  'settings.manage',
  'staff.leave.manage',
  'staff.salary.manage',
]

const ShiftSettings = () => {
  const user = useSelector((state) => state.authUser)
  const canManageShiftSettings = hasAnyPermission(user, SHIFT_SETTINGS_ALLOWED_PERMISSIONS)

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load shift settings. Please sign in again.</div>
    )
  }

  if (!canManageShiftSettings) {
    return (
      <div className="my-4 text-danger">You do not have permission to manage shift settings.</div>
    )
  }

  return (
    <CContainer fluid>
      <WorkShift />
    </CContainer>
  )
}

export default ShiftSettings
