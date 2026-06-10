import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormInput,
  CFormLabel,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { fetchAuditLogs } from 'src/services/apiClient'
import TableLoader from 'src/components/TableLoader'
import TableFilters from 'src/components/TableFilters'
import DataTableFooter from 'src/components/DataTableFooter'
import { getPeriodOptions } from 'src/components/TablePeriodSelect'
import useTableRows from 'src/hooks/useTableRows'
import { hasPermission } from 'src/utils/authz'
import { EMPTY, formatDateTime } from 'src/utils/users'

const AUDIT_LIMIT = 200

const formatAction = (value) => {
  if (!value) return EMPTY
  return value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const getActorLabel = (log) => {
  if (log.actor?.name) return log.actor.name
  if (log.metadata?.actor?.name) return log.metadata.actor.name
  if (log.actor?.email) return log.actor.email
  return EMPTY
}

const getTargetLabel = (log) => {
  const subject = log.metadata?.subject
  if (subject?.name && subject?.email) return `${subject.name} (${subject.email})`
  if (subject?.name) return subject.name
  if (subject?.email) return subject.email
  if (log.subject_type === 'user' && log.subject_id) return `User #${log.subject_id}`
  return EMPTY
}

const getDetailsLabel = (log) => {
  if (log.action === 'user_status_changed') {
    const from = log.metadata?.from || EMPTY
    const to = log.metadata?.to || EMPTY
    return `Status changed from ${from} to ${to}`
  }
  if (log.action === 'user_created') {
    const role = log.metadata?.role
    return role ? `User created with role ${role}` : 'User created'
  }
  if (log.action === 'user_role_changed') {
    const fromRoles = Array.isArray(log.metadata?.from_roles) ? log.metadata.from_roles : []
    const toRoles = Array.isArray(log.metadata?.to_roles) ? log.metadata.to_roles : []
    const fromLabel = fromRoles.length ? fromRoles.join(', ') : EMPTY
    const toLabel = toRoles.length ? toRoles.join(', ') : EMPTY
    return `Roles changed from ${fromLabel} to ${toLabel}`
  }
  if (log.action === 'password_reset_sent') {
    const method = log.metadata?.method || 'admin'
    return `Password reset sent (${method})`
  }
  if (log.action === 'user_deleted') return 'User deleted'
  if (log.action === 'user_permanently_deleted') return 'User permanently deleted'
  if (log.action === 'user_restored') return 'User restored'
  if (log.action === 'staff_message_sent') {
    const subject = log.metadata?.subject
    return subject ? `Message sent: ${subject}` : 'Message sent'
  }
  if (log.action === 'user_locked') return 'User locked'
  if (log.action === 'user_unlocked') return 'User unlocked'
  if (log.action === 'user_session_revoked') return 'Session revoked'
  if (log.action === 'team_deleted') {
    const name = log.metadata?.team_name || 'Unknown team'
    const count = log.metadata?.member_count ?? 0
    return `Team "${name}" deleted — ${count} ${count === 1 ? 'member' : 'members'} unassigned`
  }
  if (log.action === 'roster_draft_saved') {
    const count = log.metadata?.entry_count ?? 0
    return `Roster draft saved — ${count} ${count === 1 ? 'entry' : 'entries'}`
  }
  if (log.action === 'roster_published') {
    const scope = log.metadata?.scope_label || 'unknown range'
    const teams = log.metadata?.teams_count ?? 0
    return `Roster published for ${scope} — ${teams} ${teams === 1 ? 'team' : 'teams'} notified`
  }
  if (log.action === 'user_sessions_revoked_all') {
    const reason = (log.metadata?.reason || '').trim()
    if (reason === 'terminated') return 'All sessions revoked (Termination)'
    if (reason === 'status_inactive') return 'All sessions revoked (Deactivated)'
    if (reason) return `All sessions revoked (${reason.replace(/_/g, ' ')})`
    return 'All sessions revoked'
  }
  if (log.action === 'role_permissions_updated') {
    const changed = Array.isArray(log.metadata?.changed_roles) ? log.metadata.changed_roles : []
    if (changed.length === 0) return 'Role permissions updated (no changes)'
    return `Role permissions updated for: ${changed.join(', ')}`
  }
  return log.metadata?.note || EMPTY
}

const isValidDateString = (str) => str && !Number.isNaN(new Date(str).getTime())

const DEFAULT_RANGE = '7'

const periodOptions = getPeriodOptions({ include24Hours: true, includeCustom: true })

const AuditLogs = () => {
  const authUser = useSelector((state) => state.authUser)
  const canViewAudit = useMemo(() => hasPermission(authUser, 'audit.view'), [authUser])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        if (!hasLoadedRef.current) setLoading(true)
        setError(null)
      }
      try {
        const now = new Date()
        let from = null
        let to = null

        if (range === 'custom') {
          if (isValidDateString(fromDate)) {
            from = new Date(`${fromDate}T00:00:00`).toISOString()
          }
          if (isValidDateString(toDate)) {
            to = new Date(`${toDate}T23:59:59`).toISOString()
          }
        } else if (range !== 'all') {
          const days = Number(range)
          if (!Number.isNaN(days) && days > 0) {
            from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
            to = now.toISOString()
          }
        }

        const response = await fetchAuditLogs({ limit: AUDIT_LIMIT, from, to })
        if (isMounted) setLogs(response?.data || [])
      } catch (err) {
        if (isMounted) setError(err.payload?.message || 'Unable to load audit logs.')
      } finally {
        if (isMounted) {
          setLoading(false)
          hasLoadedRef.current = true
        }
      }
    }
    if (canViewAudit) {
      load()
    } else {
      setLoading(false)
    }
    return () => {
      isMounted = false
    }
  }, [canViewAudit, range, fromDate, toDate])

  const actions = useMemo(() => {
    const unique = new Set()
    logs.forEach((log) => {
      if (log.action) unique.add(log.action)
    })
    return Array.from(unique).sort()
  }, [logs])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (actionFilter !== 'All' && log.action !== actionFilter) return false
      if (!term) return true
      const hay = [
        log.action,
        formatAction(log.action),
        getActorLabel(log),
        getTargetLabel(log),
        getDetailsLabel(log),
        log.ip_address,
        log.actor?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [logs, search, actionFilter])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filtered)

  const handlePeriodChange = useCallback((value) => {
    setRange(value)
    if (value !== 'custom') {
      setFromDate('')
      setToDate('')
    }
  }, [])

  const handleClear = useCallback(() => {
    setSearch('')
    setActionFilter('All')
    setRange(DEFAULT_RANGE)
    setFromDate('')
    setToDate('')
  }, [])

  const handleClearDates = useCallback(() => {
    setFromDate('')
    setToDate('')
  }, [])

  const isTruncated = logs.length >= AUDIT_LIMIT

  if (!canViewAudit) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to view audit logs.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CCard className="mb-4">
        <CCardHeader>Audit Logs</CCardHeader>
        <CCardBody>
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search action, actor, target, IP"
            filterColMd={3}
            clearColMd={2}
            periodValue={range}
            onPeriodChange={handlePeriodChange}
            periodOptions={periodOptions}
            filters={[
              {
                key: 'action',
                value: actionFilter,
                onChange: setActionFilter,
                options: [
                  { value: 'All', label: 'All actions' },
                  ...actions.map((action) => ({
                    value: action,
                    label: formatAction(action),
                  })),
                ],
              },
            ]}
            onClear={handleClear}
          />

          {range === 'custom' && (
            <CRow className="g-2 mb-3 align-items-end">
              <CCol xs={12} md={3}>
                <CFormLabel className="small mb-1">From</CFormLabel>
                <CFormInput
                  type="date"
                  size="sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel className="small mb-1">To</CFormLabel>
                <CFormInput
                  type="date"
                  size="sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CButton size="sm" color="secondary" variant="outline" onClick={handleClearDates}>
                  Clear dates
                </CButton>
              </CCol>
            </CRow>
          )}

          {isTruncated && !error && (
            <CAlert color="info" className="py-2 small">
              Showing the latest {AUDIT_LIMIT} entries for this period. Narrow the date range to see
              older records.
            </CAlert>
          )}

          {error && <CAlert color="danger">{error}</CAlert>}

          {!error && (
            <>
              <div className="rounded-3 shadow-sm overflow-hidden bg-white">
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell style={{ width: '4%' }} className="text-center">
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '18%' }}>Time</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '16%' }}>Action</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '16%' }}>Actor</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '20%' }}>Target</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '12%' }}>IP</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '18%' }}>Details</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {loading ? (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="p-0 border-0">
                          <TableLoader />
                        </CTableDataCell>
                      </CTableRow>
                    ) : filtered.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center text-muted">
                          No audit logs found.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      visibleRows.map((log, idx) => (
                        <CTableRow key={log.id}>
                          <CTableDataCell className="text-center text-muted">
                            {idx + 1}
                          </CTableDataCell>
                          <CTableDataCell>{formatDateTime(log.created_at)}</CTableDataCell>
                          <CTableDataCell>{formatAction(log.action)}</CTableDataCell>
                          <CTableDataCell className="text-break">
                            {getActorLabel(log)}
                          </CTableDataCell>
                          <CTableDataCell className="text-break">
                            {getTargetLabel(log)}
                          </CTableDataCell>
                          <CTableDataCell className="text-break">
                            {log.ip_address || EMPTY}
                          </CTableDataCell>
                          <CTableDataCell className="text-break">
                            {getDetailsLabel(log)}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </div>

              <DataTableFooter
                rowsToShow={rowsToShow}
                onRowsToShowChange={setRowsToShow}
                filteredCount={filtered.length}
                totalCount={logs.length}
                showFilteredFrom={false}
              />
            </>
          )}
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default AuditLogs
