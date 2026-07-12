import React from 'react'
import { CButton } from '@coreui/react'
import { ArrowLeft } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'

const InspectionModuleHeaderActions = ({
  showMobileBackAction,
  onMobileBack,
  isCreateSection,
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
    {!isCreateSection ? (
      <CreateActionButton
        label="New"
        importance="page-primary"
        className="d-none d-md-inline-flex"
        onClick={onStartNew}
        data-testid="inspection-new"
      />
    ) : null}
  </>
)

export default InspectionModuleHeaderActions
