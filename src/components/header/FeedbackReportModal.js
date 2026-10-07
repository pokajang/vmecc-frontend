import React from 'react'
import {
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import WorkflowInlineFeedback from 'src/components/report-workflow/WorkflowInlineFeedback'

const FeedbackReportModal = ({
  error,
  success,
  message,
  submitting,
  visible,
  onClose,
  onMessageChange,
  onSubmit,
}) => (
  <CModal
    alignment="center"
    visible={visible}
    onClose={submitting ? undefined : onClose}
    aria-labelledby="feedback-report-modal-title"
  >
    <CModalHeader>
      <CModalTitle id="feedback-report-modal-title">Report issue</CModalTitle>
    </CModalHeader>
    <CModalBody>
      {success ? (
        <WorkflowInlineFeedback kind="success" title="Report submitted" message={success} />
      ) : (
        <>
          <label className="form-label" htmlFor="feedback-report-message">
            What happened?
          </label>
          <CFormTextarea
            id="feedback-report-message"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            rows={6}
            maxLength={2000}
            disabled={submitting}
            placeholder="Describe the bug, confusing behavior, or requested improvement."
          />
          <div className="d-flex justify-content-between mt-1 small text-muted">
            <span>Minimum 10 characters.</span>
            <span>{message.trim().length}/2000</span>
          </div>
          {error ? <div className="text-danger small mt-2">{error}</div> : null}
        </>
      )}
    </CModalBody>
    <CModalFooter>
      {success ? (
        <CButton color="primary" onClick={onClose}>
          Close
        </CButton>
      ) : (
        <>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={onSubmit}
            disabled={submitting || message.trim().length < 10}
          >
            {submitting ? 'Submitting...' : 'Submit report'}
          </CButton>
        </>
      )}
    </CModalFooter>
  </CModal>
)

export default FeedbackReportModal
