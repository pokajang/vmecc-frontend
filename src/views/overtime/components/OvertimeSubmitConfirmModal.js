import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'
import { formatDate, formatDuration, formatTime, getOvertimeTypeLabel } from '../utils'

const OvertimeSubmitConfirmModal = ({
  visible,
  submitPreview,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>
      {submitPreview?.isResubmission ? 'Confirm Overtime Resubmission' : 'Confirm Overtime Claim'}
    </CModalHeader>
    <CModalBody>
      {!submitPreview ? (
        <div className="text-body-secondary small">No overtime claim details available.</div>
      ) : (
        <div className="d-grid gap-2">
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
        </div>
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={onConfirm} disabled={!submitPreview || isSubmitting}>
        {isSubmitting ? (
          <ButtonLoader
            label={submitPreview?.isResubmission ? 'Resubmitting claim...' : 'Submitting claim...'}
          />
        ) : submitPreview?.isResubmission ? (
          'Confirm resubmission'
        ) : (
          'Confirm submission'
        )}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default OvertimeSubmitConfirmModal
