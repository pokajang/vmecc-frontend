import React from 'react'
import { CNav, CNavItem, CNavLink } from '@coreui/react'

const PayrollNav = ({ activeSection, onNavigate }) => (
  <CNav variant="underline" role="tablist" className="mb-3 flex-nowrap overflow-auto">
    <CNavItem role="presentation">
      <CNavLink
        active={activeSection === 'claims' || activeSection === 'claim-detail'}
        onClick={() => onNavigate('/payroll')}
        style={{ cursor: 'pointer' }}
        className={
          activeSection === 'claims' || activeSection === 'claim-detail' ? 'text-primary' : ''
        }
      >
        Claim Records
      </CNavLink>
    </CNavItem>
    <CNavItem role="presentation">
      <CNavLink
        active={activeSection === 'payslips'}
        onClick={() => onNavigate('/payroll/payslips')}
        style={{ cursor: 'pointer' }}
        className={activeSection === 'payslips' ? 'text-primary' : ''}
      >
        Payslips
      </CNavLink>
    </CNavItem>
    <CNavItem role="presentation">
      <CNavLink
        active={activeSection.startsWith('new-claim')}
        onClick={() => onNavigate('/payroll/claims/new')}
        style={{ cursor: 'pointer' }}
        className={activeSection.startsWith('new-claim') ? 'text-primary' : ''}
      >
        Apply Claim
      </CNavLink>
    </CNavItem>
  </CNav>
)

export default PayrollNav
