import React from 'react'
import { CButton } from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import {
  MobileRecentRecordsSection,
  MobileTypeSelectionSection,
  MobileWorkflowDraftCard,
} from 'src/components/report-workflow/mobile-home'
import { INCIDENT_TYPE_TOGGLE_VALUE } from 'src/views/inspection/useIncidentTypeManager'
import { stripInspectionContext } from 'src/views/inspection/typeOptionUtils'
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
    <div className="mobile-workflow-home d-md-none d-grid gap-3 mb-3">
      <MobileTypeSelectionSection
        title="Choose type"
        titleId="inspection-mobile-choose-type"
        data-testid="inspection-new"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="mobile-workflow-home__compact-action"
            onClick={onAddType}
          />
        }
        options={typeOptions}
        toggleValue={INCIDENT_TYPE_TOGGLE_VALUE}
        onChange={(nextValue) => {
          if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
            onToggleTypes?.()
            return
          }
          onSelectType?.(String(nextValue || '').trim())
        }}
      />

      {draftRow ? (
        <MobileWorkflowDraftCard
          ariaLabel="Continue inspection draft"
          summary={draftSummary}
          savedLabel={formatHomeDate(draftRow.savedAt, 'Saved')}
          syncStatus={draftSyncStatus}
          onContinue={onContinueDraft}
          onDelete={onDeleteDraft}
        />
      ) : null}

      {queueSummary?.count ? (
        <section
          className="inspection-queue-banner rounded-3 border bg-warning-subtle p-3 d-grid gap-2"
          aria-label="Inspection sync queue"
          aria-live="polite"
        >
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
          <div className="inspection-queue-banner__actions">
            <CButton color="secondary" variant="outline" size="sm" onClick={onViewQueueDetails}>
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
        </section>
      ) : null}

      <MobileRecentRecordsSection
        title="Recent records"
        titleId="inspection-mobile-recent-records"
        testId="inspection-records"
        recordScope={recordScope}
        onRecordScopeChange={onRecordScopeChange}
        scopeProps={{
          className: 'workflow-scope-segmented--text',
          'data-testid': 'inspection-scope',
        }}
        recordsCount={recordsCount}
        items={recentRecordItems}
        sectionKey="recent-inspection-records"
        isLoading={isRecordsLoading}
        onViewRecords={onViewRecords}
      />
    </div>
  )
}

export default InspectionMobileHome
