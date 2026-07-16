import React, { Fragment } from 'react'
import { CAccordion, CAccordionBody, CAccordionHeader, CAccordionItem, CBadge } from '@coreui/react'

const text = (value) => String(value || '').trim()

const isRedundantCheckedBadge = (badge = {}) => text(badge.label).toLowerCase() === 'checked'

const FindingSummaryHeader = ({ item }) => {
  const summaryLines = (Array.isArray(item?.summaryLines) ? item.summaryLines : []).filter((line) =>
    text(line),
  )
  const [primarySummaryLine, ...secondarySummaryLines] = summaryLines
  const badges = (Array.isArray(item?.badges) ? item.badges : []).filter(
    (badge) => !isRedundantCheckedBadge(badge),
  )

  return (
    <div className="d-grid gap-2 w-100">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div className="inspection-detail-finding-accordion-title-row">
          <span className="fw-semibold text-break">{item?.title || 'Finding item'}</span>
          {primarySummaryLine ? (
            <span className="small text-body-secondary">{primarySummaryLine}</span>
          ) : null}
        </div>
        {badges.length > 0 ? (
          <div className="d-flex flex-wrap gap-2">
            {badges.map((badge) => (
              <CBadge key={badge.key || badge.label} color={badge.color || 'secondary'}>
                {badge.label}
              </CBadge>
            ))}
          </div>
        ) : null}
      </div>
      {secondarySummaryLines.map((line, index) => (
        <div
          key={`${item?.key || item?.title || 'summary'}:${index}`}
          className="small text-body-secondary"
        >
          {line}
        </div>
      ))}
    </div>
  )
}

const InspectionDetailFindingsSection = ({
  sectionTitle = 'Inspection Findings',
  findingsTitle = '',
  items = [],
  renderItemContent = null,
  fallbackContent = null,
}) => {
  const visibleItems = Array.isArray(items) ? items.filter(Boolean) : []
  const hasItems = visibleItems.length > 0
  const hasFallback = Boolean(fallbackContent)

  if (!hasItems && !hasFallback) return null

  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{sectionTitle}</div>
      {findingsTitle ? <div className="small text-body-secondary">{findingsTitle}</div> : null}
      {hasItems ? (
        <CAccordion alwaysOpen>
          {visibleItems.map((item, index) => {
            const groupLabel = text(item.groupLabel)
            const previousGroupLabel = text(visibleItems[index - 1]?.groupLabel)
            const showGroupLabel = Boolean(groupLabel && groupLabel !== previousGroupLabel)
            return (
              <Fragment key={item.key || item.title}>
                {showGroupLabel ? (
                  <div
                    className="inspection-detail-finding-group-label"
                    role="heading"
                    aria-level={3}
                  >
                    {groupLabel}
                  </div>
                ) : null}
                <CAccordionItem
                  itemKey={item.key || item.title}
                  className="inspection-detail-finding-accordion-item"
                >
                  <CAccordionHeader>
                    <FindingSummaryHeader item={item} />
                  </CAccordionHeader>
                  <CAccordionBody>
                    {typeof renderItemContent === 'function' ? renderItemContent(item) : null}
                  </CAccordionBody>
                </CAccordionItem>
              </Fragment>
            )
          })}
        </CAccordion>
      ) : null}
      {!hasItems && hasFallback ? fallbackContent : null}
    </section>
  )
}

export default InspectionDetailFindingsSection
