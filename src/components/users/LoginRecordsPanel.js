import React, { useEffect, useMemo, useState } from 'react'
import {
  CBadge,
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
import { Clock } from 'lucide-react'
import DataTableFooter from 'src/components/DataTableFooter'
import TablePeriodSelect from 'src/components/TablePeriodSelect'
import useTableRows from 'src/hooks/useTableRows'
import { exportWorkbook } from 'src/utils/exportXlsx'
import {
  EMPTY,
  formatDateTime,
  formatDaysAgo,
  getRecordTime,
  renderStatus,
} from 'src/utils/users'

const renderDateWithAgo = (value) => {
  const formatted = formatDateTime(value)
  const ago = formatDaysAgo(value)
  if (formatted === EMPTY) return formatted
  return (
    <span className="d-inline-flex flex-wrap align-items-center gap-1">
      <span>{formatted}</span>
      {ago && <span className="text-muted small">({ago})</span>}
    </span>
  )
}

const LoginRecordsPanel = ({ records, lastLoginAt }) => {
  const [loginSearch, setLoginSearch] = useState('')
  const [loginStatus, setLoginStatus] = useState('All')
  const [loginRange, setLoginRange] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openDetail, setOpenDetail] = useState(null)

  const filteredRecords = useMemo(() => {
    const term = loginSearch.trim().toLowerCase()
    const now = new Date()
    const rangeDays = loginRange === '7' ? 7 : loginRange === '30' ? 30 : loginRange === '90' ? 90 : null

    return (records || []).filter((record) => {
      if (loginStatus !== 'All') {
        const status = (record.status || '').toLowerCase()
        const normalized =
          status === 'successful' ? 'success' : status === 'failed' ? 'failed' : status
        if (loginStatus === 'Success' && normalized !== 'success') return false
        if (loginStatus === 'Failed' && normalized !== 'failed') return false
      }

      if (rangeDays) {
        const dt = getRecordTime(record)
        if (!dt) return false
        const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
        if (dt < cutoff) return false
      }

      if (term) {
        const reason = record.reason || record.error || ''
        const ip = record.ip_address || ''
        const device = record.device_info || record.user_agent || record.device_id || ''
        const hay = `${reason} ${ip} ${device}`.toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })
  }, [records, loginRange, loginSearch, loginStatus])

  const { rowsToShow, setRowsToShow, visibleRows: visibleRecords } = useTableRows(filteredRecords)

  const handleExport = () => {
    const headers = ['#', 'Time', 'Status', 'Reason', 'IP', 'Device']
    const rows = filteredRecords.map((record, index) => {
      const { label } = renderStatus(record.status)
      const when = record.timestamp || record.logged_at || record.created_at || record.time || null
      const reason = record.reason || record.error || EMPTY
      const ip = record.ip_address || EMPTY
      const device = record.device_info || record.user_agent || record.device_id || EMPTY
      return [index + 1, formatDateTime(when), label, reason, ip, device]
    })
    exportWorkbook({
      sheets: [{ name: 'Login Records', headers, rows }],
      filename: `login-records-${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  }

  useEffect(() => {
    setOpenDetail(null)
  }, [loginSearch, loginStatus, loginRange, rowsToShow])

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Login Records</span>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleExport}
          disabled={filteredRecords.length === 0}
        >
          Export XLSX
        </CButton>
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="d-inline-flex align-items-center gap-2 bg-body-tertiary border rounded px-2 py-1">
            <Clock size={14} className="text-muted" />
            <span className="text-muted small">Last login</span>
            <span className="text-muted">-</span>
            {renderDateWithAgo(lastLoginAt)}
          </span>
        </div>

        <CRow className="g-3 align-items-center">
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
              placeholder="Search IP, device, reason"
              value={loginSearch}
              onChange={(e) => setLoginSearch(e.target.value)}
            />
          </CCol>
          <CCol md={2} className="d-none d-md-block">
            <CFormSelect
              size="sm"
              value={loginStatus}
              onChange={(e) => setLoginStatus(e.target.value)}
            >
              <option value="All">All status</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </CFormSelect>
          </CCol>
          <CCol md={2} className="d-none d-md-block">
            <TablePeriodSelect
              value={loginRange}
              onChange={setLoginRange}
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
                setLoginSearch('')
                setLoginStatus('All')
                setLoginRange('all')
              }}
            >
              Clear
            </CButton>
          </CCol>
        </CRow>

        <CCollapse visible={filtersOpen} className="d-md-none">
          <CRow className="g-2 mt-1">
            <CCol xs={12}>
              <CFormInput
                size="sm"
                placeholder="Search IP, device, reason"
                value={loginSearch}
                onChange={(e) => setLoginSearch(e.target.value)}
              />
            </CCol>
            <CCol xs={4}>
              <CFormSelect
                size="sm"
                value={loginStatus}
                onChange={(e) => setLoginStatus(e.target.value)}
              >
                <option value="All">All status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
              </CFormSelect>
            </CCol>
            <CCol xs={4}>
              <TablePeriodSelect
                value={loginRange}
                onChange={setLoginRange}
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
                  setLoginSearch('')
                  setLoginStatus('All')
                  setLoginRange('all')
                }}
              >
                Clear
              </CButton>
            </CCol>
          </CRow>
        </CCollapse>

        <div className="mt-2 d-none d-md-block">
          {filteredRecords.length === 0 ? (
            <span className="text-muted small">No login records yet.</span>
          ) : (
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable small responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '4%' }} className="text-center">
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '18%' }}>Time</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '10%' }}>Status</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '20%' }}>Reason</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '14%' }}>IP</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '34%' }}>Device</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {visibleRecords.map((record, idx) => {
                    const { color, label } = renderStatus(record.status)
                    const reason = record.reason || record.error || EMPTY
                    const when =
                      record.timestamp || record.logged_at || record.created_at || record.time || null
                    const ip = record.ip_address || EMPTY
                    const device = record.device_info || record.user_agent || record.device_id || EMPTY
                    return (
                      <CTableRow key={idx}>
                        <CTableDataCell className="text-center align-top">{idx + 1}</CTableDataCell>
                        <CTableDataCell>{renderDateWithAgo(when)}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={color}>{label}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-break">{reason}</CTableDataCell>
                        <CTableDataCell className="text-break">{ip}</CTableDataCell>
                        <CTableDataCell className="text-break">{device}</CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>
          )}
        </div>

        <div className="mt-2 d-md-none d-grid gap-2">
          {filteredRecords.length === 0 ? (
            <span className="text-muted small">No login records yet.</span>
          ) : (
            visibleRecords.map((record, idx) => {
              const { color, label } = renderStatus(record.status)
              const when =
                record.timestamp || record.logged_at || record.created_at || record.time || null
              const reason = record.reason || record.error || EMPTY
              const ip = record.ip_address || EMPTY
              const device = record.device_info || record.user_agent || record.device_id || EMPTY
              const isOpen = openDetail === idx
              return (
                <CCard
                  key={idx}
                  role="button"
                  className="cursor-pointer"
                  onClick={() => setOpenDetail(isOpen ? null : idx)}
                >
                  <CCardBody className="d-grid gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-semibold small">{formatDateTime(when)}</div>
                      <CBadge color={color}>{label}</CBadge>
                    </div>
                    {isOpen && (
                      <div className="d-grid gap-1 mt-2 small text-muted">
                        <div>
                          <span className="fw-semibold text-body">Reason: </span>
                          <span className="text-body">{reason}</span>
                        </div>
                        <div>
                          <span className="fw-semibold text-body">IP: </span>
                          <span className="text-body">{ip}</span>
                        </div>
                        <div>
                          <span className="fw-semibold text-body">Device: </span>
                          <span className="text-body">{device}</span>
                        </div>
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              )
            })
          )}
        </div>

        <DataTableFooter
          rowsToShow={rowsToShow}
          onRowsToShowChange={setRowsToShow}
          filteredCount={filteredRecords.length}
          totalCount={(records || []).length}
        />
      </CCardBody>
    </CCard>
  )
}

export default LoginRecordsPanel
