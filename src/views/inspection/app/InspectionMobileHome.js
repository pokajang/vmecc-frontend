import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import PageState from 'src/components/PageState'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TableLoader from 'src/components/TableLoader'
import { INCIDENT_TYPE_TOGGLE_VALUE } from 'src/views/inspection/useIncidentTypeManager'
import { TOGGLE_CARD_PROPS, stripInspectionContext } from 'src/views/inspection/typeOptionUtils'
import { formatHomeDate, getRecordDateValue } from './inspectionModuleUtils'

const stopDraftActionEvent = (event) => {
  event.stopPropagation()
}

const handleDraftKeyboardOpen = (event, onContinueDraft) => {
  if (!onContinueDraft) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onContinueDraft()
}

const InspectionMobileHome = ({
  draftRow,
  typeOptions,
  recentRecords,
  recordsCount,
  queueSummary,
  isQueueSyncing = false,
  recordScope,
  onRecordScopeChange,
  isRecordsLoading = false,
  onSelectType,
  onToggleTypes,
  onAddType,
  onContinueDraft,
  onDeleteDraft,
  onOpenRecord,
  onViewQueueDetails,
  onViewRecords,
  onRetryQueue,
}) => {
  const draftType = stripInspectionContext(draftRow?.incidentType) || 'Draft'
  const draftLocation = draftRow?.location || 'No location'
  const draftProgress = [draftRow?.draftProgressSummary, draftRow?.draftDefectSummary]
    .filter(Boolean)
    .join(' - ')
  const draftSyncStatus = String(draftRow?.syncStatus || '').trim()
  const draftSummary = [draftType, draftLocation, draftProgress].filter(Boolean).join(' - ')
  const recentRecordItems = recentRecords.map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: stripInspectionContext(row.incidentType) || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">
          {formatHomeDate(getRecordDateValue(row))}
        </div>
      </>
    ),
    ariaLabel: `Open inspection record ${row.displayId || row.id || 'record'} summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div className="inspection-mobile-home d-md-none d-grid gap-3 mb-3">
      <div
        className="inspection-mobile-home__section d-grid gap-3 mb-2"
        data-testid="inspection-new"
      >
        <div className="inspection-mobile-home__section-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold text-muted">Choose Type</div>
          <CreateActionButton
            label="Add type"
            className="inspection-compact-action-btn"
            onClick={onAddType}
          />
        </div>
        <IconOptionGrid
          options={typeOptions}
          value=""
          onChange={(nextValue) => {
            if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
              onToggleTypes?.()
              return
            }
            onSelectType?.(String(nextValue || '').trim())
          }}
          variant="compact"
          showDescription={false}
          columns={{ xs: 12 }}
          rowClassName="inspection-mobile-home__type-grid g-2 mx-0"
          cardProps={(option) =>
            option?.value === INCIDENT_TYPE_TOGGLE_VALUE ? TOGGLE_CARD_PROPS : {}
          }
        />
      </div>

      {draftRow ? (
        <div className="inspection-mobile-home__draft-list list-group list-group-flush overflow-hidden border rounded-3">
          <article
            className="inspection-draft-card list-group-item p-3 bg-body cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Continue inspection draft"
            onClick={onContinueDraft}
            onKeyDown={(event) => handleDraftKeyboardOpen(event, onContinueDraft)}
          >
            <div className="inspection-draft-card__grid">
              <div className="inspection-draft-card__main">
                <div className="inspection-draft-card__eyebrow">Draft in progress</div>
                <div className="inspection-draft-card__summary small text-body-secondary">
                  <span className="inspection-draft-card__action fw-semibold">Continue Draft</span>
                  {draftSummary ? (
                    <span className="inspection-draft-card__summary-detail"> {draftSummary}</span>
                  ) : null}
                </div>
                <div className="inspection-draft-card__date small text-body-secondary">
                  {formatHomeDate(draftRow.savedAt, 'Saved')}
                </div>
              </div>
              <div
                className="inspection-draft-card__meta"
                onClick={stopDraftActionEvent}
                onMouseDown={stopDraftActionEvent}
                onKeyDown={stopDraftActionEvent}
              >
                {draftSyncStatus && draftSyncStatus !== 'synced' ? (
                  <div className="small text-warning-emphasis">Sync pending</div>
                ) : null}
                <CButton
                  type="button"
                  color="link"
                  size="sm"
                  className="inspection-draft-delete-btn p-1 text-danger shadow-none border-0"
                  aria-label="Delete draft"
                  onClick={onDeleteDraft}
                >
                  <Trash2 size={15} />
                </CButton>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {queueSummary?.count ? (
        <div className="inspection-queue-banner rounded-3 border bg-warning-subtle p-3 d-grid gap-2">
          <div>
            <div className="fw-semibold">
              {isQueueSyncing
                ? 'Syncing queued reports...'
                : `${queueSummary.count} inspection ${
                    queueSummary.count === 1 ? 'report is' : 'reports are'
                  } queued for sync.`}
            </div>
            {queueSummary.lastError ? (
              <div className="small text-body-secondary mt-1">{queueSummary.lastError}</div>
            ) : null}
          </div>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="me-2"
            onClick={onViewQueueDetails}
          >
            Details
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            disabled={isQueueSyncing}
            onClick={onRetryQueue}
          >
            {isQueueSyncing ? 'Retrying...' : 'Retry now'}
          </CButton>
        </div>
      ) : null}

      <div
        className="inspection-mobile-home__section d-grid gap-2 mb-1"
        data-testid="inspection-records"
      >
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="inspection-mobile-home__records-toolbar d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl
            value={recordScope}
            onChange={onRecordScopeChange}
            data-testid="inspection-scope"
          />
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-view-all-btn inspection-compact-action-btn d-inline-flex align-items-center"
            disabled={isRecordsLoading}
            onClick={onViewRecords}
          >
            View all
            {recordsCount ? ` (${recordsCount})` : ''}
          </CButton>
        </div>
      </div>

      {isRecordsLoading ? (
        <div className="border rounded-3 bg-body">
          <TableLoader message="Loading records..." minHeight={112} />
        </div>
      ) : recentRecords.length > 0 ? (
        <MobileRecordList
          sections={[
            { key: 'recent-inspection-records', variant: 'list-group', items: recentRecordItems },
          ]}
        />
      ) : (
        <PageState
          variant="empty"
          message="No records yet."
          minHeight={96}
          className="border rounded-3"
        />
      )}
    </div>
  )
}

export default InspectionMobileHome
