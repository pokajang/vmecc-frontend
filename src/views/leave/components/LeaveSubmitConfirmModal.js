import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'
import { formatDayCount, formatFileSize, formatSubmitPreviewPeriod } from '../utils'

const LeaveSubmitConfirmModal = ({ visible, submitPreview, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>
      {submitPreview?.editingRecordId ? 'Confirm Leave Update' : 'Confirm Leave Request'}
    </CModalHeader>
    <CModalBody>
      {!submitPreview ? (
        <div className="text-body-secondary small">No leave request details available.</div>
      ) : (
        <div className="d-grid gap-2">
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
        </div>
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={onConfirm} disabled={!submitPreview}>
        {submitPreview?.editingRecordId ? 'Confirm update' : 'Confirm submission'}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default LeaveSubmitConfirmModal
