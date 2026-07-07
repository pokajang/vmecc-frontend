import React from 'react'
import { CContainer } from '@coreui/react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

import { hasPermission } from 'src/utils/authz'
import ModulePageHeader from 'src/components/ModulePageHeader'
import InspectionWorkflowRules from 'src/views/settings/components/InspectionWorkflowRules'

const InspectionWorkflowSettings = () => {
  const user = useSelector((state) => state.authUser)

  if (!user) {
    return (
      <div className="my-4 text-danger">
        Unable to load inspection workflow settings. Please sign in again.
      </div>
    )
  }

  if (!hasPermission(user, 'settings.manage')) {
    return <Navigate to="/403" replace />
  }

  return (
    <CContainer fluid>
      <ModulePageHeader
        title="Reporting Settings"
        subtitle="Configure inspection workflow routing and approval policy."
      />
      <InspectionWorkflowRules />
    </CContainer>
  )
}

export default InspectionWorkflowSettings
