import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import ButtonLoader from 'src/components/ButtonLoader'
import { fetchTeams, fetchUsers } from 'src/services/apiClient'
import BackButton from 'src/components/BackButton'
import useStaffActions from 'src/hooks/useStaffActions'
import StaffActionModals from 'src/components/staff/StaffActionModals'
import { roles as allRoles } from 'src/views/users/CreateStaffForm'
import { getPrimaryRoleLabel, hasAnyPermission, hasPermission } from 'src/utils/authz'

const EMPTY = '-'

const renderRow = (label, content) => (
  <div className="d-flex justify-content-between align-items-center">
    <span className="text-muted">{label}</span>
    <span className="ms-3 text-end">{content}</span>
  </div>
)

const renderList = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) return EMPTY
  return items.join(', ')
}

const formatDateTime = (value) => {
  if (!value) return EMPTY
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? EMPTY : dt.toLocaleString()
}

const maskAccount = (value = '') => {
  if (!value || value.length <= 4) return value || EMPTY
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`
}

const getStatusLabel = (target) => (target?.deleted_at ? 'Terminated' : target?.status || EMPTY)

const StaffProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const authUser = useSelector((state) => state.authUser)
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const canViewStaff = useMemo(
    () => hasAnyPermission(authUser, ['staff.view', 'staff.manage']),
    [authUser],
  )

  const canManageUsers = useMemo(() => hasPermission(authUser, 'users.manage'), [authUser])
  const canAssignRoles = useMemo(() => hasPermission(authUser, 'roles.assign'), [authUser])

  const roleOptions = useMemo(
    () =>
      (allRoles || []).filter(
        (role) =>
          ![
            'System Administrator',
            'Contract Manager',
            'Client',
            'Representative',
            'Client Contract Manager',
          ].includes(role),
      ),
    [],
  )

  useEffect(() => {
    if (!canViewStaff) {
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [usersResponse, teamsResponse] = await Promise.all([
          fetchUsers({ include_deleted: 1 }),
          fetchTeams(),
        ])
        const found = (usersResponse?.data || []).find((u) => String(u.id) === String(id))
        if (!found) {
          setError('Staff not found.')
        } else {
          setUser(found)
        }
        setTeams(teamsResponse?.data || [])
      } catch (err) {
        setError(err.payload?.message || 'Unable to load staff.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canViewStaff, id])

  const isSelf = useCallback(
    (target) =>
      String(authUser?.id || '') === String(target?.id || '') ||
      (authUser?.email && target?.email && authUser.email === target.email),
    [authUser?.email, authUser?.id],
  )

  const updateStaffUser = useCallback((userId, updater) => {
    setUser((prev) => {
      if (!prev || String(prev.id) !== String(userId)) return prev
      if (typeof updater === 'function') return updater(prev)
      return { ...prev, ...updater }
    })
  }, [])

  const {
    statusMessage,
    actionUpdating,
    actionUser,
    roleAssignments,
    addRoleAssignment,
    removeRoleAssignment,
    changeRoleAssignment,
    roleModalOpen,
    confirmTerminateOpen,
    confirmRehireOpen,
    messageModalOpen,
    messageBody,
    setMessageBody,
    getActionItems,
    getPrimaryAction,
    handleRoleUpdate,
    handleTerminate,
    handleRehire,
    handleSendMessage,
    closeRoleModal,
    closeTerminateModal,
    closeRehireModal,
    closeMessageModal,
  } = useStaffActions({
    roleOptions,
    isSelf,
    onUserUpdate: updateStaffUser,
    canAssignRoles,
    canManageUsers,
  })

  const emergency = user?.emergency_contact || {}
  const banking = user?.banking_info || {}
  const medical = user?.medical_info || {}

  if (loading) {
    return (
      <div className="text-center py-5 text-body-secondary">
        <Loader size={24} className="icon-spin" />
      </div>
    )
  }

  if (!canViewStaff) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to view staff.
      </CAlert>
    )
  }

  if (error || !user) {
    return (
      <CAlert color="danger" className="my-4">
        {error || 'Staff not found.'}
      </CAlert>
    )
  }

  const primaryAction = getPrimaryAction(user)
  const menuItems = getActionItems(user).filter((item) => item.key !== primaryAction?.key)

  return (
    <CContainer fluid>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <BackButton onClick={() => navigate('/staff/details')} />
        <div className="d-flex align-items-center gap-2">
          {primaryAction && (
            <CButton
              size="sm"
              color={primaryAction.buttonColor || 'secondary'}
              variant="outline"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
              title={primaryAction.title}
            >
              {actionUpdating ? <ButtonLoader label="Updating..." /> : primaryAction.label}
            </CButton>
          )}
          {menuItems.length > 0 && (
            <CDropdown alignment="end">
              <CDropdownToggle color="secondary" variant="outline" size="sm">
                More
              </CDropdownToggle>
              <CDropdownMenu>
                {menuItems.map((item) => (
                  <CDropdownItem
                    key={item.key}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`cursor-pointer ${item.className || ''}`.trim()}
                    title={item.title}
                  >
                    {item.label}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          )}
        </div>
      </div>

      {statusMessage && (
        <CAlert color={statusMessage.type} className="my-3">
          {statusMessage.message}
        </CAlert>
      )}

      <CRow>
        <CCol lg={6}>
          <CCard className="mb-4">
            <CCardHeader>Personal</CCardHeader>
            <CCardBody className="d-grid gap-2">
              {renderRow('Name', user.name || EMPTY)}
              {renderRow('Email', user.email || EMPTY)}
              {renderRow('Mobile number', user.phone || EMPTY)}
              {renderRow('Home Address', user.address || EMPTY)}
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Roles</span>
                <span className="ms-3 text-end">
                  {(user.roles || []).length === 0
                    ? EMPTY
                    : user.roles.map((r) => (
                        <CBadge
                          color={r === getPrimaryRoleLabel(user) ? 'primary' : 'success'}
                          key={r}
                          className="ms-1"
                        >
                          {r}
                        </CBadge>
                      ))}
                </span>
              </div>
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>System Info</CCardHeader>
            <CCardBody className="d-grid gap-2">
              {renderRow('Status', getStatusLabel(user))}
              {renderRow('Last login', formatDateTime(user.last_login_at))}
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>Emergency Contact</CCardHeader>
            <CCardBody className="d-grid gap-2">
              {renderRow('Name', emergency.name || EMPTY)}
              {renderRow('Relationship', emergency.relationship || EMPTY)}
              {renderRow('Mobile number', emergency.phone || EMPTY)}
              {renderRow('Email', emergency.email || EMPTY)}
              {renderRow('Home Address', emergency.address || EMPTY)}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="mb-4">
            <CCardHeader>Banking Info</CCardHeader>
            <CCardBody className="d-grid gap-2">
              {renderRow('Bank', banking.bankName || EMPTY)}
              {renderRow('Account name', banking.accountName || EMPTY)}
              {renderRow('Account number', maskAccount(banking.accountNumber || ''))}
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>Critical Medical Info</CCardHeader>
            <CCardBody className="d-grid gap-2">
              {renderRow('Blood type', medical.bloodType || EMPTY)}
              {renderRow('Allergies', renderList(medical.allergies))}
              {renderRow('Conditions', renderList(medical.conditions))}
              {renderRow('Medications', renderList(medical.medications))}
              <div>
                <span className="text-muted d-block mb-1">Notes</span>
                <div className="border rounded p-2 bg-body-secondary text-body">
                  {medical.notes ? medical.notes : EMPTY}
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <StaffActionModals
        actionUser={actionUser}
        actionUpdating={actionUpdating}
        roleModalOpen={roleModalOpen}
        roleAssignments={roleAssignments}
        teams={teams}
        onAddAssignment={addRoleAssignment}
        onRemoveAssignment={removeRoleAssignment}
        onChangeAssignment={changeRoleAssignment}
        onCloseRole={closeRoleModal}
        onConfirmRole={handleRoleUpdate}
        confirmTerminateOpen={confirmTerminateOpen}
        onCloseTerminate={closeTerminateModal}
        onConfirmTerminate={handleTerminate}
        confirmRehireOpen={confirmRehireOpen}
        onCloseRehire={closeRehireModal}
        onConfirmRehire={handleRehire}
        messageModalOpen={messageModalOpen}
        messageBody={messageBody}
        onMessageBodyChange={setMessageBody}
        onCloseMessage={closeMessageModal}
        onSendMessage={handleSendMessage}
      />
    </CContainer>
  )
}

export default StaffProfile
