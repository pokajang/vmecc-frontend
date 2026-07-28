import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

import DataTableFooter from 'src/components/DataTableFooter'
import ModulePageHeader from 'src/components/ModulePageHeader'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import { knowledgeEntryName } from 'src/components/ai-helper/constants'
import useTableRows from 'src/hooks/useTableRows'
import { activateOnEnterOrSpace } from 'src/utils/uiAccessibility'
import {
  deleteAiHelperKnowledgeReview,
  fetchAiHelperDiagnostics,
  fetchAiHelperKnowledgeReview,
  fetchAiHelperKnowledgeReviewDetail,
  updateAiHelperKnowledgeReview,
} from 'src/services/apiClient'
import { isSystemAdministrator } from 'src/utils/authz'
import { formatDateTime } from 'src/utils/users'
import AiHelperKnowledgeDiagnosticsCard from './ai-helper-knowledge/AiHelperKnowledgeDiagnosticsCard'
import AiHelperMarkdownUploadCard from './ai-helper-knowledge/AiHelperMarkdownUploadCard'
import AiHelperKnowledgeReviewModal from './ai-helper-knowledge/AiHelperKnowledgeReviewModal'
import {
  REVIEW_FILTERS,
  REVIEW_FILTER_LABELS,
  SCOPE_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  knowledgeRowSummary,
  matchesKnowledgeFilters,
  renderStatusBadges,
  scopeSummary,
  uploaderName,
} from './ai-helper-knowledge/helpers'

