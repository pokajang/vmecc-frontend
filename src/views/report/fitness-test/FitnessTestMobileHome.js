import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'
import ButtonLoader from 'src/components/ButtonLoader'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import { formatMobileReportDate } from '../reportUiUtils'
import { FITNESS_TEST_TYPE_OPTIONS } from './constants'

const FitnessTestMobileHome = ({
  draftRows = [],
  recentRecords = [],
  recordsCount = 0,
  recordScope,
  onRecordScopeChange,
  isRecordsLoading = false,
  onSelectType,
  onContinueDraft,
  onDeleteDraft,
  onOpenRecord,
  onViewRecords,
}) => {
  const draftRecordItems = draftRows.map((draft) => ({
    key: draft.recordKey || draft.id,
    layout: 'compact',
    title: 'Continue Draft',
    subtitle: `${draft.incidentType || 'Fitness Test'} - ${draft.location || 'No location'}`,
    status: (
      <div className="small text-body-secondary text-nowrap">
        {formatMobileReportDate(draft, 'Saved')}
      </div>
    ),
    ariaLabel: `Continue fitness test draft ${draft.recordKey || draft.id || ''}`.trim(),
    onOpen: () => onContinueDraft?.(draft),
    actions: (
      <CButton
        type="button"
        color="link"
        size="sm"
        className="inspection-draft-delete-btn p-1 text-danger shadow-none border-0"
        aria-label="Delete draft"
        onClick={() => onDeleteDraft?.(draft)}
      >
        <Trash2 size={15} />
      </CButton>
    ),
  }))
  const recentRecordItems = recentRecords.map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.incidentType || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <div className="text-end">
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </div>
    ),
    ariaLabel: `Open fitness test record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div className="d-md-none d-grid gap-3 mb-3" data-tour-id="fitness-test-report-mobile-home">
      <div className="d-grid gap-3 mb-2" data-tour-id="fitness-test-report-mobile-type-selection">
        <div className="fw-semibold text-muted">Choose Fitness Test Type</div>
        <IconOptionGrid
          options={FITNESS_TEST_TYPE_OPTIONS}
          value=""
          onChange={(nextValue) => {
            const value = String(nextValue || '').trim()
            if (value) onSelectType?.(value)
          }}
          variant="compact"
          showDescription={false}
          columns={{ xs: 6 }}
        />
      </div>

      {draftRows.length > 0 ? (
        <MobileRecordList
          sections={[{ key: 'fitness-test-drafts', items: draftRecordItems }]}
          variant="list-group"
        />
      ) : null}

      <div className="d-grid gap-2 mb-1">
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl value={recordScope} onChange={onRecordScopeChange} />
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-view-all-btn d-inline-flex align-items-center"
            disabled={isRecordsLoading}
            onClick={onViewRecords}
          >
            View all
          </CButton>
        </div>
      </div>

      {isRecordsLoading ? (
        <div className="border rounded-3 bg-white">
          <ButtonLoader label="Loading records..." />
        </div>
      ) : recentRecords.length > 0 ? (
        <MobileRecordList
          sections={[{ key: 'recent-fitness-test-records', items: recentRecordItems }]}
          variant="list-group"
        />
      ) : (
        <div className="border rounded-3 bg-white p-3 text-body-secondary">No records yet.</div>
      )}
    </div>
  )
}

export default FitnessTestMobileHome
