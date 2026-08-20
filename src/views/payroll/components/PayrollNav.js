import React from 'react'
import RouteNavTabs from 'src/components/RouteNavTabs'

const PayrollNav = ({ activeSection, onNavigate, className = 'd-none d-md-flex' }) => (
  <RouteNavTabs
    currentPath={activeSection}
    navigate={(to) => onNavigate(to)}
    className={className}
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
    ]}
  />
)

export default PayrollNav
