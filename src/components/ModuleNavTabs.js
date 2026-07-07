import React from 'react'
import { CNav, CNavItem, CNavLink } from '@coreui/react'

const ModuleNavTabs = ({ items = [], className = '' }) => (
  <CNav variant="underline" className={`mb-3 flex-nowrap overflow-auto pb-1 ${className}`.trim()}>
    {items.map((item) => {
      const isActive = Boolean(item.active)
      const isDisabled = Boolean(item.disabled)
      return (
        <CNavItem key={item.key || item.label}>
          <CNavLink
            active={isActive}
            disabled={isDisabled}
            aria-disabled={isDisabled || undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={item.onClick}
            title={item.title}
            data-testid={item.dataTestId}
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            className={`${isActive ? 'text-primary' : ''} text-nowrap`.trim()}
          >
            {item.label}
          </CNavLink>
        </CNavItem>
      )
    })}
  </CNav>
)

export default ModuleNavTabs
