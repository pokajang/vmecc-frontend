import React, { useEffect, useRef } from 'react'
import { CButton, CFormFeedback, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'
import ResponsiveReportDialog from 'src/components/report-workflow/ResponsiveReportDialog'
import useReportIsMobile from 'src/hooks/useReportIsMobile'

const ParticipantFields = ({ draft, setDraft, shifts, error, nameInputRef }) => {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  return (
    <div className="d-grid gap-3">
      <div>
        <CFormLabel htmlFor="fitness-participant-name">Name</CFormLabel>
        <CFormInput
          ref={nameInputRef}
          id="fitness-participant-name"
          maxLength={190}
          value={draft.name}
          invalid={Boolean(error)}
          aria-describedby={error ? 'fitness-participant-error' : undefined}
          onChange={(event) => update('name', event.target.value)}
        />
      </div>
      <div>
        <CFormLabel htmlFor="fitness-participant-role">Role (optional)</CFormLabel>
        <CFormInput
          id="fitness-participant-role"
          maxLength={190}
          value={draft.role}
          onChange={(event) => update('role', event.target.value)}
        />
      </div>
      <div>
        <CFormLabel htmlFor="fitness-participant-age">Age</CFormLabel>
        <CFormInput
          id="fitness-participant-age"
          type="number"
          min="18"
          max="100"
          inputMode="numeric"
          value={draft.age}
          onChange={(event) => update('age', event.target.value)}
        />
      </div>
      <div>
        <CFormLabel htmlFor="fitness-participant-shift">Shift group</CFormLabel>
        <CFormSelect
          id="fitness-participant-shift"
          value={draft.shift}
          onChange={(event) => update('shift', event.target.value)}
        >
          <option value="">Choose shift</option>
          {shifts.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
          <option value="__new__">Add new shift...</option>
        </CFormSelect>
      </div>
      {draft.shift === '__new__' ? (
        <div>
          <CFormLabel htmlFor="fitness-participant-new-shift">New shift name</CFormLabel>
          <CFormInput
            id="fitness-participant-new-shift"
            maxLength={100}
            value={draft.newShift}
            onChange={(event) => update('newShift', event.target.value)}
          />
        </div>
      ) : null}
      {error ? (
        <CFormFeedback id="fitness-participant-error" invalid className="d-block">
          {error}
        </CFormFeedback>
      ) : null}
    </div>
  )
}

const FitnessParticipantModal = ({ visible, draft, setDraft, shifts, error, onClose, onSave }) => {
  const isMobile = useReportIsMobile()
  const nameInputRef = useRef(null)
  useEffect(() => {
    if (!visible) return undefined
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 120)
    return () => window.clearTimeout(focusTimer)
  }, [isMobile, visible])
  const fields = (
    <ParticipantFields
      draft={draft}
      setDraft={setDraft}
      shifts={shifts}
      error={error}
      nameInputRef={nameInputRef}
    />
  )
  const actions = (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="primary" onClick={onSave}>
        Add Participant
      </CButton>
    </>
  )

  return (
    <ResponsiveReportDialog
      visible={visible}
      title="Add Participant"
      onClose={onClose}
      footer={actions}
      mobileContentClassName="d-grid gap-3"
      footerClassName="fitness-participant-drawer__footer"
    >
      {fields}
    </ResponsiveReportDialog>
  )
}

export default FitnessParticipantModal
