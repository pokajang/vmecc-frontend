import React from 'react'
import { CFormLabel, CFormSelect, CNav, CNavItem, CNavLink } from '@coreui/react'

const getItemKey = (item, index) => String(item.key || item.to || index)

const getMobileItemLabel = (item, index) => {
  if (item.mobileLabel) return String(item.mobileLabel)
  if (item.accessibleLabel) return String(item.accessibleLabel)
  if (typeof item.label === 'string') return item.label
  return getItemKey(item, index)
}

const ModuleNavTabs = ({
  items = [],
  className = '',
  mobileVariant = 'scroll',
  mobileLabel = 'Section',
}) => {
  const usesMobileSelect = mobileVariant === 'select'
  const activeIndex = items.findIndex((item) => Boolean(item.active))
  const activeValue = activeIndex >= 0 ? getItemKey(items[activeIndex], activeIndex) : ''
  const selectId = `module-nav-select-${String(mobileLabel)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`

  const handleMobileChange = (event) => {
    const selectedIndex = items.findIndex(
      (item, index) => getItemKey(item, index) === event.target.value,
    )
    if (selectedIndex < 0 || items[selectedIndex]?.disabled) return
    items[selectedIndex]?.onClick?.(event)
  }

  return (
    <>
      {usesMobileSelect ? (
        <div className="module-nav-mobile-select d-md-none mb-3">
          <CFormLabel htmlFor={selectId} className="small text-body-secondary mb-1">
            {mobileLabel}
          </CFormLabel>
          <CFormSelect id={selectId} value={activeValue} onChange={handleMobileChange}>
            {activeValue ? null : <option value="">Select a section</option>}
            {items.map((item, index) => (
              <option
                key={getItemKey(item, index)}
                value={getItemKey(item, index)}
                disabled={Boolean(item.disabled)}
              >
                {getMobileItemLabel(item, index)}
              </option>
            ))}
          </CFormSelect>
        </div>
      ) : null}
      <CNav
        variant="underline"
        className={`mb-3 flex-nowrap vmecc-scroll-x pb-1 ${
          usesMobileSelect ? 'd-none d-md-flex' : ''
        } ${className}`.trim()}
      >
        {items.map((item, index) => {
          const isActive = Boolean(item.active)
          const isDisabled = Boolean(item.disabled)
          return (
            <CNavItem key={getItemKey(item, index)}>
              <CNavLink
                as="button"
                type="button"
                active={isActive}
                disabled={isDisabled}
                aria-disabled={isDisabled || undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={item.onClick}
                title={item.title}
                data-testid={item.dataTestId}
                className={`module-nav-link ${isActive ? 'text-primary' : ''} text-nowrap`.trim()}
              >
                {item.label}
              </CNavLink>
            </CNavItem>
          )
        })}
      </CNav>
    </>
  )
}

export default ModuleNavTabs
