import React from 'react'
import { CCol, CRow } from '@coreui/react'

import {
  fetchFeedbackReport,
  fetchFeedbackReports,
  updateFeedbackReport,
} from 'src/services/apiClient'
import { formatDateTime } from 'src/utils/users'
import AdminReviewQueuePage, {
  commonReviewColumns,
  getReviewPageLabel,
  getReviewReporter,
  truncateReviewText,
} from './shared/AdminReviewQueuePage'

const columns = [
  {
    key: 'message',
    label: 'Message',
    className: 'text-break',
    render: (report) => truncateReviewText(report.message, 140),
  },
  ...commonReviewColumns,
]

const renderDetail = (report) => (
  <>
    <CRow className="g-3 mb-3">
      <CCol md={6}>
        <div className="text-muted small">Reporter</div>
        <div>{getReviewReporter(report)}</div>
      </CCol>
      <CCol md={6}>
        <div className="text-muted small">Page</div>
        <div>{getReviewPageLabel(report)}</div>
      </CCol>
      <CCol md={6}>
        <div className="text-muted small">Reported</div>
        <div>{formatDateTime(report.created_at)}</div>
      </CCol>
      <CCol md={6}>
        <div className="text-muted small">Reviewed</div>
        <div>{report.reviewed_at ? formatDateTime(report.reviewed_at) : 'Not reviewed'}</div>
      </CCol>
    </CRow>

    <section className="mb-3">
      <h6>Message</h6>
      <div className="border rounded p-3 bg-light text-break white-space-pre-wrap">
        {report.message}
      </div>
    </section>

    <section className="mb-3">
      <h6>Route context</h6>
      <pre className="border rounded p-3 bg-light small mb-0 text-break">
        {JSON.stringify(report.page_context || {}, null, 2)}
      </pre>
    </section>

    <CRow className="g-3 mb-3">
      <CCol md={6}>
        <div className="text-muted small">Reporter IP</div>
        <div className="text-break">{report.reporter_ip || 'Not available'}</div>
      </CCol>
      <CCol md={6}>
        <div className="text-muted small">User agent</div>
        <div className="text-break">{report.reporter_user_agent || 'Not available'}</div>
      </CCol>
    </CRow>
  </>
)

const FeedbackReports = () => (
  <AdminReviewQueuePage
    title="Feedback Reports"
    testIdPrefix="feedback-reports"
    formIdPrefix="feedback-report"
    permissionMessage="You do not have permission to review feedback reports."
    fetchReports={fetchFeedbackReports}
    fetchReport={fetchFeedbackReport}
    updateReport={updateFeedbackReport}
    listErrorMessage="Unable to load feedback reports."
    detailErrorMessage="Unable to load feedback report."
    updateErrorMessage="Unable to update feedback report."
    loadingMessage="Loading feedback reports..."
    emptyMessage="No feedback reports found."
    modalTitle="Feedback report"
    columns={columns}
    renderDetail={renderDetail}
  />
)

export default FeedbackReports
