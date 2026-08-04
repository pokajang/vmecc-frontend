import React from 'react'
import { CButton } from '@coreui/react'
import ErcoResponsiveActionModal from './ErcoResponsiveActionModal'

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
    <ErcoResponsiveActionModal
      visible={visible}
      title="Add PreMob Events"
      body={body}
      actions={actions}
      onClose={onClose}
    />
  )
}

export default PreMobModeModal
