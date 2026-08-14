import React from 'react'
import { CBadge } from '@coreui/react'
import DisclosureCard from 'src/components/DisclosureCard'

const text = (value) => String(value || '').trim()

const REDUNDANT_SUMMARY_BADGES = new Set(['checked', 'finding'])

const isRedundantSummaryBadge = (badge = {}) =>
  REDUNDANT_SUMMARY_BADGES.has(text(badge.label).toLowerCase())

const FindingSummaryHeader = ({ item }) => {
  const summaryLines = (Array.isArray(item?.summaryLines) ? item.summaryLines : []).filter((line) =>
    text(line),
  )
  const [primarySummaryLine, ...secondarySummaryLines] = summaryLines
  const badges = (Array.isArray(item?.badges) ? item.badges : []).filter(
    (badge) => !isRedundantSummaryBadge(badge),
  )

  return (
    <div className="d-grid gap-2 w-100">
      {text(item?.groupLabel) ? (
        <div className="small text-body-secondary">{item.groupLabel}</div>
      ) : null}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div className="inspection-detail-finding-disclosure-title-row">
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
  emptyMessage = '',
}) => {
  const visibleItems = Array.isArray(items) ? items.filter(Boolean) : []
  const hasItems = visibleItems.length > 0
  const hasFallback = Boolean(fallbackContent)

  if (!hasItems && !hasFallback && !text(emptyMessage)) return null

  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{sectionTitle}</div>
      {findingsTitle ? <div className="small text-body-secondary">{findingsTitle}</div> : null}
      {hasItems ? (
        <div className="inspection-detail-disclosure-list">
          {visibleItems.map((item) => (
            <DisclosureCard
              key={item.key || item.title}
              className="inspection-detail-finding-disclosure inspection-detail-finding-accordion-item"
              summaryClassName="inspection-detail-finding-accordion-title-row"
              summary={<FindingSummaryHeader item={item} />}
            >
              {typeof renderItemContent === 'function' ? renderItemContent(item) : null}
            </DisclosureCard>
          ))}
        </div>
      ) : null}
      {!hasItems && hasFallback ? fallbackContent : null}
      {!hasItems && !hasFallback && text(emptyMessage) ? (
        <div className="inspection-inset text-body-secondary">{emptyMessage}</div>
      ) : null}
    </section>
  )
}

export default InspectionDetailFindingsSection
