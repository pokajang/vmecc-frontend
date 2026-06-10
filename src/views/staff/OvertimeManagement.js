import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { buildWorkflowHistoryEntries } from 'src/components/auditHistory'
import { isHolidayGuidanceStaffVisibilityEnabledForUser } from 'src/config/featureFlags'
import { fetchStaffOvertimeRecord } from 'src/services/apiClient'
import { loadStaffOvertimeRecordsApiFirst, mapOvertimeApiRowToUi } from 'src/services/overtimeApi'
import { hasAnyPermission, hasPermission } from 'src/utils/authz'
import {
  formatDate as formatOvertimeDate,
  formatDateTime as formatOvertimeDateTime,
  getDisplayOvertimeId,
  getEndDateTimeLabel as getOvertimeEndDateTimeLabel,
  getScheduleLabel as getOvertimeScheduleLabel,
  getStartDateTimeLabel as getOvertimeStartDateTimeLabel,
  getWorkflowPendingActionHint as getOvertimeWorkflowPendingActionHint,
  getWorkflowStatusLabel as getOvertimeWorkflowStatusLabel,
} from 'src/views/overtime/utils'
import OvertimeDetailSection from 'src/views/overtime/components/OvertimeDetailSection'
import { overtimeSortOptions, SALARY_CLAIMS_ALLOWED_PERMISSIONS } from './leave-management/data'
import OvertimeRecordsTab from './leave-management/components/OvertimeRecordsTab'
import OvertimeWorkflowActionModal from './leave-management/components/OvertimeWorkflowActionModal'
import OvertimeApprovalRules from '../settings/components/OvertimeApprovalRules'
import useOvertimeAdminWorkflow from './salary-claims-management/hooks/useOvertimeAdminWorkflow'
import {
  buildCompositeOvertimeRecordKey,
  decodeRouteValue,
  normalizeRoleList,
  OVERTIME_WORKFLOW_DECLARATION_LABEL,
  statusColorMap,
} from './salary-claims-management/utils'

const getStatusBadge = (status, label = status) => (
  <CBadge color={statusColorMap[status] || 'secondary'}>{label || '-'}</CBadge>
)

const OVERTIME_TAB_BY_PATH = {
  records: 'overtimeRecords',
  rules: 'otRules',
}
const OVERTIME_PATH_BY_TAB = {
  overtimeRecords: 'records',
  otRules: 'rules',
}
const DEFAULT_OVERTIME_TAB = 'overtimeRecords'

const DEFAULT_ROWS_TO_SHOW = 5
const DEFAULT_META = {
  page: 1,
  perPage: DEFAULT_ROWS_TO_SHOW,
  lastPage: 1,
  totalCount: 0,
  filteredCount: 0,
}

const normalizeOptionList = (rows = [], fallbackLabel = null) => {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (typeof row === 'string') {
        const value = row.trim()
        if (!value) return null
        return { value, label: value }
      }
      const value = String(row?.value || '').trim()
      if (!value) return null
      const label = String(row?.label || value).trim() || value
      return { value, label }
    })
    .filter(Boolean)
  if (normalized.length > 0) return normalized
  if (!fallbackLabel) return []
  return [{ value: fallbackLabel, label: fallbackLabel }]
}

const resolveApiMeta = (meta = null, rows = [], perPage = DEFAULT_ROWS_TO_SHOW) => {
  const safeMeta = meta && typeof meta === 'object' ? meta : {}
  const returnedCount = Array.isArray(rows) ? rows.length : 0
  const normalizedPerPage = Number(safeMeta.per_page || safeMeta.perPage || perPage) || perPage
  const filteredCount =
    Number(safeMeta.filtered_count || safeMeta.filteredCount || returnedCount) || returnedCount
  const totalCount =
    Number(safeMeta.total_count || safeMeta.totalCount || filteredCount) || filteredCount
  const lastPage =
    Number(
      safeMeta.last_page ||
        safeMeta.lastPage ||
        Math.max(1, Math.ceil(filteredCount / normalizedPerPage)),
    ) || 1
  const page = Number(safeMeta.page || 1) || 1
  return {
    page,
    perPage: normalizedPerPage,
    lastPage: Math.max(1, lastPage),
    totalCount,
    filteredCount,
  }
}

