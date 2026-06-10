import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { hasPermission } from 'src/utils/authz'
import { migrateInspectionRecords } from 'src/views/inspection/utils'
import InspectionModule from './InspectionModule'

const InspectionPage = () => {
  const user = useSelector((state) => state.authUser)
  const canViewInspection = hasPermission(user, 'reports.inspection.view')

  useEffect(() => {
    if (user?.id) migrateInspectionRecords(user.id)
  }, [user?.id])

  if (!canViewInspection) {
    return <Navigate to="/403" replace />
  }

  return <InspectionModule />
}

export default InspectionPage
