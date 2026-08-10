import React from 'react'
import { CCol, CRow } from '@coreui/react'

import {
  fetchAiHelperReport,
  fetchAiHelperReports,
  updateAiHelperReport,
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
    key: 'reason',
    label: 'Reason',
    className: 'text-break',
    render: (report) => truncateReviewText(report.reason),
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
        <div className="text-muted small">OpenAI response ID</div>
        <div className="text-break">{report.openai_response_id || 'Not available'}</div>
      </CCol>
    </CRow>

    <section className="mb-3">
      <h6>Reason</h6>
      <div className="border rounded p-3 bg-light text-break">{report.reason}</div>
    </section>

    <section className="mb-3">
      <h6>Preceding user message</h6>
      <div className="border rounded p-3 bg-light text-break">
        {report.preceding_user_content || 'Not available'}
      </div>
    </section>

    <section className="mb-3">
      <h6>Reported Ask AI response</h6>
      <div className="border rounded p-3 bg-light text-break white-space-pre-wrap">
        {report.assistant_content || 'Not available'}
      </div>
    </section>

    <section className="mb-3">
      <h6>Route context</h6>
      <pre className="border rounded p-3 bg-light small mb-0 text-break">
        {JSON.stringify(report.page_context || {}, null, 2)}
      </pre>
    </section>

    <section className="mb-3">
      <h6>Chat snapshot</h6>
      <div className="border rounded p-3 bg-light">
        {(report.chat_snapshot?.messages || []).map((message) => (
          <div key={message.id} className="mb-3">
            <div className="small fw-semibold text-muted">{message.role}</div>
            <div className="text-break white-space-pre-wrap">{message.content}</div>
          </div>
        ))}
        {(report.chat_snapshot?.messages || []).length === 0 ? (
          <div className="text-muted">No messages captured.</div>
        ) : null}
      </div>
    </section>
  </>
)

const AiHelperReports = () => (
  <AdminReviewQueuePage
    title="Ask AI Reports"
    testIdPrefix="ai-helper-reports"
    formIdPrefix="ai-report"
    permissionMessage="You do not have permission to review Ask AI reports."
    fetchReports={fetchAiHelperReports}
    fetchReport={fetchAiHelperReport}
    updateReport={updateAiHelperReport}
    listErrorMessage="Unable to load Ask AI response reports."
    detailErrorMessage="Unable to load report details."
    updateErrorMessage="Unable to update report."
    loadingMessage="Loading Ask AI reports..."
    emptyMessage="No Ask AI reports found."
    modalTitle="Ask AI response report"
    columns={columns}
    renderDetail={renderDetail}
  />
)

export default AiHelperReports
