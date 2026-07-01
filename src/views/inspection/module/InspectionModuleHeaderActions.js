import React from 'react'
import { CButton } from '@coreui/react'
import { ArrowLeft, CircleHelp } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'

const InspectionModuleHeaderActions = ({
  showMobileBackAction,
  onMobileBack,
  tourEligible,
  isCreateSection,
  onStartTutorial,
  onStartNew,
}) => (
  <>
    {showMobileBackAction ? (
      <CButton
        color="secondary"
        variant="outline"
        size="sm"
        className="inspection-header-back-btn inspection-compact-action-btn d-md-none d-inline-flex align-items-center gap-1"
        onClick={onMobileBack}
      >
        <ArrowLeft size={14} />
        Back
      </CButton>
    ) : null}
    {tourEligible && !isCreateSection ? (
      <CButton
        color="secondary"
        variant="outline"
        size="sm"
        className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
        onClick={onStartTutorial}
        aria-label="Open Inspection tutorial"
      >
        <CircleHelp size={14} aria-hidden="true" />
        Tutorial
      </CButton>
    ) : null}
    {!isCreateSection ? (
      <CreateActionButton
        label="New"
        importance="primary"
        className="d-none d-md-inline-flex"
        onClick={onStartNew}
        data-tour-id="inspection-new"
      />
    ) : null}
  </>
)

export default InspectionModuleHeaderActions
