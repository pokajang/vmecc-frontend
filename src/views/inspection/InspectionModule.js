import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TableLoader from 'src/components/TableLoader'
import InspectionWorkflowActionModal from 'src/views/inspection/components/InspectionWorkflowActionModal'
import InspectionRecordsSection from 'src/views/inspection/InspectionRecordsSection'
import InspectionDetailSection from 'src/views/inspection/InspectionDetailSection'
import InspectionReviewSection from 'src/views/inspection/InspectionReviewSection'
import { INSPECTION_SORT_OPTIONS } from 'src/views/inspection/constants'
import {
  downloadInspectionReportPdf,
  persistInspectionRecord,
} from 'src/views/inspection/inspectionApi'
import {
  clearInspectionDraft,
  loadInspectionDraft,
  saveInspectionDraft,
} from 'src/views/inspection/inspectionStorage'
import useInspectionRecords from 'src/views/inspection/hooks/useInspectionRecords'
import useInspectionUnsavedChangesGuard from 'src/views/inspection/hooks/useInspectionUnsavedChangesGuard'
import useInspectionWorkflowActions from 'src/views/inspection/hooks/useInspectionWorkflowActions'
import {
  buildDraftRow,
  clearWorkspace,
  getActiveSection,
  loadWorkspace,
  saveWorkspace,
} from 'src/views/inspection/inspectionWorkspace'
import { formatDateTime, toDateTime } from 'src/views/inspection/inspectionSharedUtils'
import InspectionForm from './InspectionForm'
import {
  buildInspectionDraftPayload,
  buildInspectionReviewRecord,
  buildInspectionSubmittedRecord,
  createInspectionFormSignature,
  defaultInspectionForm,
  getInspectionDraftMeta,
  normalizeInspectionForm,
  selectInspectionInitialForm,
} from './inspectionFormHelpers'

const REPORT_WORKFLOW_DECLARATION_LABEL =
  'I confirm this report workflow action is accurate and aligned with submitted incident details.'

