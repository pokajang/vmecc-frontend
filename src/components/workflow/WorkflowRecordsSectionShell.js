import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const WorkflowRecordsSectionShell = ({
  sectionTitle = '',
  sectionTitleMobile,
  showHeader = true,
  recordsTestId = '',
  filtersTestId = '',
  desktopFiltersTestId = '',
  headerActions = null,
  mobileHeaderActions = null,
  filters = null,
  mobileBefore = null,
  desktopBefore = null,
  children = null,
  mobileContent = null,
  desktopContent = null,
  compactMobile = false,
  className = '',
}) => {
  const resolvedMobileContent = mobileContent ?? children
  const resolvedDesktopContent = desktopContent ?? children
  const filterTestProps = {
    ...(filtersTestId ? { 'data-testid': filtersTestId } : {}),
    ...(desktopFiltersTestId ? { 'data-desktop-testid': desktopFiltersTestId } : {}),
  }
  const mobileTitle = sectionTitleMobile || sectionTitle

  return (
    <>
      <section
        className={`${compactMobile ? 'inspection-mobile-section' : ''} d-md-none ${className}`.trim()}
        aria-label={sectionTitle || 'Records'}
        {...(recordsTestId ? { 'data-testid': `${recordsTestId}-mobile` } : {})}
      >
        {mobileBefore}
        {showHeader ? (
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
            {sectionTitle ? (
              <span className="vmecc-meta fw-semibold">{mobileTitle || sectionTitle}</span>
            ) : null}
            {mobileHeaderActions || headerActions}
          </div>
        ) : null}
        {filters ? <div {...filterTestProps}>{filters}</div> : null}
        {resolvedMobileContent}
      </section>

      <CCard
        className="d-none d-md-block"
        {...(recordsTestId ? { 'data-testid': `${recordsTestId}-desktop` } : {})}
      >
        {showHeader ? (
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <span>{sectionTitle}</span>
            {headerActions}
          </CCardHeader>
        ) : null}
        <CCardBody>
          {desktopBefore}
          {filters ? (
            <div
              {...(desktopFiltersTestId
                ? { 'data-testid': desktopFiltersTestId }
                : filterTestProps)}
            >
              {filters}
            </div>
          ) : null}
          {resolvedDesktopContent}
        </CCardBody>
      </CCard>
    </>
  )
}

export default WorkflowRecordsSectionShell
