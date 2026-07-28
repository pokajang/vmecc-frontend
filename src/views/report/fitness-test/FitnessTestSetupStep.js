import React from 'react'
import { CAlert, CCol, CFormFeedback, CFormInput, CFormLabel, CRow } from '@coreui/react'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { FITNESS_PROTOCOL } from './constants'
import FitnessStageActions from './FitnessStageActions'

const FitnessTestSetupStep = ({
  form,
  setForm,
  fieldErrors,
  clearError,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
}) => {
  const setReportingMonth = (value) => {
    setForm((current) => ({ ...current, reportingMonth: value }))
    clearError('reportingMonth')
  }

  return (
    <div className="mb-3 d-grid gap-4" data-testid="fitness-test-report-setup-ready">
      <section className="d-grid gap-3" data-fitness-test-field="reportingMonth">
        <div>
          <h3 className="h6 mb-1">Reporting period</h3>
          <p className="small text-body-secondary mb-0">
            Create one consolidated physical test report for the selected month.
          </p>
        </div>
        <CRow className="g-3">
          <CCol xs={12} md={5} lg={4}>
            <CFormLabel htmlFor="fitness-reporting-month">Reporting month</CFormLabel>
            <CFormInput
              id="fitness-reporting-month"
              type="month"
              value={form.reportingMonth}
              invalid={Boolean(fieldErrors.reportingMonth)}
              onChange={(event) => setReportingMonth(event.target.value)}
            />
            <CFormFeedback invalid>{fieldErrors.reportingMonth}</CFormFeedback>
          </CCol>
          <CCol xs={7} md={4} lg={3}>
            <CFormLabel htmlFor="fitness-document-reference">Document reference</CFormLabel>
            <CFormInput id="fitness-document-reference" value={form.documentReference} readOnly />
          </CCol>
          <CCol xs={5} md={3} lg={2}>
            <CFormLabel htmlFor="fitness-protocol-revision">Revision</CFormLabel>
            <CFormInput id="fitness-protocol-revision" value={form.protocolRevision} readOnly />
          </CCol>
        </CRow>
      </section>

      <section className="d-grid gap-3" aria-labelledby="fitness-protocol-title">
        <div>
          <h3 id="fitness-protocol-title" className="h6 mb-1">
            Assessment protocol
          </h3>
          <p className="small text-body-secondary mb-0">
            Results are calculated from the approved thresholds; no manual pass/fail checkbox is
            used.
          </p>
        </div>
        <CRow className="g-3">
          <CCol xs={12} lg={5}>
            <div className="rounded-3 border p-3 h-100 d-grid gap-2">
              <div className="d-flex align-items-center gap-2 fw-semibold">
                <CheckCircle2 size={18} className="text-primary" /> Fitness test
              </div>
              <div className="small text-body-secondary">
                Each station is completed within {FITNESS_PROTOCOL.fitness.timeLimitSeconds}{' '}
                seconds.
              </div>
              <ul className="small mb-0 ps-3">
                <li>{FITNESS_PROTOCOL.fitness.sitUps} sit-ups</li>
                <li>{FITNESS_PROTOCOL.fitness.jumpingJacks} jumping jacks</li>
                <li>{FITNESS_PROTOCOL.fitness.pushUps} push-ups</li>
              </ul>
            </div>
          </CCol>
          <CCol xs={12} lg={7}>
            <div className="rounded-3 border p-3 h-100 d-grid gap-2">
              <div className="d-flex align-items-center gap-2 fw-semibold">
                <Clock3 size={18} className="text-primary" /> Proficiency test
              </div>
              <div className="small text-body-secondary">
                Complete all six checkpoints in under 5 minutes.
              </div>
              <ol className="small mb-0 ps-3">
                {FITNESS_PROTOCOL.proficiency.checkpoints.map((checkpoint) => (
                  <li key={checkpoint.id}>
                    <strong>{checkpoint.id.toUpperCase()}:</strong> {checkpoint.label}
                  </li>
                ))}
              </ol>
            </div>
          </CCol>
        </CRow>
        {fieldErrors.reportingMonth ? (
          <CAlert color="danger">{fieldErrors.reportingMonth}</CAlert>
        ) : null}
      </section>

      <FitnessStageActions
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={draftStatus}
      />
    </div>
  )
}

export default FitnessTestSetupStep
