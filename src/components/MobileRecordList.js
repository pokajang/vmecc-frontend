import React from 'react'
import RecordCard from './RecordCard'

const MobileRecordList = ({ sections = [], emptyMessage = null, variant = 'card' }) => {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items) ? section.items.filter(Boolean) : [],
    }))
    .filter((section) => section.items.length > 0)

  if (visibleSections.length === 0) return emptyMessage

  return (
    <div className="mobile-record-list d-md-none d-grid gap-3">
      {visibleSections.map((section) => (
        <section
          key={section.key || section.label || 'records'}
          className={
            section.variant === 'list-group' || variant === 'list-group'
              ? 'mobile-record-list__section'
              : 'mobile-record-list__section d-grid gap-2'
          }
        >
          {section.label ? (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 small text-body-secondary text-uppercase fw-semibold">
              <span>{section.label}</span>
              {section.summary ? (
                <span className="text-body-tertiary">{section.summary}</span>
              ) : null}
            </div>
          ) : null}
          {section.variant === 'list-group' || variant === 'list-group' ? (
            <div className="mobile-record-list__group list-group list-group-flush overflow-hidden border rounded-3">
              {section.items.map((item) => (
                <RecordCard key={item.key} item={item} variant="list-group" />
              ))}
            </div>
          ) : (
            section.items.map((item) => <RecordCard key={item.key} item={item} />)
          )}
        </section>
      ))}
    </div>
  )
}

export default MobileRecordList
