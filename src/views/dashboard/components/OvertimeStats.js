import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart, DashboardBreakdownRows } from './DashboardCharts'

const OT_STATUS_ROWS = [
  { key: 'pending', label: 'Pending', tone: 'warning' },
  { key: 'approved', label: 'Approved', tone: 'success' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
  { key: 'cancelled', label: 'Cancelled', tone: 'secondary' },
]

export const OvertimeKpiTiles = ({ stats }) => (
  <CCol xs={12}>
    <DashboardMetricList
      metrics={[
        {
          key: 'pending-approvals',
          value: stats?.pendingApprovals ?? 0,
          label: 'pending approvals',
          tone: 'warning',
        },
        {
          key: 'approved-hours',
          value: stats?.approvedHoursThisPeriod ?? 0,
          unit: 'hrs',
          label: 'approved this period',
          tone: 'success',
        },
        {
          key: 'open-requests',
          value: stats?.staffWithOpenRequests ?? 0,
          label: 'open OT requests',
        },
        {
          key: 'submitted',
          value: stats?.submittedThisPeriod ?? 0,
          label: 'submitted requests',
        },
      ]}
    />
  </CCol>
)

export const OvertimeOperationsCard = ({ stats }) => (
  <CCol xs={12} md={6}>
    <DashboardMetricList
      title="Approvals"
      metrics={[
        {
          key: 'approved-requests',
          value: stats?.approvedRequestsThisPeriod ?? 0,
          unit: 'requests',
          label: 'approved this period',
          tone: 'success',
        },
        {
          key: 'approved-hours',
          value: stats?.approvedHoursThisPeriod ?? 0,
          unit: 'hrs',
          label: 'approved this period',
          tone: 'success',
        },
      ]}
    />
  </CCol>
)

export const OvertimeTeamCard = ({ stats }) => {
  const byTeam = stats?.byTeam ?? []
  const topTeam = byTeam[0]

  return (
    <CCol xs={12} md={6}>
      <DashboardMetricList
        title="Team activity"
        metrics={[
          {
            key: 'top-team',
            value: topTeam?.count ?? 0,
            label: topTeam ? `${topTeam.team} leads OT volume` : 'leading OT team',
          },
          {
            key: 'teams-with-requests',
            value: byTeam.length,
            label: 'teams with OT requests',
          },
        ]}
      />
    </CCol>
  )
}

export const OvertimeActivityChart = ({ stats, periodLabel }) => (
  <DashboardActivityChart
    title="OT requests submitted"
    description="Monthly submission volume"
    periodLabel={periodLabel}
    trend={stats?.monthlyTrend ?? []}
    datasetLabel="Submissions"
    emptyMessage="No overtime requests were submitted for this period."
  />
)

export const OvertimeStatusBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { weekday: 0, weekend: 0, holiday: 0 }
  const byStatus = stats?.byStatus ?? {}
  const byTeam = stats?.byTeam ?? []
  const typeRows = [
    { key: 'weekday', label: 'Weekday', value: byType.weekday, tone: 'primary' },
    { key: 'weekend', label: 'Weekend', value: byType.weekend, tone: 'success' },
    { key: 'holiday', label: 'Holiday', value: byType.holiday, tone: 'secondary' },
  ]
  const statusRows = OT_STATUS_ROWS.map((row) => ({ ...row, value: byStatus[row.key] ?? 0 }))
  const teamRows = byTeam.map((row) => ({
    key: row.team,
    label: row.team,
    value: row.count,
    tone: 'primary',
  }))
  const hasBreakdownData = [...typeRows, ...statusRows, ...teamRows].some((row) => row.value > 0)

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Overtime breakdown</div>
          <div className="text-body-secondary small mt-1">Type, status, and team</div>
        </div>
        {periodLabel && <span className="dashboard-chart-card__period">{periodLabel}</span>}
      </CCardHeader>
      <CCardBody>
        {hasBreakdownData ? (
          <CRow className="g-4">
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="By type" rows={typeRows} />
            </CCol>
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="By status" rows={statusRows} />
            </CCol>
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="By team" rows={teamRows} scale="max" />
            </CCol>
          </CRow>
        ) : (
          <DashboardEmptyState message="No overtime breakdown is available for this period." />
        )}
      </CCardBody>
    </CCard>
  )
}

const overtimeStatsShape = {
  pendingApprovals: PropTypes.number,
  approvedHoursThisPeriod: PropTypes.number,
  staffWithOpenRequests: PropTypes.number,
  submittedThisPeriod: PropTypes.number,
  approvedRequestsThisPeriod: PropTypes.number,
  monthlyTrend: PropTypes.arrayOf(
    PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
  ),
  byType: PropTypes.shape({
    weekday: PropTypes.number,
    weekend: PropTypes.number,
    holiday: PropTypes.number,
  }),
  byStatus: PropTypes.objectOf(PropTypes.number),
  byTeam: PropTypes.arrayOf(PropTypes.shape({ team: PropTypes.string, count: PropTypes.number })),
}

OvertimeKpiTiles.propTypes = { stats: PropTypes.shape(overtimeStatsShape) }
OvertimeOperationsCard.propTypes = { stats: PropTypes.shape(overtimeStatsShape) }
OvertimeTeamCard.propTypes = { stats: PropTypes.shape(overtimeStatsShape) }
OvertimeActivityChart.propTypes = {
  stats: PropTypes.shape(overtimeStatsShape),
  periodLabel: PropTypes.string,
}
OvertimeStatusBreakdown.propTypes = {
  stats: PropTypes.shape(overtimeStatsShape),
  periodLabel: PropTypes.string,
}
