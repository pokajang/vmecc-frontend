import {
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

const ReportModal = ({ error, reason, submitting, target, onClose, onReasonChange, onSubmit }) => (
  <CModal alignment="center" visible={Boolean(target)} onClose={onClose}>
    <CModalHeader>
      <CModalTitle>Report Ask AI response</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <label className="form-label" htmlFor="ai-helper-report-reason">
        Reason
      </label>
      <CFormTextarea
        id="ai-helper-report-reason"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        rows={5}
        maxLength={1000}
        disabled={submitting}
        placeholder="Example: The response used the wrong page context, gave incorrect workflow guidance, or missed important details."
      />
      <div className="d-flex justify-content-between mt-1 small text-muted">
        <span>Minimum 10 characters.</span>
        <span>{reason.trim().length}/1000</span>
      </div>
      {error ? <div className="text-danger small mt-2">{error}</div> : null}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
        Cancel
      </CButton>
      <CButton
        color="primary"
        onClick={onSubmit}
        disabled={submitting || reason.trim().length < 10}
      >
        {submitting ? 'Submitting...' : 'Submit report'}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ReportModal
