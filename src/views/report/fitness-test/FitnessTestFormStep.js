import React from 'react'
import { CButton, CFormFeedback, CFormLabel, CFormTextarea } from '@coreui/react'
import {
  ReportBasicPathSummary,
  ReportChronologySection,
  ReportMobileActionGroup,
  ReportMobileContextPanel,
} from '../components/ReportWorkflowUi'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'

const FitnessTestFormStep = ({
  form,
  fieldErrors,
  setForm,
  onEditSetup,
  addChronology,
  updateChronology,
  removeChronology,
  onClear,
  onSaveDraft,
  saveLabel = 'Save Draft',
  submitLabel = 'Submit Report',
  draftStatus = '',
  pushToast,
  photoProcessing = false,
  onPhotoProcessingChange,
}) => {
  const dateTimeLabel = [form.reportDate, form.reportTime].filter(Boolean).join(' ')
  const chronologyCount = Array.isArray(form.chronology) ? form.chronology.length : 0
  const contextItems = [
    { label: 'Type', value: form.incidentType },
    { label: 'Condition', value: form.weather },
    { label: 'Location', value: form.location },
    { label: 'Date & Time', value: dateTimeLabel },
    { label: 'Chronology', value: `${chronologyCount} rows` },
  ]

  return (
    <>
      <ReportMobileContextPanel title="Test Context" items={contextItems} />
      <ReportBasicPathSummary
        title="Basic Report Path"
        description=""
        mobileSummary={`${form.incidentType || '-'} - ${form.location || '-'} - ${chronologyCount} chronology row${chronologyCount === 1 ? '' : 's'}`}
        items={contextItems}
      />

      <div className="mb-3 d-grid gap-3">
        <div className="d-none d-md-flex justify-content-end">
          <CButton type="button" color="link" size="sm" className="p-0" onClick={onEditSetup}>
            Edit Setup
          </CButton>
        </div>
        <div
          data-fitness-test-field="details"
          aria-invalid={Boolean(fieldErrors.details) || undefined}
        >
          <CFormLabel htmlFor="fitness-test-details" className="fw-semibold text-muted">
            Test details
          </CFormLabel>
          <CFormTextarea
            id="fitness-test-details"
            rows={3}
            value={form.details}
            invalid={Boolean(fieldErrors.details)}
            onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
          />
          <CFormFeedback invalid>{fieldErrors.details}</CFormFeedback>
        </div>
        <div
          data-fitness-test-field="summary"
          aria-invalid={Boolean(fieldErrors.summary) || undefined}
        >
          <CFormLabel htmlFor="fitness-test-summary" className="fw-semibold text-muted">
            Test summary
          </CFormLabel>
          <CFormTextarea
            id="fitness-test-summary"
            rows={4}
            value={form.summary}
            invalid={Boolean(fieldErrors.summary)}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
          />
          <CFormFeedback invalid>{fieldErrors.summary}</CFormFeedback>
        </div>
        <ReportPhotoSection
          moduleKey="fitness-test"
          title="Fitness test photographs"
          photos={form.photos}
          onChange={(photos) => setForm((previous) => ({ ...previous, photos }))}
          pushToast={pushToast}
          allowCapture={false}
          onProcessingChange={onPhotoProcessingChange}
          emptyMessage="No photos."
          descriptionMaxLength={2000}
        />
      </div>

      <div
        data-fitness-test-field="chronology"
        aria-invalid={Boolean(fieldErrors.chronology) || undefined}
      >
        <ReportChronologySection
          title="Chronology of Test Activities"
          actionLabel="Activity / Observation"
          fieldError={fieldErrors.chronology}
          rows={form.chronology}
          onAddRow={addChronology}
          onUpdateRow={updateChronology}
          onRemoveRow={removeChronology}
        />
      </div>

      <div className="d-none d-md-flex flex-md-row justify-content-end gap-2 mb-4">
        {draftStatus ? (
          <div className="small text-body-secondary me-md-auto align-self-md-center">
            {draftStatus}
          </div>
        ) : null}
        <CButton type="button" color="light" disabled={photoProcessing} onClick={onClear}>
          Reset
        </CButton>
        <CButton
          type="button"
          color="secondary"
          disabled={photoProcessing}
          onClick={() => onSaveDraft()}
        >
          {saveLabel}
        </CButton>
        <CButton type="submit" color="primary" disabled={photoProcessing}>
          {submitLabel}
        </CButton>
      </div>
      <div className="d-md-none">
        <ReportMobileActionGroup
          onSaveDraft={onSaveDraft}
          saveLabel={saveLabel}
          primaryLabel={submitLabel}
          primaryType="submit"
          saveDisabled={photoProcessing}
          primaryDisabled={photoProcessing}
          statusMessage={photoProcessing ? 'Uploading fitness test photo…' : draftStatus}
        />
      </div>
    </>
  )
}

export default FitnessTestFormStep
