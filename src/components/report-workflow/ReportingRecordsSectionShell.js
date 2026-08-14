import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import TableLoader from 'src/components/TableLoader'

import RecordScopeSegmentedControl from './RecordScopeSegmentedControl'

const ReportingRecordsSectionShell = ({
  recordScope = 'mine',
  onRecordScopeChange,
  compactPresentation = false,
  scopeTestId = '',
  recordsTestId = '',
  filtersTestId = '',
  mobileBefore = null,
  desktopBefore = null,
  mobilePrimaryAction = null,
  desktopPrimaryAction = null,
  filters,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  mobileRecords,
  desktopRecords,
  footer = null,
  loadingMessage = 'Loading records...',
}) => {
  const scope = (
    <RecordScopeSegmentedControl
      value={recordScope}
      onChange={onRecordScopeChange}
      className={compactPresentation ? 'workflow-scope-segmented--text' : ''}
      {...(scopeTestId ? { 'data-testid': scopeTestId } : {})}
    />
  )
  const filterRegion = (
    <div {...(filtersTestId ? { 'data-testid': filtersTestId } : {})}>{filters}</div>
  )
  const recordsTestProps = recordsTestId ? { 'data-testid': recordsTestId } : {}

  return (
    <>
      <section
        className={`${compactPresentation ? 'inspection-mobile-section' : ''} d-md-none`.trim()}
        aria-label="Report records"
        {...recordsTestProps}
      >
        {mobileBefore}
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          {scope}
          {mobilePrimaryAction}
        </div>
        {filterRegion}
        {isLoading ? (
          <div className="reporting-records__state">
            <TableLoader message={loadingMessage} minHeight={144} />
          </div>
        ) : isEmpty ? (
          emptyMessage
        ) : (
          mobileRecords
        )}
        {!isLoading && !isEmpty ? footer : null}
      </section>

      <CCard className="d-none d-md-block" {...recordsTestProps}>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          {scope}
          {desktopPrimaryAction}
        </CCardHeader>
        <CCardBody>
          {desktopBefore}
          {filterRegion}
          <ResponsiveRecordCollection
            isLoading={isLoading}
            isEmpty={isEmpty}
            emptyMessage={emptyMessage}
            mobileSections={[]}
            renderDesktop={() => desktopRecords}
            footer={footer}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default ReportingRecordsSectionShell
