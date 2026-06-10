import React, { useMemo } from 'react'
import { CAlert, CContainer, CNav, CNavItem, CNavLink } from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import AccountSection from './AccountSection'
import SecuritySection from './SecuritySection'
import EmergencySection from './EmergencySection'
import BankingSection from './BankingSection'
import StatutorySection from './StatutorySection'
import MedicalSection from './MedicalSection'

const Profile = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSelector((state) => state.authUser)

  const userRoles = useMemo(() => user?.roles || [], [user?.roles])
  const activeSection = location.pathname === '/profile/security' ? 'security' : 'profile'

  if (!user) {
    return (
      <CAlert color="warning" className="my-4">
        Unable to load profile. Please sign in again.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CNav variant="underline" role="tablist" className="mb-3">
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'profile'}
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
            className={activeSection === 'profile' ? 'text-primary' : ''}
          >
            Profile
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'security'}
            onClick={() => navigate('/profile/security')}
            style={{ cursor: 'pointer' }}
            className={activeSection === 'security' ? 'text-primary' : ''}
          >
            Security
          </CNavLink>
        </CNavItem>
      </CNav>

      {activeSection === 'security' ? (
        <SecuritySection />
      ) : (
        <>
          <AccountSection user={user} roles={userRoles} />
          <EmergencySection contact={user.emergency_contact} user={user} />
          <BankingSection banking={user.banking_info} />
          <StatutorySection statutory={user.statutory_info} />
          <MedicalSection medical={user.medical_info} />
        </>
      )}
    </CContainer>
  )
}

export default Profile
