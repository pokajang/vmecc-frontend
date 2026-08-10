import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
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

import ModuleNavTabs from 'src/components/ModuleNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import PageState from 'src/components/PageState'
import TableLoader from 'src/components/TableLoader'
import { isSystemAdministrator } from 'src/utils/authz'
import { formatDateTime } from 'src/utils/users'

export const REVIEW_STATUSES = ['new', 'reviewing', 'resolved', 'dismissed']
export const REVIEW_STATUS_LABELS = {
  actionable: 'Open',
  all: 'All',
  new: 'New',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}
const REVIEW_STATUS_COLORS = {
  new: 'danger',
  reviewing: 'warning',
  resolved: 'success',
  dismissed: 'secondary',
}
const FILTER_STATUSES = ['actionable', ...REVIEW_STATUSES, 'all']

export const truncateReviewText = (value, length = 120) => {
  const text = String(value || '').trim()
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

export const getReviewReporter = (report) => {
  if (report?.reporter?.name && report?.reporter?.email) {
    return `${report.reporter.name} (${report.reporter.email})`
  }
  return report?.reporter?.name || report?.reporter?.email || 'Unknown user'
}

export const getReviewPageLabel = (report) => {
  const title = report?.page?.title
  const path = report?.page?.path
  if (title && path) return `${title} (${path})`
  return title || path || 'Unknown page'
}

const errorMessage = (error, fallback) => error?.payload?.message || error?.message || fallback

const AdminReviewQueuePage = ({
  title,
  testIdPrefix,
  formIdPrefix = testIdPrefix,
  permissionMessage,
  fetchReports,
  fetchReport,
  updateReport,
  listErrorMessage,
  detailErrorMessage,
  updateErrorMessage,
  loadingMessage,
  emptyMessage,
  modalTitle,
  columns,
  renderDetail,
}) => {
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
      const response = await fetchReports({ status, per_page: 50 })
      setReports(response?.data || [])
      setCounts(response?.meta?.counts || {})
    } catch (loadError) {
      setError(errorMessage(loadError, listErrorMessage))
    } finally {
      setLoading(false)
    }
  }, [canReview, fetchReports, listErrorMessage, status])

  useEffect(() => {
    if (canReview) loadReports()
    else setLoading(false)
  }, [canReview, loadReports])

  const openDetail = useCallback(
    async (reportId) => {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const response = await fetchReport(reportId)
        const detail = response?.data || null
        setSelected(detail)
        setFormStatus(detail?.status || 'new')
        setAdminNote(detail?.admin_note || '')
      } catch (loadError) {
        setDetailError(errorMessage(loadError, detailErrorMessage))
      } finally {
        setDetailLoading(false)
      }
    },
    [detailErrorMessage, fetchReport],
  )

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
      const response = await updateReport(selected.id, {
        status: formStatus,
        admin_note: adminNote,
      })
      const updated = response?.data || null
      setSelected(updated)
      setReports((current) => current.map((item) => (item.id === updated?.id ? updated : item)))
      await loadReports()
    } catch (saveError) {
      setDetailError(errorMessage(saveError, updateErrorMessage))
    } finally {
      setSaving(false)
    }
  }, [adminNote, formStatus, loadReports, saving, selected?.id, updateErrorMessage, updateReport])

  const statusItems = FILTER_STATUSES.map((item) => ({
    key: item,
    label: `${REVIEW_STATUS_LABELS[item]}${counts[item] ? ` (${counts[item]})` : ''}`,
    active: status === item,
    onClick: () => setStatus(item),
  }))

  if (!canReview) {
    return (
      <CAlert color="warning" className="my-4">
        {permissionMessage}
      </CAlert>
    )
  }

  return (
    <CContainer fluid data-testid={`${testIdPrefix}-module`}>
      <ModulePageHeader title={title} />

      <CCard className="mb-4" data-testid={`${testIdPrefix}-records`}>
        <CCardBody>
          <div
            className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3"
            data-testid={`${testIdPrefix}-filters`}
          >
            <div className="flex-grow-1 overflow-hidden">
              <ModuleNavTabs
                items={statusItems}
                mobileVariant="select"
                mobileLabel={`${title} status`}
                className="mb-0"
              />
            </div>
            <CButton size="sm" color="secondary" variant="outline" onClick={loadReports}>
              Refresh
            </CButton>
          </div>

          {error ? <CAlert color="danger">{error}</CAlert> : null}
          {detailError && !selected ? <CAlert color="danger">{detailError}</CAlert> : null}

          {loading ? (
            <TableLoader message={loadingMessage} />
          ) : reports.length ? (
            <CTable align="middle" responsive hover>
              <CTableHead color="light">
                <CTableRow>
                  {columns.map((column) => (
                    <CTableHeaderCell key={column.key} className={column.headerClassName}>
                      {column.label}
                    </CTableHeaderCell>
                  ))}
                  <CTableHeaderCell className="table-sticky-action-cell text-end">
                    Actions
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {reports.map((report) => (
                  <CTableRow key={report.id}>
                    {columns.map((column) => (
                      <CTableDataCell key={column.key} className={column.className}>
                        {column.render(report)}
                      </CTableDataCell>
                    ))}
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
            <PageState variant="empty" message={emptyMessage} />
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
          <CModalTitle>{modalTitle}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading ? (
            <TableLoader message="Loading report..." />
          ) : selected ? (
            <>
              {detailError ? <CAlert color="danger">{detailError}</CAlert> : null}
              {renderDetail(selected)}
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor={`${formIdPrefix}-status`}>Status</CFormLabel>
                  <CFormSelect
                    id={`${formIdPrefix}-status`}
                    value={formStatus}
                    onChange={(event) => setFormStatus(event.target.value)}
                  >
                    {REVIEW_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {REVIEW_STATUS_LABELS[item]}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={8}>
                  <CFormLabel htmlFor={`${formIdPrefix}-admin-note`}>Admin note</CFormLabel>
                  <CFormTextarea
                    id={`${formIdPrefix}-admin-note`}
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

export const reviewStatusBadge = (report) => (
  <CBadge color={REVIEW_STATUS_COLORS[report?.status] || 'secondary'}>
    {REVIEW_STATUS_LABELS[report?.status] || report?.status}
  </CBadge>
)

export const commonReviewColumns = [
  {
    key: 'reporter',
    label: 'Reporter',
    className: 'text-break',
    render: getReviewReporter,
  },
  {
    key: 'page',
    label: 'Page',
    className: 'text-break',
    render: getReviewPageLabel,
  },
  {
    key: 'reported',
    label: 'Reported',
    render: (report) => formatDateTime(report.created_at),
  },
  {
    key: 'status',
    label: 'Status',
    render: reviewStatusBadge,
  },
]

export default AdminReviewQueuePage
