import React from 'react'
import { CButton } from '@coreui/react'
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
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        className="mobile-workflow-home__view-all d-inline-flex align-items-center"
        disabled={isLoading}
        onClick={onViewRecords}
      >
        View all
        {recordsCount ? ` (${recordsCount})` : ''}
      </CButton>
    </div>
    {isLoading ? (
      <div className="border rounded-3 bg-body">
        <TableLoader message="Loading records..." minHeight={112} />
      </div>
    ) : items.length > 0 ? (
      <MobileRecordList sections={[{ key: sectionKey, variant: 'list-group', items }]} />
    ) : (
      <PageState
        variant="empty"
        message={emptyMessage}
        minHeight={96}
        className="border rounded-3"
      />
    )}
  </MobileWorkflowSection>
)

export default MobileRecentRecordsSection
