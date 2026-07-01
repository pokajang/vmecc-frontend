import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import { CalendarDays, Clock3, Eye, EyeOff, LayoutGrid, TriangleAlert, Wallet } from 'lucide-react'
import { getPrimaryRoleLabel, hasPermission } from 'src/utils/authz'
import { isModuleEnabled } from 'src/utils/modules'
import { DASHBOARD_SECTION_PERMISSIONS } from 'src/constants/dashboardVisibility'
import useDashboardStats from './hooks/useDashboardStats'
import useMyStats from './hooks/useMyStats'
import { PERIOD_OPTIONS, resolvePeriodLabel } from './components/DashboardHeader'
import { MODULE_ACCENTS } from './utils/chartDefaults'
import MyStats from './components/MyStats'
import {
  PayrollKpiTiles,
  PayrollOperationsCard,
  PayrollAssignmentsCard,
  PayrollActivityChart,
  PayrollStatusBreakdown,
} from './components/PayrollStats'
import {
  OvertimeKpiTiles,
  OvertimeOperationsCard,
  OvertimeTeamCard,
  OvertimeActivityChart,
  OvertimeStatusBreakdown,
} from './components/OvertimeStats'
import { LeaveKpiTiles, LeaveActivityChart, LeaveTeamBreakdown } from './components/LeaveStats'
import { RosterKpiTiles, RosterActivityChart, RosterTeamBreakdown } from './components/RosterStats'
import { ReportKpiTiles, ReportActivityChart, ReportBreakdown } from './components/ReportStats'

