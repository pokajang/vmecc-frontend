import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol } from '@coreui/react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart, DashboardBreakdownRows } from './DashboardCharts'

export const LeaveKpiTiles = ({ stats }) => (
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
          key: 'approved-days',
          value: stats?.approvedDaysThisPeriod ?? 0,
          unit: 'days',
          label: 'approved this period',
          tone: 'success',
        },
        {
          key: 'currently-on-leave',
          value: stats?.staffCurrentlyOnLeave ?? 0,
          unit: 'staff',
          label: 'currently on leave',
        },
        {
          key: 'pending-staff',
          value: stats?.staffWithPendingRequests ?? 0,
          label: 'pending leave requests',
          tone: 'warning',
        },
      ]}
    />
  </CCol>
)

export const LeaveActivityChart = ({ stats, periodLabel }) => (
  <DashboardActivityChart
    title="Leave requests submitted"
    description="Monthly submission volume"
    periodLabel={periodLabel}
    trend={stats?.monthlyTrend ?? []}
    datasetLabel="Submissions"
    emptyMessage="No leave requests were submitted for this period."
  />
)

export const LeaveTeamBreakdown = ({ stats, periodLabel }) => {
  const rows = (stats?.byTeam ?? []).map((row) => ({
    key: row.team,
    label: row.team,
    value: row.count,
    tone: 'primary',
  }))

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Leave by team</div>
          <div className="text-body-secondary small mt-1">Requests ranked by volume</div>
        </div>
        {periodLabel && <span className="dashboard-chart-card__period">{periodLabel}</span>}
      </CCardHeader>
      <CCardBody>
        {rows.length > 0 ? (
          <DashboardBreakdownRows title="Team volume" rows={rows} scale="max" />
        ) : (
          <DashboardEmptyState message="No team leave activity is available for this period." />
        )}
      </CCardBody>
    </CCard>
  )
}

const leaveStatsShape = {
  pendingApprovals: PropTypes.number,
  approvedDaysThisPeriod: PropTypes.number,
  staffCurrentlyOnLeave: PropTypes.number,
  staffWithPendingRequests: PropTypes.number,
  monthlyTrend: PropTypes.arrayOf(
    PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
  ),
  byTeam: PropTypes.arrayOf(PropTypes.shape({ team: PropTypes.string, count: PropTypes.number })),
}

LeaveKpiTiles.propTypes = { stats: PropTypes.shape(leaveStatsShape) }
LeaveActivityChart.propTypes = {
  stats: PropTypes.shape(leaveStatsShape),
  periodLabel: PropTypes.string,
}
LeaveTeamBreakdown.propTypes = {
  stats: PropTypes.shape(leaveStatsShape),
  periodLabel: PropTypes.string,
}
