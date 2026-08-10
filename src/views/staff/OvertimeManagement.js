import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CBadge, CContainer, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { buildWorkflowHistoryEntries } from 'src/components/auditHistory'
import ModulePageHeader from 'src/components/ModulePageHeader'
import RouteNavTabs from 'src/components/RouteNavTabs'
import { isHolidayGuidanceStaffVisibilityEnabledForUser } from 'src/config/featureFlags'
import { fetchStaffOvertimeRecord } from 'src/services/apiClient'
import {
  loadStaffOvertimeRecordByPublicId,
  loadStaffOvertimeRecordsApiFirst,
  mapOvertimeApiRowToUi,
} from 'src/services/overtimeApi'
import {
  createPayrollRequestContext,
  resolveSensitiveIdentityKey,
} from 'src/services/payrollPrivacy'
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
import {
  overtimeSortOptions,
  OVERTIME_MANAGEMENT_ALLOWED_PERMISSIONS,
} from './leave-management/data'
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

const OvertimeManagementContent = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { overtimeRouteKey } = useParams()
  const user = useSelector((state) => state.authUser)
  const isHrUser = useMemo(
    () => hasAnyPermission(user, OVERTIME_MANAGEMENT_ALLOWED_PERMISSIONS),
    [user],
  )
  const canManageOvertimeRules = useMemo(() => hasPermission(user, 'settings.manage'), [user])
  const showGuidanceMetadata = isHolidayGuidanceStaffVisibilityEnabledForUser(user)
  const actorName = useMemo(
    () => user?.name || user?.full_name || user?.email || 'System user',
    [user?.name, user?.full_name, user?.email],
  )
  const isDetailRoute = Boolean(overtimeRouteKey)
  const actionQueueAction = useMemo(() => {
    const action = String(new URLSearchParams(location.search).get('action') || '').toLowerCase()
    return ['review', 'recommend', 'approve'].includes(action) ? action : ''
  }, [location.search])
  const actionQueueTeamId = useMemo(() => {
    const value = Number(new URLSearchParams(location.search).get('team_id') || 0)
    return Number.isInteger(value) && value > 0 ? value : null
  }, [location.search])
  const actionQueueStatus = useMemo(
    () => String(new URLSearchParams(location.search).get('status') || 'All'),
    [location.search],
  )

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
  const [recordsIdentityId, setRecordsIdentityId] = useState('')
  const [selectedRecordFallback, setSelectedRecordFallback] = useState(null)
  const overtimeRequestRef = useRef(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(actionQueueStatus)
  const [overtimeTypeFilter, setOvertimeTypeFilter] = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('appliedAt:desc')
  const [rowsToShow, setRowsToShow] = useState(DEFAULT_ROWS_TO_SHOW)
  const [page, setPage] = useState(1)
  const [isBulkOvertimeSubmitting, setIsBulkOvertimeSubmitting] = useState(false)

  useEffect(() => {
    setStatusFilter(actionQueueStatus)
    setPage(1)
  }, [actionQueueStatus])

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
  const requestedDetailReturnTab = ['overtimeRecords', 'otRules'].includes(location.state?.tab)
    ? location.state.tab
    : DEFAULT_OVERTIME_TAB
  const detailReturnTab =
    requestedDetailReturnTab === 'otRules' && !canManageOvertimeRules
      ? DEFAULT_OVERTIME_TAB
      : requestedDetailReturnTab
  const requestedTab = isDetailRoute ? detailReturnTab : tabFromPath || DEFAULT_OVERTIME_TAB
  const resolvedTab =
    requestedTab === 'otRules' && !canManageOvertimeRules ? DEFAULT_OVERTIME_TAB : requestedTab
  const resolvedTabPath =
    OVERTIME_PATH_BY_TAB[resolvedTab] || OVERTIME_PATH_BY_TAB[DEFAULT_OVERTIME_TAB]

  useEffect(() => {
    if (!isDetailRoute && tabFromPath === 'otRules' && !canManageOvertimeRules) {
      navigate('/staff/overtime-management/records', { replace: true })
    }
  }, [canManageOvertimeRules, isDetailRoute, navigate, tabFromPath])

  const hydrateOvertime = useCallback(
    async ({ showWarningToast = false } = {}) => {
      const requestContext = createPayrollRequestContext(user?.id)
      if (!isHrUser || !user?.id) {
        setRecordsIdentityId(String(user?.id || ''))
        setAllOvertimeRecords([])
        setRecordsMeta(DEFAULT_META)
        setRecordsFilters({ status: [], overtimeType: [], team: [] })
        setSelectedRecordFallback(null)
        requestContext.release()
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
        action: actionQueueAction || undefined,
        team_id: actionQueueTeamId || undefined,
      }

      const requestId = overtimeRequestRef.current + 1
      overtimeRequestRef.current = requestId
      setIsRecordsLoading(true)
      try {
        const result = await loadStaffOvertimeRecordsApiFirst(params, {
          signal: requestContext.signal,
        })
        if (!requestContext.isCurrent() || requestId !== overtimeRequestRef.current) {
          return result
        }
        const nextRows = Array.isArray(result?.data) ? result.data : []
        const nextMeta = resolveApiMeta(result?.meta, nextRows, rowsToShow)

        if (
          (nextMeta.filteredCount || 0) > 0 &&
          nextRows.length === 0 &&
          page > nextMeta.lastPage
        ) {
          setPage(Math.max(1, nextMeta.lastPage))
          return result
        }

        setRecordsIdentityId(String(user.id))
        setAllOvertimeRecords(nextRows)
        setRecordsMeta(nextMeta)
        if (result?.filters && typeof result.filters === 'object') {
          setRecordsFilters({
            status: normalizeOptionList(result.filters.status),
            overtimeType: normalizeOptionList(result.filters.overtime_type),
            team: normalizeOptionList(result.filters.team),
          })
        }

        if (showWarningToast && !result?.ok) {
          pushToast('Unable to load overtime records. Please retry.', {
            title: 'Data warning',
            color: 'warning',
          })
        }
        return result
      } finally {
        if (requestContext.isCurrent() && requestId === overtimeRequestRef.current) {
          setIsRecordsLoading(false)
        }
        requestContext.release()
      }
    },
    [
      isHrUser,
      actionQueueAction,
      actionQueueTeamId,
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
    overtimeRequestRef.current += 1
    hasInitialHydration.current = false
    const requestContext = createPayrollRequestContext(user?.id)
    requestContext.release()
  }, [user?.id])

  useEffect(() => {
    if (!isHrUser || !user?.id) return
    const showWarningToast = !hasInitialHydration.current
    hasInitialHydration.current = true
    hydrateOvertime({ showWarningToast })
  }, [hydrateOvertime, isHrUser, user?.id])

  const hasCurrentRecordsIdentity = recordsIdentityId === String(user?.id || '')
  const currentOvertimeRecords = useMemo(
    () => (hasCurrentRecordsIdentity ? allOvertimeRecords : []),
    [allOvertimeRecords, hasCurrentRecordsIdentity],
  )
  const currentRecordsMeta = hasCurrentRecordsIdentity ? recordsMeta : DEFAULT_META
  const currentRecordsFilters = useMemo(
    () => (hasCurrentRecordsIdentity ? recordsFilters : { status: [], overtimeType: [], team: [] }),
    [hasCurrentRecordsIdentity, recordsFilters],
  )

  const adminOvertimeRows = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(currentOvertimeRecords) ? currentOvertimeRecords : []).forEach((row, index) => {
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
  }, [currentOvertimeRecords])

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
    const fromApi = normalizeOptionList(currentRecordsFilters.status)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All status' }, ...fromApi]
    }
    const unique = Array.from(new Set(adminOvertimeRows.map((row) => row.status).filter(Boolean)))
    return [
      { value: 'All', label: 'All status' },
      ...unique.map((value) => ({ value, label: value })),
    ]
  }, [adminOvertimeRows, currentRecordsFilters.status])

  const overtimeTypeOptions = useMemo(() => {
    const fromApi = normalizeOptionList(currentRecordsFilters.overtimeType)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All OT type' }, ...fromApi]
    }
    return [{ value: 'All', label: 'All OT type' }]
  }, [currentRecordsFilters.overtimeType])

  const teamOptions = useMemo(() => {
    const fromApi = normalizeOptionList(currentRecordsFilters.team)
    if (fromApi.length > 0) {
      return [{ value: 'All', label: 'All team' }, ...fromApi]
    }
    return [{ value: 'All', label: 'All team' }]
  }, [currentRecordsFilters.team])

  const decodedOvertimeRouteKey = useMemo(
    () => decodeRouteValue(overtimeRouteKey),
    [overtimeRouteKey],
  )

  useEffect(() => {
    if (!isDetailRoute || !decodedOvertimeRouteKey || !user?.id) return undefined
    const requestContext = createPayrollRequestContext(user.id)
    const loadRecord = async () => {
      try {
        let mapped = null
        if (decodedOvertimeRouteKey.includes('::')) {
          const [ownerPart, recordPart] = decodedOvertimeRouteKey.split('::')
          const ownerId = Number(ownerPart)
          const recordId = Number(recordPart)
          if (
            !Number.isInteger(ownerId) ||
            ownerId <= 0 ||
            !Number.isInteger(recordId) ||
            recordId <= 0
          ) {
            throw new Error('Invalid overtime route key')
          }
          const response = await fetchStaffOvertimeRecord(ownerId, recordId, {
            signal: requestContext.signal,
          })
          mapped = mapOvertimeApiRowToUi(response?.data || {}, String(ownerId))
        } else {
          const result = await loadStaffOvertimeRecordByPublicId(decodedOvertimeRouteKey, {
            signal: requestContext.signal,
          })
          if (!result?.ok || !result?.data) throw result?.error || new Error('Record unavailable')
          mapped = result.data
        }
        if (!requestContext.isCurrent()) return
        setSelectedRecordFallback({
          ...mapped,
          requestIdentityId: String(user.id),
          requestRouteKey: decodedOvertimeRouteKey,
          id: String(mapped?.id || '').trim(),
          ownerUserId: String(mapped?.ownerUserId || ''),
          recordKey: String(mapped?.recordKey || mapped?.publicId || decodedOvertimeRouteKey),
          employee: String(mapped?.employee || mapped?.submittedBy || '').trim(),
          team: String(mapped?.team || '').trim() || 'Unassigned',
          applicantRoles: normalizeRoleList(mapped?.applicantRoles || []),
        })
      } catch {
        if (!requestContext.isCurrent()) return
        setSelectedRecordFallback(null)
        pushToast('This overtime record is unavailable or you no longer have access to it.', {
          title: 'Record unavailable',
          color: 'warning',
        })
        navigate(`/staff/overtime-management/${resolvedTabPath}`, { replace: true })
      }
    }

    void loadRecord().finally(requestContext.release)
    return requestContext.abort
  }, [decodedOvertimeRouteKey, isDetailRoute, navigate, pushToast, resolvedTabPath, user?.id])

  const selectedRecord = useMemo(() => {
    if (!decodedOvertimeRouteKey) return null
    const currentFallback =
      selectedRecordFallback?.requestIdentityId === String(user?.id || '') &&
      selectedRecordFallback?.requestRouteKey === decodedOvertimeRouteKey
        ? selectedRecordFallback
        : null
    if (decodedOvertimeRouteKey.includes('::')) {
      const fromRows =
        adminOvertimeRows.find((row) => String(row?.recordKey || '') === decodedOvertimeRouteKey) ||
        null
      if (fromRows && currentFallback) {
        return { ...fromRows, ...currentFallback }
      }
      return fromRows || currentFallback || null
    }
    return (
      adminOvertimeRows.find(
        (row) =>
          String(row?.recordKey || '') === decodedOvertimeRouteKey ||
          String(row?.publicId || '') === decodedOvertimeRouteKey ||
          String(row?.id || '') === decodedOvertimeRouteKey,
      ) || null
    )
  }, [adminOvertimeRows, decodedOvertimeRouteKey, selectedRecordFallback, user?.id])

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
    isCorrectionOvertimeWorkflowModal,
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
    submitOvertimeWorkflowCorrection,
    approveOvertime,
    rejectOvertime,
    requestOvertimeCorrection,
    runOvertimeWorkflowAction,
  } = useOvertimeAdminWorkflow({
    normalizedUserRoles,
    isSystemAdmin,
    canLoadOvertimePolicy: canManageOvertimeRules,
    getOvertimeApplicantRolesForRecord,
    hydrateOvertime,
    pushToast,
  })
  const selectedRecordReviewActionConfig = useMemo(
    () => (selectedRecord ? getOvertimeReviewActionConfig(selectedRecord) : null),
    [getOvertimeReviewActionConfig, selectedRecord],
  )

  const runBulkOvertimeWorkflowAction = useCallback(
    async ({ action, rows, remarks = '', declarationChecked = false } = {}) => {
      if (isBulkOvertimeSubmitting) return { processed: 0, succeeded: 0, failed: 0 }
      const selectedRows = Array.isArray(rows) ? rows.filter((row) => row?.id) : []
      if (selectedRows.length === 0) return { processed: 0, succeeded: 0, failed: 0 }
      const eligibleRows = selectedRows.filter((row) => {
        const config = getOvertimeReviewActionConfig(row)
        return action === 'reject' ? !config.rejectDisabled : !config.approveDisabled
      })
      if (eligibleRows.length !== selectedRows.length) {
        pushToast(
          'Some selected overtime claims are no longer eligible. Refresh and select again.',
          {
            title: 'Bulk action blocked',
            color: 'warning',
          },
        )
        return { processed: selectedRows.length, succeeded: 0, failed: selectedRows.length }
      }
      if (action !== 'reject') {
        const actionLabels = new Set(
          eligibleRows.map((row) => getOvertimeReviewActionConfig(row).approveLabel),
        )
        if (actionLabels.size !== 1) {
          pushToast('Select claims at the same workflow stage before processing them together.', {
            title: 'Mixed workflow stages',
            color: 'warning',
          })
          return { processed: selectedRows.length, succeeded: 0, failed: selectedRows.length }
        }
      }

      setIsBulkOvertimeSubmitting(true)
      try {
        let succeeded = 0
        let failed = 0
        for (const row of eligibleRows) {
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

        return { processed: eligibleRows.length, succeeded, failed }
      } finally {
        setIsBulkOvertimeSubmitting(false)
      }
    },
    [
      getOvertimeReviewActionConfig,
      hydrateOvertime,
      isBulkOvertimeSubmitting,
      pushToast,
      runOvertimeWorkflowAction,
    ],
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
    <CContainer fluid className="workflow-module-page" data-testid="overtime-management-module">
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />

      <OvertimeWorkflowActionModal
        visible={overtimeWorkflowModalState.visible}
        record={overtimeWorkflowModalState.record}
        actionLabel={overtimeWorkflowModalActionLabel}
        actionType={
          isRejectOvertimeWorkflowModal
            ? 'reject'
            : isCorrectionOvertimeWorkflowModal
              ? 'request_correction'
              : 'approve'
        }
        actionDisabled={overtimeWorkflowModalActionDisabled}
        remarks={overtimeWorkflowRemarks}
        onRemarksChange={handleOvertimeWorkflowRemarksChange}
        showDeclaration={!isRejectOvertimeWorkflowModal && !isCorrectionOvertimeWorkflowModal}
        declarationRequired={!isRejectOvertimeWorkflowModal && !isCorrectionOvertimeWorkflowModal}
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
            : isCorrectionOvertimeWorkflowModal
              ? submitOvertimeWorkflowCorrection
              : submitOvertimeWorkflowApprove
        }
      />

      {!isDetailRoute ? (
        <>
          <ModulePageHeader title="Staff Overtime Management" />

          <div data-testid="overtime-management-nav">
            <RouteNavTabs
              currentPath={resolvedTab}
              navigate={(tab) => switchTab(tab)}
              items={[
                {
                  key: 'overtimeRecords',
                  label: 'Overtime Records',
                  to: 'overtimeRecords',
                  match: 'overtimeRecords',
                },
                ...(canManageOvertimeRules
                  ? [
                      {
                        key: 'otRules',
                        label: 'Overtime Rules',
                        to: 'otRules',
                        match: 'otRules',
                      },
                    ]
                  : []),
              ]}
            />
          </div>

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
                currentPage: currentRecordsMeta.page,
                lastPage: search.trim() ? 1 : currentRecordsMeta.lastPage,
                filteredCount: search.trim()
                  ? filteredAdminOvertimeRows.length
                  : currentRecordsMeta.filteredCount,
                totalCount: currentRecordsMeta.totalCount,
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
                requestOvertimeCorrection,
                openOvertimeDetail,
                onBulkWorkflowAction: runBulkOvertimeWorkflowAction,
                isBulkSubmitting: isBulkOvertimeSubmitting,
              }}
            />
          ) : null}

          {resolvedTab === 'otRules' && canManageOvertimeRules ? (
            <div data-testid="overtime-management-rules">
              <OvertimeApprovalRules />
            </div>
          ) : null}
        </>
      ) : (
        <div data-testid="overtime-management-detail">
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
            showPageHeader
            reviewerActions={
              selectedRecordReviewActionConfig
                ? {
                    primaryLabel: selectedRecordReviewActionConfig.approveLabel,
                    primaryDisabled: selectedRecordReviewActionConfig.approveDisabled,
                    rejectDisabled: selectedRecordReviewActionConfig.rejectDisabled,
                    correctionDisabled: selectedRecordReviewActionConfig.correctionDisabled,
                    statusMessage: selectedRecordPendingActionHint,
                    onPrimary: approveOvertime,
                    onReject: rejectOvertime,
                    onCorrection: requestOvertimeCorrection,
                  }
                : null
            }
          />
        </div>
      )}
    </CContainer>
  )
}

const OvertimeManagement = () => {
  const identityKey = useSelector((state) => resolveSensitiveIdentityKey(state.authUser))

  return <OvertimeManagementContent key={`staff-overtime:${identityKey}`} />
}

export default OvertimeManagement
