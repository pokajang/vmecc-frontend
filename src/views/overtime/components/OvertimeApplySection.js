import React, { useEffect, useMemo, useRef } from 'react'
import {
  CCol,
  CForm,
  CFormCheck,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { CalendarCheck2, CalendarDays, Clock3 } from 'lucide-react'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import WorkflowAttachmentField from 'src/components/report-workflow/WorkflowAttachmentField'
import WorkflowChoiceStage from 'src/components/report-workflow/WorkflowChoiceStage'
import WorkflowInlineFeedback from 'src/components/report-workflow/WorkflowInlineFeedback'
import WorkflowSetupField from 'src/components/report-workflow/WorkflowSetupField'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import { focusFirstInvalidField } from 'src/components/report-workflow/workflowFormFocus'
import { formatDuration } from '../utils'

const OVERTIME_TYPE_ICONS = {
  weekday: Clock3,
  weekend: CalendarDays,
  publicHoliday: CalendarCheck2,
}

const OvertimeApplySection = ({
  overtimeTypeConfirmed,
  overtimeType,
  overtimeTypeOptions = [],
  onSelectOvertimeType,
  onContinueOvertimeType,
  onBackToOvertimeType,
  onSubmit,
  claimDate,
  startTime,
  endTime,
  reason,
  fieldErrors,
  onClaimDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onReasonChange,
  durationMinutes,
  isOvernight,
  isOvernightConfirmed = false,
  onOvernightConfirmationChange,
  onClearForm,
  clearButtonLabel = 'Clear form',
  clearingButtonLabel = 'Clearing...',
  isResumeEditMode = false,
  isOvertimeTypeDerived = false,
  submitButtonLabel = 'Submit request',
  submittingButtonLabel = 'Submitting request...',
  isDraftSaving = false,
  isFormClearing = false,
  isSubmittingClaim = false,
  guidanceMessage = '',
  attachment = null,
  onAttachmentChange,
  onAttachmentRemove,
  isAttachmentUploading = false,
  isFormActionBusy = false,
  formActionStatus = '',
  draftFeedback = null,
}) => {
  const formRef = useRef(null)
  const isMobile = useReportIsMobile()
  const visualOvertimeTypeOptions = useMemo(
    () =>
      overtimeTypeOptions.map((option) => ({
        ...option,
        icon: option.icon || OVERTIME_TYPE_ICONS[option.value] || Clock3,
      })),
    [overtimeTypeOptions],
  )
  const selectedOvertimeTypeOption =
    visualOvertimeTypeOptions.find((option) => option.value === overtimeType) ||
    visualOvertimeTypeOptions[0]

  const canRenderFreshTypeSelector =
    !isOvertimeTypeDerived && !overtimeTypeConfirmed && !isResumeEditMode
  const resolvedActionStatus =
    formActionStatus ||
    (isSubmittingClaim
      ? submittingButtonLabel
      : isDraftSaving
        ? 'Saving overtime draft...'
        : isFormClearing
          ? clearingButtonLabel
          : isAttachmentUploading
            ? 'Uploading evidence attachment...'
            : '')

  useEffect(() => {
    if (!formRef.current || Object.keys(fieldErrors || {}).length === 0) return undefined
    const frameId = window.requestAnimationFrame(() => {
      focusFirstInvalidField(formRef.current)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [fieldErrors])

  const renderTypeChoices = () => {
    if (visualOvertimeTypeOptions.length === 0) {
      return (
        <div className="rounded-3 border p-3 bg-light text-body-secondary">
          No overtime type is available. Please contact HR/Admin to configure OT rules.
        </div>
      )
    }

    return (
      <ResponsiveChoiceSelector
        isMobile={isMobile}
        options={visualOvertimeTypeOptions}
        value={overtimeType}
        onChange={(nextType) => onSelectOvertimeType(nextType)}
        showDescription={false}
        variant="standard"
        columns={{ xs: 12, md: 4, lg: 4 }}
        rowClassName="g-2 g-md-3"
        ariaLabel="Choose Overtime Type"
        testIdPrefix="overtime-type"
      />
    )
  }

  if (canRenderFreshTypeSelector) {
    return (
      <div className="d-grid gap-4">
        {visualOvertimeTypeOptions.length > 0 ? (
          <WorkflowChoiceStage
            title="Choose overtime type"
            options={visualOvertimeTypeOptions}
            value={overtimeType}
            onChange={onSelectOvertimeType}
            onContinue={onContinueOvertimeType}
            error={fieldErrors.overtimeType}
            showDescription={false}
            columns={{ xs: 12, md: 4, lg: 4 }}
            rowClassName="g-2 g-md-3"
            variant="standard"
            ariaLabel="Choose Overtime Type"
            testIdPrefix="overtime-type"
            testId="overtime-type-selection"
            advanceOnSelect
          />
        ) : (
          <div className="d-grid gap-3" data-testid="overtime-type-selection">
            <h2 className="h6 mb-0">Choose overtime type</h2>
            {renderTypeChoices()}
          </div>
        )}
      </div>
    )
  }

  return (
    <CForm ref={formRef} onSubmit={onSubmit} data-testid="overtime-apply" noValidate>
      <CRow className="g-3 mb-4">
        <CCol xs={12}>
          {isResumeEditMode && !isOvertimeTypeDerived ? (
            <WorkflowSetupField
              label="Overtime type"
              value={selectedOvertimeTypeOption?.title || overtimeType}
              editing
              error={fieldErrors.overtimeType}
            >
              {renderTypeChoices()}
            </WorkflowSetupField>
          ) : (
            <WorkflowSetupField
              label="Overtime type"
              value={selectedOvertimeTypeOption?.title || 'Overtime Claim'}
              onEdit={!isOvertimeTypeDerived ? onBackToOvertimeType : undefined}
              editLabel="Change overtime type"
              ariaLabel="Selected overtime type"
            />
          )}
        </CCol>
      </CRow>

      <section className="overtime-application-fields" aria-label="Overtime request details">
        <CRow className="g-3">
          {guidanceMessage ? (
            <CCol xs={12}>
              <WorkflowInlineFeedback kind="info" message={guidanceMessage} compact />
            </CCol>
          ) : null}
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="overtime-claim-date">Date</CFormLabel>
            <CFormInput
              id="overtime-claim-date"
              type="date"
              value={claimDate}
              onChange={(event) => onClaimDateChange(event.target.value)}
              invalid={Boolean(fieldErrors.claimDate)}
              aria-invalid={Boolean(fieldErrors.claimDate)}
              aria-describedby={fieldErrors.claimDate ? 'overtime-claim-date-error' : undefined}
            />
            <CFormFeedback id="overtime-claim-date-error" invalid>
              {fieldErrors.claimDate}
            </CFormFeedback>
          </CCol>
          <CCol xs={12} md={8}>
            <CRow className="g-3">
              <CCol xs={6} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="overtime-start-time">Start time</CFormLabel>
                <CFormInput
                  id="overtime-start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => onStartTimeChange(event.target.value)}
                  invalid={Boolean(fieldErrors.startTime || fieldErrors.window)}
                  aria-invalid={Boolean(fieldErrors.startTime || fieldErrors.window)}
                  aria-describedby={
                    fieldErrors.startTime || fieldErrors.window
                      ? 'overtime-start-time-error'
                      : undefined
                  }
                />
                {fieldErrors.startTime ? (
                  <CFormFeedback
                    id="overtime-start-time-error"
                    invalid
                    style={{ display: 'block' }}
                  >
                    {fieldErrors.startTime}
                  </CFormFeedback>
                ) : fieldErrors.window ? (
                  <span id="overtime-start-time-error" className="visually-hidden">
                    {fieldErrors.window}
                  </span>
                ) : null}
              </CCol>
              <CCol xs={6} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="overtime-end-time">End time</CFormLabel>
                <CFormInput
                  id="overtime-end-time"
                  type="time"
                  value={endTime}
                  onChange={(event) => onEndTimeChange(event.target.value)}
                  invalid={Boolean(fieldErrors.endTime || fieldErrors.window)}
                  aria-invalid={Boolean(fieldErrors.endTime || fieldErrors.window)}
                  aria-describedby={
                    fieldErrors.endTime || fieldErrors.window
                      ? 'overtime-end-time-error'
                      : undefined
                  }
                />
                {fieldErrors.endTime ? (
                  <CFormFeedback id="overtime-end-time-error" invalid style={{ display: 'block' }}>
                    {fieldErrors.endTime}
                  </CFormFeedback>
                ) : fieldErrors.window ? (
                  <span id="overtime-end-time-error" className="visually-hidden">
                    {fieldErrors.window}
                  </span>
                ) : null}
              </CCol>
            </CRow>
            <div className="mt-2" data-testid="overtime-utility-panel">
              <div className="small text-muted">
                Overtime duration:{' '}
                <span className="fw-semibold">{formatDuration(durationMinutes)}</span>
                {isOvernight ? (
                  <span className="ms-2 text-warning">Ends on the next day (+1 day).</span>
                ) : null}
              </div>
              {isOvernight ? (
                <div className="mt-2">
                  <CFormCheck
                    id="overtime-overnight-confirmation"
                    checked={isOvernightConfirmed}
                    onChange={(event) => onOvernightConfirmationChange?.(event.target.checked)}
                    label="I confirm this overtime ends on the next day."
                    invalid={Boolean(fieldErrors.window)}
                  />
                </div>
              ) : null}
              {fieldErrors.window ? (
                <div className="small text-danger mt-1">{fieldErrors.window}</div>
              ) : null}
            </div>
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="overtime-reason">Reason / work done</CFormLabel>
            <CFormTextarea
              id="overtime-reason"
              rows={5}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Describe overtime purpose and tasks completed."
              invalid={Boolean(fieldErrors.reason)}
              aria-invalid={Boolean(fieldErrors.reason)}
              aria-describedby={fieldErrors.reason ? 'overtime-reason-error' : undefined}
            />
            <CFormFeedback id="overtime-reason-error" invalid>
              {fieldErrors.reason}
            </CFormFeedback>
          </CCol>
          <CCol xs={12}>
            <WorkflowAttachmentField
              id="overtime-attachment"
              label="Evidence attachment (optional)"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onFileSelect={onAttachmentChange}
              disabled={isFormActionBusy || isAttachmentUploading}
              error={fieldErrors.attachment}
              guidance="PDF, JPG, PNG, DOC, or DOCX up to 10 MB."
              statusLabel={attachment?.id ? 'Evidence ready' : ''}
              statusDetail={
                attachment?.id ? 'The uploaded file will be submitted with this request.' : ''
              }
              statusTone={attachment?.id ? 'success' : 'muted'}
              hasAttachment={Boolean(attachment?.id)}
              onRemove={onAttachmentRemove}
            />
          </CCol>
        </CRow>
      </section>

      <CRow className="g-3">
        <CCol xs={12}>
          <WorkflowStageActions
            className="mt-4"
            ariaLabel="Overtime form actions"
            onReset={onClearForm}
            resetLabel={clearButtonLabel}
            onPrimary={() => {}}
            primaryType="submit"
            primaryLabel={submitButtonLabel}
            primaryTestId="overtime-submit-action"
            primaryBusyLabel={isSubmittingClaim ? submittingButtonLabel : ''}
            isSaving={isFormActionBusy}
            resetDisabled={isFormActionBusy}
            feedback={draftFeedback}
            statusMessage={resolvedActionStatus}
            primaryDisabled={isFormActionBusy}
            primaryFirst
            mobileLayout="stacked-primary-first"
            stackedMobileBehavior="terminal"
          />
        </CCol>
      </CRow>
    </CForm>
  )
}

export default OvertimeApplySection
