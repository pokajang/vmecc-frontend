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
    <CContainer fluid data-testid="profile-module">
      <CNav variant="underline" role="tablist" className="mb-3" data-testid="profile-nav">
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
        <div data-testid="profile-security">
          <SecuritySection />
        </div>
      ) : (
        <>
          <div data-testid="profile-personal">
            <AccountSection user={user} roles={userRoles} />
          </div>
          <div data-testid="profile-emergency">
            <EmergencySection contact={user.emergency_contact} user={user} />
          </div>
          <div data-testid="profile-banking">
            <BankingSection banking={user.banking_info} />
          </div>
          <div data-testid="profile-statutory">
            <StatutorySection statutory={user.statutory_info} />
          </div>
          <div data-testid="profile-medical">
            <MedicalSection medical={user.medical_info} />
          </div>
        </>
      )}
    </CContainer>
  )
}

export default Profile
