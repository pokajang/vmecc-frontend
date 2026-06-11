import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { fetchAuditLogs } from 'src/services/apiClient'
import TableLoader from 'src/components/TableLoader'
import DataTableFooter from 'src/components/DataTableFooter'
import useTableRows from 'src/hooks/useTableRows'
import { exportWorkbook } from 'src/utils/exportXlsx'
import { formatDateTime } from 'src/utils/users'

const EMPTY = '--'

const formatAction = (value) => {
  if (!value) return EMPTY
  return value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const getActorLabel = (log) => {
  if (log.actor?.name) return log.actor.name
  if (log.actor?.email) return log.actor.email
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
  if (log.action === 'user_restored') return 'User restored'
  if (log.action === 'user_locked') return 'User locked'
  if (log.action === 'user_unlocked') return 'User unlocked'
  if (log.action === 'user_session_revoked') return 'Session revoked'
  if (log.action === 'user_sessions_revoked_all') return 'All sessions revoked'
  return log.metadata?.note || EMPTY
}

const UserAuditPanel = ({ userId }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchAuditLogs({ subject_id: userId, limit: 100 })
        if (isMounted) setLogs(response?.data || [])
      } catch (err) {
        if (isMounted) setError(err.payload?.message || 'Unable to load audit logs.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [userId])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(logs)

  const emptyState = useMemo(
    () => !loading && !error && logs.length === 0,
    [loading, error, logs.length],
  )

  const handleExport = () => {
    const headers = ['#', 'Time', 'Action', 'Actor', 'IP', 'Details']
    const rows = logs.map((log, index) => [
      index + 1,
      formatDateTime(log.created_at),
      formatAction(log.action),
      getActorLabel(log),
      log.ip_address || EMPTY,
      getDetailsLabel(log),
    ])
    exportWorkbook({
      sheets: [{ name: 'Admin Activity', headers, rows }],
      filename: `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

  return (
    <CCard className="mt-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Recent Admin Activity</span>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleExport}
          disabled={logs.length === 0}
        >
          Export CSV
        </CButton>
      </CCardHeader>
      <CCardBody>
        {loading && <TableLoader />}
        {error && <CAlert color="danger">{error}</CAlert>}
        {emptyState && <span className="text-muted small">No audit activity for this user.</span>}
        {!loading && !error && logs.length > 0 && (
          <div className="rounded-3 shadow-sm overflow-hidden bg-white">
            <CTable align="middle" className="mb-0" hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell className="text-center" style={{ width: '5%' }}>
                    #
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '19%' }}>Time</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '19%' }}>Action</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '19%' }}>Actor</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '19%' }}>IP</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '19%' }}>Details</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {visibleRows.map((log, index) => (
                  <CTableRow key={log.id}>
                    <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                    <CTableDataCell>{formatDateTime(log.created_at)}</CTableDataCell>
                    <CTableDataCell>{formatAction(log.action)}</CTableDataCell>
                    <CTableDataCell className="text-break">{getActorLabel(log)}</CTableDataCell>
                    <CTableDataCell className="text-break">
                      {log.ip_address || EMPTY}
                    </CTableDataCell>
                    <CTableDataCell className="text-break">{getDetailsLabel(log)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <DataTableFooter
            rowsToShow={rowsToShow}
            onRowsToShowChange={setRowsToShow}
            filteredCount={logs.length}
            totalCount={logs.length}
            showFilteredFrom={false}
          />
        )}
      </CCardBody>
    </CCard>
  )
}

export default UserAuditPanel
