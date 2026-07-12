import React from 'react'
import RouteNavTabs from 'src/components/RouteNavTabs'

const ALL_TAB_ITEMS = [
  { key: 'salaryRecords', label: 'Salary Records', group: 'records' },
  { key: 'claimRecords', label: 'Claim Records', group: 'records' },
  { key: 'assignment', label: 'Salary Assignments', group: 'settings' },
  { key: 'otRates', label: 'Overtime Rates', group: 'settings' },
  { key: 'workflowRules', label: 'Workflow Rules', group: 'settings' },
  { key: 'companyLegal', label: 'Company Information', group: 'settings' },
]

const SalaryClaimsTabsNav = ({ activeTab, onSwitch, group, tabMeta = {} }) => {
  const items = group ? ALL_TAB_ITEMS.filter((t) => t.group === group) : ALL_TAB_ITEMS
  const canSwitch = typeof onSwitch === 'function'

  if (items.length === 0) return null

  return (
    <RouteNavTabs
      currentPath={activeTab}
      navigate={(tab) => onSwitch(tab)}
      mobileVariant={group === 'settings' ? 'select' : 'scroll'}
      mobileLabel="Payroll configuration section"
      items={items.map((tabItem) => ({
        key: tabItem.key,
        to: tabItem.key,
        match: tabItem.key,
        disabled: !canSwitch,
        mobileLabel: tabItem.label,
        label: (
          <span className="d-inline-flex align-items-center gap-2">
            <span>{tabItem.label}</span>
            {Number(tabMeta?.[tabItem.key]?.warningCount || 0) > 0 && (
              <span className="badge rounded-pill bg-warning text-dark">
                {tabMeta[tabItem.key].warningCount}
              </span>
            )}
          </span>
        ),
      }))}
    />
  )
}

export default SalaryClaimsTabsNav
