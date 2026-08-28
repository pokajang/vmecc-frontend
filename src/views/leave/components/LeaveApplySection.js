import React, { useEffect, useRef } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { Upload } from 'lucide-react'
import { formatCameraDiagnosticsLines } from 'src/utils/cameraDiagnostics'
import WorkflowAttachmentField from 'src/components/report-workflow/WorkflowAttachmentField'
import WorkflowInlineFeedback from 'src/components/report-workflow/WorkflowInlineFeedback'
import WorkflowSetupField from 'src/components/report-workflow/WorkflowSetupField'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import { focusFirstInvalidField } from 'src/components/report-workflow/workflowFormFocus'
import LeaveTypeSelection from 'src/views/leave/components/LeaveTypeSelection'

const LeaveApplySection = ({
  leaveTypeConfirmed,
  leaveType,
  onSelectLeaveType,
  onContinueLeaveType,
  onBackToLeaveType,
  onSubmit,
  selectedLeaveTypeOption,
  balanceStats,
  balanceSummary,
  workShift,
  handleShiftChange,
  shiftOptions,
  selectedShiftConfig,
  startDate,
  handleStartDateChange,
  startTimeSlot,
  handleStartTimeChange,
  endDate,
  handleEndDateChange,
  endTimeSlot,
  handleEndTimeChange,
  fieldErrors,
  activeFieldRule,
  coverBy,
  onCoverByChange,
  handleAttachmentChange,
  openCameraCapture,
  requestUploadFromCameraFallback,
  isAttachmentProcessing,
  cameraInputRef,
  uploadInputRef,
  cameraUploadFallback,
  clearCameraUploadFallback,
  attachmentStatus,
  attachmentMeta,
  clearAttachment,
  requestedDays,
  formatDayCount,
  reason,
  onReasonChange,
  onClearForm,
  isSubmitBlockedByBalance,
  editingRecordId,
  guidanceMessage = '',
  rosterImpact = null,
  isSubmitting = false,
  draftFeedback = null,
}) => {
  const formRef = useRef(null)

  useEffect(() => {
    if (!formRef.current || Object.keys(fieldErrors || {}).length === 0) return undefined
    const frameId = window.requestAnimationFrame(() => focusFirstInvalidField(formRef.current))
    return () => window.cancelAnimationFrame(frameId)
  }, [fieldErrors])

  return (
    <>
      {!leaveTypeConfirmed ? (
        <LeaveTypeSelection
          selectedType={leaveType}
          onSelect={onSelectLeaveType}
          onContinue={onContinueLeaveType}
        />
      ) : (
        <CForm ref={formRef} onSubmit={onSubmit} data-testid="leave-apply" noValidate>
          <CRow className="g-3 mb-4 align-items-stretch">
            <CCol xs={12} md={5} lg={4}>
              <WorkflowSetupField
                className="h-100"
                label="Leave type"
                value={selectedLeaveTypeOption?.title || leaveType}
                onEdit={onBackToLeaveType}
                editLabel="Change leave type"
                ariaLabel="Selected leave type"
              />
            </CCol>
            <CCol xs={12} md={7} lg={8}>
              <div className="leave-balance h-100" data-testid="leave-balance">
                <WorkflowSummaryList title="Leave balance" items={balanceStats} variant="metrics" />
                {!balanceSummary.hasAssignment && (
                  <WorkflowInlineFeedback
                    className="mt-3"
                    compact
                    kind="error"
                    title="Assignment required"
                    message={`No assignment found for ${leaveType} (${balanceSummary.year}).`}
                  />
                )}
                {balanceSummary.hasAssignment && balanceSummary.isZeroEntitlement && (
                  <WorkflowInlineFeedback
                    className="mt-3"
                    compact
                    kind="error"
                    title="No entitlement"
                    message="Entitlement is 0 day(s). Submission is blocked until HR/HQ updates assignment."
                  />
                )}
                {leaveType === 'Other Leave' && (
                  <WorkflowInlineFeedback
                    className="mt-3"
                    compact
                    kind="info"
                    message="Requires HR/HQ review and written justification."
                  />
                )}
              </div>
            </CCol>
          </CRow>
          <section className="leave-application-fields" aria-label="Leave request details">
            <CRow className="g-3">
              {guidanceMessage ? (
                <CCol xs={12}>
                  <WorkflowInlineFeedback kind="info" message={guidanceMessage} compact />
                </CCol>
              ) : null}
              {rosterImpact?.summary?.duty_count ? (
                <CCol xs={12} data-testid="leave-roster-impact">
                  <WorkflowInlineFeedback
                    kind="warning"
                    compact
                    title="Roster duty detected"
                    message={`${rosterImpact.items
                      .map((item) => `${item.shift_label} shift, ${item.team_name}, ${item.date}`)
                      .join('; ')}. Your leave request can still be submitted.`}
                  />
                </CCol>
              ) : null}
              <CCol md={4}>
                <CFormLabel htmlFor="leave-work-shift">Work shift</CFormLabel>
                <CFormSelect id="leave-work-shift" value={workShift} onChange={handleShiftChange}>
                  {shiftOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
                {selectedShiftConfig.note && (
                  <div className="small text-muted mt-1">{selectedShiftConfig.note}</div>
                )}
              </CCol>
              <CCol xs={6} md={2} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="leave-start-date">Start date</CFormLabel>
                <CFormInput
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  invalid={Boolean(fieldErrors.startDate)}
                  aria-invalid={Boolean(fieldErrors.startDate)}
                  aria-describedby={fieldErrors.startDate ? 'leave-start-date-error' : undefined}
                />
                <CFormFeedback id="leave-start-date-error" invalid>
                  {fieldErrors.startDate}
                </CFormFeedback>
              </CCol>
              <CCol xs={6} md={2} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="leave-start-time">Start time</CFormLabel>
                <CFormSelect
                  id="leave-start-time"
                  value={startTimeSlot}
                  onChange={handleStartTimeChange}
                  invalid={Boolean(fieldErrors.schedule)}
                  aria-invalid={Boolean(fieldErrors.schedule)}
                  aria-describedby={fieldErrors.schedule ? 'leave-schedule-error' : undefined}
                >
                  {selectedShiftConfig.startOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={6} md={2} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="leave-end-date">End date</CFormLabel>
                <CFormInput
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  min={startDate || undefined}
                  invalid={Boolean(fieldErrors.endDate)}
                  aria-invalid={Boolean(fieldErrors.endDate)}
                  aria-describedby={fieldErrors.endDate ? 'leave-end-date-error' : undefined}
                />
                <CFormFeedback id="leave-end-date-error" invalid>
                  {fieldErrors.endDate}
                </CFormFeedback>
              </CCol>
              <CCol xs={6} md={2} className="workflow-compact-stack-field">
                <CFormLabel htmlFor="leave-end-time">End time</CFormLabel>
                <CFormSelect
                  id="leave-end-time"
                  value={endTimeSlot}
                  onChange={handleEndTimeChange}
                  invalid={Boolean(fieldErrors.schedule)}
                  aria-invalid={Boolean(fieldErrors.schedule)}
                  aria-describedby={fieldErrors.schedule ? 'leave-schedule-error' : undefined}
                >
                  {selectedShiftConfig.endOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
                {fieldErrors.schedule ? (
                  <CFormFeedback id="leave-schedule-error" invalid style={{ display: 'block' }}>
                    {fieldErrors.schedule}
                  </CFormFeedback>
                ) : null}
              </CCol>
              {(activeFieldRule.showCoverage || activeFieldRule.showAttachment) && (
                <>
                  {activeFieldRule.showCoverage && (
                    <CCol md={6}>
                      <CFormLabel htmlFor="leave-cover-by">
                        Coverage by ({activeFieldRule.coverageRequired ? 'required' : 'optional'})
                      </CFormLabel>
                      <CFormInput
                        id="leave-cover-by"
                        value={coverBy}
                        onChange={(event) => onCoverByChange(event.target.value)}
                        placeholder="Name of teammate covering your duties"
                        invalid={Boolean(fieldErrors.coverBy)}
                        aria-invalid={Boolean(fieldErrors.coverBy)}
                        aria-describedby={fieldErrors.coverBy ? 'leave-cover-by-error' : undefined}
                      />
                      <CFormFeedback id="leave-cover-by-error" invalid>
                        {fieldErrors.coverBy}
                      </CFormFeedback>
                    </CCol>
                  )}
                  {activeFieldRule.showAttachment && (
                    <CCol md={6} data-testid="leave-attachments">
                      {cameraUploadFallback ? (
                        <CAlert
                          color="warning"
                          className="mb-2"
                          dismissible
                          onClose={() => {
                            if (clearCameraUploadFallback) clearCameraUploadFallback()
                          }}
                        >
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                              <div className="small">{cameraUploadFallback.message}</div>
                              <CButton
                                type="button"
                                color="warning"
                                size="sm"
                                onClick={() => {
                                  if (clearCameraUploadFallback) clearCameraUploadFallback()
                                  if (requestUploadFromCameraFallback)
                                    requestUploadFromCameraFallback()
                                }}
                              >
                                <Upload size={14} className="me-1" />
                                Upload photo
                              </CButton>
                            </div>
                            {cameraUploadFallback.diagnostics ? (
                              <details className="small">
                                <summary>Camera diagnostics</summary>
                                <div className="mt-2 d-grid gap-1">
                                  {formatCameraDiagnosticsLines(
                                    cameraUploadFallback.diagnostics,
                                  ).map((line) => (
                                    <div key={line}>{line}</div>
                                  ))}
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </CAlert>
                      ) : null}
                      <WorkflowAttachmentField
                        id="leave-attachment"
                        label="Supporting attachment"
                        required={activeFieldRule.attachmentRequired}
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleAttachmentChange}
                        disabled={isAttachmentProcessing}
                        error={fieldErrors.attachment}
                        guidance="Images or PDF only. Large images are compressed automatically."
                        statusLabel={attachmentStatus?.label || ''}
                        statusDetail={attachmentStatus?.detail || ''}
                        statusTone={attachmentStatus?.tone || 'muted'}
                        hasAttachment={Boolean(attachmentMeta?.name)}
                        onRemove={clearAttachment}
                        onCamera={openCameraCapture}
                        cameraInput={
                          <CFormInput
                            type="file"
                            aria-label="Take leave attachment photo"
                            accept="image/*"
                            capture="environment"
                            className="d-none"
                            ref={cameraInputRef}
                            onChange={handleAttachmentChange}
                          />
                        }
                        uploadInput={
                          <input
                            type="file"
                            aria-label="Upload leave attachment from device"
                            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                            className="d-none"
                            ref={uploadInputRef}
                            onChange={handleAttachmentChange}
                          />
                        }
                      />
                    </CCol>
                  )}
                </>
              )}
              <CCol xs={12}>
                <div className="small text-muted">
                  Requested leave:{' '}
                  <span className="fw-semibold">{formatDayCount(requestedDays)} day(s)</span>
                </div>
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="leave-reason">Reason</CFormLabel>
                <CFormTextarea
                  id="leave-reason"
                  rows={5}
                  value={reason}
                  onChange={(event) => onReasonChange(event.target.value)}
                  placeholder={
                    leaveType === 'Annual Leave'
                      ? 'Briefly describe leave reason.'
                      : 'Briefly describe leave reason and handover context.'
                  }
                  invalid={Boolean(fieldErrors.reason)}
                  aria-invalid={Boolean(fieldErrors.reason)}
                  aria-describedby={fieldErrors.reason ? 'leave-reason-error' : undefined}
                />
                <CFormFeedback id="leave-reason-error" invalid>
                  {fieldErrors.reason}
                </CFormFeedback>
              </CCol>
            </CRow>
          </section>
          <WorkflowStageActions
            className="mt-4"
            ariaLabel="Leave form actions"
            onReset={onClearForm}
            resetLabel="Clear form"
            onPrimary={() => {}}
            primaryType="submit"
            primaryLabel={editingRecordId ? 'Update request' : 'Submit request'}
            primaryBusyLabel="Submitting request..."
            primaryTestId="leave-submit-action"
            primaryDisabled={isSubmitBlockedByBalance || isAttachmentProcessing || isSubmitting}
            isSaving={isSubmitting || isAttachmentProcessing}
            feedback={draftFeedback}
            statusMessage={
              isSubmitting
                ? 'Submitting leave request...'
                : isAttachmentProcessing
                  ? 'Processing attachment...'
                  : ''
            }
            primaryFirst
            mobileLayout="stacked-primary-first"
            stackedMobileBehavior="terminal"
          />
        </CForm>
      )}
    </>
  )
}

export default LeaveApplySection
