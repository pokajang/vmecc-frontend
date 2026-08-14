import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
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
import { Camera, Download, MessageSquare } from 'lucide-react'

import DataTableFooter from 'src/components/DataTableFooter'
import CreateActionButton from 'src/components/CreateActionButton'
import EvidencePhotoGallery from 'src/components/media/EvidencePhotoGallery'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import { formatLocalDate, getLocalDateInputValue } from 'src/utils/localDate'
import { InspectionPhotoViewerModal } from 'src/views/inspection/form/components/InspectionDisplayShared'
import {
  fetchFireExtinguisherCoverage,
  fetchFireExtinguisherCoverageDetail,
  fetchFireExtinguisherInspectionHistory,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import FireExtinguisherCreateDrawer from './FireExtinguisherCreateDrawer'
import FireExtinguisherEditDialog from './FireExtinguisherEditDialog'
import FireExtinguisherLifecycleDialog, {
  buildFireExtinguisherLifecycleMenuItems,
} from './FireExtinguisherLifecycleDialog'
import FireExtinguisherManagementPanel from './FireExtinguisherManagementPanel'
import FireExtinguisherMonthlyComplianceStatus from './FireExtinguisherMonthlyComplianceStatus'
import InspectionSidePanel from './InspectionSidePanel'
import FireExtinguisherExceptionExportDialog from './fire-extinguisher-export/FireExtinguisherExceptionExportDialog'

const ALL_ROWS_VALUE = 'all'
const REMOTE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map((value) => ({
  value,
  label: String(value),
}))

const getTodayDateInputValue = () => getLocalDateInputValue()

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'thisweek', label: 'This week' },
  { value: 'thismonth', label: 'This month' },
  { value: 'lastmonth', label: 'Last month' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

export const getPeriodLabel = (period, periodFrom = '', periodTo = '') => {
  if (period === 'custom') {
    const from = periodFrom ? formatDate(periodFrom) : ''
    const to = periodTo ? formatDate(periodTo) : ''
    return from && to ? `Custom range: ${from} - ${to}` : 'Custom range'
  }

  return PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'All time'
}

export const ALL_EXTINGUISHERS_DEMO_ROWS = [
  {
    id: 'fe-ado-001',
    zone: 'Zone 1',
    location: 'Manjung Hub',
    subLocation: 'Reception',
    idLocNo: 'ADO-001',
    feType: 'DP 6KG',
    barcodeNo: 'EE042021Y544896',
    certificationValidity: '2026-07-01',
    daysLeft: -6,
    latestInspectionAt: '2026-07-07T11:31:00+08:00',
    inspectedBy: 'Jang',
    physical: 'Good',
    signage: 'Good',
    boxKey: 'N/A',
    boxGlass: 'N/A',
    operational: 'Good',
    remarks: '',
    issueCount: 0,
    duplicateCount: 1,
    latestReportId: 'INS-01-772026',
  },
  {
    id: 'fe-ado-002',
    zone: 'Zone 1',
    location: 'Manjung Hub',
    subLocation: 'Infront Auditorium',
    idLocNo: 'ADO-002',
    feType: 'DP 6KG',
    barcodeNo: 'EE042021Y544839',
    certificationValidity: '2026-07-27',
    daysLeft: 20,
    latestInspectionAt: '2026-07-07T12:05:00+08:00',
    inspectedBy: 'Ali',
    physical: 'Good',
    signage: 'Good',
    boxKey: 'N/A',
    boxGlass: 'N/A',
    operational: 'Not Good',
    remarks: 'Operational condition reported not good.',
    issueCount: 1,
    duplicateCount: 2,
    latestReportId: 'INS-02-772026',
    historyRecords: [
      {
        reportId: 202,
        displayId: 'INS-02-772026',
        submittedAt: '2026-07-07T12:05:00+08:00',
        submittedBy: 'Ali',
        issueCount: 1,
        evidenceCount: 1,
        status: 'issues',
        checks: [
          { key: 'physical', label: 'FE Physical Condition', value: 'Good', hasDefect: false },
          { key: 'signage', label: 'FE Signage Condition', value: 'Good', hasDefect: false },
          { key: 'boxKey', label: 'FE Box Key Availability', value: 'N/A', hasDefect: false },
          { key: 'boxGlass', label: 'FE Box Glass Availability', value: 'N/A', hasDefect: false },
          {
            key: 'operational',
            label: 'Operational Condition',
            value: 'Not Good',
            hasDefect: true,
            remarks: 'Operational condition reported not good.',
            evidenceCount: 1,
            photos: [
              {
                id: 'ado-002-operational-photo',
                fileName: 'ado-002-operational.jpg',
                description: 'Operational condition evidence.',
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
              },
            ],
          },
        ],
      },
      {
        reportId: 201,
        displayId: 'INS-02-762026',
        submittedAt: '2026-07-06T15:10:00+08:00',
        submittedBy: 'Jang',
        issueCount: 0,
        evidenceCount: 0,
        status: 'checked',
        checks: [
          { key: 'physical', label: 'FE Physical Condition', value: 'Good', hasDefect: false },
          { key: 'signage', label: 'FE Signage Condition', value: 'Good', hasDefect: false },
          { key: 'boxKey', label: 'FE Box Key Availability', value: 'N/A', hasDefect: false },
          { key: 'boxGlass', label: 'FE Box Glass Availability', value: 'N/A', hasDefect: false },
          { key: 'operational', label: 'Operational Condition', value: 'Good', hasDefect: false },
        ],
      },
    ],
  },
  {
    id: 'fe-ado-015',
    zone: 'Zone 1',
    location: 'Manjung Hub',
    subLocation: 'Admin',
    idLocNo: 'ADO-015',
    feType: 'DP 6KG',
    barcodeNo: 'SR092020Y148252',
    certificationValidity: '2026-09-15',
    daysLeft: 70,
    latestInspectionAt: '2026-07-03T09:20:00+08:00',
    inspectedBy: 'Siti',
    physical: 'Good',
    signage: 'Good',
    boxKey: 'Yes',
    boxGlass: 'Yes',
    operational: 'Good',
    remarks: '',
    issueCount: 0,
    duplicateCount: 1,
    latestReportId: 'INS-11-772026',
  },
  {
    id: 'fe-sw-001',
    zone: 'Zone 2',
    location: 'Main Sub Station',
    subLocation: 'Switchgear Room',
    idLocNo: 'SW-001',
    feType: 'CO2 5KG',
    barcodeNo: 'SR032015Z102794',
    certificationValidity: '2026-07-18',
    daysLeft: 11,
    latestInspectionAt: '',
    inspectedBy: '',
    physical: '',
    signage: '',
    boxKey: '',
    boxGlass: '',
    operational: '',
    remarks: '',
    issueCount: 0,
    duplicateCount: 0,
    latestReportId: '',
  },
  {
    id: 'fe-pw-001',
    zone: 'Zone 2',
    location: 'Potable Water Pump House',
    subLocation: 'Potable Water Pump House',
    idLocNo: 'PW-001',
    feType: 'DP 9KG',
    barcodeNo: 'SR072024Y171020',
    certificationValidity: '2026-11-29',
    daysLeft: 145,
    latestInspectionAt: '2026-07-06T16:10:00+08:00',
    inspectedBy: 'Jang',
    physical: 'Good',
    signage: 'Good',
    boxKey: 'Yes',
    boxGlass: 'Yes',
    operational: 'Good',
    remarks: '',
    issueCount: 0,
    duplicateCount: 1,
    latestReportId: 'INS-15-772026',
  },
  {
    id: 'fe-qaqc-001',
    zone: 'Yard',
    location: 'QA Yard',
    subLocation: 'Pump Bay',
    idLocNo: 'QA-001',
    feType: 'DP 6KG',
    barcodeNo: 'BAR-QA-001',
    certificationValidity: '2026-12-31',
    daysLeft: 177,
    latestInspectionAt: '',
    inspectedBy: '',
    physical: '',
    signage: '',
    boxKey: '',
    boxGlass: '',
    operational: '',
    remarks: '',
    issueCount: 0,
    duplicateCount: 0,
    latestReportId: '',
  },
]

const text = (value) => String(value || '').trim()

const toTime = (value) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

const getZoneSortValue = (zone = '') => {
  const normalized = text(zone)
  const match = normalized.match(/^zone\s+(\d+)/i)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

const formatDate = (value) => {
  return formatLocalDate(value, '--')
}

const formatDateTime = (value) => {
  if (!value) return 'Not inspected'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${parsed.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const getReportCount = (row = {}) => Number(row.reportCount ?? row.duplicateCount ?? 0) || 0
const getBarcodeDuplicateCount = (row = {}) =>
  Number(row.barcodeDuplicateCount ?? row.locatorDuplicateCount ?? 0) || 0
const getIdLocNoDuplicateCount = (row = {}) => Number(row.idLocNoDuplicateCount ?? 0) || 0

const getOpenIssueCount = (row = {}) =>
  Number(row.openIssueCount ?? row.open_issue_count ?? row.issueCount ?? 0) || 0

const getInspectionStatus = (row) => {
  if (!row.latestInspectionAt) return 'not-inspected'
  if (getOpenIssueCount(row) > 0) return 'issues'
  if (getReportCount(row) > 1) return 'duplicates'
  return 'inspected'
}

const getCertificationStatus = (row) => {
  const days = Number(row.daysLeft)
  if (Number.isNaN(days)) return 'unknown'
  if (days < 0) return 'expired'
  if (days <= 20) return 'expiring'
  return 'valid'
}

const statusLabel = {
  inspected: 'Inspected',
  'not-inspected': 'Not inspected',
  issues: 'Issue',
  duplicates: 'Multiple reports',
}

const badgeTone = {
  good: 'success',
  yes: 'success',
  inspected: 'success',
  valid: 'success',
  'not good': 'danger',
  no: 'danger',
  issues: 'danger',
  expired: 'danger',
  duplicates: 'warning',
  expiring: 'warning',
  'not-inspected': 'secondary',
  unknown: 'secondary',
  active: 'success',
  out_of_service: 'warning',
  retired: 'secondary',
}

const StatusBadge = ({ value, label }) => {
  const normalized = text(value).toLowerCase()
  const display = text(label || value) || '--'
  return (
    <CBadge color={badgeTone[normalized] || 'secondary'} className="fw-semibold">
      {display}
    </CBadge>
  )
}

const SummaryItem = ({ label, value, tone = 'body', onClick, isActive = false }) => {
  const itemClass = `all-extinguishers-summary-item${
    onClick ? ' all-extinguishers-summary-item--clickable' : ''
  }${isActive ? ' all-extinguishers-summary-item--active' : ''}`

  if (!onClick) {
    return (
      <span className={itemClass}>
        <span className="all-extinguishers-summary-label">{label}</span>
        <span className={`all-extinguishers-summary-value text-${tone}`}>{value}</span>
      </span>
    )
  }

  return (
    <button type="button" className={itemClass} onClick={onClick} aria-pressed={isActive}>
      <span className="all-extinguishers-summary-label">{label}</span>
      <span className={`all-extinguishers-summary-value text-${tone}`}>{value}</span>
    </button>
  )
}

const buildOptions = (rows, key, allLabel) => [
  { value: ALL_ROWS_VALUE, label: allLabel },
  ...Array.from(new Set(rows.map((row) => text(row[key])).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((value) => ({ value, label: value })),
]

const buildStaticOptions = (values = [], allLabel) => [
  { value: ALL_ROWS_VALUE, label: allLabel },
  ...(Array.isArray(values) ? values : [])
    .map(text)
    .filter(Boolean)
    .map((value) => ({ value, label: value })),
]

const filterRows = ({
  rows,
  search,
  zoneFilter,
  locationFilter,
  inspectedByFilter,
  statusFilter,
  issueFilter,
  certificationFilter,
  duplicateScope,
  lifecycleFilter,
}) => {
  const query = text(search).toLowerCase()

  return rows.filter((row) => {
    const inspectionStatus = getInspectionStatus(row)
    const certificationStatus = getCertificationStatus(row)
    const searchable = [
      row.zone,
      row.location,
      row.subLocation,
      row.idLocNo,
      row.feType,
      row.barcodeNo,
      row.inspectedBy,
      row.latestReportId,
      row.remarks,
    ]
      .join(' ')
      .toLowerCase()

    if (query && !searchable.includes(query)) return false
    if (zoneFilter !== ALL_ROWS_VALUE && row.zone !== zoneFilter) return false
    if (locationFilter !== ALL_ROWS_VALUE && row.location !== locationFilter) return false
    if (inspectedByFilter !== ALL_ROWS_VALUE && row.inspectedBy !== inspectedByFilter) return false
    if (statusFilter !== ALL_ROWS_VALUE && inspectionStatus !== statusFilter) return false
    if ((duplicateScope === 'report' || duplicateScope === 'reports') && getReportCount(row) <= 1) {
      return false
    }
    if (issueFilter === 'with-issues' && getOpenIssueCount(row) <= 0) return false
    if (issueFilter === 'no-issues' && getOpenIssueCount(row) > 0) return false
    if (certificationFilter !== ALL_ROWS_VALUE && certificationStatus !== certificationFilter) {
      return false
    }
    if (
      lifecycleFilter !== ALL_ROWS_VALUE &&
      (row.lifecycleStatus || 'active') !== lifecycleFilter
    ) {
      return false
    }
    if (duplicateScope === 'locator' && getBarcodeDuplicateCount(row) <= 1) {
      return false
    }
    if (duplicateScope === 'id-loc' && getIdLocNoDuplicateCount(row) <= 1) {
      return false
    }
    return true
  })
}

const sortRows = (rows, sort) => {
  const next = [...rows]
  if (sort === 'latest') {
    return next.sort((a, b) => toTime(b.latestInspectionAt) - toTime(a.latestInspectionAt))
  }
  if (sort === 'days-left') {
    return next.sort((a, b) => Number(a.daysLeft || 0) - Number(b.daysLeft || 0))
  }
  if (sort === 'issues') {
    return next.sort((a, b) => getOpenIssueCount(b) - getOpenIssueCount(a))
  }
  if (sort === 'duplicates') {
    return next.sort((a, b) => getReportCount(b) - getReportCount(a))
  }
  if (sort === 'locator-duplicates') {
    return next.sort((a, b) => getBarcodeDuplicateCount(b) - getBarcodeDuplicateCount(a))
  }
  if (sort === 'id-loc-duplicates') {
    return next.sort((a, b) => getIdLocNoDuplicateCount(b) - getIdLocNoDuplicateCount(a))
  }
  return next.sort((a, b) => {
    const zoneDiff = getZoneSortValue(a.zone) - getZoneSortValue(b.zone)
    if (zoneDiff !== 0) return zoneDiff
    return [a.zone, a.location, a.subLocation, a.idLocNo]
      .join(' ')
      .localeCompare([b.zone, b.location, b.subLocation, b.idLocNo].join(' '), undefined, {
        numeric: true,
      })
  })
}

const getSummary = (rows) => ({
  total: rows.length,
  inspected: rows.filter((row) => row.latestInspectionAt).length,
  notInspected: rows.filter((row) => !row.latestInspectionAt).length,
  issues: rows.filter((row) => getOpenIssueCount(row) > 0).length,
  duplicates: rows.filter((row) => getReportCount(row) > 1).length,
  barcodeDuplicates: rows.filter((row) => getBarcodeDuplicateCount(row) > 1).length,
  idLocNoDuplicates: rows.filter((row) => getIdLocNoDuplicateCount(row) > 1).length,
  expired: rows.filter((row) => getCertificationStatus(row) === 'expired').length,
})

const getLifecycleSummary = (rows) => ({
  all: rows.length,
  active: rows.filter((row) => (row.lifecycleStatus || 'active') === 'active').length,
  outOfService: rows.filter((row) => row.lifecycleStatus === 'out_of_service').length,
  retired: rows.filter((row) => row.lifecycleStatus === 'retired').length,
})

const nowrapCellClass = 'all-extinguishers-table__nowrap'
const textCellClass = 'all-extinguishers-table__text-cell'
const centeredCellClass = `text-center ${nowrapCellClass}`
const indexColumnStyle = { width: '56px', minWidth: '56px' }

const lifecycleStatusLabel = {
  active: 'Active',
  out_of_service: 'Out of service',
  retired: 'Retired',
}

const isInteractiveRowTarget = (target) =>
  Boolean(
    target?.closest?.('a, button, input, select, textarea, [role="button"], [role="menuitem"]'),
  )

const AllExtinguishersTable = ({
  visibleRows,
  onViewDetails,
  onEditAsset,
  onLifecycleAction,
  canManageCatalog,
}) => (
  <div className="all-extinguishers-table-frame d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
    <CTable align="middle" className="all-extinguishers-table mb-0" hover responsive>
      <CTableHead color="light">
        <CTableRow>
          <CTableHeaderCell className="text-center" style={indexColumnStyle}>
            #
          </CTableHeaderCell>
          <CTableHeaderCell>Zone</CTableHeaderCell>
          <CTableHeaderCell>Location</CTableHeaderCell>
          <CTableHeaderCell>ID Loc. No.</CTableHeaderCell>
          <CTableHeaderCell>Sub-location</CTableHeaderCell>
          <CTableHeaderCell>FE Type</CTableHeaderCell>
          <CTableHeaderCell>Lifecycle</CTableHeaderCell>
          <CTableHeaderCell>Barcode</CTableHeaderCell>
          <CTableHeaderCell>Certification Validity</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Physical</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Signage</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Box Key</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Box Glass</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Operational</CTableHeaderCell>
          <CTableHeaderCell>Last Inspected By</CTableHeaderCell>
          <CTableHeaderCell>Last Inspected Date</CTableHeaderCell>
          <CTableHeaderCell>Monthly Status</CTableHeaderCell>
          <CTableHeaderCell>Remarks</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Days Left</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Issues</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Reports</CTableHeaderCell>
          <CTableHeaderCell
            className="all-extinguishers-table__sticky-action-cell text-center"
            aria-label="Actions"
          />
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {visibleRows.map((row, index) => {
          const certificationStatus = getCertificationStatus(row)
          return (
            <CTableRow
              key={row.id || row.catalogId}
              className="all-extinguishers-table__row all-extinguishers-table__row--interactive"
              onClick={(event) => {
                if (!isInteractiveRowTarget(event.target)) onViewDetails(row)
              }}
            >
              <CTableDataCell
                className={`text-body-secondary ${centeredCellClass}`}
                style={indexColumnStyle}
              >
                {index + 1}
              </CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>{row.zone}</CTableDataCell>
              <CTableDataCell className={textCellClass}>{row.location}</CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>
                <a
                  href={`/inspection/all-extinguishers/${encodeURIComponent(row.catalogId || row.id)}`}
                  className="all-extinguishers-table__detail-trigger fw-semibold text-start"
                  onClick={(event) => {
                    if (
                      event.button === 0 &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault()
                      onViewDetails(row)
                    }
                  }}
                  aria-label={`View details for ${row.idLocNo || row.barcodeNo || 'fire extinguisher'}`}
                >
                  {row.idLocNo || row.barcodeNo || 'View details'}
                </a>
              </CTableDataCell>
              <CTableDataCell className={textCellClass}>{row.subLocation}</CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>{row.feType}</CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>
                <StatusBadge
                  value={row.lifecycleStatus || 'active'}
                  label={
                    lifecycleStatusLabel[row.lifecycleStatus || 'active'] || row.lifecycleStatus
                  }
                />
              </CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>{row.barcodeNo || '--'}</CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>
                {formatDate(row.certificationValidity)}
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge value={row.physical || 'not-inspected'} label={row.physical || '--'} />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge value={row.signage || 'not-inspected'} label={row.signage || '--'} />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge value={row.boxKey || 'not-inspected'} label={row.boxKey || '--'} />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge value={row.boxGlass || 'not-inspected'} label={row.boxGlass || '--'} />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge
                  value={row.operational || 'not-inspected'}
                  label={row.operational || '--'}
                />
              </CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>{row.inspectedBy || '--'}</CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>
                {formatDateTime(row.latestInspectionAt)}
              </CTableDataCell>
              <CTableDataCell className={nowrapCellClass}>
                <FireExtinguisherMonthlyComplianceStatus compliance={row.monthlyCompliance} />
              </CTableDataCell>
              <CTableDataCell className={textCellClass}>{row.remarks || '--'}</CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge
                  value={certificationStatus}
                  label={
                    certificationStatus === 'expired'
                      ? `${Math.abs(Number(row.daysLeft))} days expired`
                      : `${row.daysLeft} days`
                  }
                />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge
                  value={getOpenIssueCount(row) > 0 ? 'issues' : 'good'}
                  label={`${getOpenIssueCount(row)} open`}
                />
              </CTableDataCell>
              <CTableDataCell className={centeredCellClass}>
                <StatusBadge
                  value={getReportCount(row) > 1 ? 'duplicates' : 'good'}
                  label={`${getReportCount(row)} report${getReportCount(row) === 1 ? '' : 's'}`}
                />
              </CTableDataCell>
              <RowActionCell className="all-extinguishers-table__action-cell all-extinguishers-table__sticky-action-cell text-center align-top">
                <RowActions
                  hitArea={36}
                  items={[
                    {
                      key: 'view',
                      label: 'View details',
                      onClick: (event) => {
                        event?.stopPropagation?.()
                        onViewDetails(row)
                      },
                    },
                    ...buildFireExtinguisherLifecycleMenuItems({
                      asset: row,
                      canManage: canManageCatalog,
                      onEdit: onEditAsset,
                      onLifecycleAction,
                    }),
                  ]}
                  toggleAriaLabel={`Extinguisher actions for ${row.idLocNo}`}
                />
              </RowActionCell>
            </CTableRow>
          )
        })}
      </CTableBody>
    </CTable>
  </div>
)

const buildMobileSections = (
  rows,
  onViewDetails,
  onEditAsset,
  onLifecycleAction,
  canManageCatalog,
) => [
  {
    key: 'all-extinguishers',
    label: 'All Extinguishers',
    summary: `${rows.length} shown`,
    items: rows.map((row) => {
      const certificationStatus = getCertificationStatus(row)
      return {
        key: row.id || row.catalogId,
        title: row.idLocNo,
        subtitle: `${row.zone} > ${row.location} > ${row.subLocation}`,
        eyebrow: row.feType,
        status: <FireExtinguisherMonthlyComplianceStatus compliance={row.monthlyCompliance} />,
        fields: [
          {
            key: 'lifecycle',
            label: 'Lifecycle',
            value: lifecycleStatusLabel[row.lifecycleStatus || 'active'] || row.lifecycleStatus,
          },
          {
            key: 'monthly-status',
            label: row.monthlyCompliance?.cycleLabel
              ? `${row.monthlyCompliance.cycleLabel} status`
              : 'Monthly status',
            value: <FireExtinguisherMonthlyComplianceStatus compliance={row.monthlyCompliance} />,
          },
          {
            key: 'latest',
            label: 'Last inspected date',
            value: formatDateTime(row.latestInspectionAt),
          },
          { key: 'inspector', label: 'Last inspected by', value: row.inspectedBy || '--' },
          {
            key: 'issues',
            label: 'Issues',
            value: `${getOpenIssueCount(row)} open`,
          },
          {
            key: 'reports',
            label: 'Reports',
            value: `${getReportCount(row)} in period`,
          },
          {
            key: 'certification',
            label: 'Certification',
            value:
              certificationStatus === 'expired'
                ? `${Math.abs(Number(row.daysLeft))} days expired`
                : `${row.daysLeft} days left`,
          },
        ],
        actions: (
          <RowActions
            hitArea={44}
            items={[
              {
                key: 'view',
                label: 'View details',
                onClick: () => onViewDetails(row),
              },
              ...buildFireExtinguisherLifecycleMenuItems({
                asset: row,
                canManage: canManageCatalog,
                onEdit: onEditAsset,
                onLifecycleAction,
              }),
            ]}
            toggleAriaLabel={`Extinguisher actions for ${row.idLocNo}`}
          />
        ),
      }
    }),
  },
]

const detailIdentity = (row = {}) => {
  const detail = row || {}
  return [detail.zone, detail.location || detail.mainLocation, detail.subLocation]
    .filter(Boolean)
    .join(' > ')
}

const CHECK_FIELDS = [
  { key: 'physical', label: 'FE Physical Condition', rowKey: 'physical' },
  { key: 'signage', label: 'FE Signage Condition', rowKey: 'signage' },
  { key: 'boxKey', label: 'FE Box Key Availability', rowKey: 'boxKey' },
  { key: 'boxGlass', label: 'FE Box Glass Availability', rowKey: 'boxGlass' },
  { key: 'operational', label: 'Operational Condition', rowKey: 'operational' },
]

const isDefectValue = (value) =>
  ['not good', 'no', 'defect', 'missing'].includes(text(value).toLowerCase())

const parseBooleanFlag = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  const normalized = text(value).toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false

  return null
}

const checksFromCoverageRow = (row = {}) =>
  CHECK_FIELDS.map((field) => {
    const value = text(row[field.rowKey])
    const hasDefect = isDefectValue(value)
    return {
      key: field.key,
      label: field.label,
      value,
      hasDefect,
      remarks: hasDefect ? text(row.remarks) : '',
      evidenceCount: 0,
      photos: [],
    }
  })

const normalizeChecks = (checks = [], fallbackRow = {}) => {
  const normalized = (Array.isArray(checks) ? checks : []).map((check) => {
    const value = text(check.value)
    const photos = Array.isArray(check.photos) ? check.photos : []
    const explicitDefect = parseBooleanFlag(check.hasDefect ?? check.has_defect)
    const evidenceCount = Number(check.evidenceCount ?? check.evidence_count ?? photos.length) || 0

    return {
      key: check.key || check.checkKey || check.check_key || check.label,
      label: check.label || check.checkName || check.check_name || 'Inspection criterion',
      value,
      hasDefect: explicitDefect ?? isDefectValue(value),
      remarks: text(check.remarks),
      evidenceCount: Math.max(evidenceCount, photos.length),
      photos,
    }
  })

  return normalized.length > 0 ? normalized : checksFromCoverageRow(fallbackRow)
}

const countEvidence = (checks = []) =>
  checks.reduce((total, check) => total + (Number(check.evidenceCount || 0) || 0), 0)

const formatHistoryDisplayId = (reportId) => {
  const normalized = text(reportId)
  if (!normalized) return ''
  return /^ins[-_]/i.test(normalized) ? normalized : `Report ${normalized}`
}

const buildLatestHistoryRecord = (detail = {}) => {
  if (!detail.latestInspectionAt && !detail.latestReportId) return null

  const checks = normalizeChecks(detail.checks, detail)
  const issueCount =
    Number(detail.issueCount || 0) || checks.filter((check) => Boolean(check.hasDefect)).length
  const evidenceCount = Number(detail.evidenceCount || 0) || countEvidence(checks)

  return {
    reportId: detail.latestReportId || 'latest',
    displayId: detail.latestReportId || 'Latest inspection',
    submittedAt: detail.latestInspectionAt,
    submittedBy: detail.inspectedBy || '',
    issueCount,
    evidenceCount,
    status: issueCount > 0 ? 'issues' : 'checked',
    checks,
  }
}

const normalizeHistoryRecords = (detail = {}) => {
  if (Array.isArray(detail.historyRecords) && detail.historyRecords.length > 0) {
    return detail.historyRecords
      .map((record) => {
        const reportId =
          record.reportId ||
          record.report_id ||
          record.displayId ||
          record.display_id ||
          record.submittedAt
        const checks = normalizeChecks(record.checks, detail)
        const issueCount =
          Number(record.issueCount || 0) || checks.filter((check) => check.hasDefect).length
        const evidenceCount = Number(record.evidenceCount || 0) || countEvidence(checks)
        return {
          ...record,
          reportId,
          displayId: record.displayId || record.display_id || formatHistoryDisplayId(reportId),
          submittedAt: record.submittedAt || record.submitted_at || '',
          submittedBy: record.submittedBy || record.submitted_by || '',
          issueCount,
          evidenceCount,
          status: record.status || (issueCount > 0 ? 'issues' : 'checked'),
          checks,
        }
      })
      .sort((a, b) => toTime(b.submittedAt) - toTime(a.submittedAt))
  }

  const latestRecord = buildLatestHistoryRecord(detail)
  const latestDisplayId = text(latestRecord?.displayId)
  const duplicateRecords = (Array.isArray(detail.duplicateReports) ? detail.duplicateReports : [])
    .map((report) => {
      const rawReportId = report.reportId || report.report_id || ''
      const displayId = report.displayId || report.display_id || formatHistoryDisplayId(rawReportId)
      const isLatest =
        latestRecord &&
        (text(displayId) === latestDisplayId ||
          text(report.submittedAt) === text(latestRecord.submittedAt))

      return isLatest
        ? latestRecord
        : {
            reportId: rawReportId || displayId || report.submittedAt || report.submitted_at,
            displayId,
            submittedAt: report.submittedAt || report.submitted_at || '',
            submittedBy: report.submittedBy || report.submitted_by || '',
            issueCount: 0,
            evidenceCount: 0,
            status: 'checked',
            checks: [],
            detailUnavailable: true,
          }
    })
    .filter(Boolean)

  const records =
    duplicateRecords.length > 0 ? duplicateRecords : latestRecord ? [latestRecord] : []
  const seen = new Set()

  return records
    .filter((record) => {
      const key = `${record.displayId || record.reportId}-${record.submittedAt || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => toTime(b.submittedAt) - toTime(a.submittedAt))
}

const buildHistoricalIssueRows = (records = []) =>
  records.flatMap((record) =>
    normalizeChecks(record.checks, {}).flatMap((check) =>
      check.hasDefect
        ? [
            {
              key: `${record.displayId || record.reportId}-${record.submittedAt}-${check.key}`,
              reportId: record.displayId || record.reportId || '--',
              inspectedAt: record.submittedAt,
              inspectedBy: record.submittedBy,
              label: check.label,
              value: check.value,
              remarks: check.remarks,
              evidenceCount: check.evidenceCount,
              photos: check.photos,
              record,
            },
          ]
        : [],
    ),
  )

const getRecordCheck = (record, key) =>
  normalizeChecks(record.checks, {}).find((check) => check.key === key) || null

const CriteriaStatusCell = ({ record, checkKey, detail, onViewPhotos }) => {
  const check = getRecordCheck(record, checkKey)
  const value = check?.value || '--'
  const photos = Array.isArray(check?.photos) ? check.photos : []
  const hasRemarks = text(check?.remarks) !== ''
  const hasPhotos = photos.length > 0

  return (
    <div className="all-extinguishers-history-criteria-cell">
      <StatusBadge value={check?.hasDefect ? 'issues' : value} label={value} />
      {hasRemarks || hasPhotos ? (
        <div className="all-extinguishers-history-criteria-cell__meta">
          {hasRemarks ? (
            <span
              className="all-extinguishers-history-criteria-cell__remark"
              title={check.remarks}
              aria-label={`${check.label} has remark`}
            >
              <MessageSquare size={13} aria-hidden="true" />
              Remark
            </span>
          ) : null}
          {hasPhotos ? (
            <CButton
              type="button"
              color="link"
              className="all-extinguishers-history-criteria-cell__photo"
              onClick={() =>
                onViewPhotos?.({
                  title: `${detail.idLocNo || detail.barcodeNo || 'Fire extinguisher'} - ${
                    record.displayId || record.reportId || 'historical record'
                  } - ${check.label} photos`,
                  photos,
                  readOnly: true,
                  showDescriptionInput: false,
                })
              }
              aria-label={`View ${check.label} photos from ${record.displayId || record.reportId}`}
            >
              <Camera size={13} aria-hidden="true" />
              {photos.length}
            </CButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const HistoricalIssueList = ({
  issueRows,
  detail,
  onSelectRecord,
  onViewPhotos,
  showMobileCards = false,
}) => (
  <section className="d-grid gap-2">
    <div className="fw-semibold">Issues in inspection history</div>
    {showMobileCards ? (
      <div className="all-extinguishers-history-cards d-grid d-md-none gap-2">
        {issueRows.length > 0 ? (
          issueRows.map((issue) => (
            <article key={`mobile-${issue.key}`} className="rounded-3 border p-3 d-grid gap-2">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <CButton
                  type="button"
                  color="link"
                  className="p-0 fw-semibold text-start"
                  onClick={() => onSelectRecord?.(issue.record)}
                >
                  {issue.reportId}
                </CButton>
                <StatusBadge value="issues" label={issue.value || 'Issue'} />
              </div>
              <div className="small text-body-secondary">{formatDateTime(issue.inspectedAt)}</div>
              <div>
                <div className="fw-semibold">{issue.label}</div>
                {issue.remarks ? <div className="small mt-1">{issue.remarks}</div> : null}
              </div>
              {Array.isArray(issue.photos) && issue.photos.length > 0 ? (
                <EvidencePhotoGallery
                  photos={issue.photos}
                  title={`${issue.label} photos`}
                  contextLabel={`${issue.label} evidence`}
                  hiddenDescriptionValues={[issue.remarks, issue.label]}
                />
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-3 border p-3 text-body-secondary">
            No historical issues found for the selected period.
          </div>
        )}
      </div>
    ) : null}
    <div
      className={`all-extinguishers-history-list all-extinguishers-history-list--issues${
        showMobileCards ? ' d-none d-md-block' : ''
      }`}
    >
      <CTable small responsive className="mb-0">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Report ID</CTableHeaderCell>
            <CTableHeaderCell>Inspected Date</CTableHeaderCell>
            <CTableHeaderCell>Issue</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Evidence</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {issueRows.length > 0 ? (
            issueRows.map((issue) => (
              <CTableRow key={issue.key}>
                <CTableDataCell>
                  {issue.record ? (
                    <CButton
                      type="button"
                      color="link"
                      className="p-0 fw-semibold text-start"
                      onClick={() => onSelectRecord?.(issue.record)}
                      aria-label={`View ${issue.reportId} details for ${issue.label}`}
                    >
                      {issue.reportId}
                    </CButton>
                  ) : (
                    <span className="fw-semibold">{issue.reportId}</span>
                  )}
                </CTableDataCell>
                <CTableDataCell>{formatDateTime(issue.inspectedAt)}</CTableDataCell>
                <CTableDataCell>
                  <div className="fw-semibold">{issue.label}</div>
                  {issue.remarks ? (
                    <div className="small text-body-secondary mt-1">{issue.remarks}</div>
                  ) : null}
                </CTableDataCell>
                <CTableDataCell>
                  <StatusBadge value="issues" label={issue.value || 'Issue'} />
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  {Array.isArray(issue.photos) && issue.photos.length > 0 ? (
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="inspection-compact-action-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        onViewPhotos?.({
                          title: `${detail.idLocNo || detail.barcodeNo || 'Fire extinguisher'} - ${
                            issue.label
                          } photos`,
                          photos: issue.photos,
                          readOnly: true,
                          showDescriptionInput: false,
                        })
                      }}
                    >
                      {issue.evidenceCount} photo{issue.evidenceCount === 1 ? '' : 's'}
                    </CButton>
                  ) : (
                    issue.evidenceCount
                  )}
                </CTableDataCell>
              </CTableRow>
            ))
          ) : (
            <CTableRow>
              <CTableDataCell
                colSpan={5}
                className="all-extinguishers-history-list__empty text-body-secondary"
              >
                No historical issues found for the selected period.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  </section>
)

const HistoricalRecordList = ({
  records,
  detail,
  periodLabel,
  onSelectRecord,
  onViewPhotos,
  showMobileCards = false,
}) => (
  <section className="d-grid gap-2">
    <div className="fw-semibold">
      Inspection history
      {periodLabel ? <span className="fw-normal text-body-secondary"> · {periodLabel}</span> : null}
    </div>
    {showMobileCards ? (
      <div className="all-extinguishers-history-cards d-grid d-md-none gap-2">
        {records.length > 0 ? (
          records.map((record) => (
            <article
              key={`mobile-${record.displayId || record.reportId}-${record.submittedAt}`}
              className="rounded-3 border p-3 d-grid gap-3"
            >
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div>
                  <div className="fw-semibold">{record.displayId || '--'}</div>
                  <div className="small text-body-secondary">
                    {formatDateTime(record.submittedAt)}
                  </div>
                  <div className="small text-body-secondary">
                    Inspected by {record.submittedBy || '--'}
                  </div>
                </div>
                {records.length > 1 ? <CBadge color="warning">Repeat check</CBadge> : null}
              </div>
              <div className="all-extinguishers-history-card__criteria d-grid gap-2">
                {CHECK_FIELDS.map((field) => (
                  <div
                    key={`${record.reportId}-${field.key}`}
                    className="d-flex align-items-center justify-content-between gap-2"
                  >
                    <span className="small text-body-secondary">{field.label}</span>
                    <CriteriaStatusCell
                      record={record}
                      checkKey={field.key}
                      detail={detail}
                      onViewPhotos={onViewPhotos}
                    />
                  </div>
                ))}
              </div>
              <div className="d-flex align-items-center justify-content-between gap-2">
                <span className="small text-body-secondary">
                  {record.issueCount} issues · {record.evidenceCount} evidence
                </span>
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectRecord(record)}
                >
                  View record
                </CButton>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3 border p-3 text-body-secondary">
            No inspection records found for the selected period.
          </div>
        )}
      </div>
    ) : null}
    <div
      className={`all-extinguishers-history-list all-extinguishers-history-list--records${
        showMobileCards ? ' d-none d-md-block' : ''
      }`}
    >
      <CTable small responsive className="mb-0">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Report ID</CTableHeaderCell>
            <CTableHeaderCell>Inspected Date</CTableHeaderCell>
            <CTableHeaderCell>Last Inspected By</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Physical</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Signage</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Box Key</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Box Glass</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Operational</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Issues</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Evidence</CTableHeaderCell>
            <CTableHeaderCell className="text-end">View</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {records.length > 0 ? (
            records.map((record) => (
              <CTableRow key={`${record.displayId || record.reportId}-${record.submittedAt}`}>
                <CTableDataCell className="fw-semibold">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span>{record.displayId || '--'}</span>
                    {records.length > 1 ? (
                      <CBadge color="warning" className="fw-semibold">
                        Repeat check
                      </CBadge>
                    ) : null}
                  </div>
                </CTableDataCell>
                <CTableDataCell>{formatDateTime(record.submittedAt)}</CTableDataCell>
                <CTableDataCell>{record.submittedBy || '--'}</CTableDataCell>
                <CTableDataCell className="text-center">
                  <CriteriaStatusCell
                    record={record}
                    checkKey="physical"
                    detail={detail}
                    onViewPhotos={onViewPhotos}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CriteriaStatusCell
                    record={record}
                    checkKey="signage"
                    detail={detail}
                    onViewPhotos={onViewPhotos}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CriteriaStatusCell
                    record={record}
                    checkKey="boxKey"
                    detail={detail}
                    onViewPhotos={onViewPhotos}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CriteriaStatusCell
                    record={record}
                    checkKey="boxGlass"
                    detail={detail}
                    onViewPhotos={onViewPhotos}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CriteriaStatusCell
                    record={record}
                    checkKey="operational"
                    detail={detail}
                    onViewPhotos={onViewPhotos}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">{record.issueCount}</CTableDataCell>
                <CTableDataCell className="text-center">{record.evidenceCount}</CTableDataCell>
                <CTableDataCell className="text-end">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn"
                    onClick={() => onSelectRecord(record)}
                    aria-label={`View ${record.displayId || record.reportId}`}
                  >
                    View
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))
          ) : (
            <CTableRow>
              <CTableDataCell
                colSpan={11}
                className="all-extinguishers-history-list__empty text-body-secondary"
              >
                No inspection records found for the selected period.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  </section>
)

const CriteriaRows = ({ checks }) => (
  <div className="all-extinguishers-detail__criteria">
    {checks.map((check) => (
      <div key={`criteria-${check.key}`} className="all-extinguishers-detail__criteria-row">
        <div className="min-w-0">
          <div>{check.label}</div>
          {check.remarks ? (
            <div className="small text-body-secondary mt-1" style={{ whiteSpace: 'pre-wrap' }}>
              {check.remarks}
            </div>
          ) : null}
          {Array.isArray(check.photos) && check.photos.length > 0 ? (
            <EvidencePhotoGallery
              photos={check.photos}
              title={`${check.label} photos`}
              contextLabel={`${check.label} evidence`}
              hiddenDescriptionValues={[check.remarks, check.label]}
              className="mt-2"
            />
          ) : null}
        </div>
        <StatusBadge
          value={check.hasDefect ? 'issues' : check.value || 'not-inspected'}
          label={check.value || '--'}
        />
      </div>
    ))}
  </div>
)

const HistoricalRecordDetail = ({ detail, record }) => {
  if (!record) return null
  const checks = normalizeChecks(record.checks, detail)

  return (
    <div className="all-extinguishers-detail d-grid gap-3">
      <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-1">
        <div className="fw-semibold">{record.displayId || `Report ${record.reportId}`}</div>
        <div className="text-body-secondary">
          Inspected date: {formatDateTime(record.submittedAt)}
        </div>
        <div className="text-body-secondary">Last inspected by: {record.submittedBy || '--'}</div>
        <div className="text-body-secondary">{detailIdentity(detail) || '--'}</div>
      </div>

      {record.detailUnavailable ? (
        <CAlert color="info" className="mb-0">
          Detailed criteria aren&apos;t available for this historical report.
        </CAlert>
      ) : null}

      <section className="d-grid gap-2">
        <div className="fw-semibold">Inspection criteria</div>
        {checks.length > 0 ? (
          <CriteriaRows checks={checks} />
        ) : (
          <div className="rounded-3 border p-3 text-body-secondary">
            No criterion details are available for this historical record.
          </div>
        )}
      </section>
    </div>
  )
}

const CoverageOverview = ({
  detail,
  historyRecords,
  historyMeta,
  isLoadingHistory,
  historyError,
  onHistoryPageChange,
  pageLayout = false,
  periodLabel,
  onSelectHistoryRecord,
  onViewPhotos,
  currentUser,
  canManageCatalog,
  canManageIssues,
  canVerifyIssues,
  onAssetChanged,
}) => {
  const latestHistoryRecord = detail.latestHistoryRecord || historyRecords[0] || null
  const hasDirectChecks = Array.isArray(detail.checks) && detail.checks.length > 0
  const checks =
    hasDirectChecks || !latestHistoryRecord?.checks?.length
      ? normalizeChecks(detail.checks, detail)
      : normalizeChecks(latestHistoryRecord.checks, detail)
  const issueChecks = checks.filter((check) => check.hasDefect)
  const issueCount = Math.max(
    Number((hasDirectChecks ? detail.issueCount : latestHistoryRecord?.issueCount) ?? 0) || 0,
    issueChecks.length,
  )
  const evidenceCount = Math.max(
    Number((hasDirectChecks ? detail.evidenceCount : latestHistoryRecord?.evidenceCount) ?? 0) || 0,
    countEvidence(checks),
  )
  const latestInspectionAt = latestHistoryRecord?.submittedAt || detail.latestInspectionAt
  const latestInspectedBy = latestHistoryRecord?.submittedBy || detail.inspectedBy
  const latestStatus = issueCount > 0 ? 'issues' : getInspectionStatus(detail)
  const hasInspectionData = Boolean(latestInspectionAt || latestHistoryRecord?.submittedAt)
  const historicalIssueRows = buildHistoricalIssueRows(historyRecords)
  const metadataItems = [
    { label: 'FE Type', value: detail.feType || '--' },
    { label: 'Barcode', value: detail.barcodeNo || '--' },
    { label: 'Certification', value: formatDate(detail.certificationValidity) },
  ]

  return (
    <div className="all-extinguishers-detail d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <div className="fw-semibold">
            {detail.monthlyCompliance?.cycleLabel || 'Monthly'} status
          </div>
          <div className="text-body-secondary">
            Last inspected:{' '}
            {latestInspectionAt
              ? `${formatDateTime(latestInspectionAt)}${latestInspectedBy ? ` by ${latestInspectedBy}` : ''}`
              : 'Not inspected'}
          </div>
        </div>
        <FireExtinguisherMonthlyComplianceStatus compliance={detail.monthlyCompliance} />
      </div>

      <div className="all-extinguishers-detail__meta-card">
        {metadataItems.map((item) => (
          <div key={item.label} className="all-extinguishers-detail__meta-item">
            <div className="all-extinguishers-detail__meta-label">{item.label}</div>
            <div className="all-extinguishers-detail__meta-value">{item.value}</div>
          </div>
        ))}
      </div>

      {hasInspectionData ? (
        <>
          <section className="d-grid gap-2">
            <div className="fw-semibold">Latest inspection result</div>
            <div className="rounded-3 border p-3 d-flex flex-wrap align-items-center gap-2">
              <StatusBadge value={latestStatus} label={statusLabel[latestStatus]} />
              <span className="text-body-secondary">
                {issueCount} issue{issueCount === 1 ? '' : 's'}
              </span>
              <span className="text-body-secondary">
                {evidenceCount} evidence item{evidenceCount === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          {issueChecks.length > 0 ? (
            <section className="d-grid gap-2">
              <div className="fw-semibold">Issues recorded ({issueChecks.length})</div>
              <div className="d-grid gap-2">
                {issueChecks.map((check) => (
                  <div key={check.key} className="rounded-3 border p-3 d-grid gap-2">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div className="fw-semibold">{check.label}</div>
                      <StatusBadge value="issues" label={check.value || 'Issue'} />
                    </div>
                    {check.remarks ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{check.remarks}</div>
                    ) : null}
                    {Array.isArray(check.photos) && check.photos.length > 0 ? (
                      <EvidencePhotoGallery
                        photos={check.photos}
                        title={`${check.label} photos`}
                        contextLabel={`${check.label} evidence`}
                        hiddenDescriptionValues={[check.remarks, check.label]}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {historicalIssueRows.length > 0 ? (
        <HistoricalIssueList
          issueRows={historicalIssueRows}
          detail={detail}
          onSelectRecord={onSelectHistoryRecord}
          onViewPhotos={onViewPhotos}
          showMobileCards={pageLayout}
        />
      ) : null}
      {historyRecords.length > 0 ? (
        <HistoricalRecordList
          records={historyRecords}
          detail={detail}
          periodLabel={periodLabel}
          onSelectRecord={onSelectHistoryRecord}
          onViewPhotos={onViewPhotos}
          showMobileCards={pageLayout}
        />
      ) : (
        <section className="d-grid gap-1">
          <div className="fw-semibold">
            Inspection history{' '}
            <span className="fw-normal text-body-secondary">· {periodLabel}</span>
          </div>
          <div className="text-body-secondary">No inspection history for the selected period.</div>
        </section>
      )}
      {historyError ? (
        <CAlert color="danger" className="mb-0 py-2" role="alert">
          {historyError}
        </CAlert>
      ) : null}
      {isLoadingHistory ? (
        <div className="small text-body-secondary" role="status">
          Loading inspection history...
        </div>
      ) : null}
      {Number(historyMeta?.total || 0) > 0 ? (
        <DataTableFooter
          rowsToShow={25}
          showRowsPerPage={false}
          visibleCount={historyRecords.length}
          filteredCount={Number(historyMeta.total)}
          totalCount={Number(historyMeta.total)}
          currentPage={Number(historyMeta.page || 1)}
          lastPage={Number(historyMeta.lastPage || 1)}
          onPageChange={onHistoryPageChange}
          showFilteredFrom={false}
          className="mt-0"
        />
      ) : null}
      <FireExtinguisherManagementPanel
        detail={detail}
        currentUser={currentUser}
        canManageCatalog={canManageCatalog}
        canManageIssues={canManageIssues}
        canVerifyIssues={canVerifyIssues}
        onAssetChanged={onAssetChanged}
      />
    </div>
  )
}

export const CoverageDetailBody = ({
  detail,
  isLoading,
  error,
  onRetry,
  onViewPhotos,
  view,
  selectedHistoryRecord,
  periodLabel,
  onSelectHistoryRecord,
  currentUser,
  canManageCatalog,
  canManageIssues,
  canVerifyIssues,
  onAssetChanged,
  isLoadingHistory,
  historyError,
  onHistoryPageChange,
  pageLayout = false,
}) => {
  if (isLoading) {
    return <div className="text-body-secondary">Loading extinguisher details...</div>
  }

  if (error) {
    return (
      <CAlert color="danger" className="mb-0 d-grid gap-2">
        <div>{error}</div>
        {onRetry ? (
          <CButton color="danger" variant="outline" size="sm" className="w-auto" onClick={onRetry}>
            Retry
          </CButton>
        ) : null}
      </CAlert>
    )
  }

  if (!detail) return null

  const historyRecords = normalizeHistoryRecords(detail)

  return view === 'historyDetail' ? (
    <HistoricalRecordDetail detail={detail} record={selectedHistoryRecord} />
  ) : (
    <CoverageOverview
      detail={detail}
      historyRecords={historyRecords}
      historyMeta={detail.historyMeta || {}}
      isLoadingHistory={isLoadingHistory}
      historyError={historyError}
      onHistoryPageChange={onHistoryPageChange}
      pageLayout={pageLayout}
      periodLabel={periodLabel}
      onSelectHistoryRecord={onSelectHistoryRecord}
      onViewPhotos={onViewPhotos}
      currentUser={currentUser}
      canManageCatalog={canManageCatalog}
      canManageIssues={canManageIssues}
      canVerifyIssues={canVerifyIssues}
      onAssetChanged={onAssetChanged}
    />
  )
}

const CoverageDetailDialog = ({
  visible,
  detail,
  isLoading,
  error,
  onClose,
  onRetry,
  onViewPhotos,
  view,
  selectedHistoryRecord,
  periodLabel,
  onSelectHistoryRecord,
  onBack,
  currentUser,
  canManageCatalog,
  canManageIssues,
  canVerifyIssues,
  onAssetChanged,
  isLoadingHistory,
  historyError,
  onHistoryPageChange,
}) => {
  const title =
    view === 'historyDetail'
      ? selectedHistoryRecord?.displayId || 'Historical inspection'
      : detail?.idLocNo || detail?.barcodeNo || 'Fire extinguisher'
  const subtitle =
    view === 'historyDetail'
      ? `${detail?.idLocNo || detail?.barcodeNo || 'Fire extinguisher'} historical record`
      : detailIdentity(detail)
  const body = (
    <CoverageDetailBody
      detail={detail}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onViewPhotos={onViewPhotos}
      view={view}
      selectedHistoryRecord={selectedHistoryRecord}
      periodLabel={periodLabel}
      onSelectHistoryRecord={onSelectHistoryRecord}
      currentUser={currentUser}
      canManageCatalog={canManageCatalog}
      canManageIssues={canManageIssues}
      canVerifyIssues={canVerifyIssues}
      onAssetChanged={onAssetChanged}
      isLoadingHistory={isLoadingHistory}
      historyError={historyError}
      onHistoryPageChange={onHistoryPageChange}
    />
  )

  return (
    <InspectionSidePanel
      visible={visible}
      title={title}
      subtitle={subtitle}
      onBack={view === 'historyDetail' ? onBack : null}
      onClose={onClose}
    >
      {body}
    </InspectionSidePanel>
  )
}

const AllExtinguishersSection = ({
  rows = null,
  isLoading = false,
  onViewDetails = null,
  onViewStateChange = null,
  isCreateOpen = false,
  onRequestCreate = null,
  onRequestCloseCreate = null,
  initialViewState = null,
  initialSuccessMessage = '',
  currentUser = null,
  canManageCatalog = true,
  canManageIssues = false,
  canVerifyIssues = false,
}) => {
  const useProvidedRows = Array.isArray(rows)
  const savedView = initialViewState || {}
  const locationParams =
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search)
  const linkedIssueFilter = locationParams.get('issues') === 'with-issues' ? 'with-issues' : null
  const [remoteRows, setRemoteRows] = useState([])
  const [remoteMeta, setRemoteMeta] = useState(null)
  const [isFetchingRows, setIsFetchingRows] = useState(!useProvidedRows)
  const [fetchError, setFetchError] = useState('')
  const coverageRequestRef = useRef({ id: 0, controller: null })
  const [detailTarget, setDetailTarget] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailView, setDetailView] = useState('overview')
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null)
  const [isFetchingDetail, setIsFetchingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const detailRequestRef = useRef({ id: 0, controller: null })
  const historyRequestRef = useRef({ id: 0, controller: null })
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [photoViewer, setPhotoViewer] = useState(null)
  const [lifecycleTarget, setLifecycleTarget] = useState(null)
  const [lifecycleAction, setLifecycleAction] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [assetFeedback, setAssetFeedback] = useState(null)
  const [search, setSearch] = useState(savedView.search || '')
  const [period, setPeriod] = useState(savedView.period || 'all')
  const [periodFrom, setPeriodFrom] = useState(savedView.periodFrom || getTodayDateInputValue)
  const [periodTo, setPeriodTo] = useState(savedView.periodTo || getTodayDateInputValue)
  const [sort, setSort] = useState(savedView.sort || 'zone-location')
  const [duplicateScope, setDuplicateScope] = useState(savedView.duplicateScope || 'all')
  const [zoneFilter, setZoneFilter] = useState(savedView.zoneFilter || ALL_ROWS_VALUE)
  const [locationFilter, setLocationFilter] = useState(savedView.locationFilter || ALL_ROWS_VALUE)
  const [inspectedByFilter, setInspectedByFilter] = useState(
    savedView.inspectedByFilter || ALL_ROWS_VALUE,
  )
  const [statusFilter, setStatusFilter] = useState(savedView.statusFilter || ALL_ROWS_VALUE)
  const [monthlyComplianceFilter, setMonthlyComplianceFilter] = useState(
    savedView.monthlyComplianceFilter || ALL_ROWS_VALUE,
  )
  const [issueFilter, setIssueFilter] = useState(
    savedView.issueFilter || linkedIssueFilter || ALL_ROWS_VALUE,
  )
  const [certificationFilter, setCertificationFilter] = useState(
    savedView.certificationFilter || ALL_ROWS_VALUE,
  )
  const [lifecycleFilter, setLifecycleFilter] = useState(savedView.lifecycleFilter || 'active')
  const [rowsToShow, setRowsToShow] = useState(savedView.rowsToShow ?? 10)
  const [currentPage, setCurrentPage] = useState(savedView.currentPage ?? 1)
  const [createSuccessMessage, setCreateSuccessMessage] = useState(initialSuccessMessage)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const isCustomPeriod = period === 'custom'
  const isCustomPeriodReady =
    !isCustomPeriod || (periodFrom !== '' && periodTo !== '' && periodFrom <= periodTo)

  const loadCoverageRows = useCallback(async () => {
    if (useProvidedRows) return
    coverageRequestRef.current.controller?.abort()
    const requestId = coverageRequestRef.current.id + 1
    const controller = new AbortController()
    coverageRequestRef.current = { id: requestId, controller }

    if (!isCustomPeriodReady) {
      setRemoteRows([])
      setRemoteMeta((current) => ({
        ...(current || {}),
        filtered: 0,
        total: 0,
        page: 1,
        lastPage: 1,
        summary: getSummary([]),
      }))
      setFetchError('Select a valid custom period to load extinguisher coverage.')
      if (coverageRequestRef.current.id === requestId) setIsFetchingRows(false)
      return
    }

    setIsFetchingRows(true)
    try {
      const response = await fetchFireExtinguisherCoverage(
        {
          search,
          period,
          periodFrom: isCustomPeriod ? periodFrom : '',
          periodTo: isCustomPeriod ? periodTo : '',
          sort,
          status: statusFilter,
          monthlyCompliance: monthlyComplianceFilter,
          issues: issueFilter,
          certification: certificationFilter,
          inspectedBy: inspectedByFilter === ALL_ROWS_VALUE ? '' : inspectedByFilter,
          zone: zoneFilter === ALL_ROWS_VALUE ? '' : zoneFilter,
          location: locationFilter === ALL_ROWS_VALUE ? '' : locationFilter,
          page: currentPage,
          perPage: rowsToShow,
          duplicateScope,
          lifecycleStatus: lifecycleFilter,
        },
        { signal: controller.signal },
      )
      if (coverageRequestRef.current.id !== requestId) return
      setRemoteRows(response.data)
      setRemoteMeta(response.meta)
      setFetchError('')
    } catch (error) {
      if (error?.name === 'AbortError' || coverageRequestRef.current.id !== requestId) return
      setFetchError(error?.message || 'Unable to load fire extinguisher coverage.')
      setRemoteRows([])
      setRemoteMeta(null)
    } finally {
      if (coverageRequestRef.current.id === requestId) {
        setIsFetchingRows(false)
        coverageRequestRef.current.controller = null
      }
    }
  }, [
    certificationFilter,
    currentPage,
    inspectedByFilter,
    issueFilter,
    isCustomPeriod,
    isCustomPeriodReady,
    locationFilter,
    monthlyComplianceFilter,
    period,
    periodFrom,
    periodTo,
    rowsToShow,
    search,
    sort,
    statusFilter,
    useProvidedRows,
    zoneFilter,
    duplicateScope,
    lifecycleFilter,
  ])

  useEffect(() => {
    loadCoverageRows()
  }, [loadCoverageRows])

  useEffect(
    () => () => {
      coverageRequestRef.current.id += 1
      coverageRequestRef.current.controller?.abort()
      detailRequestRef.current.id += 1
      detailRequestRef.current.controller?.abort()
      historyRequestRef.current.id += 1
      historyRequestRef.current.controller?.abort()
    },
    [],
  )

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const viewState = useMemo(
    () => ({
      search,
      period,
      periodFrom,
      periodTo,
      sort,
      duplicateScope,
      zoneFilter,
      locationFilter,
      inspectedByFilter,
      statusFilter,
      monthlyComplianceFilter,
      issueFilter,
      certificationFilter,
      lifecycleFilter,
      rowsToShow,
      currentPage,
    }),
    [
      certificationFilter,
      lifecycleFilter,
      currentPage,
      duplicateScope,
      inspectedByFilter,
      issueFilter,
      locationFilter,
      monthlyComplianceFilter,
      period,
      periodFrom,
      periodTo,
      rowsToShow,
      search,
      sort,
      statusFilter,
      zoneFilter,
    ],
  )

  useEffect(() => {
    onViewStateChange?.(viewState)
  }, [onViewStateChange, viewState])

  const requestCreate = useCallback(() => {
    setCreateSuccessMessage('')
    onRequestCreate?.(viewState)
  }, [onRequestCreate, viewState])

  const handleCreated = useCallback(
    (createdRows = []) => {
      const rows = Array.isArray(createdRows) ? createdRows : [createdRows].filter(Boolean)
      const locator = text(rows[0]?.idLocNo || rows[0]?.barcodeNo)
      const successMessage =
        rows.length === 1 && locator
          ? `Fire extinguisher ${locator} was added to the catalogue.`
          : `${rows.length} fire extinguishers were added to the catalogue.`
      setCreateSuccessMessage(successMessage)
      if (currentPage === 1) {
        loadCoverageRows()
      } else {
        setCurrentPage(1)
      }
      return successMessage
    },
    [currentPage, loadCoverageRows],
  )

  const updateSearch = useCallback(
    (value) => {
      resetToFirstPage()
      setSearch(value)
    },
    [resetToFirstPage],
  )
  const updatePeriod = useCallback(
    (value) => {
      resetToFirstPage()
      if (value === 'custom' && (!periodFrom || !periodTo)) {
        const today = getTodayDateInputValue()
        setPeriodFrom(today)
        setPeriodTo(today)
      }
      setPeriod(value)
    },
    [periodFrom, periodTo, resetToFirstPage],
  )
  const updatePeriodFrom = useCallback(
    (value) => {
      resetToFirstPage()
      setPeriodFrom(value)
    },
    [resetToFirstPage],
  )
  const updatePeriodTo = useCallback(
    (value) => {
      resetToFirstPage()
      setPeriodTo(value)
    },
    [resetToFirstPage],
  )
  const updateSort = useCallback(
    (value) => {
      resetToFirstPage()
      setSort(value)
    },
    [resetToFirstPage],
  )
  const updateZoneFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setZoneFilter(value)
    },
    [resetToFirstPage],
  )
  const updateLocationFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setLocationFilter(value)
    },
    [resetToFirstPage],
  )
  const updateInspectedByFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setInspectedByFilter(value)
    },
    [resetToFirstPage],
  )
  const updateStatusFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setStatusFilter(value)
    },
    [resetToFirstPage],
  )
  const updateIssueFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setIssueFilter(value)
    },
    [resetToFirstPage],
  )
  const updateCertificationFilter = useCallback(
    (value) => {
      resetToFirstPage()
      setCertificationFilter(value)
    },
    [resetToFirstPage],
  )
  const updateRowsToShow = useCallback(
    (value) => {
      resetToFirstPage()
      setRowsToShow(value)
    },
    [resetToFirstPage],
  )

  const allRows = useMemo(
    () => (useProvidedRows ? rows : remoteRows),
    [remoteRows, rows, useProvidedRows],
  )
  const summary = useMemo(
    () => (useProvidedRows ? getSummary(allRows) : remoteMeta?.summary || getSummary(allRows)),
    [allRows, remoteMeta?.summary, useProvidedRows],
  )
  const monthlyCycle = summary.cycle || {}
  const monthlyCyclePrefix = monthlyCycle.label ? `${monthlyCycle.label} ` : ''
  const monthlyInspected = monthlyCycle.inspected ?? summary.inspected ?? 0
  const monthlyNotInspected = monthlyCycle.notInspected ?? summary.notInspected ?? 0
  const monthlyRepeatChecks = monthlyCycle.repeatChecks ?? summary.duplicates ?? 0
  const lifecycleSummary = useMemo(
    () =>
      useProvidedRows
        ? getLifecycleSummary(allRows)
        : remoteMeta?.lifecycleSummary || getLifecycleSummary(allRows),
    [allRows, remoteMeta?.lifecycleSummary, useProvidedRows],
  )
  const filteredRows = useMemo(() => {
    if (!useProvidedRows) return allRows
    return sortRows(
      filterRows({
        rows: allRows,
        search,
        zoneFilter,
        locationFilter,
        inspectedByFilter,
        statusFilter,
        issueFilter,
        certificationFilter,
        duplicateScope,
        lifecycleFilter,
      }),
      sort,
    )
  }, [
    allRows,
    certificationFilter,
    inspectedByFilter,
    issueFilter,
    locationFilter,
    lifecycleFilter,
    search,
    sort,
    duplicateScope,
    statusFilter,
    useProvidedRows,
    zoneFilter,
  ])
  const visibleRows =
    !useProvidedRows || rowsToShow === ALL_ROWS_VALUE
      ? filteredRows
      : filteredRows.slice(0, Number(rowsToShow || 10))

  const clearFilters = () => {
    resetToFirstPage()
    setSearch('')
    setPeriod('all')
    const today = getTodayDateInputValue()
    setPeriodFrom(today)
    setPeriodTo(today)
    setSort('zone-location')
    setZoneFilter(ALL_ROWS_VALUE)
    setLocationFilter(ALL_ROWS_VALUE)
    setInspectedByFilter(ALL_ROWS_VALUE)
    setDuplicateScope('all')
    setStatusFilter(ALL_ROWS_VALUE)
    setMonthlyComplianceFilter(ALL_ROWS_VALUE)
    setIssueFilter(ALL_ROWS_VALUE)
    setCertificationFilter(ALL_ROWS_VALUE)
    setLifecycleFilter('active')
  }

  const openDetails = useCallback(
    async (row) => {
      onViewDetails?.(row, viewState)
      if (onViewDetails) return

      detailRequestRef.current.controller?.abort()
      const requestId = detailRequestRef.current.id + 1
      const controller = new AbortController()
      detailRequestRef.current = { id: requestId, controller }

      setDetailTarget(row)
      setDetail(useProvidedRows ? row : null)
      setDetailView('overview')
      setSelectedHistoryRecord(null)
      setDetailError('')
      setHistoryError('')

      if (useProvidedRows) {
        setIsFetchingDetail(false)
        return
      }

      setIsFetchingDetail(true)
      try {
        const [detailResult, historyResult] = await Promise.allSettled([
          fetchFireExtinguisherCoverageDetail(
            row.catalogId,
            {
              period,
              periodFrom: isCustomPeriod ? periodFrom : '',
              periodTo: isCustomPeriod ? periodTo : '',
            },
            { signal: controller.signal },
          ),
          fetchFireExtinguisherInspectionHistory(
            row.catalogId,
            {
              perPage: 25,
              period,
              periodFrom: isCustomPeriod ? periodFrom : '',
              periodTo: isCustomPeriod ? periodTo : '',
            },
            { signal: controller.signal },
          ),
        ])
        if (detailRequestRef.current.id !== requestId) return
        if (detailResult.status === 'rejected') throw detailResult.reason

        const fallbackHistoryRecords = Array.isArray(detailResult.value.data?.historyRecords)
          ? detailResult.value.data.historyRecords
          : []
        const historyRecords =
          historyResult.status === 'fulfilled' ? historyResult.value.data : fallbackHistoryRecords
        const historyMeta =
          historyResult.status === 'fulfilled'
            ? historyResult.value.meta
            : { page: 1, lastPage: 1, total: fallbackHistoryRecords.length }
        if (historyResult.status === 'rejected') {
          if (historyResult.reason?.name === 'AbortError') throw historyResult.reason
          setHistoryError(
            historyResult.reason?.message || 'Unable to load paginated inspection history.',
          )
        }
        setDetail({
          ...detailResult.value.data,
          historyRecords,
          latestHistoryRecord: historyRecords[0] || null,
          historyMeta,
        })
      } catch (error) {
        if (error?.name === 'AbortError' || detailRequestRef.current.id !== requestId) return
        setDetail(row)
        setDetailError(error?.message || 'Unable to load extinguisher details.')
      } finally {
        if (detailRequestRef.current.id === requestId) {
          setIsFetchingDetail(false)
          detailRequestRef.current.controller = null
        }
      }
    },
    [isCustomPeriod, onViewDetails, period, periodFrom, periodTo, useProvidedRows, viewState],
  )

  const retryDetails = useCallback(() => {
    if (detailTarget) openDetails(detailTarget)
  }, [detailTarget, openDetails])

  const loadHistoryPage = useCallback(
    async (page) => {
      if (useProvidedRows || !detailTarget?.catalogId) return
      historyRequestRef.current.controller?.abort()
      const requestId = historyRequestRef.current.id + 1
      const controller = new AbortController()
      historyRequestRef.current = { id: requestId, controller }
      setIsFetchingHistory(true)
      setHistoryError('')
      try {
        const history = await fetchFireExtinguisherInspectionHistory(
          detailTarget.catalogId,
          {
            page,
            perPage: 25,
            period,
            periodFrom: isCustomPeriod ? periodFrom : '',
            periodTo: isCustomPeriod ? periodTo : '',
          },
          { signal: controller.signal },
        )
        if (historyRequestRef.current.id !== requestId) return
        setDetail((current) => ({
          ...(current || detailTarget),
          historyRecords: history.data,
          historyMeta: history.meta,
        }))
      } catch (error) {
        if (error?.name === 'AbortError' || historyRequestRef.current.id !== requestId) return
        setHistoryError(error?.message || 'Unable to load inspection history.')
      } finally {
        if (historyRequestRef.current.id === requestId) {
          setIsFetchingHistory(false)
          historyRequestRef.current.controller = null
        }
      }
    },
    [detailTarget, isCustomPeriod, period, periodFrom, periodTo, useProvidedRows],
  )

  const handleAssetChanged = useCallback(
    (updated) => {
      if (!updated) return
      setDetail((current) => ({ ...(current || {}), ...updated }))
      setDetailTarget((current) => ({ ...(current || {}), ...updated }))
      loadCoverageRows()
    },
    [loadCoverageRows],
  )

  const handleCatalogAssetChanged = useCallback(
    (updated, result = {}) => {
      if (result.message) setAssetFeedback(result)
      if (updated) {
        setDetail((current) => (current ? { ...current, ...updated } : current))
        setDetailTarget((current) => (current ? { ...current, ...updated } : current))
      }
      loadCoverageRows()
    },
    [loadCoverageRows],
  )

  const openLifecycleAction = useCallback((asset, action) => {
    setLifecycleTarget(asset)
    setLifecycleAction(action)
  }, [])

  const zoneOptions = useMemo(
    () =>
      useProvidedRows
        ? buildOptions(allRows, 'zone', 'All zones')
        : buildStaticOptions(remoteMeta?.options?.zones, 'All zones'),
    [allRows, remoteMeta?.options?.zones, useProvidedRows],
  )
  const locationOptions = useMemo(
    () =>
      useProvidedRows
        ? buildOptions(allRows, 'location', 'All locations')
        : buildStaticOptions(remoteMeta?.options?.locations, 'All locations'),
    [allRows, remoteMeta?.options?.locations, useProvidedRows],
  )
  const inspectedByOptions = useMemo(
    () =>
      useProvidedRows
        ? buildOptions(allRows, 'inspectedBy', 'All inspectors')
        : buildStaticOptions(remoteMeta?.options?.inspectors, 'All inspectors'),
    [allRows, remoteMeta?.options?.inspectors, useProvidedRows],
  )

  const filters = (
    <>
      <TableFilters
        searchValue={search}
        onSearchChange={updateSearch}
        searchPlaceholder="Search extinguishers"
        periodValue={period}
        onPeriodChange={updatePeriod}
        periodOptions={PERIOD_OPTIONS}
        periodLabel="Record period"
        desktopPrimaryFilterCount={3}
        advancedFiltersLabel="More extinguisher filters"
        filters={[
          {
            key: 'sort',
            label: 'Sort',
            value: sort,
            onChange: updateSort,
            options: [
              { value: 'zone-location', label: 'Zone / Location' },
              { value: 'latest', label: 'Latest inspected' },
              { value: 'days-left', label: 'Days left' },
              { value: 'issues', label: 'Issues first' },
              { value: 'duplicates', label: 'Reports first' },
              { value: 'locator-duplicates', label: 'Duplicate barcode first' },
              { value: 'id-loc-duplicates', label: 'Duplicate ID Loc No. first' },
            ],
          },
          {
            key: 'zone',
            label: 'Zone',
            value: zoneFilter,
            onChange: updateZoneFilter,
            options: zoneOptions,
          },
          {
            key: 'location',
            label: 'Location',
            value: locationFilter,
            onChange: updateLocationFilter,
            options: locationOptions,
          },
          {
            key: 'inspected-by',
            label: 'Last Inspected By',
            value: inspectedByFilter,
            onChange: updateInspectedByFilter,
            options: inspectedByOptions,
          },
          {
            key: 'status',
            label: 'Record status',
            value: statusFilter,
            onChange: updateStatusFilter,
            options: [
              { value: ALL_ROWS_VALUE, label: 'All status' },
              { value: 'inspected', label: 'Inspected' },
              { value: 'not-inspected', label: 'Not inspected' },
              { value: 'issues', label: 'Issues' },
              { value: 'duplicates', label: 'Multiple reports' },
            ],
          },
          {
            key: 'monthly-compliance',
            label: 'Monthly status',
            value: monthlyComplianceFilter,
            onChange: (value) => {
              resetToFirstPage()
              setMonthlyComplianceFilter(value)
            },
            options: [
              { value: ALL_ROWS_VALUE, label: 'All monthly status' },
              { value: 'complete', label: 'Complete' },
              { value: 'not_inspected', label: 'Not inspected' },
              { value: 'repeat_check', label: 'Repeat checks' },
              { value: 'out_of_service', label: 'Excluded: out of service' },
              { value: 'retired', label: 'Excluded: retired' },
            ],
          },
          {
            key: 'lifecycle',
            label: 'Lifecycle',
            value: lifecycleFilter,
            onChange: (value) => {
              resetToFirstPage()
              setLifecycleFilter(value)
            },
            options: [
              { value: 'active', label: 'Active assets' },
              { value: 'out_of_service', label: 'Out of service' },
              { value: 'retired', label: 'Retired' },
              { value: 'all', label: 'All lifecycle states' },
            ],
          },
          {
            key: 'issues',
            label: 'Issues',
            value: issueFilter,
            onChange: updateIssueFilter,
            options: [
              { value: ALL_ROWS_VALUE, label: 'All issues' },
              { value: 'with-issues', label: 'With issues' },
              { value: 'no-issues', label: 'No issues' },
            ],
          },
          {
            key: 'certification',
            label: 'Certification',
            value: certificationFilter,
            onChange: updateCertificationFilter,
            options: [
              { value: ALL_ROWS_VALUE, label: 'All certification' },
              { value: 'valid', label: 'Valid' },
              { value: 'expiring', label: 'Expiring soon' },
              { value: 'expired', label: 'Expired' },
            ],
          },
        ]}
        onClear={clearFilters}
        rowClassName="inspection-records-filter-row all-extinguishers-filter-row align-items-md-end"
        searchColMd={3}
        periodColMd={2}
        filterColMd={2}
        clearColMd="auto"
        showDesktopLabels
        labelClassName="text-muted"
      />
      {isCustomPeriod ? (
        <CRow className="g-2 mb-3 align-items-end">
          <CCol xs={12} md={2}>
            <CFormLabel htmlFor="extinguisher-period-from" className="text-muted mb-1">
              From
            </CFormLabel>
            <CFormInput
              id="extinguisher-period-from"
              aria-label="Custom period from date"
              size="sm"
              type="date"
              value={periodFrom}
              onChange={(event) => updatePeriodFrom(event.target.value)}
              invalid={!isCustomPeriodReady}
              aria-describedby={!isCustomPeriodReady ? 'extinguisher-period-error' : undefined}
            />
          </CCol>
          <CCol xs={12} md={2}>
            <CFormLabel htmlFor="extinguisher-period-to" className="text-muted mb-1">
              To
            </CFormLabel>
            <CFormInput
              id="extinguisher-period-to"
              aria-label="Custom period to date"
              size="sm"
              type="date"
              value={periodTo}
              onChange={(event) => updatePeriodTo(event.target.value)}
              invalid={!isCustomPeriodReady}
              aria-describedby={!isCustomPeriodReady ? 'extinguisher-period-error' : undefined}
            />
          </CCol>
          {!isCustomPeriodReady ? (
            <CCol
              id="extinguisher-period-error"
              xs={12}
              md="auto"
              className="invalid-feedback d-block"
            >
              Select a valid date range.
            </CCol>
          ) : null}
        </CRow>
      ) : null}
    </>
  )

  const renderSummaryStrip = (testId) => (
    <div
      className="all-extinguishers-summary-strip d-flex flex-wrap align-items-center gap-2 mb-3"
      data-testid={testId}
    >
      {monthlyCycle.label ? (
        <div className="w-100 small text-body-secondary">
          Monthly compliance: {monthlyCycle.label} · {formatDate(monthlyCycle.start)} -{' '}
          {formatDate(monthlyCycle.end)}
        </div>
      ) : null}
      <SummaryItem
        label="Total"
        value={lifecycleSummary.all}
        onClick={() => {
          resetToFirstPage()
          setLifecycleFilter(ALL_ROWS_VALUE)
          setStatusFilter(ALL_ROWS_VALUE)
          setIssueFilter(ALL_ROWS_VALUE)
          setCertificationFilter(ALL_ROWS_VALUE)
          setDuplicateScope('all')
          setMonthlyComplianceFilter(ALL_ROWS_VALUE)
          setSort('zone-location')
        }}
        isActive={lifecycleFilter === ALL_ROWS_VALUE}
      />
      <details className="all-extinguishers-summary-group">
        <summary>Lifecycle metrics</summary>
        <div className="d-flex flex-wrap gap-2 pt-2">
          <SummaryItem
            label="Active"
            value={lifecycleSummary.active}
            tone="success"
            onClick={() => {
              resetToFirstPage()
              setLifecycleFilter('active')
            }}
            isActive={lifecycleFilter === 'active'}
          />
          <SummaryItem
            label="Out of service"
            value={lifecycleSummary.outOfService}
            tone="warning"
            onClick={() => {
              resetToFirstPage()
              setLifecycleFilter('out_of_service')
            }}
            isActive={lifecycleFilter === 'out_of_service'}
          />
          <SummaryItem
            label="Retired"
            value={lifecycleSummary.retired}
            tone="secondary"
            onClick={() => {
              resetToFirstPage()
              setLifecycleFilter('retired')
            }}
            isActive={lifecycleFilter === 'retired'}
          />
        </div>
      </details>
      <SummaryItem
        label={`${monthlyCyclePrefix}Inspected`}
        value={monthlyInspected}
        tone="success"
        onClick={() => {
          resetToFirstPage()
          const nextStatus = monthlyComplianceFilter === 'complete' ? ALL_ROWS_VALUE : 'complete'
          setPeriod('thismonth')
          setMonthlyComplianceFilter(nextStatus)
          setStatusFilter(ALL_ROWS_VALUE)
          setIssueFilter(ALL_ROWS_VALUE)
          setDuplicateScope('all')
          if (nextStatus === 'inspected') {
            setSort('latest')
          }
        }}
        isActive={monthlyComplianceFilter === 'complete'}
      />
      <SummaryItem
        label={`${monthlyCyclePrefix}Not inspected`}
        value={monthlyNotInspected}
        tone="secondary"
        onClick={() => {
          resetToFirstPage()
          const nextStatus =
            monthlyComplianceFilter === 'not_inspected' ? ALL_ROWS_VALUE : 'not_inspected'
          setPeriod('thismonth')
          setMonthlyComplianceFilter(nextStatus)
          setStatusFilter(ALL_ROWS_VALUE)
          setIssueFilter(ALL_ROWS_VALUE)
          setDuplicateScope('all')
          if (nextStatus === 'not_inspected') {
            setSort('zone-location')
          }
        }}
        isActive={monthlyComplianceFilter === 'not_inspected'}
      />
      <SummaryItem
        label="Open issues"
        value={summary.openIssues ?? summary.issues}
        tone="danger"
        onClick={() => {
          resetToFirstPage()
          const nextIssueFilter = issueFilter === 'with-issues' ? ALL_ROWS_VALUE : 'with-issues'
          setIssueFilter(nextIssueFilter)
          setStatusFilter(ALL_ROWS_VALUE)
          setDuplicateScope('all')
          if (nextIssueFilter === 'with-issues') {
            setSort('issues')
          }
        }}
        isActive={issueFilter === 'with-issues'}
      />
      <details className="all-extinguishers-summary-group">
        <summary>Exceptions and data quality</summary>
        <div className="d-flex flex-wrap gap-2 pt-2">
          <SummaryItem
            label={`${monthlyCyclePrefix}Repeat checks`}
            value={monthlyRepeatChecks}
            tone="warning"
            onClick={() => {
              resetToFirstPage()
              const nextScope =
                monthlyComplianceFilter === 'repeat_check' ? ALL_ROWS_VALUE : 'repeat_check'
              setPeriod('thismonth')
              setMonthlyComplianceFilter(nextScope)
              setDuplicateScope('all')
              if (nextScope === 'repeat_check') setSort('duplicates')
            }}
            isActive={monthlyComplianceFilter === 'repeat_check'}
          />
          <SummaryItem
            label="Duplicate barcode"
            value={summary.barcodeDuplicates ?? summary.locatorDuplicates ?? 0}
            tone="warning"
            onClick={() => {
              const nextScope = duplicateScope === 'locator' ? 'all' : 'locator'
              resetToFirstPage()
              setDuplicateScope(nextScope)
              if (nextScope === 'locator') setSort('locator-duplicates')
            }}
            isActive={duplicateScope === 'locator'}
          />
          <SummaryItem
            label="Duplicate ID Loc No."
            value={summary.idLocNoDuplicates ?? 0}
            tone="warning"
            onClick={() => {
              const nextScope = duplicateScope === 'id-loc' ? 'all' : 'id-loc'
              resetToFirstPage()
              setDuplicateScope(nextScope)
              if (nextScope === 'id-loc') setSort('id-loc-duplicates')
            }}
            isActive={duplicateScope === 'id-loc'}
          />
          <SummaryItem
            label="Expired"
            value={summary.expired}
            tone="danger"
            onClick={() => {
              resetToFirstPage()
              const nextCertification =
                certificationFilter === 'expired' ? ALL_ROWS_VALUE : 'expired'
              setCertificationFilter(nextCertification)
              setDuplicateScope('all')
              if (nextCertification === 'expired') setSort('days-left')
            }}
            isActive={certificationFilter === 'expired'}
          />
        </div>
      </details>
    </div>
  )

  const emptyMessage = (
    <div className="text-body-secondary">
      {fetchError ||
        (monthlyComplianceFilter === 'not_inspected'
          ? `All required extinguishers are complete for ${monthlyCycle.label || 'this month'}.`
          : 'No extinguishers match the current filters.')}
    </div>
  )

  const footer = (
    <DataTableFooter
      rowsToShow={rowsToShow}
      onRowsToShowChange={updateRowsToShow}
      visibleCount={visibleRows.length}
      filteredCount={useProvidedRows ? filteredRows.length : (remoteMeta?.filtered ?? 0)}
      totalCount={useProvidedRows ? allRows.length : (remoteMeta?.total ?? 0)}
      currentPage={useProvidedRows ? 1 : (remoteMeta?.page ?? currentPage)}
      lastPage={useProvidedRows ? 1 : (remoteMeta?.lastPage ?? 1)}
      onPageChange={useProvidedRows ? null : setCurrentPage}
      options={useProvidedRows ? undefined : REMOTE_PAGE_SIZE_OPTIONS}
    />
  )
  const detailPeriodLabel = getPeriodLabel(period, periodFrom, periodTo)
  const createAction = (
    <div
      className="d-flex flex-wrap justify-content-end gap-2 mb-3"
      data-testid="all-extinguishers-create-toolbar"
    >
      <CreateActionButton
        label="Export"
        ariaLabel="Export fire extinguisher exceptions"
        icon={<Download size={13} className="me-1" aria-hidden="true" />}
        importance="section-primary"
        onClick={() => setIsExportOpen(true)}
      />
      {onRequestCreate && canManageCatalog ? (
        <CreateActionButton
          label="Add Extinguisher"
          importance="section-primary"
          onClick={requestCreate}
        />
      ) : null}
    </div>
  )
  const createSuccess = createSuccessMessage ? (
    <CAlert
      color="success"
      dismissible
      onClose={() => setCreateSuccessMessage('')}
      className="mb-3"
    >
      {createSuccessMessage}
    </CAlert>
  ) : null
  const lifecycleFeedback = assetFeedback?.message ? (
    <CAlert
      color="success"
      dismissible
      onClose={() => setAssetFeedback(null)}
      className="mb-3"
      role="status"
    >
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span>{assetFeedback.message}</span>
        {assetFeedback.lifecycleFilter ? (
          <CButton
            type="button"
            color="link"
            className="p-0 fw-semibold"
            onClick={() => {
              resetToFirstPage()
              setLifecycleFilter(assetFeedback.lifecycleFilter)
              setAssetFeedback(null)
            }}
          >
            {assetFeedback.followUpLabel || 'View updated assets'}
          </CButton>
        ) : null}
      </div>
    </CAlert>
  ) : null

  return (
    <>
      <div
        className="inspection-mobile-section d-md-none"
        data-testid="all-extinguishers-section-mobile"
      >
        {createAction}
        {createSuccess}
        {lifecycleFeedback}
        {renderSummaryStrip('all-extinguishers-summary-mobile')}
        {filters}
        <ResponsiveRecordCollection
          isLoading={isLoading || isFetchingRows}
          isEmpty={filteredRows.length === 0}
          emptyMessage={emptyMessage}
          mobileSections={buildMobileSections(
            visibleRows,
            openDetails,
            setEditTarget,
            openLifecycleAction,
            canManageCatalog,
          )}
          renderDesktop={null}
          footer={footer}
        />
      </div>

      <CCard className="d-none d-md-block" data-testid="all-extinguishers-section">
        <CCardBody>
          {createAction}
          {createSuccess}
          {lifecycleFeedback}
          {renderSummaryStrip('all-extinguishers-summary')}
          {filters}
          <ResponsiveRecordCollection
            isLoading={isLoading || isFetchingRows}
            isEmpty={filteredRows.length === 0}
            emptyMessage={emptyMessage}
            mobileSections={[]}
            renderDesktop={() => (
              <AllExtinguishersTable
                visibleRows={visibleRows}
                onViewDetails={openDetails}
                onEditAsset={setEditTarget}
                onLifecycleAction={openLifecycleAction}
                canManageCatalog={canManageCatalog}
              />
            )}
            footer={footer}
          />
        </CCardBody>
      </CCard>

      <CoverageDetailDialog
        visible={Boolean(detailTarget)}
        detail={detail || detailTarget}
        isLoading={isFetchingDetail}
        error={detailError}
        onClose={() => {
          detailRequestRef.current.id += 1
          detailRequestRef.current.controller?.abort()
          detailRequestRef.current.controller = null
          historyRequestRef.current.id += 1
          historyRequestRef.current.controller?.abort()
          historyRequestRef.current.controller = null
          setDetailTarget(null)
          setDetail(null)
          setDetailView('overview')
          setSelectedHistoryRecord(null)
          setDetailError('')
          setHistoryError('')
        }}
        onRetry={retryDetails}
        onViewPhotos={setPhotoViewer}
        view={detailView}
        selectedHistoryRecord={selectedHistoryRecord}
        periodLabel={detailPeriodLabel}
        onSelectHistoryRecord={(record) => {
          setSelectedHistoryRecord(record)
          setDetailView('historyDetail')
        }}
        onBack={() => {
          setSelectedHistoryRecord(null)
          setDetailView('overview')
        }}
        currentUser={currentUser}
        canManageCatalog={canManageCatalog}
        canManageIssues={canManageIssues}
        canVerifyIssues={canVerifyIssues}
        onAssetChanged={handleAssetChanged}
        isLoadingHistory={isFetchingHistory}
        historyError={historyError}
        onHistoryPageChange={loadHistoryPage}
      />
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
      <FireExtinguisherLifecycleDialog
        asset={lifecycleTarget}
        action={lifecycleAction}
        onClose={() => {
          setLifecycleTarget(null)
          setLifecycleAction('')
        }}
        onChanged={handleCatalogAssetChanged}
      />
      <FireExtinguisherEditDialog
        asset={editTarget}
        onClose={() => setEditTarget(null)}
        onChanged={handleCatalogAssetChanged}
      />
      <FireExtinguisherExceptionExportDialog
        visible={isExportOpen}
        filterSnapshot={viewState}
        onClose={() => setIsExportOpen(false)}
      />
      {isCreateOpen ? (
        <FireExtinguisherCreateDrawer
          visible
          onClose={(options = {}) => onRequestCloseCreate?.({ ...options, viewState })}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  )
}

export default AllExtinguishersSection
