import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TableLoader from 'src/components/TableLoader'
import { formatMobileReportDate } from '../reportUiUtils'
import { FITNESS_TEST_TYPE_OPTIONS } from './constants'

const MOBILE_HOME_RECENT_RECORD_LIMIT = 3

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
  const draftRow = draftRows[0] || null
  const draftSummary = draftRow
    ? [draftRow.incidentType || 'Fitness Test', draftRow.location || 'No location']
        .filter(Boolean)
        .join(' - ')
    : ''
  const recentRecordItems = recentRecords.slice(0, MOBILE_HOME_RECENT_RECORD_LIMIT).map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.incidentType || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </>
    ),
    ariaLabel: `Open fitness test record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="inspection-mobile-home d-md-none d-grid gap-3 mb-3"
      data-testid="fitness-test-report-mobile-home"
    >
      <div
        className="inspection-mobile-home__section d-grid gap-3 mb-2"
        data-testid="fitness-test-report-mobile-type-selection"
      >
        <div className="inspection-mobile-home__section-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold text-muted">Choose Type</div>
        </div>
        <IconOptionGrid
          options={FITNESS_TEST_TYPE_OPTIONS}
          value=""
          onChange={(nextValue) => {
            const value = String(nextValue || '').trim()
            if (value) onSelectType?.(value)
          }}
          variant="compact"
          showDescription={false}
          columns={{ xs: 12 }}
          rowClassName="inspection-mobile-home__type-grid g-2 mx-0"
        />
      </div>

      {draftRow ? (
        <div className="inspection-mobile-home__draft-list list-group list-group-flush overflow-hidden border rounded-3">
          <article
            className="inspection-draft-card list-group-item p-3 bg-white cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Continue fitness test draft"
            onClick={() => onContinueDraft?.(draftRow)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onContinueDraft?.(draftRow)
            }}
          >
            <div className="inspection-draft-card__grid">
              <div className="inspection-draft-card__main">
                <div className="inspection-draft-card__summary small text-body-secondary">
                  <span className="fw-semibold text-body">Continue Draft</span>
                  {draftSummary ? (
                    <span className="inspection-draft-card__summary-detail"> {draftSummary}</span>
                  ) : null}
                </div>
                <div className="inspection-draft-card__date small text-body-secondary">
                  {formatMobileReportDate(draftRow, 'Saved')}
                </div>
              </div>
              <div
                className="inspection-draft-card__meta"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <CButton
                  type="button"
                  color="link"
                  size="sm"
                  className="inspection-draft-delete-btn p-1 text-danger shadow-none border-0"
                  aria-label="Delete draft"
                  onClick={() => onDeleteDraft?.(draftRow)}
                >
                  <Trash2 size={15} />
                </CButton>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      <div
        className="inspection-mobile-home__section d-grid gap-2 mb-1"
        data-testid="fitness-test-report-mobile-records"
      >
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="inspection-mobile-home__records-toolbar d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl value={recordScope} onChange={onRecordScopeChange} />
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
            {
              key: 'recent-fitness-test-records',
              variant: 'list-group',
              items: recentRecordItems,
            },
          ]}
        />
      ) : (
        <div className="border rounded-3 bg-white p-3 text-body-secondary">No records yet.</div>
      )}
    </div>
  )
}

export default FitnessTestMobileHome
