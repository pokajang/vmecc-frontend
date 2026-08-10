import React from 'react'
import { CButton } from '@coreui/react'
import ResponsiveReportDialog from 'src/components/report-workflow/ResponsiveReportDialog'

const ChronologyStartModeModal = ({ visible, responseStartTime, onClose, onManual, onPremob }) => {
  const body = (
    <>
      Response start time is set to <strong>{responseStartTime}</strong>. Choose how to begin
      chronology.
    </>
  )
  const actions = (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onManual}>
        Start with Manual Row
      </CButton>
      <CButton type="button" color="primary" onClick={onPremob}>
        Add PreMob Template
      </CButton>
    </>
  )

  return (
    <ResponsiveReportDialog
      visible={visible}
      title="Initialize Chronology"
      footer={actions}
      onClose={onClose}
      mobileBodyClassName="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body"
      desktopFullscreen="sm"
      scrollable
    >
      {body}
    </ResponsiveReportDialog>
  )
}

export default ChronologyStartModeModal
