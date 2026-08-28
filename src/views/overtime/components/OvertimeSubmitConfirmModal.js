import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import ButtonLoader from 'src/components/ButtonLoader'
import { formatDate, formatDuration, formatTime, getOvertimeTypeLabel } from '../utils'

const OvertimeSubmitConfirmModal = ({
  visible,
  submitPreview,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => (
  <OvertimeSubmitConfirmModalContent
    visible={visible}
    submitPreview={submitPreview}
    onClose={onClose}
    onConfirm={onConfirm}
    isSubmitting={isSubmitting}
  />
)

const OvertimeSubmitConfirmModalContent = ({
  visible,
  submitPreview,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const confirmLabel = isSubmitting ? (
    <ButtonLoader
      label={submitPreview?.isResubmission ? 'Resubmitting claim...' : 'Submitting claim...'}
    />
  ) : submitPreview?.isResubmission ? (
    'Confirm resubmission'
  ) : (
    'Confirm submission'
  )
  const body = (
    <div className="d-grid gap-2">
      {!submitPreview ? (
        <div className="text-body-secondary small">No overtime claim details available.</div>
      ) : (
        <>
          <div>
            <span className="text-body-secondary small d-block">Overtime Type</span>
            <span>{getOvertimeTypeLabel(submitPreview.overtimeType)}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Claim Date</span>
            <span>{formatDate(submitPreview.claimDate)}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Time Window</span>
            <span>
              {formatTime(submitPreview.startTime)} - {formatTime(submitPreview.endTime)}
              {submitPreview.isOvernight ? ' (+1 day)' : ''}
            </span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Overtime Duration</span>
            <span>{formatDuration(submitPreview.durationMinutes)}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Reason</span>
            <span>{submitPreview.reason || '-'}</span>
          </div>
        </>
      )}
    </div>
  )

  return (
    <ActionConfirmModal
      visible={visible}
      title={
        submitPreview?.isResubmission ? 'Confirm overtime resubmission' : 'Confirm overtime claim'
      }
      message={body}
      confirmLabel={confirmLabel}
      confirmDisabled={!submitPreview || isSubmitting}
      cancelDisabled={isSubmitting}
      mobileDrawerQuery="(max-width: 767.98px)"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

export default OvertimeSubmitConfirmModal
