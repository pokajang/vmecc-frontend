import React, { useState } from 'react'
import {
  CDropdown,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { CalendarDays, Clock3, LogOut, Settings, User, WalletCards } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import ButtonLoader from 'src/components/ButtonLoader'
import { logoutRequest } from 'src/services/apiClient'
import { getPrimaryRoleLabel, hasPermission } from 'src/utils/authz'

const AppHeaderDropdown = ({ placement = 'bottom-end', label = null, canOvertime = null }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.authUser)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [visible, setVisible] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }
    setIsLoggingOut(true)
    try {
      await logoutRequest()
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      setVisible(false)
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  const goTo = (path) => {
    setVisible(false)
    navigate(path)
  }

  const primaryRole = getPrimaryRoleLabel(user)
  const secondaryRoles = (user?.roles || []).filter((role) => role !== primaryRole)
  const canClaim = hasPermission(user, 'self.payroll')
  const canLeave = hasPermission(user, 'self.leave')
  const canOvertimeAction =
    typeof canOvertime === 'boolean' ? canOvertime : hasPermission(user, 'self.overtime')

  return (
    <CDropdown
      variant="nav-item"
      placement={placement}
      offset={label ? [0, 12] : [0, 2]}
      visible={visible}
      onShow={() => setVisible(true)}
      onHide={() => setVisible(false)}
      className="d-flex align-items-center"
    >
      <CDropdownToggle
        className={`py-0 pe-0 d-flex flex-column align-items-center gap-1${label ? ' border-0 bg-transparent shadow-none' : ''}`}
        caret={false}
      >
        <User size={label ? 20 : 18} />
        {label && <span className="app-bottom-nav-label">{label}</span>}
      </CDropdownToggle>
      <CDropdownMenu className="pt-0">
        <CDropdownHeader className="fw-semibold mb-0 py-2 app-header-dropdown-user-header">
          <div className="d-grid gap-1">
            <span>Signed in as</span>
            <div className="small fw-normal app-header-dropdown-user-name">
              {user?.name || user?.email || 'User'}
            </div>
            {primaryRole && (
              <div className="small app-header-dropdown-user-role">{primaryRole}</div>
            )}
            {secondaryRoles.length > 0 && (
              <div className="small app-header-dropdown-user-role">{secondaryRoles.join(', ')}</div>
            )}
          </div>
        </CDropdownHeader>
        <CDropdownItem as="button" type="button" onClick={() => goTo('/profile')} className="py-2">
          <User size={16} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem
          as="button"
          type="button"
          onClick={() => goTo('/profile/security')}
          className="py-2"
        >
          <Settings size={16} className="me-2" />
          Settings
        </CDropdownItem>
        {(canClaim || canLeave || canOvertimeAction) && (
          <>
            <CDropdownHeader className="fw-semibold mt-1 mb-1 app-header-dropdown-section-header">
              Quick Actions
            </CDropdownHeader>
            {canClaim && (
              <CDropdownItem
                as="button"
                type="button"
                onClick={() => goTo('/payroll/claims/new')}
                className="py-2"
              >
                <WalletCards size={16} className="me-2" />
                New Claim
              </CDropdownItem>
            )}
            {canLeave && (
              <CDropdownItem
                as="button"
                type="button"
                onClick={() => goTo('/leave/new')}
                className="py-2"
              >
                <CalendarDays size={16} className="me-2" />
                Apply Leave
              </CDropdownItem>
            )}
            {canOvertimeAction && (
              <CDropdownItem
                as="button"
                type="button"
                onClick={() => goTo('/overtime/new')}
                className="py-2"
              >
                <Clock3 size={16} className="me-2" />
                Apply Overtime
              </CDropdownItem>
            )}
          </>
        )}
        <CDropdownHeader className="fw-semibold mt-1 mb-1 app-header-dropdown-section-header">
          Session
        </CDropdownHeader>
        <CDropdownItem
          as="button"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="py-2"
        >
          {isLoggingOut ? (
            <ButtonLoader label="Signing out..." />
          ) : (
            <>
              <LogOut size={16} className="me-2" />
              Log out
            </>
          )}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
