import React, { useEffect, useRef } from 'react'
import { CButton, CFormInput, CFormLabel, CFormTextarea } from '@coreui/react'
import ResponsiveReportDialog from 'src/components/report-workflow/ResponsiveReportDialog'

const ChronologyRowModal = ({ visible, draft, onClose, onChangeDraft, onSave, onSaveAndNext }) => {
  const isEditing = Boolean(draft?.editId)
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
        <CFormTextarea
          id="chronology-event-action"
          ref={actionRef}
          value={draft?.action || ''}
          placeholder="Describe the event or action..."
          rows={3}
          onChange={(e) => onChangeDraft({ action: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (!e.metaKey && !e.ctrlKey) return
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

  return (
    <ResponsiveReportDialog
      visible={visible}
      title={title}
      onClose={onClose}
      footer={actions}
      desktopFullscreen="sm"
      scrollable
    >
      {body}
    </ResponsiveReportDialog>
  )
}

export default ChronologyRowModal
