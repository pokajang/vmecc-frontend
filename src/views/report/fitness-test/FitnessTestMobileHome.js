import React from 'react'
import {
  MobileRecentRecordsSection,
  MobileTypeSelectionSection,
  MobileWorkflowDraftCard,
} from 'src/components/report-workflow/mobile-home'
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
    ? ['Physical Test Report', draftRow.reportingMonth || 'Month not selected']
        .filter(Boolean)
        .join(' - ')
    : ''
  const recentRecordItems = recentRecords.slice(0, MOBILE_HOME_RECENT_RECORD_LIMIT).map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: 'Physical Test Report',
    subtitle: row.reportingMonth || row.reportDate?.slice?.(0, 7) || 'Month unavailable',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </>
    ),
    ariaLabel: `Open physical test report ${row.reportingMonth || ''} summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="mobile-workflow-home d-md-none d-grid gap-3 mb-3"
      data-testid="fitness-test-report-mobile-home"
    >
      <MobileTypeSelectionSection
        title="Start monthly report"
        data-testid="fitness-test-report-mobile-type-selection"
        options={FITNESS_TEST_TYPE_OPTIONS}
        onChange={(nextValue) => {
          const value = String(nextValue || '').trim()
          if (value) onSelectType?.(value)
        }}
      />

      {draftRow ? (
        <MobileWorkflowDraftCard
          ariaLabel="Continue fitness test draft"
          summary={draftSummary}
          savedLabel={formatMobileReportDate(draftRow, 'Saved')}
          onContinue={() => onContinueDraft?.(draftRow)}
          onDelete={() => onDeleteDraft?.(draftRow)}
        />
      ) : null}

      <MobileRecentRecordsSection
        testId="fitness-test-report-mobile-records"
        recordScope={recordScope}
        onRecordScopeChange={onRecordScopeChange}
        recordsCount={recordsCount}
        items={recentRecordItems}
        sectionKey="recent-fitness-test-records"
        isLoading={isRecordsLoading}
        onViewRecords={onViewRecords}
      />
    </div>
  )
}

export default FitnessTestMobileHome