const ModuleSectionHeader = ({
  title,
  subtext,
  accentColor = '#1b7a4a',
  icon: Icon,
  period,
  onPeriodChange,
  children,
}) => {
  const [visible, setVisible] = useState(true)
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label || resolvePeriodLabel(period)

  return (
    <div className={visible ? 'mt-5' : 'mt-3'}>
      <div className="mb-4 px-3 py-2 rounded" style={{ background: 'var(--cui-tertiary-bg)' }}>
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {Icon && <Icon size={20} style={{ color: accentColor, flexShrink: 0 }} />}
            <div className="d-flex align-items-baseline gap-2 flex-wrap">
              <div className="fw-semibold" style={{ fontSize: '1.2rem' }}>
                {title}
              </div>
              {subtext && <div className="text-muted">{subtext}</div>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {period && onPeriodChange && (
              <CDropdown alignment="end">
                <CDropdownToggle
                  size="sm"
                  className="d-inline-flex align-items-center border-0 shadow-none"
                  style={{ background: 'rgba(0, 126, 122, 0.12)', color: 'var(--cui-primary)' }}
                >
                  {selectedPeriodLabel}
                </CDropdownToggle>
                <CDropdownMenu>
                  {PERIOD_OPTIONS.map((option) => (
                    <CDropdownItem
                      key={option.value}
                      active={option.value === period}
                      onClick={() => onPeriodChange(option.value)}
                    >
                      {option.label}
                    </CDropdownItem>
                  ))}
                </CDropdownMenu>
              </CDropdown>
            )}
            <CButton
              size="sm"
              className="px-2 py-1 d-inline-flex align-items-center border-0 bg-transparent shadow-none text-primary"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide section' : 'Show section'}
              title={visible ? 'Hide section' : 'Show section'}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </CButton>
          </div>
        </div>
      </div>
      {visible && children}
    </div>
  )
}

const SectionHeading = ({ title, subtext }) => (
  <div className="mb-3 mt-3">
    <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
      {title}
    </span>
    {subtext && <span className="text-muted ms-2">{subtext}</span>}
  </div>
)

const buildDashboardActionQueue = ({
  stats,
  canViewPayrollSection,
  canViewOvertimeSection,
  canViewLeaveSection,
  canViewRosterSection,
  canViewReportsSection,
}) => {
  const items = []
  const addItem = (condition, item) => {
    if (condition && Number(item.count) > 0) items.push(item)
  }

  addItem(canViewPayrollSection, {
    key: 'payroll-approvals',
    module: 'Payroll',
    label: 'Claims pending approval',
    count: stats.payroll?.pendingApprovals,
    to: '/staff/salary-claims/claims',
    tone: MODULE_ACCENTS.payroll.base,
  })
  addItem(canViewPayrollSection, {
    key: 'payroll-unpaid',
    module: 'Payroll',
    label: 'Approved unpaid claims',
    count: stats.payroll?.approvedUnpaidCount,
    to: '/staff/salary-claims/claims',
    tone: MODULE_ACCENTS.payroll.base,
  })
  addItem(canViewOvertimeSection, {
    key: 'overtime-approvals',
    module: 'Overtime',
    label: 'Requests pending approval',
    count: stats.overtime?.pendingApprovals,
    to: '/staff/overtime-management/records',
    tone: MODULE_ACCENTS.overtime.base,
  })
  addItem(canViewLeaveSection, {
    key: 'leave-approvals',
    module: 'Leave',
    label: 'Requests pending approval',
    count: stats.leave?.pendingApprovals,
    to: '/staff/leave-management/records',
    tone: MODULE_ACCENTS.leave.base,
  })
  addItem(canViewRosterSection, {
    key: 'roster-drafts',
    module: 'Roster',
    label: 'Draft days pending publish',
    count: stats.roster?.draftsPendingPublish,
    to: '/roster/schedule',
    tone: MODULE_ACCENTS.roster.base,
  })
  addItem(canViewReportsSection, {
    key: 'reports-review',
    module: 'Reports',
    label: 'Reports pending review',
    count: stats.reports?.pendingReview,
    to: '/report/erco',
    tone: MODULE_ACCENTS.reports.base,
  })
  addItem(canViewReportsSection, {
    key: 'reports-approval',
    module: 'Reports',
    label: 'Reports pending approval',
    count: stats.reports?.pendingApproval,
    to: '/report/erco',
    tone: MODULE_ACCENTS.reports.base,
  })

  return items
}

const DashboardActionQueue = ({ items, loading, periodLabel, hasModuleErrors = false }) => (
  <CCard
    className="mb-4"
    data-tour-id="dashboard-action-queue"
    data-testid="dashboard-action-queue"
  >
    <CCardBody>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <h5 className="mb-1 fw-semibold">Action Queue</h5>
          <div className="text-body-secondary small">
            Items needing attention now - {periodLabel}
          </div>
        </div>
        {items.length > 0 && (
          <span className="badge text-bg-light border">{items.length} groups</span>
        )}
      </div>
      {loading ? (
        <div className="text-body-secondary small" data-testid="dashboard-action-queue-loading">
          Loading action queue...
        </div>
      ) : hasModuleErrors && items.length === 0 ? (
        <div className="text-body-secondary small" data-testid="dashboard-action-queue-error">
          Some dashboard modules could not be loaded. Action queue values may be partial.
        </div>
      ) : items.length === 0 ? (
        <div className="text-body-secondary small" data-testid="dashboard-action-queue-empty">
          No dashboard actions need attention.
        </div>
      ) : (
        <div className="d-grid gap-2" data-testid="dashboard-action-queue-items">
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className="d-flex flex-wrap align-items-center justify-content-between gap-2 rounded border bg-body px-3 py-2 text-decoration-none text-body"
            >
              <span className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.tone,
                    flexShrink: 0,
                  }}
                />
                <span className="d-grid" style={{ minWidth: 0 }}>
                  <span className="fw-semibold text-break">{item.label}</span>
                  <span className="small text-body-secondary">{item.module}</span>
                </span>
              </span>
              <span className="fw-semibold">{item.count}</span>
            </Link>
          ))}
        </div>
      )}
    </CCardBody>
  </CCard>
)

