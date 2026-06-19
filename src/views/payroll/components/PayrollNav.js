import React from 'react'
import RouteNavTabs from 'src/components/RouteNavTabs'

const PayrollNav = ({ activeSection, onNavigate }) => (
  <RouteNavTabs
    currentPath={activeSection}
    navigate={(to) => onNavigate(to)}
    items={[
      {
        key: 'claims',
        label: 'Claim Records',
        to: '/payroll',
        match: (section) => section === 'claims' || section === 'claim-detail',
      },
      {
        key: 'payslips',
        label: 'Payslips',
        to: '/payroll/payslips',
        match: 'payslips',
      },
      {
        key: 'new-claim',
        label: 'Apply Claim',
        to: '/payroll/claims/new',
        match: (section) => section.startsWith('new-claim'),
      },
    ]}
  />
)

export default PayrollNav
