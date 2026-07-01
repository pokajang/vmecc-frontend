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
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTooltip,
} from '@coreui/react'
import { useSelector } from 'react-redux'

import ModulePageHeader from 'src/components/ModulePageHeader'
import {
  deleteAiHelperKnowledgeReview,
  fetchAiHelperDiagnostics,
  fetchAiHelperKnowledgeReview,
  fetchAiHelperKnowledgeReviewDetail,
  updateAiHelperKnowledgeReview,
} from 'src/services/apiClient'
import { isSystemAdministrator } from 'src/utils/authz'
import { formatDateTime } from 'src/utils/users'

const FILTERS = ['pending', 'approved', 'rejected', 'processing', 'failed', 'all']
const FILTER_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  failed: 'Failed',
  all: 'All',
}
const REVIEW_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const truncate = (value, length = 120) => {
  const text = String(value || '').trim()
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

const uploaderName = (entry) => entry?.uploader_name || 'Unknown user'

const formatBytes = (value) => {
  const size = Number(value || 0)
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const statusText = (entry = {}) => {
  if (entry.status === 'processing') return 'Processing'
  if (entry.status === 'failed') return 'Failed'
  if (entry.review_status === 'rejected') return 'Rejected'
  if (entry.visibility === 'shared' && entry.review_status === 'pending') return 'Pending review'
  if (entry.visibility === 'shared')
    return entry.active ? 'Approved shared' : 'Approved shared - disabled'
  return entry.active ? 'Personal ready' : 'Personal disabled'
}

const AiHelperKnowledge = () => {
  const authUser = useSelector((state) => state.authUser)
  const canReview = useMemo(() => isSystemAdministrator(authUser), [authUser])
  const [filter, setFilter] = useState('pending')
  const [entries, setEntries] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('pending')
  const [entryStatus, setEntryStatus] = useState('active')
  const [reviewNote, setReviewNote] = useState('')
  const [diagnostics, setDiagnostics] = useState(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [diagnosticsError, setDiagnosticsError] = useState(null)

  const loadDiagnostics = useCallback(async () => {
    if (!canReview) return
    setDiagnosticsLoading(true)
    setDiagnosticsError(null)
    try {
      const response = await fetchAiHelperDiagnostics()
      setDiagnostics(response?.data || null)
    } catch (err) {
      setDiagnosticsError(err.payload?.message || 'Unable to load Ask AI diagnostics.')
    } finally {
      setDiagnosticsLoading(false)
    }
  }, [canReview])

  const loadEntries = useCallback(async () => {
    if (!canReview) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchAiHelperKnowledgeReview({ status: filter, per_page: 50 })
      setEntries(response?.data || [])
      setCounts(response?.meta?.counts || {})
    } catch (err) {
      setError(err.payload?.message || 'Unable to load Ask AI knowledge.')
    } finally {
      setLoading(false)
    }
  }, [canReview, filter])

  useEffect(() => {
    if (canReview) {
      loadEntries()
      loadDiagnostics()
    } else {
      setLoading(false)
    }
  }, [canReview, loadDiagnostics, loadEntries])

  const openDetail = useCallback(async (entryId) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const response = await fetchAiHelperKnowledgeReviewDetail(entryId)
      const detail = response?.data || null
      setSelected(detail)
      setReviewStatus(detail?.review_status || 'pending')
      setEntryStatus(detail?.status === 'disabled' ? 'disabled' : 'active')
      setReviewNote(detail?.review_note || '')
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to load knowledge details.')
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
    if (reviewStatus === 'rejected' && !reviewNote.trim()) {
      setDetailError('Review note is required when rejecting knowledge.')
      return
    }
    setSaving(true)
    setDetailError(null)
    try {
      const payload = {
        review_status: reviewStatus,
        review_note: reviewNote,
      }
      if (!['processing', 'failed'].includes(selected.status)) {
        payload.status = entryStatus
      }
      const response = await updateAiHelperKnowledgeReview(selected.id, payload)
      const updated = response?.data || null
      setSelected(updated)
      setEntries((prev) => prev.map((item) => (item.id === updated?.id ? updated : item)))
      await loadEntries()
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to update knowledge.')
    } finally {
      setSaving(false)
    }
  }, [entryStatus, loadEntries, reviewNote, reviewStatus, saving, selected])

  const deleteSelected = useCallback(async () => {
    if (!selected?.id || saving) return
    setSaving(true)
    setDetailError(null)
    try {
      await deleteAiHelperKnowledgeReview(selected.id)
      setEntries((prev) => prev.filter((item) => item.id !== selected.id))
      setSelected(null)
      await loadEntries()
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to delete knowledge.')
    } finally {
      setSaving(false)
    }
  }, [loadEntries, saving, selected])

  if (!canReview) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage Ask AI knowledge.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <ModulePageHeader
        title="Ask AI Knowledge"
        subtitle="Review shared guidance before it is used by Ask AI."
      />

      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h5 className="mb-1">Ask AI diagnostics</h5>
              <div className="text-muted small">
                Operational status for configuration, queue, storage, and failed processing.
              </div>
            </div>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={loadDiagnostics}
              disabled={diagnosticsLoading}
            >
              {diagnosticsLoading ? 'Refreshing...' : 'Refresh'}
            </CButton>
          </div>

          {diagnosticsError ? <CAlert color="danger">{diagnosticsError}</CAlert> : null}
          {diagnosticsLoading && !diagnostics ? (
            <div className="text-muted">
              <CSpinner size="sm" className="me-2" />
              Loading diagnostics...
            </div>
          ) : diagnostics ? (
            <>
              <CRow className="g-3 mb-3">
                <CCol md={3}>
                  <div className="text-muted small">Feature</div>
                  <CBadge color={diagnostics.enabled ? 'success' : 'secondary'}>
                    {diagnostics.enabled ? 'Enabled' : 'Disabled'}
                  </CBadge>
                </CCol>
                <CCol md={3}>
                  <div className="text-muted small">Provider config</div>
                  <CBadge color={diagnostics.configured ? 'success' : 'warning'}>
                    {diagnostics.configured ? 'Configured' : 'Missing'}
                  </CBadge>
                </CCol>
                <CCol md={3}>
                  <div className="text-muted small">Queue</div>
                  <div>{diagnostics.queue?.default_connection || 'Unknown'}</div>
                </CCol>
                <CCol md={3}>
                  <div className="text-muted small">Ask AI storage</div>
                  <div>
                    {formatBytes(diagnostics.storage?.used_bytes)}
                    {diagnostics.storage?.max_total_bytes
                      ? ` / ${formatBytes(diagnostics.storage.max_total_bytes)}`
                      : ''}
                  </div>
                </CCol>
              </CRow>
              {(diagnostics.recent_failed_uploads || []).length ? (
                <div className="border rounded p-3 bg-light">
                  <div className="fw-semibold mb-2">Recent failed uploads</div>
                  {diagnostics.recent_failed_uploads.map((item) => (
                    <div key={item.id} className="mb-2 text-break">
                      <div>{item.source_filename || item.title}</div>
                      <div className="text-muted small">{truncate(item.error, 160)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted small">No recent failed uploads.</div>
              )}
            </>
          ) : null}
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <CButtonGroup role="group" aria-label="Ask AI knowledge filters">
              {FILTERS.map((item) => (
                <CButton
                  key={item}
                  color={filter === item ? 'primary' : 'secondary'}
                  variant={filter === item ? undefined : 'outline'}
                  size="sm"
                  onClick={() => setFilter(item)}
                >
                  {FILTER_LABELS[item]} {counts[item] ? `(${counts[item]})` : ''}
                </CButton>
              ))}
            </CButtonGroup>
            <CButton size="sm" color="secondary" variant="outline" onClick={loadEntries}>
              Refresh
            </CButton>
          </div>

          {error ? <CAlert color="danger">{error}</CAlert> : null}
          {detailError && !selected ? <CAlert color="danger">{detailError}</CAlert> : null}

          {loading ? (
            <div className="text-center text-muted py-5">
              <CSpinner size="sm" className="me-2" />
              Loading Ask AI knowledge...
            </div>
          ) : entries.length ? (
            <CTable align="middle" responsive hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Title</CTableHeaderCell>
                  <CTableHeaderCell>Uploader</CTableHeaderCell>
                  <CTableHeaderCell>Scope</CTableHeaderCell>
                  <CTableHeaderCell>Uploaded</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {entries.map((entry) => (
                  <CTableRow key={entry.id}>
                    <CTableDataCell className="text-break">
                      <div className="fw-semibold">{entry.title}</div>
                      <div className="text-muted small">
                        {truncate(entry.summary || entry.source_filename)}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-break">{uploaderName(entry)}</CTableDataCell>
                    <CTableDataCell>
                      {entry.scope_type === 'module' ? entry.module_key : entry.route_key}
                    </CTableDataCell>
                    <CTableDataCell>{formatDateTime(entry.created_at)}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={REVIEW_COLORS[entry.review_status] || 'secondary'}>
                        {statusText(entry)}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton
                        size="sm"
                        color="primary"
                        variant="outline"
                        onClick={() => openDetail(entry.id)}
                      >
                        View
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          ) : (
            <div className="text-center text-muted py-5">No Ask AI knowledge found.</div>
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
          <CModalTitle>Ask AI knowledge</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading ? (
            <div className="text-center text-muted py-5">
              <CSpinner size="sm" className="me-2" />
              Loading knowledge...
            </div>
          ) : selected ? (
            <>
              {detailError ? <CAlert color="danger">{detailError}</CAlert> : null}
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <div className="text-muted small">Title</div>
                  <div>{selected.title}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Uploader</div>
                  <div>{uploaderName(selected)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">File</div>
                  <CTooltip content={selected.source_filename || 'Uploaded PDF'} placement="top">
                    <div className="text-break">{selected.source_filename || 'Uploaded PDF'}</div>
                  </CTooltip>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Uploaded</div>
                  <div>{formatDateTime(selected.created_at)}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Scope</div>
                  <div>
                    {selected.scope_type === 'module' ? selected.module_key : selected.route_key}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="text-muted small">Visibility</div>
                  <div>{selected.visibility === 'shared' ? 'Shared guidance' : 'Personal'}</div>
                </CCol>
              </CRow>

              <section className="mb-3">
                <h6>Summary</h6>
                <div className="border rounded p-3 bg-light text-break">
                  {selected.summary || 'No summary available yet.'}
                </div>
              </section>

              <section className="mb-3">
                <h6>Extracted preview</h6>
                <div className="border rounded p-3 bg-light text-break white-space-pre-wrap">
                  {selected.content_preview ||
                    selected.error ||
                    'No extracted content available yet.'}
                </div>
              </section>

              <section className="mb-3">
                <h6>Retrieved chunks</h6>
                <div className="border rounded p-3 bg-light">
                  {(selected.chunks || []).map((chunk) => (
                    <div key={chunk.id} className="mb-3">
                      <div className="small fw-semibold text-muted">
                        Chunk {chunk.chunk_index + 1}
                      </div>
                      <div className="text-break white-space-pre-wrap">{chunk.content}</div>
                    </div>
                  ))}
                  {(selected.chunks || []).length === 0 ? (
                    <div className="text-muted">No chunks available yet.</div>
                  ) : null}
                </div>
              </section>

              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Review</CFormLabel>
                  <CFormSelect
                    value={reviewStatus}
                    onChange={(event) => setReviewStatus(event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Use status</CFormLabel>
                  <CFormSelect
                    value={entryStatus}
                    onChange={(event) => setEntryStatus(event.target.value)}
                    disabled={['processing', 'failed'].includes(selected.status)}
                  >
                    <option value="active">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </CFormSelect>
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Review note</CFormLabel>
                  <CFormTextarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Required context for rejection, optional for approval"
                  />
                </CCol>
              </CRow>
            </>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="danger"
            variant="outline"
            onClick={deleteSelected}
            disabled={!selected || saving}
          >
            Delete
          </CButton>
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

export default AiHelperKnowledge
