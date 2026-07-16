import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { hasPermission } from 'src/utils/authz'
import { migrateInspectionRecords } from 'src/views/inspection/form/utils'
import InspectionModule from './InspectionModule'

const InspectionPage = () => {
  const user = useSelector((state) => state.authUser)
  const location = useLocation()
  const canViewInspection = hasPermission(user, 'reports.inspection.view')
  const canConductInspection =
    hasPermission(user, 'reports.manage') || hasPermission(user, 'reports.inspection.conduct')
  const requiresConductPermission =
    location.pathname.toLowerCase().startsWith('/inspection/new') ||
    location.pathname.toLowerCase().endsWith('/edit')

  useEffect(() => {
    if (user?.id) migrateInspectionRecords(user.id)
  }, [user?.id])

  if (!canViewInspection || (requiresConductPermission && !canConductInspection)) {
    return <Navigate to="/403" replace />
  }

  return <InspectionModule />
}

export default InspectionPage
