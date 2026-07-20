import React, { useEffect, useRef } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useIsMobile from './useIsMobile'

const ChronologyRowModal = ({ visible, draft, onClose, onChangeDraft, onSave, onSaveAndNext }) => {
  const isEditing = Boolean(draft?.editId)
  const isMobile = useIsMobile()
  const actionRef = useRef(null)

  useEffect(() => {
    if (visible) {
      const timer = window.setTimeout(() => actionRef.current?.focus(), 120)
      return () => window.clearTimeout(timer)
    }
  }, [visible])

  const title = isEditing ? 'Edit event' : 'Add event'
  const body = (
    <div className="d-grid gap-3">
      <div>
        <CFormLabel htmlFor="chronology-event-time">Time</CFormLabel>
        <CFormInput
          id="chronology-event-time"
          type="time"
          value={draft?.time || ''}
          onChange={(e) => onChangeDraft({ time: e.target.value })}
        />
      </div>
      <div>
        <CFormLabel htmlFor="chronology-event-action">Event / action</CFormLabel>
        <CFormInput
          id="chronology-event-action"
          ref={actionRef}
          value={draft?.action || ''}
          placeholder="Describe the event or action..."
          onChange={(e) => onChangeDraft({ action: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (isEditing) onSave()
            else onSaveAndNext()
          }}
        />
      </div>
    </div>
  )
  const actions = (
    <>
      <CButton color="secondary" variant="outline" onClick={onClose}>
        Cancel
      </CButton>
      {!isEditing ? (
        <CButton color="secondary" variant="outline" onClick={onSaveAndNext}>
          Save &amp; add next
        </CButton>
      ) : null}
      <CButton color="primary" onClick={onSave}>
        Save
      </CButton>
    </>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer visible={visible} title={title} onClose={onClose}>
        {body}
        <div className="mobile-bottom-drawer__footer d-flex flex-wrap justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} alignment="center" onClose={onClose} fullscreen="sm" scrollable>
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ChronologyRowModal