const AiHelperKnowledge = () => {
  const authUser = useSelector((state) => state.authUser)
  const location = useLocation()
  const canReview = useMemo(() => isSystemAdministrator(authUser), [authUser])

  const [statusFilter, setStatusFilter] = useState(() => {
    const status = String(new URLSearchParams(location.search).get('status') || '').toLowerCase()
    return REVIEW_FILTERS.includes(status) ? status : 'all'
  })
  const [scopeFilter, setScopeFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
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
      const fetchPage = (page) =>
        fetchAiHelperKnowledgeReview({
          status: 'all',
          per_page: 50,
          page,
        })

      const firstResponse = await fetchPage(1)
      const lastPage = Math.max(1, Number(firstResponse?.meta?.last_page || 1))
      const allEntries = [...(firstResponse?.data || [])]

      if (lastPage > 1) {
        const remainingResponses = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, index) => fetchPage(index + 2)),
        )
        remainingResponses.forEach((response) => {
          allEntries.push(...(response?.data || []))
        })
      }

      setEntries(allEntries)
    } catch (err) {
      setError(err.payload?.message || 'Unable to load Ask AI knowledge.')
    } finally {
      setLoading(false)
    }
  }, [canReview])

  useEffect(() => {
    if (canReview) {
      loadEntries()
      loadDiagnostics()
    } else {
      setLoading(false)
    }
  }, [canReview, loadDiagnostics, loadEntries])

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesKnowledgeFilters(entry, {
          search,
          scope: scopeFilter,
          status: statusFilter,
          visibility: visibilityFilter,
        }),
      ),
    [entries, scopeFilter, search, statusFilter, visibilityFilter],
  )

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredEntries)

  const openDetail = useCallback(async (entryId) => {
    setDetailLoading(true)
    setDetailError(null)
    setSelected(null)
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

  const requestDelete = useCallback(
    (entry) => {
      if (!entry?.id || saving) return
      setDeleteTarget(entry)
    },
    [saving],
  )

  const closeDeleteTarget = useCallback(() => {
    if (saving) return
    setDeleteTarget(null)
  }, [saving])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id || saving) return
    setSaving(true)
    setDetailError(null)
    try {
      await deleteAiHelperKnowledgeReview(deleteTarget.id)
      setEntries((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) {
        setSelected(null)
      }
      setDeleteTarget(null)
    } catch (err) {
      setDetailError(err.payload?.message || 'Unable to delete knowledge.')
    } finally {
      setSaving(false)
    }
  }, [deleteTarget, saving, selected])

  const buildActionItems = useCallback(
    (entry) => [
      {
        key: 'review',
        label: 'Review details',
        onClick: () => openDetail(entry.id),
      },
      {
        key: 'delete',
        label: 'Delete',
        className: 'text-danger',
        onClick: () => requestDelete(entry),
      },
    ],
    [openDetail, requestDelete],
  )

  const mobileSections = useMemo(
    () => [
      {
        key: 'knowledge-records',
        items: visibleRows.map((entry, index) => ({
          key: entry.id,
          layout: 'compact',
          eyebrow: `#${index + 1}`,
          title: entry.title || knowledgeEntryName(entry),
          subtitle: knowledgeRowSummary(entry),
          status: renderStatusBadges(entry),
          fields: [
            { key: 'uploader', label: 'Uploader', value: uploaderName(entry) },
            { key: 'scope', label: 'Scope', value: scopeSummary(entry) },
            { key: 'uploaded', label: 'Uploaded', value: formatDateTime(entry.created_at) },
          ],
          actions: (
            <RowActions
              items={buildActionItems(entry)}
              testId={`ai-helper-knowledge-mobile-actions-${entry.id}`}
            />
          ),
          onOpen: () => openDetail(entry.id),
          ariaLabel: `Open knowledge review for ${entry.title || knowledgeEntryName(entry)}`,
        })),
        variant: 'list-group',
      },
    ],
    [buildActionItems, openDetail, visibleRows],
  )

  const statusOptions = useMemo(() => {
    const derivedCounts = entries.reduce(
      (acc, entry) => {
        if (entry?.status === 'processing') {
          acc.processing += 1
        } else if (entry?.status === 'failed') {
          acc.failed += 1
        } else if (entry?.review_status === 'approved') {
          acc.approved += 1
        } else if (entry?.review_status === 'rejected') {
          acc.rejected += 1
        } else {
          acc.pending += 1
        }

        acc.all += 1
        return acc
      },
      {
        pending: 0,
        approved: 0,
        rejected: 0,
        processing: 0,
        failed: 0,
        all: 0,
      },
    )

    return REVIEW_FILTERS.map((item) => ({
      value: item,
      label: `${REVIEW_FILTER_LABELS[item]} (${derivedCounts[item] || 0})`,
    }))
  }, [entries])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
    setScopeFilter('all')
    setVisibilityFilter('all')
  }, [])

  if (!canReview) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage Ask AI knowledge.
      </CAlert>
    )
  }

  return (
    <CContainer fluid data-testid="ai-helper-knowledge-module">
      <ModulePageHeader title="Ask AI Knowledge" />

      <AiHelperKnowledgeDiagnosticsCard
        diagnostics={diagnostics}
        diagnosticsError={diagnosticsError}
        diagnosticsLoading={diagnosticsLoading}
        onRefresh={loadDiagnostics}
      />

      <AiHelperMarkdownUploadCard onUploaded={loadEntries} />

      <CCard className="mb-4" data-testid="ai-helper-knowledge-records">
        <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>Knowledge Records</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadEntries}
            disabled={loading}
          >
            Refresh
          </button>
        </CCardHeader>
        <CCardBody>
          {error ? <CAlert color="danger">{error}</CAlert> : null}
          {detailError && !selected ? <CAlert color="danger">{detailError}</CAlert> : null}

          {!error ? (
            <>
              <div data-testid="ai-helper-knowledge-filters">
                <TableFilters
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchLabel="Search knowledge by title, file, or uploader"
                  searchPlaceholder="Search knowledge"
                  showPeriod={false}
                  searchColMd={4}
                  filterColMd={2}
                  clearColMd={2}
                  filters={[
                    {
                      key: 'status',
                      label: 'Review status',
                      ariaLabel: 'Review status filter',
                      defaultValue: 'all',
                      value: statusFilter,
                      onChange: setStatusFilter,
                      options: statusOptions,
                    },
                    {
                      key: 'scope',
                      label: 'Scope',
                      defaultValue: 'all',
                      value: scopeFilter,
                      onChange: setScopeFilter,
                      options: SCOPE_FILTER_OPTIONS,
                    },
                    {
                      key: 'visibility',
                      label: 'Visibility',
                      defaultValue: 'all',
                      value: visibilityFilter,
                      onChange: setVisibilityFilter,
                      options: VISIBILITY_FILTER_OPTIONS,
                    },
                  ]}
                  onClear={clearFilters}
                  rowClassName="align-items-md-end"
                  showDesktopLabels
                />
              </div>

              <div data-testid="ai-helper-knowledge-list">
                <ResponsiveRecordCollection
                  isLoading={loading}
                  isEmpty={filteredEntries.length === 0}
                  emptyMessage={
                    <div className="text-body-secondary">
                      No Ask AI knowledge matches the current filters.
                    </div>
                  }
                  mobileSections={mobileSections}
                  mobileVariant="list-group"
                  renderDesktop={() => (
                    <div className="d-none d-md-block">
                      <div className="rounded-3 shadow-sm overflow-hidden bg-body">
                        <CTable align="middle" className="mb-0" hover responsive>
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                              <CTableHeaderCell>Title</CTableHeaderCell>
                              <CTableHeaderCell>Uploader</CTableHeaderCell>
                              <CTableHeaderCell>Scope</CTableHeaderCell>
                              <CTableHeaderCell>Uploaded</CTableHeaderCell>
                              <CTableHeaderCell>Status</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {visibleRows.map((entry, index) => (
                              <CTableRow
                                key={entry.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Open knowledge entry ${entry.title || knowledgeEntryName(entry)}`}
                                className="cursor-pointer"
                                onClick={() => openDetail(entry.id)}
                                onKeyDown={(event) =>
                                  activateOnEnterOrSpace(event, () => openDetail(entry.id))
                                }
                              >
                                <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                                <CTableDataCell className="text-break">
                                  <div className="fw-semibold">
                                    {entry.title || knowledgeEntryName(entry)}
                                  </div>
                                  <div className="small text-body-secondary">
                                    {knowledgeRowSummary(entry)}
                                  </div>
                                </CTableDataCell>
                                <CTableDataCell className="text-break">
                                  {uploaderName(entry)}
                                </CTableDataCell>
                                <CTableDataCell className="text-break">
                                  {scopeSummary(entry)}
                                </CTableDataCell>
                                <CTableDataCell>{formatDateTime(entry.created_at)}</CTableDataCell>
                                <CTableDataCell>{renderStatusBadges(entry)}</CTableDataCell>
                                <RowActionCell className="text-center align-middle">
                                  <RowActions
                                    items={buildActionItems(entry)}
                                    testId={`ai-helper-knowledge-row-actions-${entry.id}`}
                                  />
                                </RowActionCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      </div>
                    </div>
                  )}
                  footer={
                    <DataTableFooter
                      rowsToShow={rowsToShow}
                      onRowsToShowChange={setRowsToShow}
                      filteredCount={filteredEntries.length}
                      totalCount={entries.length}
                    />
                  }
                />
              </div>
            </>
          ) : null}
        </CCardBody>
      </CCard>

      <AiHelperKnowledgeReviewModal
        key={selected?.id || (detailLoading ? 'loading' : 'empty')}
        detailError={detailError}
        detailLoading={detailLoading}
        entryStatus={entryStatus}
        onClose={closeDetail}
        onDelete={() => requestDelete(selected)}
        onEntryStatusChange={setEntryStatus}
        onReviewNoteChange={setReviewNote}
        onReviewStatusChange={setReviewStatus}
        onSave={saveDetail}
        reviewNote={reviewNote}
        reviewStatus={reviewStatus}
        saving={saving}
        selected={selected}
      />

      <CModal visible={Boolean(deleteTarget)} onClose={closeDeleteTarget} alignment="center">
        <CModalHeader onClose={closeDeleteTarget}>
          <CModalTitle>Delete Knowledge</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Delete <strong>{deleteTarget?.title || knowledgeEntryName(deleteTarget || {})}</strong>?
          This cannot be undone.
        </CModalBody>
        <CModalFooter>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={closeDeleteTarget}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={confirmDelete}
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default AiHelperKnowledge