const DashboardModuleSlot = ({ moduleKey, isVisible, children }) => (
  <div
    data-testid={`dashboard-module-${moduleKey}`}
    data-visible={isVisible ? 'visible' : 'hidden'}
    hidden={!isVisible}
  >
    {children}
  </div>
)

const moduleFriendlyName = {
  payroll: 'payroll',
  overtime: 'overtime',
  leave: 'leave',
  roster: 'roster',
  reports: 'reports',
}

const DashboardModuleCardGuard = ({ moduleKey, moduleStats, onRetry, children }) => {
  const state = moduleStats?.[moduleKey]
  const isLoading = Boolean(state?.loading)
  const stateError = state?.error ? String(state.error).replace(/^Error: /, '') : ''

  if (isLoading) {
    return (
      <CAlert color="secondary" className="mb-3" data-testid={`dashboard-${moduleKey}-loading`}>
        Loading {moduleFriendlyName[moduleKey]} stats...
      </CAlert>
    )
  }

  if (stateError) {
    return (
      <CAlert color="warning" className="mb-3" data-testid={`dashboard-${moduleKey}-error`}>
        <div className="mb-2">
          Unable to load {moduleFriendlyName[moduleKey]} stats right now. {stateError}
        </div>
        <CButton size="sm" color="warning" variant="outline" onClick={onRetry}>
          Retry {moduleFriendlyName[moduleKey]}
        </CButton>
      </CAlert>
    )
  }

  return children
}

