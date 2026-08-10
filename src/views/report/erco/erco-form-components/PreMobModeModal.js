import React from 'react'
import { CButton } from '@coreui/react'
import ResponsiveReportDialog from 'src/components/report-workflow/ResponsiveReportDialog'

const PreMobModeModal = ({ visible, onClose, onAppend, onReplace }) => {
  const body = 'Current chronology already has events. Choose how to apply PreMob rows.'
  const actions = (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onAppend}>
        Append to Current
      </CButton>
      <CButton type="button" color="warning" onClick={onReplace}>
        Start New (Replace)
      </CButton>
    </>
  )

  return (
    <ResponsiveReportDialog
      visible={visible}
      title="Add PreMob Events"
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

export default PreMobModeModal
