import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

import ModulePageHeader from 'src/components/ModulePageHeader'
import PageState from 'src/components/PageState'
import TableLoader from 'src/components/TableLoader'
import {
  fetchAiHelperReport,
  fetchAiHelperReports,
  updateAiHelperReport,
} from 'src/services/apiClient'
import { isSystemAdministrator } from 'src/utils/authz'
import { formatDateTime } from 'src/utils/users'

const STATUSES = ['new', 'reviewing', 'resolved', 'dismissed']
const STATUS_LABELS = {
  actionable: 'Open',
  all: 'All',
  new: 'New',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}
const STATUS_COLORS = {
  new: 'danger',
  reviewing: 'warning',
  resolved: 'success',
  dismissed: 'secondary',
}

const truncate = (value, length = 120) => {
  const text = String(value || '').trim()
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

const getReporter = (report) => {
  if (report?.reporter?.name && report?.reporter?.email) {
    return `${report.reporter.name} (${report.reporter.email})`
  }
  return report?.reporter?.name || report?.reporter?.email || 'Unknown user'
}

const getPageLabel = (report) => {
  const title = report?.page?.title
  const path = report?.page?.path
  if (title && path) return `${title} (${path})`
  return title || path || 'Unknown page'
}

const AiHelperReports = () => {
  const authUser = useSelector((state) => state.authUser)
  const location = useLocation()
  const canReview = useMemo(() => isSystemAdministrator(authUser), [authUser])
  const [status, setStatus] = useState(() =>
    new URLSearchParams(location.search).get('status') === 'actionable' ? 'actionable' : 'new',
  )
  const [reports, setReports] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formStatus, setFormStatus] = useState('new')
  const [adminNote, setAdminNote] = useState('')

  const loadReports = useCallback(async () => {
    if (!canReview) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchAiHelperReports({ status, per_page: 50 })
      setReports(response?.data || [])
      setCounts(response?.meta?.counts || {})
    } catch (err) {
      setError(err.payload?.message || 'Unable to load Ask AI response reports.')
    } finally {
      setLoading(false)
    }
  }, [canReview, status])

  useEffect(() => {
    if (canReview) {
      loadReports()
    } else {
      setLoading(false)
    }
  }, [canReview, loadReports])

  const openDetail = useCallback(async (reportId) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const response = await fetchAiHelperReport(reportId)
      const detail = response?.data || null
      setSelected(detail)
      setFormStatus(detail?.status || 'new')
      setAdminNote(detail?.admin_note || '')
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to load report details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    if (saving) return
    setSelected(null)
    setDetailError(null)
  }, [saving])

  const saveDetail = useCallback(async () => {
    if (!selected?.id || saving) return
    setSaving(true)
    setDetailError(null)
    try {
      const response = await updateAiHelperReport(selected.id, {
        status: formStatus,
        admin_note: adminNote,
      })
      const updated = response?.data || null
      setSelected(updated)
      setReports((prev) => prev.map((item) => (item.id === updated?.id ? updated : item)))
      await loadReports()
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to update report.')
    } finally {
      setSaving(false)
    }
  }, [adminNote, formStatus, loadReports, saving, selected?.id])

  if (!canReview) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to review Ask AI reports.
      </CAlert>
    )
  }

  return (
    <CContainer fluid data-testid="ai-helper-reports-module">
      <ModulePageHeader
        title="Ask AI Reports"
        subtitle="Review user reports for Ask AI responses and triage follow-up."
      />

      <CCard className="mb-4" data-testid="ai-helper-reports-records">
        <CCardBody>
          <div
            className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
            data-testid="ai-helper-reports-filters"
          >
            <CButtonGroup role="group" aria-label="Ask AI report status filters">
              {['actionable', 'new', 'reviewing', 'resolved', 'dismissed', 'all'].map((item) => (
                <CButton
                  key={item}
                  color={status === item ? 'primary' : 'secondary'}
                  variant={status === item ? undefined : 'outline'}
                  size="sm"
                  onClick={() => setStatus(item)}
                >
                  {STATUS_LABELS[item]} {counts[item] ? `(${counts[item]})` : ''}
                </CButton>
              ))}
            </CButtonGroup>
            <CButton size="sm" color="secondary" variant="outline" onClick={loadReports}>
              Refresh
            </CButton>
          </div>

          {error ? <CAlert color="danger">{error}</CAlert> : null}
          {detailError && !selected ? <CAlert color="danger">{detailError}</CAlert> : null}

          {loading ? (
            <TableLoader message="Loading Ask AI reports..." />
          ) : reports.length ? (
            <CTable align="middle" responsive hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Reason</CTableHeaderCell>
                  <CTableHeaderCell>Reporter</CTableHeaderCell>
                  <CTableHeaderCell>Page</CTableHeaderCell>
                  <CTableHeaderCell>Reported</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell className="table-sticky-action-cell text-end">
                    Actions
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {reports.map((report) => (
                  <CTableRow key={report.id}>
                    <CTableDataCell className="text-break">
                      {truncate(report.reason)}
                    </CTableDataCell>
                    <CTableDataCell className="text-break">{getReporter(report)}</CTableDataCell>
                    <CTableDataCell className="text-break">{getPageLabel(report)}</CTableDataCell>
                    <CTableDataCell>{formatDateTime(report.created_at)}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[report.status] || 'secondary'}>
                        {STATUS_LABELS[report.status] || report.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="table-sticky-action-cell text-end">
                      <CButton
                        size="sm"
                        color="primary"
                        variant="outline"
                        onClick={() => openDetail(report.id)}
                      >
                        View
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          ) : (
            <PageState variant="empty" message="No Ask AI reports found." />
          )}
        </CCardBody>
      </CCard>

      <CModal
        size="lg"
        scrollable
        visible={Boolean(selected) || detailLoading}
        onClose={closeDetail}
      >
        <CModalHeader>
          <CModalTitle>Ask AI response report</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading ? (
            <TableLoader message="Loading report..." />
          ) : selected ? (
            <>
              {detailError ? <CAlert color="danger">{detailError}</CAlert> : null}
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <div className="text-muted small">Reporter</div>
                  <div>{getReporter(selected)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Page</div>
                  <div>{getPageLabel(selected)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Reported</div>
                  <div>{formatDateTime(selected.created_at)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">OpenAI response ID</div>
                  <div className="text-break">{selected.openai_response_id || 'Not available'}</div>
                </CCol>
              </CRow>

              <section className="mb-3">
                <h6>Reason</h6>
                <div className="border rounded p-3 bg-light text-break">{selected.reason}</div>
              </section>

              <section className="mb-3">
                <h6>Preceding user message</h6>
                <div className="border rounded p-3 bg-light text-break">
                  {selected.preceding_user_content || 'Not available'}
                </div>
              </section>

              <section className="mb-3">
                <h6>Reported Ask AI response</h6>
                <div className="border rounded p-3 bg-light text-break white-space-pre-wrap">
                  {selected.assistant_content || 'Not available'}
                </div>
              </section>

              <section className="mb-3">
                <h6>Route context</h6>
                <pre className="border rounded p-3 bg-light small mb-0 text-break">
                  {JSON.stringify(selected.page_context || {}, null, 2)}
                </pre>
              </section>

              <section className="mb-3">
                <h6>Chat snapshot</h6>
                <div className="border rounded p-3 bg-light">
                  {(selected.chat_snapshot?.messages || []).map((message) => (
                    <div key={message.id} className="mb-3">
                      <div className="small fw-semibold text-muted">{message.role}</div>
                      <div className="text-break white-space-pre-wrap">{message.content}</div>
                    </div>
                  ))}
                  {(selected.chat_snapshot?.messages || []).length === 0 ? (
                    <div className="text-muted">No messages captured.</div>
                  ) : null}
                </div>
              </section>

              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="ai-report-status">Status</CFormLabel>
                  <CFormSelect
                    id="ai-report-status"
                    value={formStatus}
                    onChange={(event) => setFormStatus(event.target.value)}
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {STATUS_LABELS[item]}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={8}>
                  <CFormLabel htmlFor="ai-report-admin-note">Admin note</CFormLabel>
                  <CFormTextarea
                    id="ai-report-admin-note"
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Optional triage note"
                  />
                </CCol>
              </CRow>
            </>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeDetail} disabled={saving}>
            Close
          </CButton>
          <CButton color="primary" onClick={saveDetail} disabled={!selected || saving}>
            {saving ? 'Saving...' : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default AiHelperReports
