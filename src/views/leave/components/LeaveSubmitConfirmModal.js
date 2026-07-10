import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { formatDayCount, formatFileSize, formatSubmitPreviewPeriod } from '../utils'

const LeaveSubmitConfirmModal = ({ visible, submitPreview, onClose, onConfirm }) => (
  <LeaveSubmitConfirmModalContent
    visible={visible}
    submitPreview={submitPreview}
    onClose={onClose}
    onConfirm={onConfirm}
  />
)

const LeaveSubmitConfirmModalContent = ({ visible, submitPreview, onClose, onConfirm }) => {
  const body = (
    <div className="d-grid gap-2">
      {!submitPreview ? (
        <div className="text-body-secondary small">No leave request details available.</div>
      ) : (
        <>
          <div>
            <span className="text-body-secondary small d-block">Leave Type</span>
            <span className="fw-semibold">{submitPreview.leaveType}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Work Shift</span>
            <span>{submitPreview.shiftLabel}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Period</span>
            <span>{formatSubmitPreviewPeriod(submitPreview)}</span>
          </div>
          <div>
            <span className="text-body-secondary small d-block">Requested Leave</span>
            <span>{formatDayCount(submitPreview.requestedDays)} day(s)</span>
          </div>
          {submitPreview.coverBy && (
            <div>
              <span className="text-body-secondary small d-block">Coverage By</span>
              <span>{submitPreview.coverBy}</span>
            </div>
          )}
          {submitPreview.attachmentName && (
            <div>
              <span className="text-body-secondary small d-block">Attachment</span>
              <span>{submitPreview.attachmentName}</span>
              {submitPreview.attachmentMeta?.originalSize ? (
                <div className="small text-body-secondary mt-1">
                  Size:{' '}
                  {submitPreview.attachmentMeta.wasCompressed
                    ? `${formatFileSize(submitPreview.attachmentMeta.originalSize)} -> ${formatFileSize(
                        submitPreview.attachmentMeta.size,
                      )} (auto-compressed)`
                    : formatFileSize(submitPreview.attachmentMeta.size)}
                </div>
              ) : null}
              {submitPreview.attachmentMeta?.wasCompressed ? (
                <div className="small text-warning mt-1">
                  Keep your original image in your own records.
                </div>
              ) : null}
            </div>
          )}
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
      title={submitPreview?.editingRecordId ? 'Confirm leave update' : 'Confirm leave request'}
      message={body}
      confirmLabel={submitPreview?.editingRecordId ? 'Confirm update' : 'Confirm submission'}
      confirmDisabled={!submitPreview}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

export default LeaveSubmitConfirmModal