const Dashboard = () => {
  const authUser = useSelector((state) => state.authUser)
  const moduleActivation = useSelector((state) => state.moduleActivation)
  const { stats: myStats, loading: myStatsLoading } = useMyStats()
  const [myStatsVisible, setMyStatsVisible] = useState(true)
  const [period, setPeriod] = useState('this_month')
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const periodLabel = resolvePeriodLabel(period)
  const userName = authUser?.name || authUser?.full_name || ''
  const userRole = getPrimaryRoleLabel(authUser)
  const canViewPayrollSection =
    hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.payroll) &&
    isModuleEnabled(moduleActivation, 'dashboard.payroll')
  const canViewOvertimeSection =
    hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.overtime) &&
    isModuleEnabled(moduleActivation, 'dashboard.overtime')
  const canViewLeaveSection =
    hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.leave) &&
    isModuleEnabled(moduleActivation, 'dashboard.leave')
  const canViewRosterSection =
    hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.roster) &&
    isModuleEnabled(moduleActivation, 'dashboard.roster')
  const canViewReportsSection =
    hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.reports) &&
    isModuleEnabled(moduleActivation, 'dashboard.reports')
  const visibleDashboardModules = useMemo(
    () =>
      [
        canViewPayrollSection ? 'payroll' : null,
        canViewOvertimeSection ? 'overtime' : null,
        canViewLeaveSection ? 'leave' : null,
        canViewRosterSection ? 'roster' : null,
        canViewReportsSection ? 'reports' : null,
      ].filter(Boolean),
    [
      canViewPayrollSection,
      canViewOvertimeSection,
      canViewLeaveSection,
      canViewRosterSection,
      canViewReportsSection,
    ],
  )
  const { stats, loading, moduleStats } = useDashboardStats({
    period,
    modules: visibleDashboardModules,
    refreshToken: dashboardRefreshToken,
  })
  const payrollLoading = moduleStats?.payroll?.loading
  const overtimeLoading = moduleStats?.overtime?.loading
  const leaveLoading = moduleStats?.leave?.loading
  const rosterLoading = moduleStats?.roster?.loading
  const reportsLoading = moduleStats?.reports?.loading
  const refreshDashboardStats = () => setDashboardRefreshToken((value) => value + 1)
  const actionQueueHasModuleErrors = visibleDashboardModules.some((moduleKey) =>
    Boolean(moduleStats?.[moduleKey]?.error),
  )
  const actionQueueItems = useMemo(
    () =>
      buildDashboardActionQueue({
        stats,
        canViewPayrollSection,
        canViewOvertimeSection,
        canViewLeaveSection,
        canViewRosterSection,
        canViewReportsSection,
      }),
    [
      stats,
      canViewPayrollSection,
      canViewOvertimeSection,
      canViewLeaveSection,
      canViewRosterSection,
      canViewReportsSection,
    ],
  )

  if (!hasPermission(authUser, 'self.dashboard')) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to the dashboard.
      </CAlert>
    )
  }

  return (
    <div data-tour-id="dashboard-module">
      <CCard
        className="mb-4 border-0"
        data-tour-id="dashboard-overview"
        style={{ background: 'rgba(0, 126, 122, 0.08)' }}
      >
        <CCardBody>
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div>
              <h4 className="mb-1 fw-semibold">Dashboard Overview</h4>
              <div className="text-body-secondary">
                {userName ? `Welcome back, ${userName}` : ''}
                {userName && userRole ? ` (${userRole})` : ''}
              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <CDropdown alignment="end" data-tour-id="dashboard-period-control">
                <CDropdownToggle size="sm" color="primary" variant="outline">
                  {periodLabel}
                </CDropdownToggle>
                <CDropdownMenu>
                  {PERIOD_OPTIONS.map((option) => (
                    <CDropdownItem
                      key={option.value}
                      active={option.value === period}
                      onClick={() => setPeriod(option.value)}
                    >
                      {option.label}
                    </CDropdownItem>
                  ))}
                </CDropdownMenu>
              </CDropdown>
              <CButton
                size="sm"
                className="px-2 py-1 d-inline-flex align-items-center border-0 bg-transparent shadow-none text-primary"
                onClick={() => setMyStatsVisible((v) => !v)}
                aria-label={myStatsVisible ? 'Hide my stats' : 'Show my stats'}
                title={myStatsVisible ? 'Hide my stats' : 'Show my stats'}
              >
                {myStatsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </CButton>
            </div>
          </div>
          {myStatsVisible && (
            <div className="mt-4" data-tour-id="dashboard-my-stats">
              <MyStats stats={myStats} loading={myStatsLoading} />
            </div>
          )}
        </CCardBody>
      </CCard>

      <DashboardActionQueue
        items={actionQueueItems}
        loading={loading}
        periodLabel={periodLabel}
        hasModuleErrors={actionQueueHasModuleErrors}
      />

      <DashboardModuleSlot moduleKey="payroll" isVisible={canViewPayrollSection}>
        {canViewPayrollSection && (
          <ModuleSectionHeader
            title="Payroll Claims"
            subtext={`Salary & expense claims - ${periodLabel}`}
            accentColor={MODULE_ACCENTS.payroll.base}
            icon={Wallet}
          >
            <DashboardModuleCardGuard
              moduleKey="payroll"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading
                title="Current Status"
                subtext={`Key claim metrics - ${periodLabel}`}
              />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <PayrollKpiTiles
                  stats={stats.payroll}
                  loading={payrollLoading}
                  periodLabel={periodLabel}
                />
              </CRow>

              <SectionHeading
                title="Period Summary"
                subtext={`Payroll & assignment totals - ${periodLabel}`}
              />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <PayrollOperationsCard
                  stats={stats.payroll}
                  loading={payrollLoading}
                  periodLabel={periodLabel}
                />
                <PayrollAssignmentsCard stats={stats.payroll} loading={payrollLoading} />
              </CRow>

              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <CCol xs={12} lg={6}>
                  <PayrollActivityChart
                    stats={stats.payroll}
                    loading={payrollLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
                <CCol xs={12} lg={6}>
                  <PayrollStatusBreakdown
                    stats={stats.payroll}
                    loading={payrollLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
              </CRow>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="overtime" isVisible={canViewOvertimeSection}>
        {canViewOvertimeSection && (
          <ModuleSectionHeader
            title="Overtime"
            subtext={`OT requests & approvals - ${periodLabel}`}
            accentColor={MODULE_ACCENTS.overtime.base}
            icon={Clock3}
          >
            <DashboardModuleCardGuard
              moduleKey="overtime"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current Status" subtext={`Key OT metrics - ${periodLabel}`} />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <OvertimeKpiTiles
                  stats={stats.overtime}
                  loading={overtimeLoading}
                  periodLabel={periodLabel}
                />
              </CRow>

              <SectionHeading
                title="Period Summary"
                subtext={`OT approvals & team distribution - ${periodLabel}`}
              />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <OvertimeOperationsCard
                  stats={stats.overtime}
                  loading={overtimeLoading}
                  periodLabel={periodLabel}
                />
                <OvertimeTeamCard stats={stats.overtime} loading={overtimeLoading} />
              </CRow>

              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <CCol xs={12} lg={6}>
                  <OvertimeActivityChart
                    stats={stats.overtime}
                    loading={overtimeLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
                <CCol xs={12} lg={6}>
                  <OvertimeStatusBreakdown
                    stats={stats.overtime}
                    loading={overtimeLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
              </CRow>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="leave" isVisible={canViewLeaveSection}>
        {canViewLeaveSection && (
          <ModuleSectionHeader
            title="Leave"
            subtext={`Leave requests & absences - ${periodLabel}`}
            accentColor={MODULE_ACCENTS.leave.base}
            icon={CalendarDays}
          >
            <DashboardModuleCardGuard
              moduleKey="leave"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading
                title="Current Status"
                subtext={`Key leave metrics - ${periodLabel}`}
              />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <LeaveKpiTiles
                  stats={stats.leave}
                  loading={leaveLoading}
                  periodLabel={periodLabel}
                />
              </CRow>

              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <CCol xs={12} lg={6}>
                  <LeaveActivityChart
                    stats={stats.leave}
                    loading={leaveLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
                <CCol xs={12} lg={6}>
                  <LeaveTeamBreakdown
                    stats={stats.leave}
                    loading={leaveLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
              </CRow>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="roster" isVisible={canViewRosterSection}>
        {canViewRosterSection && (
          <ModuleSectionHeader
            title="Roster & Teams"
            subtext={`Shift scheduling & team coverage - ${periodLabel}`}
            accentColor={MODULE_ACCENTS.roster.base}
            icon={LayoutGrid}
          >
            <DashboardModuleCardGuard
              moduleKey="roster"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current Status" subtext="Live roster snapshot" />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <RosterKpiTiles stats={stats.roster} loading={rosterLoading} />
              </CRow>

              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <CCol xs={12} lg={6}>
                  <RosterActivityChart stats={stats.roster} loading={rosterLoading} />
                </CCol>
                <CCol xs={12} lg={6}>
                  <RosterTeamBreakdown stats={stats.roster} loading={rosterLoading} />
                </CCol>
              </CRow>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="reports" isVisible={canViewReportsSection}>
        {canViewReportsSection && (
          <ModuleSectionHeader
            title="Reports"
            subtext={`ERCO, Drill & Fitness Test submissions - ${periodLabel}`}
            accentColor={MODULE_ACCENTS.reports.base}
            icon={TriangleAlert}
          >
            <DashboardModuleCardGuard
              moduleKey="reports"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading
                title="Current Status"
                subtext={`Key report metrics - ${periodLabel}`}
              />
              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <ReportKpiTiles
                  stats={stats.reports}
                  loading={reportsLoading}
                  periodLabel={periodLabel}
                />
              </CRow>

              <CRow className="mb-4" xs={{ gutter: 4 }}>
                <CCol xs={12} lg={5}>
                  <ReportActivityChart
                    stats={stats.reports}
                    loading={reportsLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
                <CCol xs={12} lg={7}>
                  <ReportBreakdown
                    stats={stats.reports}
                    loading={reportsLoading}
                    periodLabel={periodLabel}
                  />
                </CCol>
              </CRow>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>
    </div>
  )
}

export default Dashboard
