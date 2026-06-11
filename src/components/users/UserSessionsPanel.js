import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CFormInput,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { fetchUserSessions, revokeAllUserSessions, revokeUserSession } from 'src/services/apiClient'
import TableLoader from 'src/components/TableLoader'
import DataTableFooter from 'src/components/DataTableFooter'
import TablePeriodSelect from 'src/components/TablePeriodSelect'
import useTableRows from 'src/hooks/useTableRows'
import { exportWorkbook } from 'src/utils/exportXlsx'
import { formatDateTime } from 'src/utils/users'

const statusLabel = (session) => {
  if (session.active) return { label: 'Active', color: 'success' }
  if (session.revoked_at || session.logged_out_at) return { label: 'Revoked', color: 'secondary' }
  return { label: 'Expired', color: 'secondary' }
}

const UserSessionsPanel = ({ userId, actionsDisabled = false, actionsDisabledReason = '' }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [range, setRange] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchUserSessions(userId)
      setSessions(response?.data || [])
    } catch (err) {
      setError(err.payload?.message || 'Unable to load sessions.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase()
    const now = new Date()
    const rangeDays = range === '7' ? 7 : range === '30' ? 30 : range === '90' ? 90 : null

    return sessions.filter((session) => {
      const isActive = !!session.active
      const isRevoked = !!session.revoked_at || !!session.logged_out_at
      const isExpired = !isActive && !isRevoked

      if (statusFilter !== 'All') {
        if (statusFilter === 'Active' && !isActive) return false
        if (statusFilter === 'Revoked' && !isRevoked) return false
        if (statusFilter === 'Expired' && !isExpired) return false
      }

      if (rangeDays) {
        const createdAt = session.created_at ? new Date(session.created_at) : null
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false
        const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
        if (createdAt < cutoff) return false
      }

      if (term) {
        const hay =
          `${session.ip_address || ''} ${session.user_agent || ''} ${session.device_id || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })
  }, [sessions, search, statusFilter, range])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredSessions)

  const handleExport = () => {
    const headers = ['#', 'Status', 'Device', 'IP', 'Created', 'Last seen', 'Expires']
    const rows = filteredSessions.map((session, index) => {
      const status = statusLabel(session)
      return [
        index + 1,
        status.label,
        session.user_agent || '-',
        session.ip_address || '-',
        formatDateTime(session.created_at),
        formatDateTime(session.last_seen_at),
        formatDateTime(session.expires_at),
      ]
    })
    exportWorkbook({
      sheets: [{ name: 'Active Sessions', headers, rows }],
      filename: `active-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

  const handleRevoke = async (sessionId) => {
    if (!userId || !sessionId || working || actionsDisabled) return
    setWorking(true)
    try {
      await revokeUserSession(userId, sessionId, 'admin_revoked')
      await load()
    } catch (err) {
      setError(err.payload?.message || 'Unable to revoke session.')
    } finally {
      setWorking(false)
    }
  }

  const handleRevokeAll = async () => {
    if (!userId || working || actionsDisabled) return
    setWorking(true)
    try {
      await revokeAllUserSessions(userId, 'admin_revoked_all')
      await load()
    } catch (err) {
      setError(err.payload?.message || 'Unable to revoke sessions.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <CCard className="mt-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Active Sessions</span>
        <div className="d-flex gap-2">
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={handleExport}
            disabled={filteredSessions.length === 0}
          >
            Export CSV
          </CButton>
          <CButton
            size="sm"
            color="danger"
            variant="outline"
            disabled={working || loading || actionsDisabled}
            onClick={handleRevokeAll}
            title={actionsDisabled ? actionsDisabledReason : undefined}
          >
            Revoke all
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 align-items-center mb-3">
          <CCol xs={6} md="auto" className="d-flex d-md-none">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              className="w-100 w-md-auto d-md-none"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </CButton>
          </CCol>
          <CCol md={5} className="d-none d-md-block">
            <CFormInput
              size="sm"
              placeholder="Search IP, device"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CCol>
          <CCol md={2} className="d-none d-md-block">
            <CFormSelect
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All status</option>
              <option value="Active">Active</option>
              <option value="Revoked">Revoked</option>
              <option value="Expired">Expired</option>
            </CFormSelect>
          </CCol>
          <CCol md={2} className="d-none d-md-block">
            <TablePeriodSelect
              value={range}
              onChange={setRange}
              include24Hours={false}
              includeCustom={false}
              includeAll={true}
              ranges={[7, 30, 90]}
            />
          </CCol>
          <CCol md={3} className="d-none d-md-flex justify-content-md-end">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              className="w-100"
              onClick={() => {
                setSearch('')
                setStatusFilter('All')
                setRange('all')
              }}
            >
              Clear
            </CButton>
          </CCol>
        </CRow>

        <CCollapse visible={filtersOpen} className="d-md-none mb-3">
          <CRow className="g-2 mt-1">
            <CCol xs={12}>
              <CFormInput
                size="sm"
                placeholder="Search IP, device"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CCol>
            <CCol xs={4}>
              <CFormSelect
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All status</option>
                <option value="Active">Active</option>
                <option value="Revoked">Revoked</option>
                <option value="Expired">Expired</option>
              </CFormSelect>
            </CCol>
            <CCol xs={4}>
              <TablePeriodSelect
                value={range}
                onChange={setRange}
                include24Hours={false}
                includeCustom={false}
                includeAll={true}
                ranges={[7, 30, 90]}
              />
            </CCol>
            <CCol xs={4}>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                className="w-100"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('All')
                  setRange('all')
                }}
              >
                Clear
              </CButton>
            </CCol>
          </CRow>
        </CCollapse>

        {loading && <TableLoader />}
        {error && <CAlert color="danger">{error}</CAlert>}
        {!loading && !error && filteredSessions.length === 0 && (
          <span className="text-muted small">No sessions found.</span>
        )}
        {!loading && !error && filteredSessions.length > 0 && (
          <div className="rounded-3 shadow-sm overflow-hidden bg-white">
            <CTable align="middle" className="mb-0" responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell className="text-center" style={{ width: '5%' }}>
                    #
                  </CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Device</CTableHeaderCell>
                  <CTableHeaderCell>IP</CTableHeaderCell>
                  <CTableHeaderCell>Created</CTableHeaderCell>
                  <CTableHeaderCell>Last seen</CTableHeaderCell>
                  <CTableHeaderCell>Expires</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {visibleRows.map((session, index) => {
                  const status = statusLabel(session)
                  return (
                    <CTableRow key={session.id}>
                      <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <span className={`badge bg-${status.color}`}>{status.label}</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-break">
                        {session.user_agent || '-'}
                      </CTableDataCell>
                      <CTableDataCell>{session.ip_address || '-'}</CTableDataCell>
                      <CTableDataCell>{formatDateTime(session.created_at)}</CTableDataCell>
                      <CTableDataCell>{formatDateTime(session.last_seen_at)}</CTableDataCell>
                      <CTableDataCell>{formatDateTime(session.expires_at)}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          disabled={!session.active || working || actionsDisabled}
                          onClick={() => handleRevoke(session.id)}
                          title={actionsDisabled ? actionsDisabledReason : undefined}
                        >
                          Revoke
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>
        )}

        {!loading && !error && (
          <DataTableFooter
            rowsToShow={rowsToShow}
            onRowsToShowChange={setRowsToShow}
            filteredCount={filteredSessions.length}
            totalCount={sessions.length}
          />
        )}
      </CCardBody>
    </CCard>
  )
}

export default UserSessionsPanel
