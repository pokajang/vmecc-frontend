import React from 'react'
import MobileRecordList from 'src/components/MobileRecordList'
import PageState from 'src/components/PageState'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TableLoader from 'src/components/TableLoader'
import MobileWorkflowSection from './MobileWorkflowSection'

const MobileRecentRecordsSection = ({
  title = 'Recent records',
  titleId,
  testId,
  recordScope,
  onRecordScopeChange,
  scopeProps = {},
  recordsCount = 0,
  items = [],
  sectionKey,
  isLoading = false,
  onViewRecords,
  emptyMessage = 'No records yet.',
}) => (
  <MobileWorkflowSection title={title} titleId={titleId} data-testid={testId}>
    <div className="mobile-workflow-home__records-toolbar">
      <RecordScopeSegmentedControl
        {...scopeProps}
        value={recordScope}
        onChange={onRecordScopeChange}
      />
      <button
        type="button"
        className="mobile-workflow-home__view-all"
        disabled={isLoading}
        onClick={onViewRecords}
      >
        View all
        {recordsCount ? ` (${recordsCount})` : ''}
      </button>
    </div>
    {isLoading ? (
      <div className="mobile-workflow-home__records-state">
        <TableLoader message="Loading records..." minHeight={112} />
      </div>
    ) : items.length > 0 ? (
      <MobileRecordList sections={[{ key: sectionKey, variant: 'list-group', items }]} />
    ) : (
      <PageState
        variant="empty"
        message={emptyMessage}
        minHeight={96}
        className="mobile-workflow-home__records-state"
      />
    )}
  </MobileWorkflowSection>
)

export default MobileRecentRecordsSection
