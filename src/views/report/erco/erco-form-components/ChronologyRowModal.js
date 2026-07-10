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

const ChronologyRowModal = ({ visible, draft, onClose, onChangeDraft, onSave, onSaveAndNext }) => {
  const isEditing = Boolean(draft?.editId)
  const actionRef = useRef(null)

  useEffect(() => {
    if (visible) {
      const timer = window.setTimeout(() => actionRef.current?.focus(), 120)
      return () => window.clearTimeout(timer)
    }
  }, [visible])

  return (
    <CModal visible={visible} alignment="center" onClose={onClose} fullscreen="sm" scrollable>
      <CModalHeader>
        <CModalTitle>{isEditing ? 'Edit event' : 'Add event'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
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
      </CModalBody>
      <CModalFooter>
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
      </CModalFooter>
    </CModal>
  )
}

export default ChronologyRowModal
