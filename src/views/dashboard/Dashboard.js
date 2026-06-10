import React, { useMemo, useState } from 'react'
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

const Dashboard = () => {
  const authUser = useSelector((state) => state.authUser)
  const { stats: myStats, loading: myStatsLoading } = useMyStats()
  const [myStatsVisible, setMyStatsVisible] = useState(true)
  const [period, setPeriod] = useState('this_month')
  const periodLabel = resolvePeriodLabel(period)
  const userName = authUser?.name || authUser?.full_name || ''
  const userRole = getPrimaryRoleLabel(authUser)
  const canViewPayrollSection = hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.payroll)
  const canViewOvertimeSection = hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.overtime)
  const canViewLeaveSection = hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.leave)
  const canViewRosterSection = hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.roster)
  const canViewReportsSection = hasPermission(authUser, DASHBOARD_SECTION_PERMISSIONS.reports)
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
  const {
    stats,
    loading,
    error: dashboardStatsError,
  } = useDashboardStats({ period, modules: visibleDashboardModules })

  if (!hasPermission(authUser, 'self.dashboard')) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to the dashboard.
      </CAlert>
    )
  }

  return (
    <>
      <CCard className="mb-4 border-0" style={{ background: 'rgba(0, 126, 122, 0.08)' }}>
        <CCardBody>
          <div className="d-flex align-items-start justify-content-between">
            <div>
              <h4 className="mb-1 fw-semibold">Dashboard Overview</h4>
              <div className="text-body-secondary">
                {userName ? `Welcome back, ${userName}` : ''}
                {userName && userRole ? ` (${userRole})` : ''}
              </div>
            </div>
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
          {myStatsVisible && (
            <div className="mt-4">
              <MyStats stats={myStats} loading={myStatsLoading} />
            </div>
          )}
        </CCardBody>
      </CCard>

      {dashboardStatsError && (
        <CAlert color="warning" className="mb-4">
          Dashboard statistics could not be fully loaded. Some sections may show zero values until
          the data is available.
        </CAlert>
      )}

      {canViewPayrollSection && (
        <ModuleSectionHeader
          title="Payroll Claims"
          subtext={`Salary & expense claims - ${periodLabel}`}
          accentColor={MODULE_ACCENTS.payroll.base}
          icon={Wallet}
          period={period}
          onPeriodChange={setPeriod}
        >
          <SectionHeading title="Current Status" subtext={`Key claim metrics - ${periodLabel}`} />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <PayrollKpiTiles stats={stats.payroll} loading={loading} periodLabel={periodLabel} />
          </CRow>

          <SectionHeading
            title="Period Summary"
            subtext={`Payroll & assignment totals - ${periodLabel}`}
          />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <PayrollOperationsCard
              stats={stats.payroll}
              loading={loading}
              periodLabel={periodLabel}
            />
            <PayrollAssignmentsCard stats={stats.payroll} loading={loading} />
          </CRow>

          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <CCol xs={12} lg={6}>
              <PayrollActivityChart
                stats={stats.payroll}
                loading={loading}
                periodLabel={periodLabel}
              />
            </CCol>
            <CCol xs={12} lg={6}>
              <PayrollStatusBreakdown
                stats={stats.payroll}
                loading={loading}
                periodLabel={periodLabel}
              />
            </CCol>
          </CRow>
        </ModuleSectionHeader>
      )}

      {canViewOvertimeSection && (
        <ModuleSectionHeader
          title="Overtime"
          subtext={`OT requests & approvals - ${periodLabel}`}
          accentColor={MODULE_ACCENTS.overtime.base}
          icon={Clock3}
          period={period}
          onPeriodChange={setPeriod}
        >
          <SectionHeading title="Current Status" subtext={`Key OT metrics - ${periodLabel}`} />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <OvertimeKpiTiles stats={stats.overtime} loading={loading} periodLabel={periodLabel} />
          </CRow>

          <SectionHeading
            title="Period Summary"
            subtext={`OT approvals & team distribution - ${periodLabel}`}
          />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <OvertimeOperationsCard
              stats={stats.overtime}
              loading={loading}
              periodLabel={periodLabel}
            />
            <OvertimeTeamCard stats={stats.overtime} loading={loading} />
          </CRow>

          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <CCol xs={12} lg={6}>
              <OvertimeActivityChart
                stats={stats.overtime}
                loading={loading}
                periodLabel={periodLabel}
              />
            </CCol>
            <CCol xs={12} lg={6}>
              <OvertimeStatusBreakdown
                stats={stats.overtime}
                loading={loading}
                periodLabel={periodLabel}
              />
            </CCol>
          </CRow>
        </ModuleSectionHeader>
      )}

      {canViewLeaveSection && (
        <ModuleSectionHeader
          title="Leave"
          subtext={`Leave requests & absences - ${periodLabel}`}
          accentColor={MODULE_ACCENTS.leave.base}
          icon={CalendarDays}
          period={period}
          onPeriodChange={setPeriod}
        >
          <SectionHeading title="Current Status" subtext={`Key leave metrics - ${periodLabel}`} />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <LeaveKpiTiles stats={stats.leave} loading={loading} periodLabel={periodLabel} />
          </CRow>

          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <CCol xs={12} lg={6}>
              <LeaveActivityChart stats={stats.leave} loading={loading} periodLabel={periodLabel} />
            </CCol>
            <CCol xs={12} lg={6}>
              <LeaveTeamBreakdown stats={stats.leave} loading={loading} periodLabel={periodLabel} />
            </CCol>
          </CRow>
        </ModuleSectionHeader>
      )}

      {canViewRosterSection && (
        <ModuleSectionHeader
          title="Roster & Teams"
          subtext={`Shift scheduling & team coverage - ${periodLabel}`}
          accentColor={MODULE_ACCENTS.roster.base}
          icon={LayoutGrid}
          period={period}
          onPeriodChange={setPeriod}
        >
          <SectionHeading title="Current Status" subtext="Live roster snapshot" />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <RosterKpiTiles stats={stats.roster} loading={loading} />
          </CRow>

          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <CCol xs={12} lg={6}>
              <RosterActivityChart stats={stats.roster} loading={loading} />
            </CCol>
            <CCol xs={12} lg={6}>
              <RosterTeamBreakdown stats={stats.roster} loading={loading} />
            </CCol>
          </CRow>
        </ModuleSectionHeader>
      )}

      {canViewReportsSection && (
        <ModuleSectionHeader
          title="Reports"
          subtext={`ERCO, Drill & Fitness Test submissions - ${periodLabel}`}
          accentColor={MODULE_ACCENTS.reports.base}
          icon={TriangleAlert}
          period={period}
          onPeriodChange={setPeriod}
        >
          <SectionHeading title="Current Status" subtext={`Key report metrics - ${periodLabel}`} />
          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <ReportKpiTiles stats={stats.reports} loading={loading} periodLabel={periodLabel} />
          </CRow>

          <CRow className="mb-4" xs={{ gutter: 4 }}>
            <CCol xs={12} lg={5}>
              <ReportActivityChart
                stats={stats.reports}
                loading={loading}
                periodLabel={periodLabel}
              />
            </CCol>
            <CCol xs={12} lg={7}>
              <ReportBreakdown stats={stats.reports} loading={loading} periodLabel={periodLabel} />
            </CCol>
          </CRow>
        </ModuleSectionHeader>
      )}
    </>
  )
}

export default Dashboard
