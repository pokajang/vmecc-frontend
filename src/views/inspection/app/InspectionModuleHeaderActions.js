import React from 'react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileModuleBackAction from 'src/components/MobileModuleBackAction'

const InspectionModuleHeaderActions = ({
  showMobileBackAction,
  onMobileBack,
  isCreateSection,
  onStartNew,
  canConduct = true,
}) => (
  <>
    {showMobileBackAction ? (
      <MobileModuleBackAction
        className="inspection-header-back-btn inspection-compact-action-btn"
        onClick={onMobileBack}
      />
    ) : null}
    {!isCreateSection && canConduct ? (
      <CreateActionButton
        label="Conduct Inspection"
        importance="page-primary"
        className="d-none d-md-inline-flex"
        onClick={onStartNew}
        data-testid="inspection-new"
      />
    ) : null}
  </>
)

export default InspectionModuleHeaderActions
