import React from 'react'
import { CButton } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import { getInspectionRowLabel } from '../inspectionResetActions'

const InspectionResetConfirmDrawer = ({
  visible = false,
  row = null,
  fallbackLabel = 'this row',
  onClose,
  onConfirm,
}) => {
  const rowLabel = getInspectionRowLabel(row || {}, fallbackLabel)

  return (
    <MobileBottomDrawer
      visible={visible}
      title="Reset check"
      bodyClassName="inspection-equipment-detail-drawer-shell"
      onClose={onClose}
    >
      <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid gap-3">
        <div className="text-body-secondary">
          Reset inspection answers for <span className="fw-semibold text-body">{rowLabel}</span>?
        </div>
        <div className="small text-body-secondary">
          This clears statuses, remarks, and photos for this check only. The equipment record stays
          in the inspection.
        </div>
        <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
          <CButton type="button" color="secondary" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="button" color="danger" size="sm" onClick={onConfirm}>
            Reset
          </CButton>
        </div>
      </div>
    </MobileBottomDrawer>
  )
}

export default InspectionResetConfirmDrawer
