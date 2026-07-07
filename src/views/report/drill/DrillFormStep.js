import React from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import {
  ReportBasicPathSummary,
  ReportChronologySection,
  ReportMobileContextPanel,
  ReportSetupActions,
} from '../components/ReportWorkflowUi'

const DrillFormStep = ({
  form,
  fieldErrors,
  setForm,
  setSetupConfirmed,
  addChronology,
  updateChronology,
  removeChronology,
  onClear,
  onSaveDraft,
  submitLabel = 'Submit Report',
}) => {
  const dateTimeLabel = [form.reportDate, form.reportTime].filter(Boolean).join(' ')
  const chronologyCount = Array.isArray(form.chronology) ? form.chronology.length : 0
  const contextItems = [
    { label: 'Type', value: form.incidentType },
    { label: 'Environment', value: form.weather },
    { label: 'Location', value: form.location },
    { label: 'Date & Time', value: dateTimeLabel },
    { label: 'Chronology', value: `${chronologyCount} rows` },
  ]

  return (
    <>
      <ReportMobileContextPanel title="Drill Context" items={contextItems} />
      <ReportBasicPathSummary
        title="Basic Report Path"
        description="Complete the drill scenario and outcome summary first. Chronology remains available below when needed."
        mobileSummary={`${form.incidentType || '-'} - ${form.location || '-'} - ${chronologyCount} chronology row${chronologyCount === 1 ? '' : 's'}`}
        items={contextItems}
      />

      <div className="mb-3 d-grid gap-3">
        <div>
          <CFormLabel className="fw-semibold text-muted">Describe Drill Scenario</CFormLabel>
          <CFormTextarea
            rows={3}
            value={form.details}
            invalid={Boolean(fieldErrors.details)}
            onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
          />
        </div>
        <div>
          <CFormLabel className="fw-semibold text-muted">Outcome Summary</CFormLabel>
          <CFormTextarea
            rows={4}
            value={form.summary}
            invalid={Boolean(fieldErrors.summary)}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
          />
        </div>
      </div>

      <ReportChronologySection
        title="Chronology of Drill Actions"
        actionLabel="Event / Action"
        fieldError={fieldErrors.chronology}
        rows={form.chronology}
        onAddRow={addChronology}
        onUpdateRow={updateChronology}
        onRemoveRow={removeChronology}
      />

      <div className="d-none d-md-flex flex-md-row justify-content-end gap-2 mb-4">
        <CButton type="button" color="light" onClick={() => setSetupConfirmed(false)}>
          Back
        </CButton>
        <CButton type="button" color="light" onClick={onClear}>
          Reset
        </CButton>
        <CButton type="button" color="secondary" onClick={() => onSaveDraft()}>
          Save Draft
        </CButton>
        <CButton type="submit" color="primary">
          {submitLabel}
        </CButton>
      </div>
      <div className="d-md-none">
        <ReportSetupActions
          onSaveDraft={onSaveDraft}
          continueLabel={submitLabel}
          primaryType="submit"
        />
      </div>
    </>
  )
}

export default DrillFormStep
