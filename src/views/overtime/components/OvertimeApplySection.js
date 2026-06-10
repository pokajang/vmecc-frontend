import React from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { Clock3, Pencil } from 'lucide-react'
import BackButton from 'src/components/BackButton'
import ButtonLoader from 'src/components/ButtonLoader'
import FormActionGroup from 'src/components/FormActionGroup'
import IconOptionGrid from 'src/components/IconOptionGrid'
import { formatDuration } from '../utils'

const OvertimeApplySection = ({
  overtimeTypeConfirmed,
  overtimeType,
  overtimeTypeOptions = [],
  onSelectOvertimeType,
  onContinueOvertimeType,
  onBackToOvertimeType,
  onSubmit,
  onBack,
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
  onClearForm,
  clearButtonLabel = 'Clear form',
  clearingButtonLabel = 'Clearing...',
  onDraft,
  isResumeEditMode = false,
  isOvertimeTypeDerived = false,
  submitButtonLabel = 'Submit request',
  submittingButtonLabel = 'Submitting request...',
  isDraftSaving = false,
  isFormClearing = false,
  isSubmittingClaim = false,
  guidanceMessage = '',
}) => {
  const selectedOvertimeTypeOption =
    overtimeTypeOptions.find((option) => option.value === overtimeType) || overtimeTypeOptions[0]

  const isActionBusy = isDraftSaving || isFormClearing || isSubmittingClaim
  const canRenderFreshTypeSelector =
    !isOvertimeTypeDerived && !overtimeTypeConfirmed && !isResumeEditMode

  const renderTypeCards = ({ showDescriptions = true } = {}) => {
    if (overtimeTypeOptions.length === 0) {
      return (
        <div className="rounded-3 border p-3 bg-light text-body-secondary">
          No overtime type is available. Please contact HR/Admin to configure OT rules.
        </div>
      )
    }

    return (
      <IconOptionGrid
        options={overtimeTypeOptions}
        value={overtimeType}
        onChange={(nextType) => onSelectOvertimeType(nextType)}
        fallbackIcon={Clock3}
        showDescription={showDescriptions}
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
        <div className="fw-semibold">Choose Overtime Type</div>
        {fieldErrors.overtimeType ? (
          <div className="small text-danger">{fieldErrors.overtimeType}</div>
        ) : null}
        {renderTypeCards({ showDescriptions: true })}
        {overtimeTypeOptions.length > 0 ? (
          <>
            <div className="action-row-thumb">
              <CButton color="light" onClick={onBack}>
                Back
              </CButton>
              <CButton
                color="primary"
                disabled={!overtimeType}
                onClick={() => onContinueOvertimeType(overtimeType)}
              >
                Continue
              </CButton>
            </div>
            <div className="action-row-thumb-spacer d-lg-none" />
          </>
        ) : null}
      </div>
    )
  }

  return (
    <CForm onSubmit={onSubmit}>
      <div className="mb-3">
        <BackButton onClick={isResumeEditMode ? onBack : onBackToOvertimeType} label="Back" />
      </div>

      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          {isResumeEditMode && !isOvertimeTypeDerived ? (
            <div>
              <div className="small text-body-secondary mb-2">Application Type</div>
              {renderTypeCards({ showDescriptions: true })}
              {fieldErrors.overtimeType ? (
                <div className="small text-danger mt-2">{fieldErrors.overtimeType}</div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3">
              <div className="d-flex align-items-start gap-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center text-primary"
                  style={{ flex: '0 0 auto', lineHeight: 0 }}
                >
                  <Clock3 size={20} />
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="small text-body-secondary mb-1">Application Type</div>
                  <div className="fw-semibold">
                    {selectedOvertimeTypeOption?.title || 'Overtime Claim'}
                  </div>
                  <p className="mb-0 mt-1">
                    {selectedOvertimeTypeOption?.description ||
                      'Record approved overtime hours with a clear time window and work justification.'}
                  </p>
                </div>
                {!isOvertimeTypeDerived ? (
                  <CButton
                    type="button"
                    color="link"
                    className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary text-decoration-none"
                    style={{ lineHeight: 0 }}
                    onClick={onBackToOvertimeType}
                    title="Edit overtime type"
                    aria-label="Edit overtime type"
                  >
                    <Pencil size={14} />
                  </CButton>
                ) : null}
              </div>
            </div>
          )}
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
            <CFormLabel htmlFor="overtime-claim-date">Date</CFormLabel>
            <CFormInput
              id="overtime-claim-date"
              type="date"
              value={claimDate}
              onChange={(event) => onClaimDateChange(event.target.value)}
              invalid={Boolean(fieldErrors.claimDate)}
            />
            <CFormFeedback invalid>{fieldErrors.claimDate}</CFormFeedback>
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="overtime-start-time">Start Time</CFormLabel>
            <CFormInput
              id="overtime-start-time"
              type="time"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              invalid={Boolean(fieldErrors.startTime || fieldErrors.window)}
            />
            {fieldErrors.startTime ? (
              <CFormFeedback invalid style={{ display: 'block' }}>
                {fieldErrors.startTime}
              </CFormFeedback>
            ) : null}
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="overtime-end-time">End Time</CFormLabel>
            <CFormInput
              id="overtime-end-time"
              type="time"
              value={endTime}
              onChange={(event) => onEndTimeChange(event.target.value)}
              invalid={Boolean(fieldErrors.endTime || fieldErrors.window)}
            />
            {fieldErrors.endTime ? (
              <CFormFeedback invalid style={{ display: 'block' }}>
                {fieldErrors.endTime}
              </CFormFeedback>
            ) : null}
          </CCol>
          <CCol xs={12}>
            <div className="small text-muted">
              Overtime duration:{' '}
              <span className="fw-semibold">{formatDuration(durationMinutes)}</span>
              {isOvernight ? (
                <span className="ms-2 text-warning">Ends on the next day (+1 day).</span>
              ) : null}
            </div>
            {fieldErrors.window ? (
              <div className="small text-danger mt-1">{fieldErrors.window}</div>
            ) : null}
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="overtime-reason">Reason / Work Done</CFormLabel>
            <CFormTextarea
              id="overtime-reason"
              rows={5}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Describe overtime purpose and tasks completed."
              invalid={Boolean(fieldErrors.reason)}
            />
            <CFormFeedback invalid>{fieldErrors.reason}</CFormFeedback>
          </CCol>
        </CRow>
      </div>

      <FormActionGroup className="mt-4">
        <CButton
          color="secondary"
          variant="outline"
          type="button"
          onClick={onClearForm}
          disabled={isActionBusy}
        >
          {isFormClearing ? <ButtonLoader label={clearingButtonLabel} /> : clearButtonLabel}
        </CButton>
        <CButton color="light" type="button" onClick={onDraft} disabled={isActionBusy}>
          {isDraftSaving ? <ButtonLoader label="Saving draft..." /> : 'Save draft'}
        </CButton>
        <CButton color="primary" type="submit" disabled={isActionBusy}>
          {isSubmittingClaim ? <ButtonLoader label={submittingButtonLabel} /> : submitButtonLabel}
        </CButton>
      </FormActionGroup>
    </CForm>
  )
}

export default OvertimeApplySection
