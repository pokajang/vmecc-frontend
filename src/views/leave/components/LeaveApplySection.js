import React from 'react'
import {
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
import { Camera, Pencil } from 'lucide-react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import LeaveTypeSelection from 'src/views/leave/components/LeaveTypeSelection'

const LeaveApplySection = ({
  leaveTypeConfirmed,
  leaveType,
  onSelectLeaveType,
  onContinueLeaveType,
  onBack,
  onBackToLeaveType,
  onSubmit,
  selectedLeaveTypeOption,
  SelectedLeaveIcon,
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
  isAttachmentProcessing,
  cameraInputRef,
  attachmentStatus,
  attachmentMeta,
  clearAttachment,
  requestedDays,
  formatDayCount,
  reason,
  onReasonChange,
  onClearForm,
  onDraft,
  isSubmitBlockedByBalance,
  editingRecordId,
  guidanceMessage = '',
}) => (
  <>
    {!leaveTypeConfirmed ? (
      <LeaveTypeSelection
        selectedType={leaveType}
        onSelect={onSelectLeaveType}
        onContinue={onContinueLeaveType}
        onBack={onBack}
      />
    ) : (
      <CForm onSubmit={onSubmit}>
        <div className="mb-3">
          <BackButton onClick={onBackToLeaveType} label="Back" />
        </div>
        <CRow className="g-3 mb-3 align-items-stretch">
          <CCol xs={12} md={5} lg={4}>
            <div className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3 h-100">
              <div className="d-flex align-items-start gap-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center text-primary"
                  style={{ flex: '0 0 auto', lineHeight: 0 }}
                >
                  {SelectedLeaveIcon ? <SelectedLeaveIcon size={20} /> : null}
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="small text-body-secondary mb-1">Application Type</div>
                  <div className="fw-semibold">{selectedLeaveTypeOption?.title || leaveType}</div>
                  <p className="mb-0 mt-1">{selectedLeaveTypeOption?.description || ''}</p>
                </div>
                <CButton
                  type="button"
                  color="link"
                  className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary text-decoration-none"
                  style={{ lineHeight: 0 }}
                  onClick={onBackToLeaveType}
                  title="Edit leave type"
                  aria-label="Edit leave type"
                >
                  <Pencil size={14} />
                </CButton>
              </div>
            </div>
          </CCol>
          <CCol xs={12} md={7} lg={8}>
            <div className="rounded-3 border bg-white p-3 h-100">
              <div className="fw-semibold mb-2">Leave Balance</div>
              <CRow className="g-2 g-lg-3">
                {balanceStats.map((item) => (
                  <CCol xs={6} md={3} key={item.key}>
                    <div className="rounded-3 bg-light px-3 py-3 h-100 text-center">
                      <div className="small text-muted">{item.label}</div>
                      <div className={`fw-semibold ${item.isAlert ? 'text-danger' : ''}`}>
                        {item.value}
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>
              {!balanceSummary.hasAssignment && (
                <div className="small text-danger mt-2">
                  No assignment found for {leaveType} ({balanceSummary.year}).
                </div>
              )}
              {balanceSummary.hasAssignment && balanceSummary.isZeroEntitlement && (
                <div className="small text-danger mt-2">
                  Entitlement is 0 day(s). Submission is blocked until HR/HQ updates assignment.
                </div>
              )}
              {leaveType === 'Other Leave' && (
                <div className="small text-muted mt-2">
                  Non-statutory leave requires HR/HQ review and additional justification.
                </div>
              )}
            </div>
          </CCol>
        </CRow>
        <div className="rounded-3 border p-3 bg-white">
          <CRow className="g-3">
            {guidanceMessage ? (
              <CCol xs={12}>
                <div className="small text-info-emphasis bg-info bg-opacity-10 border border-info-subtle rounded-3 p-2">
                  {guidanceMessage}
                </div>
              </CCol>
            ) : null}
            <CCol md={4}>
              <CFormLabel htmlFor="leave-work-shift">Work Shift</CFormLabel>
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
            <CCol xs={6} md={2}>
              <CFormLabel htmlFor="leave-start-date">Start Date</CFormLabel>
              <CFormInput
                id="leave-start-date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                invalid={Boolean(fieldErrors.startDate)}
              />
              <CFormFeedback invalid>{fieldErrors.startDate}</CFormFeedback>
            </CCol>
            <CCol xs={6} md={2}>
              <CFormLabel htmlFor="leave-start-time">Start Time</CFormLabel>
              <CFormSelect
                id="leave-start-time"
                value={startTimeSlot}
                onChange={handleStartTimeChange}
                invalid={Boolean(fieldErrors.schedule)}
              >
                {selectedShiftConfig.startOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={2}>
              <CFormLabel htmlFor="leave-end-date">End Date</CFormLabel>
              <CFormInput
                id="leave-end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                min={startDate || undefined}
                invalid={Boolean(fieldErrors.endDate)}
              />
              <CFormFeedback invalid>{fieldErrors.endDate}</CFormFeedback>
            </CCol>
            <CCol xs={6} md={2}>
              <CFormLabel htmlFor="leave-end-time">End Time</CFormLabel>
              <CFormSelect
                id="leave-end-time"
                value={endTimeSlot}
                onChange={handleEndTimeChange}
                invalid={Boolean(fieldErrors.schedule)}
              >
                {selectedShiftConfig.endOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
              {fieldErrors.schedule ? (
                <CFormFeedback invalid style={{ display: 'block' }}>
                  {fieldErrors.schedule}
                </CFormFeedback>
              ) : null}
            </CCol>
            {(activeFieldRule.showCoverage || activeFieldRule.showAttachment) && (
              <>
                {activeFieldRule.showCoverage && (
                  <CCol md={6}>
                    <CFormLabel htmlFor="leave-cover-by">
                      Coverage By ({activeFieldRule.coverageRequired ? 'Required' : 'Optional'})
                    </CFormLabel>
                    <CFormInput
                      id="leave-cover-by"
                      value={coverBy}
                      onChange={(event) => onCoverByChange(event.target.value)}
                      placeholder="Name of teammate covering your duties"
                      invalid={Boolean(fieldErrors.coverBy)}
                    />
                    <CFormFeedback invalid>{fieldErrors.coverBy}</CFormFeedback>
                  </CCol>
                )}
                {activeFieldRule.showAttachment && (
                  <CCol md={6}>
                    <CFormLabel htmlFor="leave-attachment">
                      Supporting Attachment (
                      {activeFieldRule.attachmentRequired ? 'Required' : 'Optional'})
                    </CFormLabel>
                    <div className="d-flex align-items-center gap-2">
                      <CFormInput
                        id="leave-attachment"
                        type="file"
                        className="flex-grow-1"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleAttachmentChange}
                        invalid={Boolean(fieldErrors.attachment)}
                      />
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        className="d-inline-flex align-items-center justify-content-center"
                        style={{
                          height: 'calc(1.5em + 0.75rem + 2px)',
                          minHeight: 'calc(1.5em + 0.75rem + 2px)',
                          width: 'calc(1.5em + 0.75rem + 2px)',
                          minWidth: 'calc(1.5em + 0.75rem + 2px)',
                          flex: '0 0 calc(1.5em + 0.75rem + 2px)',
                          padding: 0,
                        }}
                        onClick={openCameraCapture}
                        disabled={isAttachmentProcessing}
                        title="Use camera"
                        aria-label="Use camera"
                      >
                        <Camera size={14} />
                      </CButton>
                    </div>
                    <CFormFeedback
                      invalid
                      style={{ display: fieldErrors.attachment ? 'block' : 'none' }}
                    >
                      {fieldErrors.attachment}
                    </CFormFeedback>
                    <CFormInput
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="d-none"
                      ref={cameraInputRef}
                      onChange={handleAttachmentChange}
                    />
                    <div className="small text-body-secondary mt-1">
                      Images/PDF only. Large images auto-compressed.
                    </div>
                    <div
                      className={`small mt-1 ${
                        attachmentStatus?.tone === 'danger'
                          ? 'text-danger'
                          : attachmentStatus?.tone === 'warning'
                            ? 'text-warning'
                            : attachmentStatus?.tone === 'success'
                              ? 'text-success'
                              : 'text-body-secondary'
                      }`}
                    >
                      {attachmentStatus?.label ? (
                        <>
                          <span className="fw-semibold">{attachmentStatus.label}:</span>{' '}
                          <span>{attachmentStatus.detail}</span>
                        </>
                      ) : (
                        'No attachment selected.'
                      )}
                    </div>
                    {attachmentMeta?.name ? (
                      <div className="mt-1">
                        <CButton type="button" size="sm" color="light" onClick={clearAttachment}>
                          Remove attachment
                        </CButton>
                      </div>
                    ) : null}
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
              />
              <CFormFeedback invalid>{fieldErrors.reason}</CFormFeedback>
            </CCol>
          </CRow>
        </div>
        <FormActionGroup className="mt-4">
          <CButton color="secondary" variant="outline" type="button" onClick={onClearForm}>
            Clear form
          </CButton>
          <CButton color="light" type="button" onClick={onDraft}>
            Save draft
          </CButton>
          <CButton
            color="primary"
            type="submit"
            disabled={isSubmitBlockedByBalance || isAttachmentProcessing}
          >
            {editingRecordId ? 'Update request' : 'Submit request'}
          </CButton>
        </FormActionGroup>
      </CForm>
    )}
  </>
)

export default LeaveApplySection
