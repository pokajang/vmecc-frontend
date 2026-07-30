import React, { useState } from 'react'
import { CButton, CCol, CFormFeedback, CFormInput, CFormLabel, CRow } from '@coreui/react'
import { CheckCircle2, Clock3 } from 'lucide-react'
import MobileSetupSummaryList from 'src/components/report-workflow/MobileSetupSummaryList'
import useReportIsMobile from '../hooks/useReportIsMobile'
import { FITNESS_PROTOCOL, FITNESS_REPORT_OPTION } from './constants'
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
  const isMobile = useReportIsMobile()
  const [isEditingReportingMonth, setIsEditingReportingMonth] = useState(
    () => !String(form.reportingMonth || '').trim(),
  )
  const hasReportingMonth = Boolean(String(form.reportingMonth || '').trim())
  const showReportingMonthEditor =
    !isMobile ||
    isEditingReportingMonth ||
    !hasReportingMonth ||
    Boolean(fieldErrors.reportingMonth)

  const setReportingMonth = (value) => {
    setIsEditingReportingMonth(true)
    setForm((current) => ({ ...current, reportingMonth: value }))
    if (/^\d{4}-\d{2}$/.test(value)) clearError('reportingMonth')
  }
  const mobileSetupSummaryItems = isMobile
    ? [
        {
          key: 'type',
          label: 'Type',
          value: FITNESS_REPORT_OPTION.title,
        },
        hasReportingMonth && !showReportingMonthEditor
          ? {
              key: 'reporting-period',
              label: 'Reporting Period',
              value: form.reportingMonth,
              editLabel: 'Edit Reporting Period',
              onEdit: () => setIsEditingReportingMonth(true),
            }
          : null,
      ].filter(Boolean)
    : []

  return (
    <div className="mb-3 d-grid gap-4" data-testid="fitness-test-report-setup-ready">
      {mobileSetupSummaryItems.length > 0 ? (
        <MobileSetupSummaryList
          ariaLabel="Fitness Test setup summary"
          items={mobileSetupSummaryItems}
        />
      ) : null}
      <section className="d-grid gap-3" data-fitness-test-field="reportingMonth">
        <h3 className="h6 mb-0">Reporting period</h3>
        <CRow className="g-3">
          {showReportingMonthEditor ? (
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
              {isMobile && hasReportingMonth && !fieldErrors.reportingMonth ? (
                <div className="d-flex justify-content-end mt-2">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReportingMonth(false)}
                  >
                    Done
                  </CButton>
                </div>
              ) : null}
            </CCol>
          ) : null}
        </CRow>
      </section>

      <details className="rounded-3 border">
        <summary className="p-3 fw-semibold">View assessment protocol</summary>
        <div className="px-3 pb-3 d-grid gap-3">
          <CRow className="g-3">
            <CCol xs={7} md={4} lg={3}>
              <CFormLabel htmlFor="fitness-document-reference">Document reference</CFormLabel>
              <CFormInput id="fitness-document-reference" value={form.documentReference} readOnly />
            </CCol>
            <CCol xs={5} md={3} lg={2}>
              <CFormLabel htmlFor="fitness-protocol-revision">Revision</CFormLabel>
              <CFormInput id="fitness-protocol-revision" value={form.protocolRevision} readOnly />
            </CCol>
          </CRow>
          <CRow className="g-3">
            <CCol xs={12} lg={5}>
              <div className="rounded-3 border p-3 h-100 d-grid gap-2">
                <div className="d-flex align-items-center gap-2 fw-semibold">
                  <CheckCircle2 size={18} className="text-primary" /> Fitness test
                </div>
                <div className="small text-body-secondary">
                  {FITNESS_PROTOCOL.fitness.timeLimitSeconds} seconds per station
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
                <div className="small text-body-secondary">Six checkpoints · under 5 minutes</div>
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
        </div>
      </details>

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
