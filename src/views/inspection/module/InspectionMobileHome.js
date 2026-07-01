import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TableLoader from 'src/components/TableLoader'
import { INCIDENT_TYPE_TOGGLE_VALUE } from 'src/views/inspection/useIncidentTypeManager'
import { TOGGLE_CARD_PROPS, stripInspectionContext } from 'src/views/inspection/typeOptionUtils'
import { formatHomeDate, getRecordDateValue } from './inspectionModuleUtils'

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
  onViewRecords,
  onRetryQueue,
}) => {
  const draftType = stripInspectionContext(draftRow?.incidentType) || 'Draft'
  const draftLocation = draftRow?.location || 'No location'
  const draftRecordItems = draftRow
    ? [
        {
          key: draftRow.recordKey || draftRow.id || 'inspection-draft',
          layout: 'compact',
          title: 'Continue Draft',
          subtitle: `${draftType} - ${draftLocation}`,
          status: (
            <div className="small text-body-secondary text-nowrap">
              {formatHomeDate(draftRow.savedAt, 'Saved')}
            </div>
          ),
          ariaLabel: 'Continue inspection draft',
          onOpen: onContinueDraft,
          actions: (
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
          ),
        },
      ]
    : []
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
    <div className="d-md-none d-grid gap-3 mb-3">
      <div className="d-grid gap-3 mb-2" data-tour-id="inspection-new">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
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
          columns={{ xs: 6 }}
          cardProps={(option) =>
            option?.value === INCIDENT_TYPE_TOGGLE_VALUE ? TOGGLE_CARD_PROPS : {}
          }
        />
      </div>

      {draftRow ? (
        <MobileRecordList
          sections={[{ key: 'inspection-draft', items: draftRecordItems }]}
          variant="list-group"
        />
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
            onClick={onViewRecords}
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

      <div className="d-grid gap-2 mb-1" data-tour-id="inspection-records">
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl
            value={recordScope}
            onChange={onRecordScopeChange}
            data-tour-id="inspection-scope"
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
        <div className="border rounded-3 bg-white">
          <TableLoader message="Loading records..." minHeight={112} />
        </div>
      ) : recentRecords.length > 0 ? (
        <MobileRecordList
          sections={[
            { key: 'recent-inspection-records', variant: 'list-group', items: recentRecordItems },
          ]}
        />
      ) : (
        <div className="border rounded-3 bg-white p-3 text-body-secondary">No records yet.</div>
      )}
    </div>
  )
}

export default InspectionMobileHome
