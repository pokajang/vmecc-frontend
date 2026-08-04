import React from 'react'
import { CButton } from '@coreui/react'
import ErcoResponsiveActionModal from './ErcoResponsiveActionModal'

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
    <ErcoResponsiveActionModal
      visible={visible}
      title="Initialize Chronology"
      body={body}
      actions={actions}
      onClose={onClose}
    />
  )
}

export default ChronologyStartModeModal