const InspectionModule = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useSelector((state) => state.authUser)
  const toaster = useRef()
  const submitLockRef = useRef(false)
  const initRouteKeyRef = useRef('')
  const lastPersistedSignatureRef = useRef('')

  const [toast, addToast] = useState(0)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDraftChoice, setShowDraftChoice] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [draftVersion, setDraftVersion] = useState(0)
  const [activeDraftRows, setActiveDraftRows] = useState([])
  const [formState, setFormState] = useState(defaultInspectionForm)
  const [isFormReady, setIsFormReady] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)

  const reportBasePath = '/inspection'
  const reportTypeLabel = 'Inspection'
  const reportTypeIdPrefix = 'INS'
  const activeSection = useMemo(() => getActiveSection(location.pathname), [location.pathname])
  const isEditRoute =
    activeSection === 'form' && /\/inspection\/[^/]+\/edit$/i.test(location.pathname)
  const routeMode = isEditRoute ? 'edit' : 'new'
  const routeRecordId = isEditRoute ? String(reportId || '').trim() : ''

  const pushToast = useCallback((message, { title, color = 'light', delay = 5000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title ? (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        ) : null}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) {
        if (!cancelled) setActiveDraftRows([])
        return
      }
      const draft = await loadInspectionDraft(user.id)
      if (cancelled) return
      const row = buildDraftRow(draft, user?.name || user?.email || user?.id || '')
      setActiveDraftRows(row ? [row] : [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [draftVersion, user?.email, user?.id, user?.name])

  const {
    records,
    loadError,
    isLoading,
    search,
    setSearch,
    period,
    setPeriod,
    sort,
    setSort,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    filteredRecords,
    selectedRecord,
    typeOptions,
    statusOptions,
    recordsInScopeCount,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    clearFilters,
    deleteRecord,
    reloadRecords,
  } = useInspectionRecords({
    userId: user?.id,
    reportId,
    draftRows: activeDraftRows,
  })

  const nextReportSequence = useMemo(() => {
    const inspectionRecords = records.filter(
      (row) => String(row?.reportType || '').toLowerCase() === 'inspection',
    )
    return inspectionRecords.length + 1
  }, [records])

  const editingRecord = records.find((row) => String(row.id || '').trim() === routeRecordId) || null
  const activeDraftPayload = activeDraftRows[0]?.__rawDraftPayload || null

  const currentWorkspace = useMemo(() => loadWorkspace(user?.id), [user?.id])

  const downloadRecord = useCallback(
    async (id) => {
      const record = records.find((row) => String(row.id || '') === String(id || ''))
      if (!record) return
      setDownloadingId(id)
      try {
        const { blob, filename } = await downloadInspectionReportPdf(record)
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename || `${record.displayId || record.id}.pdf`
        a.click()
        URL.revokeObjectURL(a.href)
      } catch (err) {
        if (err?.status === 409 || String(err?.code || '') === 'REPORT_VERSION_CONFLICT') {
          try {
            const { blob, filename } = await downloadInspectionReportPdf({
              id: record.id,
              displayId: record.displayId,
            })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = filename || `${record.displayId || record.id}.pdf`
            a.click()
            URL.revokeObjectURL(a.href)
            return
          } catch {
            // Fall through to default error toast below.
          }
        }
        pushToast(err.message || 'Unable to download PDF. Please try again.', {
          title: 'Download failed',
          color: 'danger',
        })
      } finally {
        setDownloadingId(null)
      }
    },
    [records, pushToast],
  )

  useEffect(() => {
    if (!loadError) return
    pushToast(loadError?.message || 'Unable to load inspection records. Please try again.', {
      title: 'Load failed',
      color: 'danger',
    })
  }, [loadError, pushToast])

  useEffect(() => {
    if (activeSection !== 'form') {
      setIsFormReady(false)
      initRouteKeyRef.current = ''
      return
    }
    if (!user?.id) return
    if (routeMode === 'edit' && !editingRecord && isLoading) return

    const routeKey = `${routeMode}:${routeRecordId || 'new'}`
    if (initRouteKeyRef.current === routeKey) return

    const next = selectInspectionInitialForm({
      routeMode,
      routeRecordId,
      workspace: loadWorkspace(user.id),
      draftPayload: activeDraftPayload,
      record: editingRecord,
    })

    initRouteKeyRef.current = routeKey
    setFormState(next.form)
    setIsFormReady(true)
    setIsFormDirty(false)
    lastPersistedSignatureRef.current = createInspectionFormSignature(next.form)
    if (next.source === 'draft') {
      pushToast('Inspection draft restored.', { title: 'Draft loaded', color: 'info' })
    }
  }, [
    activeDraftPayload,
    activeSection,
    editingRecord,
    isLoading,
    pushToast,
    routeMode,
    routeRecordId,
    user?.id,
  ])

  useEffect(() => {
    if (activeSection !== 'form' || !isFormReady || !user?.id) return
    saveWorkspace(user.id, {
      mode: routeMode,
      recordId: routeRecordId,
      form: normalizeInspectionForm(formState),
    })
    setIsFormDirty(createInspectionFormSignature(formState) !== lastPersistedSignatureRef.current)
  }, [activeSection, formState, isFormReady, routeMode, routeRecordId, user?.id])

  const runGuardedAction = (action) => {
    if (activeSection === 'form' && isFormDirty) {
      setPendingAction(() => action)
      setShowDiscard(true)
      return
    }
    action()
  }

  useInspectionUnsavedChangesGuard(
    useCallback(() => activeSection === 'form' && isFormDirty, [activeSection, isFormDirty]),
  )

  const clearWorkingState = useCallback(() => {
    setFormState(defaultInspectionForm)
    setIsFormReady(false)
    setIsFormDirty(false)
    initRouteKeyRef.current = ''
    lastPersistedSignatureRef.current = ''
    clearWorkspace(user?.id)
  }, [user?.id])

  const startNew = () => {
    const hasSavedDraft = activeDraftRows.some((row) => row?.recordKind === 'draft')
    if (activeSection !== 'form' && hasSavedDraft) {
      setShowDraftChoice(true)
      return
    }
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const openSavedDraft = () => {
    setShowDraftChoice(false)
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const startBlankReport = async () => {
    setShowDraftChoice(false)
    await clearInspectionDraft(user?.id)
    setDraftVersion((prev) => prev + 1)
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const saveDraft = async (nextForm = formState, context = null) => {
    const workspace = context || loadWorkspace(user?.id)
    const mode = workspace?.mode || routeMode
    const editReportId = workspace?.recordId || routeRecordId
    const payload = buildInspectionDraftPayload({
      form: nextForm,
      mode,
      editReportId,
    })
    let saved = false
    try {
      saved = await saveInspectionDraft(user?.id, payload)
    } catch (error) {
      pushToast(error?.message || 'Unable to save draft in database/API. Please try again.', {
        title: 'Draft save failed',
        color: 'danger',
      })
      return false
    }
    if (!saved) {
      pushToast('Unable to save draft in database/API. Please try again.', {
        title: 'Draft save failed',
        color: 'danger',
      })
      return false
    }
    lastPersistedSignatureRef.current = createInspectionFormSignature(nextForm)
    setIsFormDirty(false)
    setDraftVersion((prev) => prev + 1)
    pushToast('Draft saved.', { title: 'Draft saved', color: 'success' })
    return true
  }

  const requestReview = (nextForm) => {
    const normalized = normalizeInspectionForm(nextForm)
    setFormState(normalized)
    saveWorkspace(user?.id, {
      mode: routeMode,
      recordId: routeRecordId,
      form: normalized,
    })
    navigate(`${reportBasePath}/review`)
  }

  const reviewWorkspace = activeSection === 'review' ? loadWorkspace(user?.id) : currentWorkspace
  const reviewForm = normalizeInspectionForm(
    activeSection === 'review' ? reviewWorkspace?.form || formState : formState,
  )
  const reviewEditingRecord =
    reviewWorkspace?.mode === 'edit'
      ? records.find(
          (row) => String(row.id || '').trim() === String(reviewWorkspace?.recordId || '').trim(),
        ) || null
      : null
  const reviewRecord =
    activeSection === 'review' && reviewWorkspace?.form
      ? buildInspectionReviewRecord({
          form: reviewForm,
          mode: reviewWorkspace.mode,
          editingRecord: reviewEditingRecord,
          reportTypeSlug: 'inspection',
          reportTypeIdPrefix,
          sequence: nextReportSequence,
          user,
        })
      : null

  const backFromReview = () => {
    const workspace = loadWorkspace(user?.id)
    if (!workspace) return
    if (workspace.mode === 'edit' && workspace.recordId) {
      navigate(`${reportBasePath}/${encodeURIComponent(workspace.recordId)}/edit`)
      return
    }
    navigate(`${reportBasePath}/new`)
  }

  const submit = async (record) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSubmitting(true)
    try {
      const saved = await persistInspectionRecord(user?.id, record)
      if (!saved) throw new Error('Unable to save this report in database/API. Please try again.')
      await reloadRecords()
      await clearInspectionDraft(user?.id)
      setDraftVersion((prev) => prev + 1)
      clearWorkingState()
      pushToast(`${reportTypeLabel} report ${record.displayId} submitted.`, {
        title: 'Submitted',
        color: 'success',
      })
      navigate(reportBasePath)
    } catch (error) {
      pushToast(error?.message || 'Unable to save this report. Please try again.', {
        title: 'Save failed',
        color: 'danger',
      })
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  const confirmDeleteRecord = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    setIsDeleting(true)
    try {
      if (target.recordKind === 'draft') {
        await clearInspectionDraft(user?.id)
        clearWorkingState()
        setDraftVersion((prev) => prev + 1)
      } else {
        const result = await deleteRecord(target.id)
        if (!result.saved) {
          pushToast(result.error?.message || 'Unable to delete this report. Please try again.', {
            title: 'Delete failed',
            color: 'danger',
          })
          return
        }
      }
      pushToast(`${target.displayId || 'Report'} deleted.`, {
        title: 'Report deleted',
        color: 'info',
      })
      if (String(reportId || '') === String(target.id)) navigate(reportBasePath)
    } finally {
      setIsDeleting(false)
    }
  }

  const canEditRecord = useCallback((row) => {
    if (!row) return false
    if (row.recordKind === 'draft') return true
    return ['Submitted', 'Rejected'].includes(String(row.status || '').trim())
  }, [])

  const canDeleteRecord = useCallback((row) => Boolean(row), [])

  const {
    workflowActionState,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    isActionBusy,
    canReviewRecord,
    canApproveRecord,
    canRejectRecord,
    closeWorkflowActionModal,
    openWorkflowActionModal,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    submitWorkflowAction,
  } = useInspectionWorkflowActions({ reloadRecords, pushToast })

  const editRecord = (row) => {
    if (!row) return
    if (row.recordKind === 'draft') {
      const meta = getInspectionDraftMeta(row.__rawDraftPayload || {})
      if (meta.mode === 'edit' && meta.editReportId) {
        navigate(`${reportBasePath}/${encodeURIComponent(meta.editReportId)}/edit`)
        return
      }
      navigate(`${reportBasePath}/new`)
      return
    }
    navigate(`${reportBasePath}/${encodeURIComponent(String(row.id || '').trim())}/edit`)
  }

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load inspection page. Please sign in again.</div>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      {(isDeleting || isSubmitting) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.18)',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 36px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
            <TableLoader message={isSubmitting ? 'Submitting report...' : 'Please wait...'} />
          </div>
        </div>
      )}

      <ActionConfirmModal
        visible={showDiscard}
        title="Discard unsaved changes?"
        message="You have unsaved changes. Continue and discard them?"
        confirmLabel="Discard"
        confirmColor="danger"
        onClose={() => {
          setShowDiscard(false)
          setPendingAction(null)
        }}
        onConfirm={() => {
          setShowDiscard(false)
          setIsFormDirty(false)
          const action = pendingAction
          setPendingAction(null)
          action?.()
        }}
      />
      <ActionConfirmModal
        visible={showDraftChoice}
        title="Resume Inspection Draft"
        message="A saved Inspection draft exists. Continue editing it or start blank and discard that draft?"
        confirmLabel="Start Blank"
        confirmColor="danger"
        onClose={openSavedDraft}
        onConfirm={startBlankReport}
      />
      <ActionConfirmModal
        visible={Boolean(deleteTarget)}
        title={deleteTarget?.recordKind === 'draft' ? 'Delete Draft' : 'Delete Report'}
        message={
          deleteTarget?.recordKind === 'draft'
            ? 'Delete this saved draft? This cannot be undone.'
            : `Delete ${deleteTarget?.displayId || 'this report'}? This cannot be undone.`
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteRecord}
      />

      <InspectionWorkflowActionModal
        visible={workflowActionState.visible}
        actionType={workflowActionState.actionType}
        record={workflowActionState.record}
        remarks={workflowRemarks}
        onRemarksChange={handleWorkflowRemarksChange}
        declarationChecked={workflowDeclarationChecked}
        onDeclarationChange={handleWorkflowDeclarationChange}
        declarationLabel={REPORT_WORKFLOW_DECLARATION_LABEL}
        declarationError={workflowDeclarationError}
        rejectError={workflowRejectError}
        actionDisabled={isActionBusy}
        renderStatusBadge={renderStatusBadge}
        formatDateTime={formatDateTime}
        onClose={closeWorkflowActionModal}
        onSubmit={submitWorkflowAction}
      />

      <CNav variant="underline" role="tablist" className="mb-3 flex-nowrap overflow-auto pb-1">
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'records' || activeSection === 'detail'}
            onClick={() => runGuardedAction(() => navigate(reportBasePath))}
            style={{ cursor: 'pointer' }}
            className={`${activeSection === 'records' || activeSection === 'detail' ? 'text-primary' : ''} text-nowrap`.trim()}
          >
            Inspection Records
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'form' || activeSection === 'review'}
            onClick={() => runGuardedAction(startNew)}
            style={{ cursor: 'pointer' }}
            className={`${activeSection === 'form' || activeSection === 'review' ? 'text-primary' : ''} text-nowrap`.trim()}
          >
            New Inspection
          </CNavLink>
        </CNavItem>
      </CNav>

      {activeSection === 'records' ? (
        <InspectionRecordsSection
          startNew={startNew}
          search={search}
          setSearch={setSearch}
          period={period}
          setPeriod={setPeriod}
          sort={sort}
          setSort={setSort}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          typeOptions={typeOptions}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
          sortOptions={INSPECTION_SORT_OPTIONS}
          clearFilters={clearFilters}
          isLoading={isLoading}
          filteredRecords={filteredRecords}
          visibleRows={visibleRows}
          onViewRecord={(id) => navigate(`${reportBasePath}/${encodeURIComponent(id)}`)}
          onDownloadRecord={downloadRecord}
          downloadingId={downloadingId}
          onEditRecord={editRecord}
          onDeleteRecord={setDeleteTarget}
          onReviewTransition={(row) => openWorkflowActionModal(row, 'review')}
          onApproveTransition={(row) => openWorkflowActionModal(row, 'approve')}
          onRejectTransition={(row) => openWorkflowActionModal(row, 'reject')}
          canReviewRecord={canReviewRecord}
          canApproveRecord={canApproveRecord}
          canRejectRecord={canRejectRecord}
          canEditRecord={canEditRecord}
          canDeleteRecord={canDeleteRecord}
          formatDateTime={formatDateTime}
          rowsToShow={rowsToShow}
          setRowsToShow={setRowsToShow}
          totalCount={recordsInScopeCount}
        />
      ) : null}

      {activeSection === 'detail' ? (
        <InspectionDetailSection
          selectedRecord={selectedRecord}
          onBack={() => navigate(reportBasePath)}
          formatDateTime={formatDateTime}
          renderStatusBadge={renderStatusBadge}
          onDownloadRecord={downloadRecord}
          downloadingId={downloadingId}
          onReviewRecord={(row) => openWorkflowActionModal(row, 'review')}
          onApproveRecord={(row) => openWorkflowActionModal(row, 'approve')}
          onRejectRecord={(row) => openWorkflowActionModal(row, 'reject')}
          isActionBusy={isActionBusy}
        />
      ) : null}

      {activeSection === 'review' ? (
        <InspectionReviewSection
          selectedRecord={reviewRecord}
          reviewActions={{
            onBackToEdit: backFromReview,
            onSaveDraft: () => saveDraft(reviewForm, reviewWorkspace),
            onConfirm: () =>
              reviewRecord && submit(buildInspectionSubmittedRecord(reviewRecord, user)),
            confirmLabel: 'Confirm Submit',
          }}
          isSubmittingReview={isSubmitting}
          renderStatusBadge={renderStatusBadge}
        />
      ) : null}

      {activeSection === 'form' ? (
        isFormReady ? (
          <InspectionForm
            user={user}
            value={formState}
            pushToast={pushToast}
            onChange={(nextForm) => setFormState(normalizeInspectionForm(nextForm))}
            onSaveDraft={saveDraft}
            onRequestReview={requestReview}
          />
        ) : (
          <TableLoader />
        )
      ) : null}
    </CContainer>
  )
}

export default InspectionModule
