import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart, DashboardBreakdownRows } from './DashboardCharts'

const formatMyr = (value) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const STATUS_ROWS = [
  { key: 'pending', label: 'Pending', tone: 'warning' },
  { key: 'pendingReview', label: 'Pending review', tone: 'warning' },
  { key: 'pendingApproval', label: 'Pending approval', tone: 'primary' },
  { key: 'approved', label: 'Approved', tone: 'success' },
  { key: 'paid', label: 'Paid', tone: 'success' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
  { key: 'cancelled', label: 'Cancelled', tone: 'secondary' },
]

export const PayrollKpiTiles = ({ stats }) => (
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
          key: 'awaiting-payment',
          value: stats?.approvedUnpaidCount ?? 0,
          label: 'awaiting payment',
          detail: formatMyr(stats?.approvedUnpaidTotalMyr),
          tone: 'warning',
        },
        {
          key: 'incomplete-contracts',
          value: stats?.incompleteContracts ?? 0,
          label: 'incomplete contracts',
        },
        {
          key: 'open-claims',
          value: stats?.staffWithOpenClaims ?? 0,
          label: 'staff with open claims',
        },
      ]}
    />
  </CCol>
)

export const PayrollOperationsCard = ({ stats }) => (
  <CCol xs={12} md={6}>
    <DashboardMetricList
      title="Payments"
      metrics={[
        {
          key: 'claims-paid',
          value: stats?.paidThisMonthCount ?? 0,
          unit: 'claims',
          label: 'paid this period',
          tone: 'success',
        },
        {
          key: 'total-payout',
          value: formatMyr(stats?.paidThisMonthTotalMyr),
          label: 'total payout',
          tone: 'success',
        },
      ]}
    />
  </CCol>
)

export const PayrollAssignmentsCard = ({ stats }) => (
  <CCol xs={12} md={6}>
    <DashboardMetricList
      title="Salary assignments"
      metrics={[
        {
          key: 'active-assignments',
          value: stats?.activeAssignments ?? 0,
          label: 'active assignments',
        },
        {
          key: 'assignment-drafts',
          value: stats?.assignmentDrafts ?? 0,
          label: 'drafts in progress',
          tone: 'warning',
        },
      ]}
    />
  </CCol>
)

export const PayrollActivityChart = ({ stats, periodLabel }) => (
  <DashboardActivityChart
    title="Claims submitted"
    description="Monthly submission volume"
    periodLabel={periodLabel}
    trend={stats?.monthlyTrend ?? []}
    datasetLabel="Submissions"
    emptyMessage="No claim submissions for this period."
  />
)

export const PayrollStatusBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { salary: 0, expense: 0, other: 0 }
  const byStatus = stats?.byStatus ?? {}
  const typeRows = [
    { key: 'salary', label: 'Salary', value: byType.salary, tone: 'primary' },
    { key: 'expense', label: 'Expense', value: byType.expense, tone: 'success' },
    { key: 'other', label: 'Exceptional', value: byType.other, tone: 'secondary' },
  ]
  const statusRows = STATUS_ROWS.map((row) => ({ ...row, value: byStatus[row.key] ?? 0 }))
  const hasBreakdownData = [...typeRows, ...statusRows].some((row) => row.value > 0)

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Claims breakdown</div>
          <div className="text-body-secondary small mt-1">Type and workflow status</div>
        </div>
        {periodLabel && <span className="dashboard-chart-card__period">{periodLabel}</span>}
      </CCardHeader>
      <CCardBody>
        {hasBreakdownData ? (
          <CRow className="g-4">
            <CCol xs={12} md={5}>
              <DashboardBreakdownRows title="By type" rows={typeRows} />
            </CCol>
            <CCol xs={12} md={7}>
              <DashboardBreakdownRows title="By status" rows={statusRows} />
            </CCol>
          </CRow>
        ) : (
          <DashboardEmptyState message="No claim breakdown is available for this period." />
        )}
      </CCardBody>
    </CCard>
  )
}

const payrollStatsShape = {
  pendingApprovals: PropTypes.number,
  approvedUnpaidCount: PropTypes.number,
  approvedUnpaidTotalMyr: PropTypes.number,
  incompleteContracts: PropTypes.number,
  staffWithOpenClaims: PropTypes.number,
  paidThisMonthCount: PropTypes.number,
  paidThisMonthTotalMyr: PropTypes.number,
  activeAssignments: PropTypes.number,
  assignmentDrafts: PropTypes.number,
  monthlyTrend: PropTypes.arrayOf(
    PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
  ),
  byType: PropTypes.shape({
    salary: PropTypes.number,
    expense: PropTypes.number,
    other: PropTypes.number,
  }),
  byStatus: PropTypes.objectOf(PropTypes.number),
}

PayrollKpiTiles.propTypes = { stats: PropTypes.shape(payrollStatsShape) }
PayrollOperationsCard.propTypes = { stats: PropTypes.shape(payrollStatsShape) }
PayrollAssignmentsCard.propTypes = { stats: PropTypes.shape(payrollStatsShape) }
PayrollActivityChart.propTypes = {
  stats: PropTypes.shape(payrollStatsShape),
  periodLabel: PropTypes.string,
}
PayrollStatusBreakdown.propTypes = {
  stats: PropTypes.shape(payrollStatsShape),
  periodLabel: PropTypes.string,
}
