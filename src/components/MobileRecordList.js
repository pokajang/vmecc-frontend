import React from 'react'
import RecordCard from './RecordCard'

const MobileRecordList = ({ sections = [], emptyMessage = null }) => {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items) ? section.items.filter(Boolean) : [],
    }))
    .filter((section) => section.items.length > 0)

  if (visibleSections.length === 0) return emptyMessage

  return (
    <div className="d-md-none d-grid gap-3">
      {visibleSections.map((section) => (
        <section key={section.key || section.label || 'records'} className="d-grid gap-2">
          {section.label ? (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 small text-body-secondary text-uppercase fw-semibold">
              <span>{section.label}</span>
              {section.summary ? (
                <span className="text-body-tertiary">{section.summary}</span>
              ) : null}
            </div>
          ) : null}
          {section.items.map((item) => (
            <RecordCard key={item.key} item={item} />
          ))}
        </section>
      ))}
    </div>
  )
}

export default MobileRecordList
