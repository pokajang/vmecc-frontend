import React from 'react'
import { CListGroup, CListGroupItem } from '@coreui/react'
import { ChevronRight } from 'lucide-react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const MobileSetupSummaryList = ({
  items = [],
  ariaLabel = 'Setup summary',
  className = '',
  truncate = false,
}) => {
  const visibleItems = (Array.isArray(items) ? items : []).filter(
    (item) => String(item?.value || '').trim() !== '',
  )
  if (visibleItems.length === 0) return null

  return (
    <CListGroup
      className={buildClassName(
        'mobile-setup-summary-list',
        truncate ? 'mobile-setup-summary-list--truncate' : '',
        className,
      )}
      aria-label={ariaLabel}
    >
      {visibleItems.map((item) => {
        const fullValue = [item.value, item.secondaryValue, item.metaLabel]
          .filter(Boolean)
          .join(' ')
        const content = (
          <>
            <span className="mobile-setup-summary-list__copy">
              <span className="mobile-setup-summary-list__label">{item.label}</span>
              <span
                className="mobile-setup-summary-list__value-line"
                title={fullValue || undefined}
              >
                <span className="mobile-setup-summary-list__value">{item.value}</span>
                {item.secondaryValue ? (
                  <span className="mobile-setup-summary-list__meta">{item.secondaryValue}</span>
                ) : null}
                {item.meta || null}
              </span>
            </span>
            {typeof item.onEdit === 'function' ? (
              <ChevronRight
                className="mobile-setup-summary-list__chevron"
                size={18}
                aria-hidden="true"
              />
            ) : null}
          </>
        )

        return (
          <CListGroupItem
            key={item.key || item.label}
            className={buildClassName('mobile-setup-summary-list__item', item.className)}
          >
            <div className="mobile-setup-summary-list__row">
              {typeof item.onEdit === 'function' ? (
                <button
                  type="button"
                  className="mobile-setup-summary-list__trigger"
                  aria-label={item.editLabel || `Edit ${item.label}: ${fullValue}`}
                  onClick={item.onEdit}
                >
                  {content}
                </button>
              ) : (
                <div className="mobile-setup-summary-list__trigger">{content}</div>
              )}
              {item.extraAction ? (
                <span className="mobile-setup-summary-list__extra">{item.extraAction}</span>
              ) : null}
            </div>
          </CListGroupItem>
        )
      })}
    </CListGroup>
  )
}

export default MobileSetupSummaryList
