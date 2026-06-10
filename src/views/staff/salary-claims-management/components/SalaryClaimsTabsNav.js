import React from 'react'
import { CNav, CNavItem, CNavLink } from '@coreui/react'

const ALL_TAB_ITEMS = [
  { key: 'salaryRecords', label: 'Salary Records', group: 'records' },
  { key: 'claimRecords', label: 'Claim Records', group: 'records' },
  { key: 'assignment', label: 'Set Salary', group: 'settings' },
  { key: 'otRates', label: 'Set OT Rate', group: 'settings' },
  { key: 'workflowRules', label: 'Workflow Rules', group: 'settings' },
  { key: 'companyLegal', label: 'Company Legal Info', group: 'settings' },
]

const SalaryClaimsTabsNav = ({ activeTab, onSwitch, group, tabMeta = {} }) => {
  const items = group ? ALL_TAB_ITEMS.filter((t) => t.group === group) : ALL_TAB_ITEMS
  const canSwitch = typeof onSwitch === 'function'

  if (items.length === 0) return null

  return (
    <CNav variant="underline" role="tablist" className="mb-3">
      {items.map((tabItem) => (
        <CNavItem key={tabItem.key} role="presentation">
          <CNavLink
            active={activeTab === tabItem.key}
            onClick={(event) => {
              event.preventDefault()
              if (!canSwitch || activeTab === tabItem.key) return
              onSwitch(tabItem.key)
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="d-inline-flex align-items-center gap-2">
              <span>{tabItem.label}</span>
              {Number(tabMeta?.[tabItem.key]?.warningCount || 0) > 0 && (
                <span className="badge rounded-pill bg-warning text-dark">
                  {tabMeta[tabItem.key].warningCount}
                </span>
              )}
            </span>
          </CNavLink>
        </CNavItem>
      ))}
    </CNav>
  )
}

export default SalaryClaimsTabsNav
