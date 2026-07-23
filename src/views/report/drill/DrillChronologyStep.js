import React from 'react'
import { CAlert } from '@coreui/react'
import { ReportChronologySection, ReportMobileContextPanel } from '../components/ReportWorkflowUi'
import { DRILL_FIELD_LIMITS } from './constants'
import DrillStageActions from './DrillStageActions'

const hasOutOfOrderTime = (rows) => {
  let previous = null
  return (Array.isArray(rows) ? rows : []).some((row) => {
    if (!row?.time) return false
    const [hours, minutes] = String(row.time).split(':').map(Number)
    const current = hours * 60 + minutes
    const outOfOrder = previous !== null && current < previous
    previous = current
    return outOfOrder
  })
}

const DrillChronologyStep = ({
  form,
  fieldErrors,
  setFieldErrors,
  addChronology,
  updateChronology,
  removeChronology,
  moveChronology,
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
  blockerMessage,
  isSaving,
}) => {
  const clearChronologyErrorIfValid = (rows) => {
    const meaningful = rows.filter(
      (row) => String(row?.time || '').trim() || String(row?.action || '').trim(),
    )
    if (
      meaningful.length > 0 &&
      meaningful.every((row) => String(row?.time || '').trim() && String(row?.action || '').trim())
    ) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.chronology
        return next
      })
    }
  }
  const handleUpdate = (rowId, patch) => {
    const nextRows = form.chronology.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    updateChronology(rowId, patch)
    clearChronologyErrorIfValid(nextRows)
  }
  const handleRemove = (rowId) => {
    const nextRows = form.chronology.filter((row) => row.id !== rowId)
    removeChronology(rowId)
    clearChronologyErrorIfValid(nextRows)
  }

  return (
    <div className="d-grid gap-3">
      <ReportMobileContextPanel
        title="Drill Context"
        items={[
          { label: 'Type', value: form.incidentType },
          { label: 'Location', value: form.location },
          { label: 'Start', value: [form.reportDate, form.reportTime].filter(Boolean).join(' ') },
          { label: 'Title', value: form.exerciseTitle || form.details },
        ]}
      />
      <div
        data-drill-field="chronology"
        aria-invalid={Boolean(fieldErrors.chronology) || undefined}
      >
        <ReportChronologySection
          title="Chronology of Drill Events"
          actionLabel="Event / Action"
          fieldError={fieldErrors.chronology}
          rows={form.chronology}
          onAddRow={addChronology}
          onUpdateRow={handleUpdate}
          onRemoveRow={handleRemove}
          onMoveRow={moveChronology}
          maxRows={DRILL_FIELD_LIMITS.chronology}
          actionMaxLength={DRILL_FIELD_LIMITS.chronologyAction}
        />
      </div>
      {hasOutOfOrderTime(form.chronology) ? (
        <CAlert color="warning" className="mb-0">
          One event is earlier than the event above it. Confirm the times or reorder the rows.
        </CAlert>
      ) : null}
      <DrillStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={draftStatus}
        blockerMessage={blockerMessage}
        isSaving={isSaving}
      />
    </div>
  )
}

export default DrillChronologyStep
