import React from 'react'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import AppButton from 'src/components/AppButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ClaimPostSubmitModal = ({ visible, claimId, onClose, onBack }) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const body = claimId
    ? `Claim ${claimId} was submitted for review. It remains subject to approval.`
    : 'Your claim was submitted for review. It remains subject to approval.'
  const createAnotherAction = (
    <AppButton intent="neutral" onClick={onClose}>
      Create another claim
    </AppButton>
  )
  const claimsListAction = (
    <AppButton intent="primary" presentation="solid" onClick={onBack}>
      Go to claims list
    </AppButton>
  )
  const actions = (
    <ActionButtonGroup
      layout={isMobileDrawer ? 'stack' : 'inline'}
      ariaLabel="Submitted claim actions"
    >
      {isMobileDrawer ? (
        <>
          {claimsListAction}
          {createAnotherAction}
        </>
      ) : (
        <>
          {createAnotherAction}
          {claimsListAction}
        </>
      )}
    </ActionButtonGroup>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title="Claim submitted"
        className="mobile-bottom-drawer--confirm"
        onClose={onClose}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer">{actions}</div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Claim submitted</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ClaimPostSubmitModal