const OvertimeManagement = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { overtimeRouteKey } = useParams()
  const user = useSelector((state) => state.authUser)
  const isHrUser = useMemo(() => hasAnyPermission(user, SALARY_CLAIMS_ALLOWED_PERMISSIONS), [user])
  const showGuidanceMetadata = isHolidayGuidanceStaffVisibilityEnabledForUser(user)
  const actorName = useMemo(
    () => user?.name || user?.full_name || user?.email || 'System user',
    [user?.name, user?.full_name, user?.email],
  )
  const isDetailRoute = Boolean(overtimeRouteKey)

  const toaster = useRef()
  const [toast, addToast] = useState(null)
  const [allOvertimeRecords, setAllOvertimeRecords] = useState([])
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [recordsMeta, setRecordsMeta] = useState(DEFAULT_META)
  const [recordsFilters, setRecordsFilters] = useState({
    status: [],
    overtimeType: [],
    team: [],
  })
  const [selectedRecordFallback, setSelectedRecordFallback] = useState(null)
  const overtimeRequestRef = useRef(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [overtimeTypeFilter, setOvertimeTypeFilter] = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('appliedAt:desc')
  const [rowsToShow, setRowsToShow] = useState(DEFAULT_ROWS_TO_SHOW)
  const [page, setPage] = useState(1)
  const [isBulkOvertimeSubmitting, setIsBulkOvertimeSubmitting] = useState(false)

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title ? (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        ) : null}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const tabFromPath = useMemo(() => {
    const parts = String(location.pathname || '')
      .split('/')
      .filter(Boolean)
    const last = parts[parts.length - 1] || ''
    return OVERTIME_TAB_BY_PATH[last] || ''
  }, [location.pathname])
  const detailReturnTab = ['overtimeRecords', 'otRules'].includes(location.state?.tab)
    ? location.state.tab
    : DEFAULT_OVERTIME_TAB
  const resolvedTab = isDetailRoute ? detailReturnTab : tabFromPath || DEFAULT_OVERTIME_TAB
  const resolvedTabPath =
    OVERTIME_PATH_BY_TAB[resolvedTab] || OVERTIME_PATH_BY_TAB[DEFAULT_OVERTIME_TAB]

  const hydrateOvertime = useCallback(
    async ({ showWarningToast = false } = {}) => {
      if (!isHrUser || !user?.id) {
        setAllOvertimeRecords([])
        setRecordsMeta(DEFAULT_META)
        return { ok: false, data: [], meta: null, filters: null, source: 'api' }
      }

      const params = {
        status: statusFilter !== 'All' ? statusFilter : undefined,
        overtime_type: overtimeTypeFilter !== 'All' ? overtimeTypeFilter : undefined,
        team: teamFilter !== 'All' ? teamFilter : undefined,
        period: period !== 'all' ? period : undefined,
        sort,
        page,
        per_page: rowsToShow,
      }

      const requestId = overtimeRequestRef.current + 1
      overtimeRequestRef.current = requestId
      setIsRecordsLoading(true)
      const result = await loadStaffOvertimeRecordsApiFirst(params)
      if (requestId !== overtimeRequestRef.current) {
        return result
      }
      const nextRows = Array.isArray(result?.data) ? result.data : []
      const nextMeta = resolveApiMeta(result?.meta, nextRows, rowsToShow)

      if ((nextMeta.filteredCount || 0) > 0 && nextRows.length === 0 && page > nextMeta.lastPage) {
        setPage(Math.max(1, nextMeta.lastPage))
        setIsRecordsLoading(false)
        return result
      }

      setAllOvertimeRecords(nextRows)
      setRecordsMeta(nextMeta)
      if (result?.filters && typeof result.filters === 'object') {
        setRecordsFilters({
          status: normalizeOptionList(result.filters.status),
          overtimeType: normalizeOptionList(result.filters.overtime_type),
          team: normalizeOptionList(result.filters.team),
        })
      } else {
        setRecordsFilters((prev) => prev)
      }

      setIsRecordsLoading(false)
      if (showWarningToast && !result?.ok) {
        pushToast('Unable to load overtime records from API for admin view. Please retry.', {
          title: 'Data warning',
          color: 'warning',
        })
      }
      return result
    },
    [
      isHrUser,
      overtimeTypeFilter,
      page,
      period,
      pushToast,
      rowsToShow,
      sort,
      statusFilter,
      teamFilter,
      user?.id,
    ],
  )

  const hasInitialHydration = useRef(false)
  useEffect(() => {
    if (!isHrUser || !user?.id) return
    const showWarningToast = !hasInitialHydration.current
    hasInitialHydration.current = true
    hydrateOvertime({ showWarningToast })
  }, [hydrateOvertime, isHrUser, user?.id])

  const adminOvertimeRows = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(allOvertimeRecords) ? allOvertimeRecords : []).forEach((row, index) => {
      const ownerUserId = String(row?.ownerUserId || '').trim()
      const overtimeIdValue = String(row?.id || '').trim()
      if (!overtimeIdValue || String(row?.status || '').trim() === 'Draft') return

      const recordKey = String(
        row?.recordKey || buildCompositeOvertimeRecordKey(ownerUserId, overtimeIdValue),
      )
      const normalizedSubmittedBy = String(row?.submittedBy || '').trim()
      const normalizedRowEmployee = String(row?.employee || '').trim()
      const employee =
        normalizedSubmittedBy ||
        normalizedRowEmployee ||
        (ownerUserId ? `User ${ownerUserId}` : `Record ${index + 1}`)
      const team = String(row?.team || '').trim() || 'Unassigned'

      map.set(recordKey, {
        ...row,
        id: overtimeIdValue,
        ownerUserId,
        recordKey,
        employee,
        team,
        applicantRoles: normalizeRoleList(row?.applicantRoles || []),
      })
    })
    return Array.from(map.values())
  }, [allOvertimeRecords])

  const filteredAdminOvertimeRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return adminOvertimeRows
    return adminOvertimeRows.filter((row) => {
      const fields = [
        row.id,
        row.employee,
        row.submittedBy,
        row.employeeEmail,
        row.team,
        row.overtimeType,
        row.reason,
        row.status,
      ]
      return fields.some((f) =>
        String(f || '')
          .toLowerCase()
          .includes(term),
      )
    })
  }, [adminOvertimeRows, search])

  const statusOptions = useMemo(() => {
    const fromApi = normalizeOptionList(recordsFilters.status)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All status' }, ...fromApi]
    }
    const unique = Array.from(new Set(adminOvertimeRows.map((row) => row.status).filter(Boolean)))
    return [
      { value: 'All', label: 'All status' },
      ...unique.map((value) => ({ value, label: value })),
    ]
  }, [adminOvertimeRows, recordsFilters.status])

  const overtimeTypeOptions = useMemo(() => {
    const fromApi = normalizeOptionList(recordsFilters.overtimeType)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All OT type' }, ...fromApi]
    }
    return [{ value: 'All', label: 'All OT type' }]
  }, [recordsFilters.overtimeType])

  const teamOptions = useMemo(() => {
    const fromApi = normalizeOptionList(recordsFilters.team)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All team' }, ...fromApi]
    }
    return [{ value: 'All', label: 'All team' }]
  }, [recordsFilters.team])

  const decodedOvertimeRouteKey = useMemo(
    () => decodeRouteValue(overtimeRouteKey),
    [overtimeRouteKey],
  )

  useEffect(() => {
    if (!isDetailRoute || !decodedOvertimeRouteKey.includes('::')) return
    const [ownerPart, recordPart] = decodedOvertimeRouteKey.split('::')
    const ownerId = Number(ownerPart)
    const recordId = Number(recordPart)
    if (
      !Number.isInteger(ownerId) ||
      ownerId <= 0 ||
      !Number.isInteger(recordId) ||
      recordId <= 0
    ) {
      return
    }

    let mounted = true
    const loadRecord = async () => {
      try {
        const response = await fetchStaffOvertimeRecord(ownerId, recordId)
        if (!mounted) return
        const mapped = mapOvertimeApiRowToUi(response?.data || {}, String(ownerId))
        setSelectedRecordFallback({
          ...mapped,
          id: String(mapped?.id || '').trim(),
          ownerUserId: String(mapped?.ownerUserId || ownerId),
          recordKey: String(mapped?.recordKey || `${ownerId}::${recordId}`),
          employee: String(mapped?.employee || mapped?.submittedBy || '').trim(),
          team: String(mapped?.team || '').trim() || 'Unassigned',
          applicantRoles: normalizeRoleList(mapped?.applicantRoles || []),
        })
      } catch {
        if (!mounted) return
        setSelectedRecordFallback(null)
      }
    }

    loadRecord()
    return () => {
      mounted = false
    }
  }, [decodedOvertimeRouteKey, isDetailRoute])

  const selectedRecord = useMemo(() => {
    if (!decodedOvertimeRouteKey) return null
    if (decodedOvertimeRouteKey.includes('::')) {
      const fromRows =
        adminOvertimeRows.find((row) => String(row?.recordKey || '') === decodedOvertimeRouteKey) ||
        null
      if (fromRows && selectedRecordFallback) {
        return { ...fromRows, ...selectedRecordFallback }
      }
      return fromRows || selectedRecordFallback || null
    }
    return (
      adminOvertimeRows.find((row) => String(row?.id || '') === decodedOvertimeRouteKey) || null
    )
  }, [adminOvertimeRows, decodedOvertimeRouteKey, selectedRecordFallback])

  const selectedRecordApprovalHistory = useMemo(() => {
    if (!selectedRecord) return []
    if (
      Array.isArray(selectedRecord.approvalHistory) &&
      selectedRecord.approvalHistory.length > 0
    ) {
      return selectedRecord.approvalHistory
    }
    return [
      {
        id: `oh-${selectedRecord.id || 'submitted'}`,
        at: selectedRecord.appliedAt,
        action: 'Submitted',
        by: selectedRecord.submittedBy || selectedRecord.employee || actorName,
        remarks: 'Overtime claim submitted.',
      },
    ]
  }, [actorName, selectedRecord])

  const selectedRecordStatusLabel = useMemo(
    () => getOvertimeWorkflowStatusLabel(selectedRecord),
    [selectedRecord],
  )
  const selectedRecordPendingActionHint = useMemo(
    () => getOvertimeWorkflowPendingActionHint(selectedRecord),
    [selectedRecord],
  )
  const selectedRecordHistoryEntries = useMemo(
    () =>
      buildWorkflowHistoryEntries(selectedRecord, selectedRecordApprovalHistory, {
        targetLabel: selectedRecord?.id || selectedRecord?.recordKey || '',
        submittedRemarks: 'Overtime claim submitted.',
      }),
    [selectedRecord, selectedRecordApprovalHistory],
  )

  const normalizedUserRoles = useMemo(() => normalizeRoleList(user?.roles || []), [user?.roles])
  const isSystemAdmin = useMemo(
    () =>
      normalizedUserRoles.includes('System Administrator') || hasPermission(user, 'system.admin'),
    [normalizedUserRoles, user],
  )

  const getOvertimeApplicantRolesForRecord = useCallback((row) => {
    return normalizeRoleList(row?.applicantRoles || [])
  }, [])

  const {
    getOvertimeReviewActionConfig,
    overtimeWorkflowModalState,
    overtimeWorkflowModalActionLabel,
    isRejectOvertimeWorkflowModal,
    overtimeWorkflowModalActionDisabled,
    overtimeWorkflowRemarks,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowDeclarationError,
    overtimeWorkflowRejectError,
    handleOvertimeWorkflowRemarksChange,
    handleOvertimeWorkflowDeclarationChange,
    closeOvertimeWorkflowModal,
    submitOvertimeWorkflowApprove,
    submitOvertimeWorkflowReject,
    approveOvertime,
    rejectOvertime,
    runOvertimeWorkflowAction,
  } = useOvertimeAdminWorkflow({
    normalizedUserRoles,
    isSystemAdmin,
    getOvertimeApplicantRolesForRecord,
    hydrateOvertime,
    pushToast,
  })

  const runBulkOvertimeWorkflowAction = useCallback(
    async ({ action, rows, remarks = '', declarationChecked = false } = {}) => {
      if (isBulkOvertimeSubmitting) return { processed: 0, succeeded: 0, failed: 0 }
      const selectedRows = Array.isArray(rows) ? rows.filter((row) => row?.id) : []
      if (selectedRows.length === 0) return { processed: 0, succeeded: 0, failed: 0 }

      setIsBulkOvertimeSubmitting(true)
      try {
        let succeeded = 0
        let failed = 0
        for (const row of selectedRows) {
          const ok = await runOvertimeWorkflowAction(
            row,
            {
              decision: action === 'reject' ? 'reject' : 'approve',
              remarks,
              declarationChecked,
            },
            {
              refreshAfter: false,
              showSuccessToast: false,
              showFailureToast: false,
            },
          )
          if (ok) {
            succeeded += 1
          } else {
            failed += 1
          }
        }

        if (succeeded > 0) {
          await hydrateOvertime()
        }

        const actionLabel = action === 'reject' ? 'Rejected' : 'Processed'
        const summaryMessage =
          failed > 0
            ? `${actionLabel} ${succeeded} overtime record${succeeded === 1 ? '' : 's'} (${failed} failed).`
            : `${actionLabel} ${succeeded} overtime record${succeeded === 1 ? '' : 's'}.`

        pushToast(summaryMessage, {
          title: failed > 0 ? 'Bulk action completed with issues' : 'Bulk action completed',
          color: failed > 0 ? (succeeded > 0 ? 'warning' : 'danger') : 'success',
        })

        return { processed: selectedRows.length, succeeded, failed }
      } finally {
        setIsBulkOvertimeSubmitting(false)
      }
    },
    [hydrateOvertime, isBulkOvertimeSubmitting, pushToast, runOvertimeWorkflowAction],
  )

  const applySearch = useCallback((value) => {
    setSearch(value)
    setPage(1)
  }, [])
  const applyPeriod = useCallback((value) => {
    setPeriod(value)
    setPage(1)
  }, [])
  const applySort = useCallback((value) => {
    setSort(value)
    setPage(1)
  }, [])
  const applyStatusFilter = useCallback((value) => {
    setStatusFilter(value)
    setPage(1)
  }, [])
  const applyOvertimeTypeFilter = useCallback((value) => {
    setOvertimeTypeFilter(value)
    setPage(1)
  }, [])
  const applyTeamFilter = useCallback((value) => {
    setTeamFilter(value)
    setPage(1)
  }, [])
  const applyRowsToShow = useCallback((value) => {
    const next = Number(value) || DEFAULT_ROWS_TO_SHOW
    setRowsToShow(next)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setOvertimeTypeFilter('All')
    setTeamFilter('All')
    setPeriod('all')
    setSort('appliedAt:desc')
    setPage(1)
  }, [])

  const openOvertimeDetail = useCallback(
    (row) => {
      if (!row?.id) return
      const routeKey = String(
        row?.recordKey || buildCompositeOvertimeRecordKey(row?.ownerUserId || '', row?.id),
      ).trim()
      if (!routeKey) return
      navigate(`/staff/overtime-management/record/${encodeURIComponent(routeKey)}`, {
        state: { tab: resolvedTab },
      })
    },
    [navigate, resolvedTab],
  )

  const backToOvertimePage = useCallback(() => {
    navigate(`/staff/overtime-management/${resolvedTabPath}`)
  }, [navigate, resolvedTabPath])

  const switchTab = useCallback(
    (nextTab) => {
      if (!Object.keys(OVERTIME_PATH_BY_TAB).includes(nextTab)) return
      const nextPath = OVERTIME_PATH_BY_TAB[nextTab] || OVERTIME_PATH_BY_TAB[DEFAULT_OVERTIME_TAB]
      navigate(`/staff/overtime-management/${nextPath}`, { replace: true })
    },
    [navigate],
  )

  if (!user) {
    return (
      <div className="my-4 text-danger">
        Unable to load overtime management. Please sign in again.
      </div>
    )
  }

  if (!isHrUser) {
    return (
      <div className="my-4 text-danger">
        You do not have permission to view overtime management.
      </div>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />

      <OvertimeWorkflowActionModal
        visible={overtimeWorkflowModalState.visible}
        record={overtimeWorkflowModalState.record}
        actionLabel={overtimeWorkflowModalActionLabel}
        actionType={isRejectOvertimeWorkflowModal ? 'reject' : 'approve'}
        actionDisabled={overtimeWorkflowModalActionDisabled}
        remarks={overtimeWorkflowRemarks}
        onRemarksChange={handleOvertimeWorkflowRemarksChange}
        showDeclaration={!isRejectOvertimeWorkflowModal}
        declarationRequired={!isRejectOvertimeWorkflowModal}
        declarationChecked={overtimeWorkflowDeclarationChecked}
        onDeclarationChange={handleOvertimeWorkflowDeclarationChange}
        declarationLabel={OVERTIME_WORKFLOW_DECLARATION_LABEL}
        declarationError={overtimeWorkflowDeclarationError}
        rejectError={overtimeWorkflowRejectError}
        statusColorMap={statusColorMap}
        formatDate={formatOvertimeDate}
        getDisplayOvertimeId={getDisplayOvertimeId}
        getStartDateTimeLabel={getOvertimeStartDateTimeLabel}
        getEndDateTimeLabel={getOvertimeEndDateTimeLabel}
        onClose={closeOvertimeWorkflowModal}
        onSubmit={
          isRejectOvertimeWorkflowModal
            ? submitOvertimeWorkflowReject
            : submitOvertimeWorkflowApprove
        }
      />

      {!isDetailRoute ? (
        <>
          <CNav variant="underline" role="tablist" className="mb-3">
            <CNavItem role="presentation">
              <CNavLink
                active={resolvedTab === 'overtimeRecords'}
                onClick={(event) => {
                  event.preventDefault()
                  switchTab('overtimeRecords')
                }}
                style={{ cursor: 'pointer' }}
              >
                Overtime Records
              </CNavLink>
            </CNavItem>
            <CNavItem role="presentation">
              <CNavLink
                active={resolvedTab === 'otRules'}
                onClick={(event) => {
                  event.preventDefault()
                  switchTab('otRules')
                }}
                style={{ cursor: 'pointer' }}
              >
                Set OT Rules
              </CNavLink>
            </CNavItem>
          </CNav>

          {resolvedTab === 'overtimeRecords' ? (
            <OvertimeRecordsTab
              vm={{
                search,
                period,
                sort,
                statusFilter,
                overtimeTypeFilter,
                teamFilter,
                statusOptions,
                overtimeTypeOptions,
                teamOptions,
                overtimeSortOptions,
                rows: filteredAdminOvertimeRows,
                rowsToShow,
                currentPage: recordsMeta.page,
                lastPage: search.trim() ? 1 : recordsMeta.lastPage,
                filteredCount: search.trim()
                  ? filteredAdminOvertimeRows.length
                  : recordsMeta.filteredCount,
                totalCount: recordsMeta.totalCount,
                isLoading: isRecordsLoading,
                getStatusBadge,
                getStatusLabel: getOvertimeWorkflowStatusLabel,
                getPendingActionHint: getOvertimeWorkflowPendingActionHint,
                getDisplayOvertimeId,
                getStartDateTimeLabel: getOvertimeStartDateTimeLabel,
                getEndDateTimeLabel: getOvertimeEndDateTimeLabel,
                formatDate: formatOvertimeDate,
                getReviewActionConfig: getOvertimeReviewActionConfig,
              }}
              handlers={{
                setSearch: applySearch,
                setPeriod: applyPeriod,
                setSort: applySort,
                setStatusFilter: applyStatusFilter,
                setOvertimeTypeFilter: applyOvertimeTypeFilter,
                setTeamFilter: applyTeamFilter,
                clearFilters,
                setRowsToShow: applyRowsToShow,
                setPage,
                approveOvertime,
                rejectOvertime,
                openOvertimeDetail,
                onBulkWorkflowAction: runBulkOvertimeWorkflowAction,
                isBulkSubmitting: isBulkOvertimeSubmitting,
              }}
            />
          ) : null}

          {resolvedTab === 'otRules' ? <OvertimeApprovalRules /> : null}
        </>
      ) : (
        <OvertimeDetailSection
          selectedRecord={selectedRecord}
          selectedRecordStatusLabel={selectedRecordStatusLabel}
          selectedRecordPendingActionHint={selectedRecordPendingActionHint}
          selectedRecordHistoryEntries={selectedRecordHistoryEntries}
          onBack={backToOvertimePage}
          getDisplayOvertimeId={getDisplayOvertimeId}
          getScheduleLabel={getOvertimeScheduleLabel}
          getStatusBadge={getStatusBadge}
          formatDate={formatOvertimeDate}
          formatDateTime={formatOvertimeDateTime}
          showGuidanceMetadata={showGuidanceMetadata}
        />
      )}
    </CContainer>
  )
}

export default OvertimeManagement
