import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CSpinner,
} from '@coreui/react'

import {
  assignFireExtinguisherIssue,
  cancelFireExtinguisherIssue,
  fetchFireExtinguisherIssueAssignees,
  fetchFireExtinguisherIssues,
  reopenFireExtinguisherIssue,
  resolveFireExtinguisherIssue,
  startFireExtinguisherIssue,
  updateFireExtinguisherIssue,
  unassignFireExtinguisherIssue,
  verifyFireExtinguisherIssue,
} from 'src/views/inspection/inspectionFireExtinguisherIssueApi'
import DataTableFooter from 'src/components/DataTableFooter'
import { PhotosGrid } from 'src/components/report-workflow/ReportViewComponents'
import ReportPhotoSection from 'src/views/report/shared/emergency-report/ReportPhotoSection'
import FireExtinguisherEditDialog from './FireExtinguisherEditDialog'
import FireExtinguisherLifecycleDialog from './FireExtinguisherLifecycleDialog'

const IssueActions = ({
  issue,
  currentUser,
  canManage,
  canVerify,
  canReopen,
  assignees,
  assigneesLoading,
  onChanged,
}) => {
  const [mode, setMode] = useState('')
  const [note, setNote] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [severity, setSeverity] = useState(issue.severity || 'medium')
  const [dueAt, setDueAt] = useState(issue.dueAt?.slice(0, 10) || '')
  const [resolutionPhotos, setResolutionPhotos] = useState([])
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(
    issue.assignee?.id ? String(issue.assignee.id) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isOwnResolution =
    Boolean(issue.resolvedByUserId && currentUser?.id) &&
    Number(issue.resolvedByUserId) === Number(currentUser.id)

  useEffect(() => {
    setSelectedAssigneeId(issue.assignee?.id ? String(issue.assignee.id) : '')
  }, [issue.assignee?.id])

  useEffect(() => {
    if (mode === 'edit') return
    setSeverity(issue.severity || 'medium')
    setDueAt(issue.dueAt?.slice(0, 10) || '')
  }, [issue.dueAt, issue.severity, mode])

  const resetActionForm = () => {
    setMode('')
    setNote('')
    setCorrectiveAction('')
    setResolutionPhotos([])
    setError('')
  }

  const openActionForm = (nextMode) => {
    resetActionForm()
    setMode(nextMode)
  }

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      let updated
      if (action === 'assign' || action === 'assign-self') {
        const assignedToUserId =
          action === 'assign-self' ? currentUser?.id : Number(selectedAssigneeId)
        updated = await assignFireExtinguisherIssue(issue.id, {
          assignedToUserId,
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'unassign') {
        updated = await unassignFireExtinguisherIssue(issue.id, {
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'start') {
        updated = await startFireExtinguisherIssue(issue.id, {
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'resolve') {
        updated = await resolveFireExtinguisherIssue(issue.id, {
          correctiveAction,
          resolutionNotes: note,
          resolutionPhotos,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'verify') {
        updated = await verifyFireExtinguisherIssue(issue.id, {
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'reopen') {
        updated = await reopenFireExtinguisherIssue(issue.id, {
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'cancel') {
        updated = await cancelFireExtinguisherIssue(issue.id, {
          note,
          lockVersion: issue.lockVersion,
        })
      } else if (action === 'edit') {
        updated = await updateFireExtinguisherIssue(issue.id, {
          severity,
          dueAt: dueAt || null,
          lockVersion: issue.lockVersion,
        })
      }
      resetActionForm()
      onChanged?.(updated)
    } catch (requestError) {
      setError(requestError?.message || 'Unable to update issue.')
    } finally {
      setBusy(false)
    }
  }

  if (!canManage && !canVerify) return null

  return (
    <div className="d-grid gap-2 mt-2">
      {error ? (
        <CAlert color="danger" className="py-2 mb-0">
          {error}
        </CAlert>
      ) : null}
      <div className="d-flex flex-wrap gap-2">
        {canManage && !issue.assignee && currentUser?.id ? (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => run('assign-self')}
            disabled={busy}
          >
            Assign to me
          </CButton>
        ) : null}
        {canManage && ['open', 'in_progress'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => openActionForm('assign')}
            disabled={busy || assigneesLoading}
          >
            {issue.assignee ? 'Reassign' : 'Assign'}
          </CButton>
        ) : null}
        {canManage && issue.assignee && ['open', 'in_progress'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => run('unassign')}
            disabled={busy}
          >
            Unassign
          </CButton>
        ) : null}
        {canManage && issue.status === 'open' && issue.assignee ? (
          <CButton
            size="sm"
            color="primary"
            variant="outline"
            onClick={() => run('start')}
            disabled={busy}
          >
            Start work
          </CButton>
        ) : null}
        {canManage && ['open', 'in_progress'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="primary"
            onClick={() => openActionForm('resolve')}
            disabled={busy}
          >
            Resolve
          </CButton>
        ) : null}
        {canVerify && issue.status === 'pending_verification' && !isOwnResolution ? (
          <CButton
            size="sm"
            color="success"
            onClick={() => openActionForm('verify')}
            disabled={busy}
          >
            Verify and close
          </CButton>
        ) : null}
        {canManage && canReopen && ['closed', 'cancelled'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="warning"
            variant="outline"
            onClick={() => openActionForm('reopen')}
            disabled={busy}
          >
            Reopen
          </CButton>
        ) : null}
        {canManage && !['closed', 'cancelled'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => openActionForm('edit')}
            disabled={busy}
          >
            Edit priority
          </CButton>
        ) : null}
        {canManage && ['open', 'in_progress', 'pending_verification'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="danger"
            variant="outline"
            onClick={() => openActionForm('cancel')}
            disabled={busy}
          >
            Cancel issue
          </CButton>
        ) : null}
      </div>
      {canVerify && issue.status === 'pending_verification' && isOwnResolution ? (
        <div className="small text-body-secondary">
          A different authorized user must verify this corrective work.
        </div>
      ) : null}
      {mode ? (
        <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-2">
          {mode === 'assign' ? (
            <CFormSelect
              label="Assign to"
              aria-label="Assign to"
              value={selectedAssigneeId}
              onChange={(event) => setSelectedAssigneeId(event.target.value)}
              disabled={assigneesLoading}
            >
              <option value="">Select an eligible assignee</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                  {assignee.email ? ` — ${assignee.email}` : ''}
                </option>
              ))}
            </CFormSelect>
          ) : null}
          {mode === 'edit' ? (
            <div className="row g-2">
              <div className="col-sm-6">
                <CFormSelect
                  label="Severity"
                  aria-label="Severity"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                    { label: 'Critical', value: 'critical' },
                  ]}
                />
              </div>
              <div className="col-sm-6">
                <CFormInput
                  type="date"
                  label="Due date"
                  aria-label="Due date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>
            </div>
          ) : null}
          {mode === 'resolve' ? (
            <>
              <CFormTextarea
                label="Corrective action"
                aria-label="Corrective action"
                value={correctiveAction}
                onChange={(event) => setCorrectiveAction(event.target.value)}
              />
              <ReportPhotoSection
                moduleKey="inspection"
                title="Resolution evidence"
                emptyMessage="No resolution photos added."
                photos={resolutionPhotos}
                onChange={setResolutionPhotos}
              />
            </>
          ) : null}
          {!['edit', 'assign'].includes(mode) ? (
            <CFormTextarea
              label={
                mode === 'verify'
                  ? 'Verification notes'
                  : mode === 'reopen'
                    ? 'Reopen reason'
                    : mode === 'cancel'
                      ? 'Cancellation reason'
                      : 'Resolution notes'
              }
              aria-label={
                mode === 'verify'
                  ? 'Verification notes'
                  : mode === 'reopen'
                    ? 'Reopen reason'
                    : mode === 'cancel'
                      ? 'Cancellation reason'
                      : 'Resolution notes'
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          ) : null}
          <div className="d-flex justify-content-end gap-2">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={resetActionForm}
              disabled={busy}
            >
              Cancel
            </CButton>
            <CButton
              size="sm"
              color="primary"
              onClick={() => run(mode)}
              disabled={
                busy ||
                (mode === 'assign' && !selectedAssigneeId) ||
                (!['edit', 'assign'].includes(mode) && !note.trim()) ||
                (mode === 'resolve' && !correctiveAction.trim())
              }
            >
              {busy ? 'Saving...' : 'Confirm'}
            </CButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const FireExtinguisherManagementPanel = ({
  detail,
  currentUser,
  canManageCatalog = false,
  canManageIssues = false,
  canVerifyIssues = false,
  onAssetChanged,
}) => {
  const [issues, setIssues] = useState([])
  const [issueMeta, setIssueMeta] = useState({ page: 1, lastPage: 1, total: 0, active: null })
  const [issuePage, setIssuePage] = useState(1)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [issueError, setIssueError] = useState('')
  const issueRequestRef = useRef({ id: 0, controller: null })
  const [assignees, setAssignees] = useState([])
  const [assigneesLoading, setAssigneesLoading] = useState(false)
  const [assigneeError, setAssigneeError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState('')

  const catalogId = detail?.catalogId || detail?.id
  const loadIssues = useCallback(async () => {
    if (!catalogId) return
    issueRequestRef.current.controller?.abort()
    const requestId = issueRequestRef.current.id + 1
    const controller = new AbortController()
    issueRequestRef.current = { id: requestId, controller }
    setLoadingIssues(true)
    try {
      const response = await fetchFireExtinguisherIssues(
        {
          extinguisherId: catalogId,
          page: issuePage,
          perPage: 25,
        },
        { signal: controller.signal },
      )
      if (issueRequestRef.current.id !== requestId) return
      if (Number(response.meta?.total || 0) > 0 && response.data.length === 0 && issuePage > 1) {
        setIssuePage(Math.max(1, Number(response.meta?.lastPage || 1)))
        return
      }
      setIssues(response.data)
      setIssueMeta(response.meta || {})
      setIssueError('')
    } catch (requestError) {
      if (requestError?.name === 'AbortError' || issueRequestRef.current.id !== requestId) return
      setIssueError(requestError?.message || 'Unable to load managed issues.')
    } finally {
      if (issueRequestRef.current.id === requestId) {
        setLoadingIssues(false)
        issueRequestRef.current.controller = null
      }
    }
  }, [catalogId, issuePage])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  useEffect(() => {
    setIssuePage(1)
  }, [catalogId])

  useEffect(() => {
    if (!canManageIssues) return undefined
    const controller = new AbortController()
    setAssigneesLoading(true)
    fetchFireExtinguisherIssueAssignees({ signal: controller.signal })
      .then((rows) => {
        setAssignees(rows)
        setAssigneeError('')
      })
      .catch((requestError) => {
        if (requestError?.name === 'AbortError') return
        setAssigneeError(requestError?.message || 'Unable to load eligible assignees.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setAssigneesLoading(false)
      })
    return () => controller.abort()
  }, [canManageIssues])

  useEffect(
    () => () => {
      issueRequestRef.current.id += 1
      issueRequestRef.current.controller?.abort()
    },
    [],
  )

  const handleAssetChanged = (updated, result) => {
    onAssetChanged?.(updated, result)
    if (result?.action && result.action !== 'edit') loadIssues()
  }

  const lifecycleStatus = detail.lifecycleStatus || 'active'
  const activeIssues = issues.filter((issue) =>
    ['open', 'in_progress', 'pending_verification'].includes(issue.status),
  )
  const closedIssues = issues.filter((issue) => !activeIssues.includes(issue))

  return (
    <div className="d-grid gap-3">
      <section className="rounded-3 border p-3 d-grid gap-2">
        <div className="fw-semibold">Asset lifecycle</div>
        {detail.outOfServiceReason ? (
          <div className="small text-body-secondary">Reason: {detail.outOfServiceReason}</div>
        ) : null}
        {detail.retirementReason ? (
          <div className="small text-body-secondary">
            Retirement reason: {detail.retirementReason}
          </div>
        ) : null}
        {canManageCatalog ? (
          <div className="d-flex flex-wrap gap-2">
            {lifecycleStatus !== 'retired' ? (
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                Edit asset
              </CButton>
            ) : null}
            {lifecycleStatus === 'active' ? (
              <CButton
                size="sm"
                color="warning"
                variant="outline"
                onClick={() => setLifecycleAction('out_of_service')}
              >
                Mark out of service
              </CButton>
            ) : null}
            {lifecycleStatus === 'out_of_service' ? (
              <CButton
                size="sm"
                color="success"
                variant="outline"
                onClick={() => setLifecycleAction('active')}
              >
                Return to service
              </CButton>
            ) : null}
            {lifecycleStatus !== 'retired' ? (
              <CButton
                size="sm"
                color="danger"
                variant="outline"
                onClick={() => setLifecycleAction('retired')}
              >
                Retire
              </CButton>
            ) : null}
            {lifecycleStatus === 'retired' ? (
              <CButton
                size="sm"
                color="primary"
                variant="outline"
                onClick={() => setLifecycleAction('restore')}
              >
                Restore
              </CButton>
            ) : null}
          </div>
        ) : null}
        <FireExtinguisherLifecycleDialog
          asset={lifecycleAction ? detail : null}
          action={lifecycleAction}
          onClose={() => setLifecycleAction('')}
          onChanged={handleAssetChanged}
        />
        <FireExtinguisherEditDialog
          asset={editOpen ? detail : null}
          onClose={() => setEditOpen(false)}
          onChanged={handleAssetChanged}
        />
      </section>

      <section className="rounded-3 border p-3 d-grid gap-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="fw-semibold">Issue management</div>
          <CBadge
            color={Number(issueMeta.active || detail.openIssueCount || 0) ? 'danger' : 'success'}
          >
            {Number(issueMeta.active ?? detail.openIssueCount ?? 0)} open
          </CBadge>
        </div>
        {loadingIssues ? (
          <div className="text-body-secondary">
            <CSpinner size="sm" className="me-2" />
            Loading issues...
          </div>
        ) : null}
        {issueError ? (
          <CAlert color="danger" className="mb-0">
            {issueError}
          </CAlert>
        ) : null}
        {assigneeError ? (
          <CAlert color="warning" className="mb-0 py-2" role="alert">
            {assigneeError}
          </CAlert>
        ) : null}
        {!loadingIssues && !issueError && issues.length === 0 ? (
          <div className="text-body-secondary">No managed issues.</div>
        ) : null}
        {[...activeIssues, ...closedIssues].map((issue) => (
          <div key={issue.id} className="rounded-3 border p-3 d-grid gap-1">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div className="fw-semibold">{issue.checkName || issue.title}</div>
              <div className="d-flex gap-1">
                <CBadge color={issue.isOverdue ? 'danger' : 'secondary'}>
                  {issue.status.replaceAll('_', ' ')}
                </CBadge>
                <CBadge color="light" textColor="dark">
                  {issue.severity}
                </CBadge>
              </div>
            </div>
            {issue.description ? <div className="small">{issue.description}</div> : null}
            <div className="small text-body-secondary">
              {issue.assignee ? `Assigned to ${issue.assignee.name}` : 'Unassigned'} —{' '}
              {issue.occurrenceCount || 0} occurrence{issue.occurrenceCount === 1 ? '' : 's'}
            </div>
            {issue.dueAt ? (
              <div className={`small ${issue.isOverdue ? 'text-danger' : 'text-body-secondary'}`}>
                Due {new Date(issue.dueAt).toLocaleDateString()}
              </div>
            ) : null}
            {issue.correctiveAction ? (
              <div className="small">
                <span className="fw-semibold">Corrective action:</span> {issue.correctiveAction}
              </div>
            ) : null}
            <PhotosGrid photos={issue.resolutionEvidence} />
            <IssueActions
              issue={issue}
              currentUser={currentUser}
              canManage={canManageIssues}
              canVerify={canVerifyIssues}
              canReopen={lifecycleStatus !== 'retired'}
              assignees={assignees}
              assigneesLoading={assigneesLoading}
              onChanged={() => loadIssues()}
            />
            {issue.events?.length ? (
              <details className="small mt-2">
                <summary className="text-body-secondary">Activity ({issue.events.length})</summary>
                <div className="border-start ms-1 ps-3 mt-2 d-grid gap-2">
                  {issue.events.map((event) => (
                    <div key={event.id}>
                      <div className="fw-semibold">{event.type.replaceAll('_', ' ')}</div>
                      <div className="text-body-secondary">
                        {event.actor || 'System'} — {new Date(event.createdAt).toLocaleString()}
                      </div>
                      {event.note ? <div>{event.note}</div> : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ))}
        {Number(issueMeta.total || 0) > 0 ? (
          <DataTableFooter
            rowsToShow={25}
            showRowsPerPage={false}
            visibleCount={issues.length}
            filteredCount={Number(issueMeta.total)}
            totalCount={Number(issueMeta.total)}
            currentPage={Number(issueMeta.page || issuePage)}
            lastPage={Number(issueMeta.lastPage || 1)}
            onPageChange={setIssuePage}
            showFilteredFrom={false}
            className="mt-0"
          />
        ) : null}
      </section>
    </div>
  )
}

export default FireExtinguisherManagementPanel
