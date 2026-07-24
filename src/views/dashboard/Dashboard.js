import React, { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CListGroup,
  CListGroupItem,
  CRow,
} from '@coreui/react'
import {
  CalendarDays,
  CircleCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  LayoutGrid,
  ListChecks,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { getPrimaryRoleLabel, hasPermission } from 'src/utils/authz'
import { isModuleEnabled } from 'src/utils/modules'
import { DASHBOARD_SECTION_PERMISSIONS } from 'src/constants/dashboardVisibility'
import useDashboardStats from './hooks/useDashboardStats'
import useDashboardActionQueue from './hooks/useDashboardActionQueue'
import { PERIOD_OPTIONS, resolvePeriodLabel } from './components/DashboardHeader'
import DashboardAnalyticsDisclosure from './components/DashboardAnalyticsDisclosure'
import { MODULE_ACCENTS } from './utils/chartDefaults'
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

const ModuleSectionHeader = ({ title, subtext, accentColor = '#1b7a4a', icon: Icon, children }) => {
  const [visible, setVisible] = useState(true)
  const contentId = useId()

  return (
    <CCard className={`${visible ? 'mt-5' : 'mt-3'} mb-4 dashboard-module-card`}>
      <CCardHeader
        className={`dashboard-module-card__header px-3 px-md-4 py-3 ${
          visible ? 'border-bottom' : 'border-bottom-0'
        }`}
        style={{ borderInlineStart: `4px solid ${accentColor}` }}
      >
        <div className="dashboard-module-card__toolbar">
          <div className="dashboard-module-card__heading">
            {Icon && (
              <Icon
                className="dashboard-module-card__icon"
                size={18}
                style={{ color: accentColor }}
              />
            )}
            <div>
              <h2 className="dashboard-module-card__title">{title}</h2>
              {subtext && <div className="dashboard-module-card__subtext">{subtext}</div>}
            </div>
          </div>
          <CButton
            size="sm"
            className="dashboard-collapse-button"
            onClick={() => setVisible((value) => !value)}
            aria-controls={contentId}
            aria-expanded={visible}
            aria-label={visible ? `Collapse ${title}` : `Expand ${title}`}
          >
            {visible ? (
              <ChevronUp size={17} aria-hidden="true" />
            ) : (
              <ChevronDown size={17} aria-hidden="true" />
            )}
          </CButton>
        </div>
      </CCardHeader>
      {visible && (
        <CCardBody id={contentId} className="dashboard-module-card__body p-3 p-md-4">
          {children}
        </CCardBody>
      )}
    </CCard>
  )
}

const SectionHeading = ({ title, subtext }) => (
  <div className="dashboard-section-heading">
    <h3 className="dashboard-section-heading__title">{title}</h3>
    {subtext && <p className="dashboard-section-heading__subtext">{subtext}</p>}
  </div>
)

const ACTION_QUEUE_TONES = {
  payroll: MODULE_ACCENTS.payroll.base,
  overtime: MODULE_ACCENTS.overtime.base,
  leave: MODULE_ACCENTS.leave.base,
  roster: MODULE_ACCENTS.roster.base,
  reports: MODULE_ACCENTS.reports.base,
  inspection: MODULE_ACCENTS.reports.base,
  admin: 'var(--cui-primary)',
}

const DashboardActionQueue = ({ items, loading, error, onRetry }) => {
  const [visible, setVisible] = useState(true)
  const contentId = useId()

  return (
    <CCard className="dashboard-action-queue mb-4" data-testid="dashboard-action-queue">
      <CCardHeader
        className={`dashboard-action-queue__header px-3 px-md-4 py-3 ${
          visible ? 'border-bottom' : 'border-bottom-0'
        }`}
      >
        <div className="dashboard-action-queue__toolbar">
          <div className="dashboard-action-queue__heading">
            <ListChecks
              aria-hidden="true"
              className="dashboard-action-queue__icon"
              color="var(--cui-primary)"
              size={18}
            />
            <div>
              <h2 className="dashboard-action-queue__title">Action Queue</h2>
              <div className="dashboard-action-queue__description">
                Items needing your attention now
              </div>
            </div>
          </div>
          <CButton
            size="sm"
            className="dashboard-collapse-button"
            onClick={() => setVisible((value) => !value)}
            aria-controls={contentId}
            aria-expanded={visible}
            aria-label={visible ? 'Collapse action queue' : 'Expand action queue'}
          >
            {visible ? (
              <ChevronUp size={17} aria-hidden="true" />
            ) : (
              <ChevronDown size={17} aria-hidden="true" />
            )}
          </CButton>
        </div>
      </CCardHeader>
      {visible && (
        <CCardBody id={contentId} className="dashboard-action-queue__body p-3 p-md-4">
          {loading ? (
            <div className="text-body-secondary small" data-testid="dashboard-action-queue-loading">
              Loading action queue...
            </div>
          ) : error ? (
            <div className="text-body-secondary small" data-testid="dashboard-action-queue-error">
              <div className="mb-2">Unable to load your action queue. {error}</div>
              <CButton size="sm" color="secondary" variant="outline" onClick={onRetry}>
                Retry action queue
              </CButton>
            </div>
          ) : items.length === 0 ? (
            <div
              className="dashboard-action-queue__empty"
              data-testid="dashboard-action-queue-empty"
            >
              <CircleCheck aria-hidden="true" size={16} />
              <span>All caught up - no actions need attention.</span>
            </div>
          ) : (
            <CListGroup data-testid="dashboard-action-queue-items">
              {items.map((item) => (
                <CListGroupItem
                  as={Link}
                  key={item.key}
                  to={item.to}
                  className="dashboard-action-queue__item list-group-item-action text-decoration-none text-body"
                >
                  <span className="dashboard-action-queue__item-content">
                    <span
                      aria-hidden="true"
                      className="dashboard-action-queue__tone"
                      style={{
                        '--dashboard-action-tone':
                          item.tone || ACTION_QUEUE_TONES[item.module] || 'var(--cui-primary)',
                      }}
                    />
                    <span className="dashboard-action-queue__item-copy">
                      <span className="dashboard-action-queue__item-label">{item.label}</span>
                      <span className="dashboard-action-queue__item-module text-capitalize">
                        {item.module}
                      </span>
                    </span>
                  </span>
                  <span
                    className="dashboard-action-queue__count"
                    aria-label={`${item.count} items`}
                  >
                    {item.count}
                  </span>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </CCardBody>
      )}
    </CCard>
  )
}

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
  const [period, setPeriod] = useState('this_month')
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const periodLabel = resolvePeriodLabel(period)
  const selectedPeriodOption = PERIOD_OPTIONS.find((option) => option.value === period)
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
  const { stats, moduleStats } = useDashboardStats({
    period,
    modules: visibleDashboardModules,
    refreshToken: dashboardRefreshToken,
  })
  const actionQueue = useDashboardActionQueue({ refreshToken: dashboardRefreshToken })
  const refreshDashboardStats = () => setDashboardRefreshToken((value) => value + 1)

  if (!hasPermission(authUser, 'self.dashboard')) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to the dashboard.
      </CAlert>
    )
  }

  return (
    <div className="dashboard-page" data-testid="dashboard-module">
      <header className="dashboard-overview mb-4" data-testid="dashboard-overview">
        <div className="dashboard-overview__content">
          <div className="dashboard-overview__identity">
            <h1 id="dashboard-page-title" className="dashboard-overview__title">
              Dashboard Overview
            </h1>
            <p className="dashboard-overview__description">
              {userName ? `Welcome back, ${userName}` : 'Your operations overview'}
              {userRole ? ` · ${userRole}` : ''}
            </p>
          </div>
          <div className="dashboard-overview__period" data-testid="dashboard-period-control">
            <div className="vmecc-scroll-x dashboard-period-switcher">
              <CButtonGroup size="sm" role="group" aria-label="Select dashboard reporting period">
                {PERIOD_OPTIONS.map((option) => (
                  <CButton
                    key={option.value}
                    color={period === option.value ? 'primary' : 'outline-secondary'}
                    aria-pressed={option.value === period}
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </CButton>
                ))}
              </CButtonGroup>
            </div>
            <CDropdown
              className="dashboard-period-dropdown"
              data-testid="dashboard-period-dropdown"
            >
              <CDropdownToggle
                className="dashboard-period-dropdown__toggle"
                color="secondary"
                variant="outline"
                aria-label={`Select dashboard reporting period, currently ${selectedPeriodOption?.label || ''}, ${periodLabel}`}
              >
                {selectedPeriodOption?.label} · {periodLabel}
              </CDropdownToggle>
              <CDropdownMenu className="dashboard-period-dropdown__menu">
                {PERIOD_OPTIONS.map((option) => (
                  <CDropdownItem
                    key={option.value}
                    active={option.value === period}
                    className="dashboard-period-dropdown__item"
                    data-testid={`dashboard-period-option-${option.value}`}
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          </div>
        </div>
      </header>

      <DashboardActionQueue
        items={actionQueue.items}
        loading={actionQueue.loading}
        error={actionQueue.error}
        onRetry={actionQueue.retry}
      />

      <DashboardModuleSlot moduleKey="payroll" isVisible={canViewPayrollSection}>
        {canViewPayrollSection && (
          <ModuleSectionHeader
            title="Payroll Claims"
            subtext="Salary and expense claims"
            accentColor={MODULE_ACCENTS.payroll.base}
            icon={Wallet}
          >
            <DashboardModuleCardGuard
              moduleKey="payroll"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current status" />
              <CRow className="dashboard-kpi-row mb-4" xs={{ gutter: 4 }}>
                <PayrollKpiTiles stats={stats.payroll} />
              </CRow>

              <SectionHeading title="Period summary" />
              <CRow
                className="dashboard-summary-row dashboard-summary-row--grouped mb-4"
                xs={{ gutter: 4 }}
              >
                <PayrollOperationsCard stats={stats.payroll} />
                <PayrollAssignmentsCard stats={stats.payroll} />
              </CRow>

              <DashboardAnalyticsDisclosure title="Payroll analytics">
                <CRow className="dashboard-chart-row" xs={{ gutter: 4 }}>
                  <CCol xs={12} lg={6}>
                    <PayrollActivityChart stats={stats.payroll} periodLabel={periodLabel} />
                  </CCol>
                  <CCol xs={12} lg={6}>
                    <PayrollStatusBreakdown stats={stats.payroll} periodLabel={periodLabel} />
                  </CCol>
                </CRow>
              </DashboardAnalyticsDisclosure>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="overtime" isVisible={canViewOvertimeSection}>
        {canViewOvertimeSection && (
          <ModuleSectionHeader
            title="Overtime"
            subtext="OT requests and approvals"
            accentColor={MODULE_ACCENTS.overtime.base}
            icon={Clock3}
          >
            <DashboardModuleCardGuard
              moduleKey="overtime"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current status" />
              <CRow className="dashboard-kpi-row mb-4" xs={{ gutter: 4 }}>
                <OvertimeKpiTiles stats={stats.overtime} />
              </CRow>

              <SectionHeading title="Period summary" />
              <CRow
                className="dashboard-summary-row dashboard-summary-row--grouped mb-4"
                xs={{ gutter: 4 }}
              >
                <OvertimeOperationsCard stats={stats.overtime} />
                <OvertimeTeamCard stats={stats.overtime} />
              </CRow>

              <DashboardAnalyticsDisclosure title="Overtime analytics">
                <CRow className="dashboard-chart-row" xs={{ gutter: 4 }}>
                  <CCol xs={12} lg={6}>
                    <OvertimeActivityChart stats={stats.overtime} periodLabel={periodLabel} />
                  </CCol>
                  <CCol xs={12} lg={6}>
                    <OvertimeStatusBreakdown stats={stats.overtime} periodLabel={periodLabel} />
                  </CCol>
                </CRow>
              </DashboardAnalyticsDisclosure>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="leave" isVisible={canViewLeaveSection}>
        {canViewLeaveSection && (
          <ModuleSectionHeader
            title="Leave"
            subtext="Leave requests and absences"
            accentColor={MODULE_ACCENTS.leave.base}
            icon={CalendarDays}
          >
            <DashboardModuleCardGuard
              moduleKey="leave"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current status" />
              <CRow className="dashboard-kpi-row mb-4" xs={{ gutter: 4 }}>
                <LeaveKpiTiles stats={stats.leave} />
              </CRow>

              <DashboardAnalyticsDisclosure title="Leave analytics">
                <CRow className="dashboard-chart-row" xs={{ gutter: 4 }}>
                  <CCol xs={12} lg={6}>
                    <LeaveActivityChart stats={stats.leave} periodLabel={periodLabel} />
                  </CCol>
                  <CCol xs={12} lg={6}>
                    <LeaveTeamBreakdown stats={stats.leave} periodLabel={periodLabel} />
                  </CCol>
                </CRow>
              </DashboardAnalyticsDisclosure>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="roster" isVisible={canViewRosterSection}>
        {canViewRosterSection && (
          <ModuleSectionHeader
            title="Roster & Teams"
            subtext="Shift scheduling and team coverage"
            accentColor={MODULE_ACCENTS.roster.base}
            icon={LayoutGrid}
          >
            <DashboardModuleCardGuard
              moduleKey="roster"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current status" />
              <CRow className="dashboard-kpi-row mb-4" xs={{ gutter: 4 }}>
                <RosterKpiTiles stats={stats.roster} />
              </CRow>

              <DashboardAnalyticsDisclosure title="Roster analytics">
                <CRow className="dashboard-chart-row" xs={{ gutter: 4 }}>
                  <CCol xs={12} lg={6}>
                    <RosterActivityChart stats={stats.roster} />
                  </CCol>
                  <CCol xs={12} lg={6}>
                    <RosterTeamBreakdown stats={stats.roster} />
                  </CCol>
                </CRow>
              </DashboardAnalyticsDisclosure>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>

      <DashboardModuleSlot moduleKey="reports" isVisible={canViewReportsSection}>
        {canViewReportsSection && (
          <ModuleSectionHeader
            title="Reports"
            subtext="ERCO, drill, and fitness test submissions"
            accentColor={MODULE_ACCENTS.reports.base}
            icon={TriangleAlert}
          >
            <DashboardModuleCardGuard
              moduleKey="reports"
              moduleStats={moduleStats}
              onRetry={refreshDashboardStats}
            >
              <SectionHeading title="Current status" />
              <CRow className="dashboard-kpi-row mb-4" xs={{ gutter: 4 }}>
                <ReportKpiTiles stats={stats.reports} />
              </CRow>

              <DashboardAnalyticsDisclosure title="Reports analytics">
                <CRow className="dashboard-chart-row" xs={{ gutter: 4 }}>
                  <CCol xs={12} lg={5}>
                    <ReportActivityChart stats={stats.reports} periodLabel={periodLabel} />
                  </CCol>
                  <CCol xs={12} lg={7}>
                    <ReportBreakdown stats={stats.reports} periodLabel={periodLabel} />
                  </CCol>
                </CRow>
              </DashboardAnalyticsDisclosure>
            </DashboardModuleCardGuard>
          </ModuleSectionHeader>
        )}
      </DashboardModuleSlot>
    </div>
  )
}

export default Dashboard
