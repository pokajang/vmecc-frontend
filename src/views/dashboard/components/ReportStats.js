import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart, DashboardBreakdownRows } from './DashboardCharts'

export const ReportKpiTiles = ({ stats }) => (
  <CCol xs={12}>
    <DashboardMetricList
      metrics={[
        {
          key: 'pending-review',
          value: stats?.pendingReview ?? 0,
          label: 'pending review',
          tone: 'warning',
        },
        {
          key: 'pending-approval',
          value: stats?.pendingApproval ?? 0,
          label: 'pending approval',
          tone: 'warning',
        },
        {
          key: 'submitted',
          value: stats?.submittedThisPeriod ?? 0,
          label: 'submitted this period',
        },
      ]}
    />
  </CCol>
)

export const ReportActivityChart = ({ stats, periodLabel }) => (
  <DashboardActivityChart
    title="Reports submitted"
    description="Monthly submission volume"
    periodLabel={periodLabel}
    trend={stats?.monthlyTrend ?? []}
    datasetLabel="Reports"
    emptyMessage="No reports were submitted for this period."
  />
)

export const ReportBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { erco: 0, drill: 0, fitnessTest: 0 }
  const ercoByType = stats?.ercoByIncidentType ?? []
  const byPersonnel = stats?.byPersonnel ?? []
  const reportTypeRows = [
    { key: 'erco', label: 'ERCO', value: byType.erco, tone: 'primary' },
    { key: 'drill', label: 'Drill', value: byType.drill, tone: 'success' },
    { key: 'fitness-test', label: 'Fitness test', value: byType.fitnessTest, tone: 'secondary' },
  ]
  const incidentRows = ercoByType.map((row) => ({
    key: row.type,
    label: row.type,
    value: row.count,
    tone: 'primary',
  }))
  const personnelRows = byPersonnel.map((row) => ({
    key: row.name,
    label: row.name,
    value: row.count,
    tone: 'primary',
  }))
  const hasBreakdownData = [...reportTypeRows, ...incidentRows, ...personnelRows].some(
    (row) => row.value > 0,
  )

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Reports breakdown</div>
          <div className="text-body-secondary small mt-1">Type, incident, and personnel</div>
        </div>
        {periodLabel && <span className="dashboard-chart-card__period">{periodLabel}</span>}
      </CCardHeader>
      <CCardBody>
        {hasBreakdownData ? (
          <CRow className="g-4">
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="By report type" rows={reportTypeRows} />
            </CCol>
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="ERCO incident type" rows={incidentRows} scale="max" />
            </CCol>
            <CCol xs={12} md={4}>
              <DashboardBreakdownRows title="By personnel" rows={personnelRows} scale="max" />
            </CCol>
          </CRow>
        ) : (
          <DashboardEmptyState message="No report breakdown is available for this period." />
        )}
      </CCardBody>
    </CCard>
  )
}

const reportStatsShape = {
  pendingReview: PropTypes.number,
  pendingApproval: PropTypes.number,
  submittedThisPeriod: PropTypes.number,
  monthlyTrend: PropTypes.arrayOf(
    PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
  ),
  byType: PropTypes.shape({
    erco: PropTypes.number,
    drill: PropTypes.number,
    fitnessTest: PropTypes.number,
  }),
  ercoByIncidentType: PropTypes.arrayOf(
    PropTypes.shape({ type: PropTypes.string, count: PropTypes.number }),
  ),
  byPersonnel: PropTypes.arrayOf(
    PropTypes.shape({ name: PropTypes.string, count: PropTypes.number }),
  ),
}

ReportKpiTiles.propTypes = { stats: PropTypes.shape(reportStatsShape) }
ReportActivityChart.propTypes = {
  stats: PropTypes.shape(reportStatsShape),
  periodLabel: PropTypes.string,
}
ReportBreakdown.propTypes = {
  stats: PropTypes.shape(reportStatsShape),
  periodLabel: PropTypes.string,
}
