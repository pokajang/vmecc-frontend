import React, { useCallback, useEffect, useState } from 'react'
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
  markFireExtinguisherOutOfService,
  restoreFireExtinguisher,
  retireFireExtinguisher,
  returnFireExtinguisherToService,
  updateFireExtinguisherOption,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import {
  assignFireExtinguisherIssue,
  cancelFireExtinguisherIssue,
  fetchFireExtinguisherIssues,
  reopenFireExtinguisherIssue,
  resolveFireExtinguisherIssue,
  startFireExtinguisherIssue,
  updateFireExtinguisherIssue,
  verifyFireExtinguisherIssue,
} from 'src/views/inspection/inspectionFireExtinguisherIssueApi'
import { AddFireExtinguisherForm } from '../types/fire-extinguisher/fireExtinguisherEditForm'
import { PhotosGrid } from 'src/components/report-workflow/ReportViewComponents'
import ReportPhotoSection from 'src/views/report/shared/emergency-report/ReportPhotoSection'

const lifecycleLabels = {
  active: 'Active',
  out_of_service: 'Out of service',
  retired: 'Retired',
}

const IssueActions = ({ issue, currentUser, canManage, canVerify, canReopen, onChanged }) => {
  const [mode, setMode] = useState('')
  const [note, setNote] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [severity, setSeverity] = useState(issue.severity || 'medium')
  const [dueAt, setDueAt] = useState(issue.dueAt?.slice(0, 10) || '')
  const [resolutionPhotos, setResolutionPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      let updated
      if (action === 'assign') {
        updated = await assignFireExtinguisherIssue(issue.id, {
          assignedToUserId: currentUser.id,
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
      setMode('')
      setNote('')
      setCorrectiveAction('')
      setResolutionPhotos([])
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
            onClick={() => run('assign')}
            disabled={busy}
          >
            Assign to me
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
          <CButton size="sm" color="primary" onClick={() => setMode('resolve')} disabled={busy}>
            Resolve
          </CButton>
        ) : null}
        {canVerify && issue.status === 'pending_verification' ? (
          <CButton size="sm" color="success" onClick={() => setMode('verify')} disabled={busy}>
            Verify and close
          </CButton>
        ) : null}
        {canManage && canReopen && ['closed', 'cancelled'].includes(issue.status) ? (
          <CButton
            size="sm"
            color="warning"
            variant="outline"
            onClick={() => setMode('reopen')}
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
            onClick={() => setMode('edit')}
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
            onClick={() => setMode('cancel')}
            disabled={busy}
          >
            Cancel issue
          </CButton>
        ) : null}
      </div>
      {mode ? (
        <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-2">
          {mode === 'edit' ? (
            <div className="row g-2">
              <div className="col-sm-6">
                <CFormSelect
                  label="Severity"
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
          {mode !== 'edit' ? (
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
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          ) : null}
          <div className="d-flex justify-content-end gap-2">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => setMode('')}
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
                (mode !== 'edit' && !note.trim()) ||
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
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [issueError, setIssueError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const catalogId = detail?.catalogId || detail?.id
  const loadIssues = useCallback(async () => {
    if (!catalogId) return
    setLoadingIssues(true)
    try {
      const response = await fetchFireExtinguisherIssues({
        extinguisherId: catalogId,
        perPage: 100,
      })
      setIssues(response.data)
      setIssueError('')
    } catch (requestError) {
      setIssueError(requestError?.message || 'Unable to load managed issues.')
    } finally {
      setLoadingIssues(false)
    }
  }, [catalogId])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  const saveAsset = async (payload) => {
    setBusy(true)
    setError('')
    try {
      const updated = await updateFireExtinguisherOption(catalogId, {
        ...payload,
        lockVersion: detail.lockVersion,
        zone: payload.zone || detail.zone,
        mainLocation: payload.mainLocation || detail.mainLocation || detail.location,
        subLocation: payload.subLocation || detail.subLocation,
      })
      setEditOpen(false)
      onAssetChanged?.(updated)
      return updated
    } catch (requestError) {
      setError(requestError?.message || 'Unable to update extinguisher.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const applyLifecycle = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = { reason: reason.trim(), lockVersion: detail.lockVersion }
      let updated
      if (lifecycleAction === 'out_of_service')
        updated = await markFireExtinguisherOutOfService(catalogId, payload)
      if (lifecycleAction === 'active')
        updated = await returnFireExtinguisherToService(catalogId, payload)
      if (lifecycleAction === 'retired') updated = await retireFireExtinguisher(catalogId, payload)
      if (lifecycleAction === 'restore') updated = await restoreFireExtinguisher(catalogId, payload)
      setLifecycleAction('')
      setReason('')
      onAssetChanged?.(updated)
      loadIssues()
    } catch (requestError) {
      setError(requestError?.message || 'Unable to change extinguisher lifecycle status.')
    } finally {
      setBusy(false)
    }
  }

  const lifecycleStatus = detail.lifecycleStatus || 'active'
  const activeIssues = issues.filter((issue) =>
    ['open', 'in_progress', 'pending_verification'].includes(issue.status),
  )
  const closedIssues = issues.filter((issue) => !activeIssues.includes(issue))

  return (
    <div className="d-grid gap-3">
      <section className="rounded-3 border p-3 d-grid gap-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold">Asset lifecycle</div>
          <CBadge
            color={
              lifecycleStatus === 'active'
                ? 'success'
                : lifecycleStatus === 'retired'
                  ? 'secondary'
                  : 'warning'
            }
          >
            {lifecycleLabels[lifecycleStatus] || lifecycleStatus}
          </CBadge>
        </div>
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
        {error ? (
          <CAlert color="danger" className="mb-0 py-2">
            {error}
          </CAlert>
        ) : null}
        {lifecycleAction ? (
          <div className="rounded-3 bg-light-subtle border p-3 d-grid gap-2">
            {!['active', 'restore'].includes(lifecycleAction) ? (
              <CFormTextarea
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            ) : null}
            <div className="d-flex justify-content-end gap-2">
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => setLifecycleAction('')}
                disabled={busy}
              >
                Cancel
              </CButton>
              <CButton
                size="sm"
                color={lifecycleAction === 'retired' ? 'danger' : 'primary'}
                onClick={applyLifecycle}
                disabled={
                  busy || (!['active', 'restore'].includes(lifecycleAction) && !reason.trim())
                }
              >
                {busy ? 'Saving...' : 'Confirm'}
              </CButton>
            </div>
          </div>
        ) : null}
        {editOpen ? (
          <AddFireExtinguisherForm
            presentation="plain"
            editableLocation
            mode="edit"
            submitLabel="Save changes"
            initialValue={{ ...detail, mainLocation: detail.mainLocation || detail.location }}
            onCancel={() => setEditOpen(false)}
            onSave={saveAsset}
            onSubmittingChange={setBusy}
          />
        ) : null}
      </section>

      <section className="rounded-3 border p-3 d-grid gap-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="fw-semibold">Managed issues</div>
          <CBadge color={activeIssues.length ? 'danger' : 'success'}>
            {activeIssues.length} open
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
        {!loadingIssues && !issueError && issues.length === 0 ? (
          <div className="text-body-secondary">No managed issues for this extinguisher.</div>
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
              onChanged={loadIssues}
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
      </section>
    </div>
  )
}

export default FireExtinguisherManagementPanel
