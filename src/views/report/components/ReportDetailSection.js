import React, { useState } from 'react'
import { CAlert, CBadge, CButton, CRow } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import ReportPhotoGallery from 'src/components/report-workflow/ReportPhotoGallery'
import RecordDetailActions from 'src/components/report-workflow/RecordDetailActions'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'

const ChronologyRows = ({ chronology }) => {
  const rows = (Array.isArray(chronology) ? chronology : []).filter((r) => r.time || r.action)
  if (rows.length === 0) return null
  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Chronology</div>
      <div className="rounded-3 border overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`d-flex gap-3 px-3 py-2${i < rows.length - 1 ? ' border-bottom' : ''}`}
          >
            <div
              className="text-body-secondary flex-shrink-0 text-truncate"
              style={{ width: '52px' }}
            >
              {row.time || '--'}
            </div>
            <div style={{ minWidth: 0 }}>{row.action || '--'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

const RespondingTeamRows = ({ respondingTeam, isDrill = false }) => {
  if (!respondingTeam) return null
  const attendance = Array.isArray(respondingTeam.attendance) ? respondingTeam.attendance : []
  if (!respondingTeam.name && !respondingTeam.shift && attendance.length === 0) return null
  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">
        {isDrill ? 'Exercise Personnel' : 'Responding Team'}
      </div>
      <CRow className="g-3">
        <DetailField label="Team">{respondingTeam.name || '--'}</DetailField>
        {respondingTeam.shift ? (
          <DetailField label="Shift">{respondingTeam.shift}</DetailField>
        ) : null}
      </CRow>
      {attendance.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Attending members</div>
          <div className="d-flex flex-wrap gap-2">
            {attendance.map((member, i) => (
              <CBadge
                key={member.memberId || i}
                color="light"
                className="border text-body-secondary fw-normal"
              >
                {member.name}
                {member.role ? ` - ${member.role}` : ''}
                {member.exerciseRole ? ` (${member.exerciseRole})` : ''}
              </CBadge>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

const PostAnalysisRows = ({ analysis, fallbackPhotos = [], isDrill = false }) => {
  if (!analysis) return null
  const strengths = (Array.isArray(analysis.strengths) ? analysis.strengths : []).filter(Boolean)
  const resources = (
    Array.isArray(analysis.resourcesMobilised) ? analysis.resourcesMobilised : []
  ).filter(Boolean)
  const improvements = (
    Array.isArray(analysis.improvementOpportunities) ? analysis.improvementOpportunities : []
  ).filter(Boolean)
  const photos = (
    Array.isArray(analysis.photos) && analysis.photos.length ? analysis.photos : fallbackPhotos
  ).filter((p) => p?.url)

  if (!strengths.length && !resources.length && !improvements.length && !photos.length) return null

  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">
        {isDrill ? 'Post-Exercise Analysis' : 'Post-Incident Analysis'}
      </div>
      {strengths.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Strengths</div>
          <ul className="mb-0 ps-4">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {resources.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Resources Mobilised</div>
          <div className="d-flex flex-wrap gap-2">
            {resources.map((r, i) => (
              <CBadge key={i} color="light" className="border text-body-secondary fw-normal">
                {r}
              </CBadge>
            ))}
          </div>
        </div>
      ) : null}
      {improvements.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Improvement Opportunities</div>
          <ul className="mb-0 ps-4">
            {improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {photos.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-2">Photographs</div>
          <ReportPhotoGallery photos={photos} />
        </div>
      ) : null}
    </section>
  )
}

const ReportDetailSection = ({
  selectedRecord,
  onBack,
  formatDateTime,
  renderStatusBadge,
  onEditRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  onDeleteRecord,
  canEditRecord,
  canDeleteRecord,
  canReviewRecord,
  canApproveRecord,
  canRejectRecord,
  downloadingId = null,
  isActionBusy = false,
  isDeleting = false,
  mode = 'detail',
  reviewActions = null,
  isSubmittingReview = false,
  changeSummary = [],
  reviewBannerText = 'Review Mode - not submitted yet.',
  typeLabel = 'Incident Type',
  conditionLabel = 'Weather',
  detailsLabel = 'Incident Title',
  summaryLabel = 'Summary',
  testAnchorPrefix = '',
}) => {
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)

  if (!selectedRecord) {
    return (
      <CAlert color="warning">
        {mode === 'review'
          ? 'Review data is unavailable. Return to edit and try again.'
          : 'Report not found.'}
      </CAlert>
    )
  }

  const r = selectedRecord
  const isReviewMode = mode === 'review'
  const reportType = String(r.reportType || '').toLowerCase()
  const isErco = reportType === 'erco'
  const isDrill = reportType === 'drill'

  const hasRespondingTeam = (isErco || isDrill) && r.respondingTeam
  const hasChronology =
    Array.isArray(r.chronology) && r.chronology.some((row) => row.time || row.action)
  const detailsText = String(r.details || r.description || '').trim()
  const summaryText = String(r.summary || '').trim()
  const displayStatus = isReviewMode ? 'Draft' : r.status
  const canEditCurrentRecord = Boolean(canEditRecord?.(r))
  const canDeleteCurrentRecord = Boolean(canDeleteRecord?.(r))

  const dateTime = formatDateTime(r.incidentDate || r.reportDate, r.incidentTime || r.reportTime)
  const timeline = Array.isArray(r.timeline) ? r.timeline : []
  const findAction = (name) =>
    timeline.find(
      (entry) =>
        String(entry?.action || '')
          .trim()
          .toLowerCase() === name.toLowerCase(),
    ) || null

  const submittedEntry = findAction('Submitted')
  const reviewedEntry = findAction('Reviewed')
  const approvedEntry = findAction('Approved')
  const rejectedEntry = findAction('Rejected')
  const submittedBy =
    String(r.submittedBy || submittedEntry?.by || r.reportedBy || r.createdBy || '').trim() || '--'
  const submittedAtRaw = String(submittedEntry?.at || r.submittedAt || r.createdAt || '').trim()
  const submittedAtDate = submittedAtRaw ? new Date(submittedAtRaw) : null
  const submittedAt =
    submittedAtDate && !Number.isNaN(submittedAtDate.getTime())
      ? submittedAtDate.toLocaleString()
      : submittedAtRaw || '--'
  const renderWorkflowActor = (entry) => {
    const actor = String(entry?.by || '').trim() || '--'
    const remarks = String(entry?.remarks || '').trim()
    return (
      <>
        <div>{actor}</div>
        {remarks ? (
          <div className="small text-body-secondary mt-1" style={{ whiteSpace: 'pre-wrap' }}>
            Remarks: {remarks}
          </div>
        ) : null}
      </>
    )
  }

  const renderStatusValue = () =>
    typeof renderStatusBadge === 'function'
      ? renderStatusBadge(displayStatus)
      : displayStatus || '--'

  const buildActionDescriptors = () => {
    if (isReviewMode) {
      return [
        {
          key: 'back',
          label: 'Back to Edit',
          color: 'light',
          onClick: () => reviewActions?.onBackToEdit?.(),
        },
        {
          key: 'draft',
          label: 'Save Draft',
          color: 'secondary',
          onClick: () => reviewActions?.onSaveDraft?.(),
        },
        {
          key: 'confirm',
          label: reviewActions?.confirmLabel || 'Confirm Submit',
          color: 'primary',
          disabled: isSubmittingReview,
          onClick: () => reviewActions?.onConfirm?.(),
        },
      ]
    }

    return [
      {
        key: 'back',
        label: 'Back to records',
        color: 'light',
        onClick: onBack,
      },
      {
        key: 'download',
        label: downloadingId === r.id ? 'Generating...' : 'Download',
        color: 'secondary',
        variant: 'outline',
        disabled:
          Boolean(downloadingId) ||
          (['erco', 'drill'].includes(String(r.reportType || '').toLowerCase()) &&
            r.canDownloadPdf !== true),
        testId: testAnchorPrefix ? `${testAnchorPrefix}-download-action` : '',
        onClick: () => onDownloadRecord?.(r.id),
      },
      {
        key: 'edit',
        label: 'Edit',
        color: 'primary',
        variant: 'outline',
        disabled: !canEditCurrentRecord,
        testId: testAnchorPrefix ? `${testAnchorPrefix}-edit-action` : '',
        onClick: () => onEditRecord?.(r),
      },
      {
        key: 'delete',
        label: 'Delete',
        color: 'danger',
        variant: 'outline',
        disabled: !canDeleteCurrentRecord,
        testId: testAnchorPrefix ? `${testAnchorPrefix}-delete-action` : '',
        onClick: () => onDeleteRecord?.(r),
      },
      ...(String(r.status || '').trim() === 'Submitted'
        ? [
            {
              key: 'review',
              label: 'Review',
              color: 'info',
              variant: 'outline',
              disabled: isActionBusy,
              onClick: () => onReviewRecord?.(r),
            },
          ]
        : []),
      ...(String(r.status || '').trim() === 'Reviewed'
        ? [
            {
              key: 'approve',
              label: 'Approve',
              color: 'success',
              variant: 'outline',
              disabled: isActionBusy,
              onClick: () => onApproveRecord?.(r),
            },
            {
              key: 'reject',
              label: 'Reject',
              color: 'danger',
              variant: 'outline',
              disabled: isActionBusy,
              onClick: () => onRejectRecord?.(r),
            },
          ]
        : []),
    ]
  }

  const buildActionButton = (action, className = '') => (
    <CButton
      key={action.key}
      color={action.color}
      variant={action.variant}
      className={className}
      disabled={action.disabled}
      {...(action.testId ? { 'data-testid': action.testId } : {})}
      onClick={action.onClick}
    >
      {action.label}
    </CButton>
  )

  const renderDetailActions = ({ mobile = false } = {}) => {
    if (!isReviewMode) {
      return (
        <RecordDetailActions
          record={r}
          mode={mobile ? 'mobile' : 'desktop'}
          ariaLabel="Report detail actions"
          testAnchorPrefix={testAnchorPrefix}
          downloadingId={downloadingId}
          isActionBusy={isActionBusy}
          isDeleting={isDeleting}
          handlers={{
            back: onBack,
            download:
              typeof onDownloadRecord === 'function'
                ? (record) => onDownloadRecord(record.id)
                : null,
            edit: typeof onEditRecord === 'function' ? (record) => onEditRecord(record) : null,
            delete:
              typeof onDeleteRecord === 'function' ? (record) => onDeleteRecord(record) : null,
            review:
              typeof onReviewRecord === 'function' ? (record) => onReviewRecord(record) : null,
            approve:
              typeof onApproveRecord === 'function' ? (record) => onApproveRecord(record) : null,
            reject:
              typeof onRejectRecord === 'function' ? (record) => onRejectRecord(record) : null,
          }}
          fallbackCapabilities={{
            edit: canEditRecord,
            delete: canDeleteRecord,
            review: canReviewRecord || ((record) => record?.canReview === true),
            approve: canApproveRecord || ((record) => record?.canApprove === true),
            reject: canRejectRecord || ((record) => record?.canReject === true),
          }}
        />
      )
    }

    const actions = buildActionDescriptors()
    if (!mobile) {
      return (
        <div className="d-none d-md-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
          {actions.map((action) => buildActionButton(action))}
        </div>
      )
    }

    const primaryKeys = isReviewMode
      ? ['confirm']
      : String(r.status || '').trim() === 'Submitted'
        ? ['review']
        : String(r.status || '').trim() === 'Reviewed'
          ? ['approve']
          : ['edit']
    const primaryActions = primaryKeys
      .map((key) => actions.find((action) => action.key === key))
      .filter(Boolean)
    const drawerActions = actions.filter(
      (action) => !primaryKeys.includes(action.key) && action.key !== 'back',
    )
    const utilityActions = actions.filter((action) => action.key === 'back')

    return (
      <>
        <FormActionGroup
          className="inspection-detail-inline-actions d-md-none"
          mobileThumb={false}
          ariaLabel="Report detail actions"
        >
          {primaryActions.map((action) =>
            buildActionButton(action, 'inspection-detail-sticky-action-btn'),
          )}
          {drawerActions.length || utilityActions.length ? (
            <CButton
              color="secondary"
              variant="outline"
              className="inspection-detail-sticky-action-btn"
              onClick={() => setMoreActionsOpen(true)}
            >
              More
            </CButton>
          ) : null}
        </FormActionGroup>
        <MobileBottomDrawer
          visible={moreActionsOpen}
          title="More actions"
          bodyClassName="inspection-equipment-detail-drawer-shell"
          onClose={() => setMoreActionsOpen(false)}
        >
          <div className="inspection-detail-more-actions">
            {[...drawerActions, ...utilityActions].map((action) =>
              buildActionButton(
                {
                  ...action,
                  onClick: () => {
                    setMoreActionsOpen(false)
                    action.onClick?.()
                  },
                },
                'w-100',
              ),
            )}
          </div>
        </MobileBottomDrawer>
      </>
    )
  }

  const renderDetailContent = () => (
    <div className="d-grid gap-4">
      {isReviewMode && reviewBannerText ? (
        <CAlert color="info" className="mb-0 py-2">
          {reviewBannerText}
        </CAlert>
      ) : null}

      <section className="inspection-form-section d-grid gap-3">
        <div className="fw-semibold text-muted">Report Metadata</div>
        <CRow className="g-3">
          <DetailField label="Report ID">{r.displayId || '--'}</DetailField>
          <DetailField label="Status">{renderStatusValue()}</DetailField>
          <DetailField label="Submitted By">{submittedBy}</DetailField>
          <DetailField label="Submitted At">{submittedAt}</DetailField>
          <DetailField label="Action Owner">{r.actionOwner || '--'}</DetailField>
          <DetailField label="Date / Time">{dateTime || '--'}</DetailField>
        </CRow>
      </section>

      <section className="inspection-form-section d-grid gap-3">
        <div className="fw-semibold text-muted">Report Context</div>
        <CRow className="g-3">
          <DetailField label={typeLabel}>{r.incidentType || '--'}</DetailField>
          {r.weather ? <DetailField label={conditionLabel}>{r.weather}</DetailField> : null}
          <DetailField label="Location" xs={12} md={r.weather ? 4 : 8}>
            {r.location || '--'}
          </DetailField>
          {isDrill && Array.isArray(r.exerciseCategories) && r.exerciseCategories.length ? (
            <DetailField label="Exercise Categories" xs={12} md={4}>
              {r.exerciseCategories.join(', ')}
            </DetailField>
          ) : null}
          {isDrill && r.reportIssuanceDate ? (
            <DetailField label="Report Issuance Date" xs={12} md={4}>
              {r.reportIssuanceDate}
            </DetailField>
          ) : null}
          {r.teamInCharge || r.respondingTeamName ? (
            <DetailField label="Team In Charge" xs={12} md={4}>
              {r.teamInCharge || r.respondingTeamName}
            </DetailField>
          ) : null}
          {r.aicInCharge ? (
            <DetailField label="AIC In Charge" xs={12} md={4}>
              {r.aicInCharge}
            </DetailField>
          ) : null}
        </CRow>
      </section>

      {detailsText || summaryText ? (
        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Report Details</div>
          {isDrill && r.exerciseTitle ? (
            <div>
              <div className="small text-body-secondary">Exercise Title</div>
              <div className="fw-semibold">{r.exerciseTitle}</div>
            </div>
          ) : null}
          {detailsText ? (
            <div>
              <div className="small text-body-secondary">{detailsLabel}</div>
              <div className="fw-semibold">{detailsText}</div>
            </div>
          ) : null}
          {summaryText ? (
            <div>
              <div className="small text-body-secondary">{summaryLabel}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{summaryText}</div>
            </div>
          ) : null}
          {isDrill && Array.isArray(r.exerciseObjectives) && r.exerciseObjectives.length ? (
            <div>
              <div className="small text-body-secondary">Exercise Objectives</div>
              <ul className="mb-0 ps-4">
                {r.exerciseObjectives.map((row, index) => (
                  <li key={`${row?.text || row}-${index}`}>{row?.text || row}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {isDrill && Array.isArray(r.erpReferences) && r.erpReferences.length ? (
            <div>
              <div className="small text-body-secondary">ERP / Annex References</div>
              <ul className="mb-0 ps-4">
                {r.erpReferences.map((row, index) => (
                  <li key={`${row?.annexNumber || 'reference'}-${index}`}>
                    {[row?.annexNumber, row?.title].filter(Boolean).join(' - ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {submittedEntry || reviewedEntry || approvedEntry || rejectedEntry ? (
        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Workflow Activity</div>
          <CRow className="g-3">
            {submittedEntry ? (
              <DetailField label={isDrill ? 'Prepared By' : 'Submitted By'} xs={12} md={4}>
                {renderWorkflowActor(submittedEntry)}
              </DetailField>
            ) : null}
            {reviewedEntry ? (
              <DetailField
                label={isDrill ? 'Station Commander Review' : 'Reviewed By'}
                xs={12}
                md={4}
              >
                {renderWorkflowActor(reviewedEntry)}
              </DetailField>
            ) : null}
            {approvedEntry ? (
              <DetailField label={isDrill ? 'VMM Review' : 'Approved By'} xs={12} md={4}>
                {renderWorkflowActor(approvedEntry)}
              </DetailField>
            ) : null}
            {rejectedEntry ? (
              <DetailField label="Rejected By" xs={12} md={4}>
                {renderWorkflowActor(rejectedEntry)}
              </DetailField>
            ) : null}
          </CRow>
        </section>
      ) : null}

      {isReviewMode ? (
        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Changed Fields</div>
          {Array.isArray(changeSummary) && changeSummary.length > 0 ? (
            <div className="rounded-3 border overflow-hidden">
              {changeSummary.map((entry, index) => (
                <div
                  key={`${entry.label}-${index}`}
                  className={`px-3 py-2 ${index < changeSummary.length - 1 ? 'border-bottom' : ''}`}
                >
                  <div className="small text-body-secondary">{entry.label}</div>
                  <div className="small">
                    <span className="text-body-secondary">From:</span> {entry.before || '--'}
                  </div>
                  <div className="small">
                    <span className="text-body-secondary">To:</span> {entry.after || '--'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="small text-body-secondary">No changes detected.</div>
          )}
        </section>
      ) : null}

      {hasRespondingTeam ? (
        <RespondingTeamRows respondingTeam={r.respondingTeam} isDrill={isDrill} />
      ) : null}
      {hasChronology ? <ChronologyRows chronology={r.chronology} /> : null}

      {(isErco || isDrill) &&
      (r.postIncidentAnalysis || (Array.isArray(r.photos) && r.photos.length > 0)) ? (
        <PostAnalysisRows
          analysis={r.postIncidentAnalysis || {}}
          fallbackPhotos={Array.isArray(r.photos) ? r.photos : []}
          isDrill={isDrill}
        />
      ) : null}
    </div>
  )

  return (
    <div className="inspection-detail-section">
      <div className="inspection-form-sections d-grid gap-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="fw-semibold">{r.displayId}</div>
            <div className="small text-body-secondary">{submittedAt}</div>
          </div>
          {renderDetailActions()}
        </div>
        {renderDetailContent()}
        {renderDetailActions({ mobile: true })}
      </div>
    </div>
  )
}

export default ReportDetailSection
