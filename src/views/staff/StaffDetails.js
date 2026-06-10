import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader } from 'lucide-react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchTeams, fetchUsers } from 'src/services/apiClient'
import RowActions from 'src/components/RowActions'
import TableLoader from 'src/components/TableLoader'
import TableFilters from 'src/components/TableFilters'
import DataTableFooter from 'src/components/DataTableFooter'
import useTableRows from 'src/hooks/useTableRows'
import useStaffActions from 'src/hooks/useStaffActions'
import StaffActionModals from 'src/components/staff/StaffActionModals'
import { roles as allRoles } from 'src/views/users/CreateStaffForm'
import { getPrimaryRoleLabel, hasAnyPermission, hasPermission } from 'src/utils/authz'

const StaffDetails = () => {
  const authUser = useSelector((state) => state.authUser)
  const canViewStaff = useMemo(
    () => hasAnyPermission(authUser, ['staff.view', 'staff.manage']),
    [authUser],
  )
  const canManageUsers = useMemo(() => hasPermission(authUser, 'users.manage'), [authUser])
  const canAssignRoles = useMemo(() => hasPermission(authUser, 'roles.assign'), [authUser])
  const navigate = useNavigate()

  const [staff, setStaff] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' })
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      if (hasLoadedRef.current) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const [response, teamsResponse] = await Promise.all([
          fetchUsers({ include_deleted: 1 }),
          fetchTeams(),
        ])
        const filtered = (response?.data || []).filter(
          (u) =>
            !u.roles?.some((r) =>
              [
                'Client',
                'Representative',
                'Client Contract Manager',
                'Contract Manager',
                'System Administrator',
              ].includes(r),
            ),
        )
        setStaff(filtered)
        setTeams(teamsResponse?.data || [])
      } catch (err) {
        setError(err.payload?.message || 'Unable to load staff.')
      } finally {
        setLoading(false)
        setRefreshing(false)
        hasLoadedRef.current = true
      }
    }
    if (canViewStaff) {
      load()
    } else {
      setLoading(false)
    }
  }, [canViewStaff])
  const staffRoleOptions = useMemo(
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

  const renderEmergency = (user) => {
    const ec = user?.emergency_contact
    if (!ec) return '-'
    const name = ec.name || ''
    const phone = ec.phone || ''
    const relation = ec.relationship || ''
    const parts = [name, phone, relation].filter(Boolean)
    return parts.length ? parts.join(' - ') : '-'
  }

  const roleOptions = useMemo(() => {
    const set = new Set()
    ;(staff || []).forEach((u) => (u.roles || []).forEach((r) => set.add(r)))
    return ['All', ...Array.from(set)]
  }, [staff])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let next = [...staff]
    if (term) {
      next = next.filter((u) => {
        const hay = `${u.name || ''} ${u.email || ''} ${(u.roles || []).join(' ')}`.toLowerCase()
        return hay.includes(term)
      })
    }
    if (statusFilter !== 'All') {
      if (statusFilter === 'Terminated') {
        next = next.filter((u) => !!u.deleted_at)
      } else {
        next = next.filter((u) => !u.deleted_at && (u.status || '') === statusFilter)
      }
    }
    if (roleFilter !== 'All') {
      next = next.filter((u) => u.roles?.includes(roleFilter))
    }
    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        next = next.filter((u) => {
          if (!u.last_login_at) return false
          const dt = new Date(u.last_login_at)
          return !Number.isNaN(dt.getTime()) && dt >= cutoff
        })
      }
    }
    next.sort((a, b) => {
      const dir = sort.dir === 'desc' ? -1 : 1
      if (sort.field === 'last_login_at') {
        const av = a.last_login_at ? new Date(a.last_login_at).getTime() : -Infinity
        const bv = b.last_login_at ? new Date(b.last_login_at).getTime() : -Infinity
        if (av === bv) return 0
        return av > bv ? dir : -dir
      }
      const fields = {
        name: (v) => (v?.name || '').toLowerCase(),
        role: (v) => (v?.roles || []).join(', ').toLowerCase(),
        team: (v) => (v?.team || '').toLowerCase(),
        status: (v) => (v?.deleted_at ? 'terminated' : v?.status || '').toLowerCase(),
      }
      const getter = fields[sort.field] || fields.name
      const av = getter(a)
      const bv = getter(b)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    })
    return next
  }, [staff, search, statusFilter, roleFilter, period, sort])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filtered)

  const toggleSort = (field) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { field, dir: 'asc' }
    })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setRoleFilter('All')
    setPeriod('all')
    setSort({ field: 'name', dir: 'asc' })
  }

  const isSelf = useCallback(
    (user) =>
      String(authUser?.id || '') === String(user?.id || '') ||
      (authUser?.email && user?.email && authUser.email === user.email),
    [authUser?.email, authUser?.id],
  )

  const updateStaffUser = useCallback((userId, updater) => {
    setStaff((prev) =>
      prev.map((u) => {
        if (String(u.id) !== String(userId)) return u
        if (typeof updater === 'function') return updater(u)
        return { ...u, ...updater }
      }),
    )
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
    handleRoleUpdate,
    handleTerminate,
    handleRehire,
    handleSendMessage,
    closeRoleModal,
    closeTerminateModal,
    closeRehireModal,
    closeMessageModal,
  } = useStaffActions({
    roleOptions: staffRoleOptions,
    isSelf,
    onUserUpdate: updateStaffUser,
    canAssignRoles,
    canManageUsers,
  })

  const getStatusLabel = (user) => (user?.deleted_at ? 'Terminated' : user?.status || '-')

  const goProfile = (id) => navigate(`/staff/profile/${id}`)

  if (!canViewStaff && !loading) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to view staff.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center gap-2">
              <span>Staff Details</span>
              {refreshing && <Loader size={14} className="icon-spin" />}
            </CCardHeader>
            <CCardBody>
              {error && <CAlert color="danger">{error}</CAlert>}
              {statusMessage && <CAlert color={statusMessage.type}>{statusMessage.message}</CAlert>}

              {!error && (
                <>
                  <TableFilters
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search name or email"
                    searchColMd={4}
                    periodColMd={2}
                    filterColMd={2}
                    clearColMd={2}
                    periodValue={period}
                    onPeriodChange={setPeriod}
                    filters={[
                      {
                        key: 'status',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        options: [
                          { value: 'All', label: 'All status' },
                          { value: 'Active', label: 'Active' },
                          { value: 'Inactive', label: 'Inactive' },
                          { value: 'Terminated', label: 'Terminated' },
                        ],
                      },
                      {
                        key: 'role',
                        value: roleFilter,
                        onChange: setRoleFilter,
                        options: roleOptions.map((r) => ({
                          value: r,
                          label: r === 'All' ? 'All roles' : r,
                        })),
                      },
                    ]}
                    onClear={clearFilters}
                  />
                  <div className="d-none d-md-block">
                    <div className="rounded-3 shadow-sm overflow-hidden bg-white">
                      <CTable align="middle" className="mb-0" hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                            <CTableHeaderCell role="button" onClick={() => toggleSort('name')}>
                              Name
                            </CTableHeaderCell>
                            <CTableHeaderCell role="button" onClick={() => toggleSort('role')}>
                              Role
                            </CTableHeaderCell>
                            <CTableHeaderCell>Mobile</CTableHeaderCell>
                            <CTableHeaderCell>Emergency contact</CTableHeaderCell>
                            <CTableHeaderCell role="button" onClick={() => toggleSort('team')}>
                              Team
                            </CTableHeaderCell>
                            <CTableHeaderCell role="button" onClick={() => toggleSort('status')}>
                              Status
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {loading ? (
                            <CTableRow>
                              <CTableDataCell colSpan={8} className="p-0 border-0">
                                <TableLoader />
                              </CTableDataCell>
                            </CTableRow>
                          ) : visibleRows.map((user, index) => (
                            <CTableRow
                              key={user.id}
                              role="button"
                              className="cursor-pointer"
                              onClick={() => goProfile(user.id)}
                            >
                              <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                              <CTableDataCell>{user.name || '-'}</CTableDataCell>
                              <CTableDataCell>{getPrimaryRoleLabel(user) || '-'}</CTableDataCell>
                              <CTableDataCell>{user.phone || '-'}</CTableDataCell>
                              <CTableDataCell>{renderEmergency(user)}</CTableDataCell>
                              <CTableDataCell>{user.team || '-'}</CTableDataCell>
                              <CTableDataCell>{getStatusLabel(user)}</CTableDataCell>
                              <CTableDataCell className="text-center align-middle">
                                <RowActions items={getActionItems(user)} />
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </div>
                  </div>

                  <div className="d-md-none">
                    {loading ? (
                      <TableLoader />
                    ) : visibleRows.map((user, index) => (
                      <CCard
                        key={user.id}
                        className="mb-3 cursor-pointer"
                        role="button"
                        onClick={() => goProfile(user.id)}
                      >
                        <CCardBody className="d-flex justify-content-between align-items-start gap-3">
                          <div>
                            <div className="fw-semibold d-flex justify-content-between align-items-center gap-2">
                              <span>{user.name || '-'}</span>
                              <span className="text-muted small">
                                {getPrimaryRoleLabel(user) || '-'}
                              </span>
                            </div>
                            <div className="text-muted small">{user.phone || '-'}</div>
                            <div className="text-muted small">{renderEmergency(user)}</div>
                            <div className="text-muted small">{user.team || '-'}</div>
                            <div className="text-muted small">{getStatusLabel(user)}</div>
                          </div>
                          <RowActions items={getActionItems(user)} />
                        </CCardBody>
                      </CCard>
                    ))}
                  </div>

                  <DataTableFooter
                    rowsToShow={rowsToShow}
                    onRowsToShowChange={setRowsToShow}
                    filteredCount={filtered.length}
                    totalCount={staff.length}
                  />
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
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default StaffDetails
