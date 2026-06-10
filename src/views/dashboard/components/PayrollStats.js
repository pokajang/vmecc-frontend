import React from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CWidgetStatsA,
  CWidgetStatsD,
} from '@coreui/react'
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { BadgeDollarSign, Users } from 'lucide-react'
import {
  sparklineOptions,
  bgChartOptions,
  sparklineDataset,
  MODULE_ACCENTS,
  PeriodLabel,
  TileTitle,
} from '../utils/chartDefaults'

const { base: ACCENT, dark: ACCENT_DARK, sparkline: ACCENT_SPARK } = MODULE_ACCENTS.payroll

const formatMyr = (value) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(value || 0)

// ─── Zone 1 — four KPI tiles ──────────────────────────────────────────────────

export const PayrollKpiTiles = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.count)
  const trendLabels = trend.map((t) => t.month)
  const pl = periodLabel || '—'

  const sparkline = (color, filled = false) => (
    <CChartLine
      className="mt-3 mx-3"
      style={{ height: '64px' }}
      data={{
        labels: trendLabels,
        datasets: [{ ...sparklineDataset(color, filled), data: trendCounts }],
      }}
      options={sparklineOptions}
    />
  )

  return (
    <>
      {/* Tile 1 — Pending Claim Approvals · warning */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={stats?.pendingApprovals ?? 0}
          title={
            <TileTitle>
              Pending Claim Approvals
              <PeriodLabel label={pl} />
            </TileTitle>
          }
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>

      {/* Tile 2 — Approved but unpaid · danger (financial obligation outstanding) */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="danger"
          value={
            <>
              {stats?.approvedUnpaidCount ?? 0} <span className="fs-6 fw-normal">claims</span>
            </>
          }
          title={
            <TileTitle>
              Approved, Awaiting Payment
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }} className="mt-1">
                {formatMyr(stats?.approvedUnpaidTotalMyr)}
              </div>
              <PeriodLabel label={pl} />
            </TileTitle>
          }
          chart={sparkline(getStyle('--cui-danger'), true)}
        />
      </CCol>

      {/* Tile 3 — Incomplete contracts · snapshot · primary */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="primary"
          value={
            <>
              {stats?.incompleteContracts ?? 0}{' '}
              <span className="fs-6 fw-normal">salary claims</span>
            </>
          }
          title={
            <TileTitle>
              Incomplete Salary Contracts
              <PeriodLabel label="Current" />
            </TileTitle>
          }
          chart={sparkline(getStyle('--cui-primary'), true)}
        />
      </CCol>

      {/* Tile 4 — Staff with open claims · module-accented gradient */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100 text-white"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}
          value={
            <>
              {stats?.staffWithOpenClaims ?? 0} <span className="fs-6 fw-normal">staff</span>
            </>
          }
          title={
            <TileTitle>
              Staff with Open Claims
              <PeriodLabel label={pl} />
            </TileTitle>
          }
          chart={sparkline(ACCENT_SPARK, true)}
        />
      </CCol>
    </>
  )
}

PayrollKpiTiles.propTypes = {
  stats: PropTypes.shape({
    pendingApprovals: PropTypes.number,
    approvedUnpaidCount: PropTypes.number,
    approvedUnpaidTotalMyr: PropTypes.number,
    incompleteContracts: PropTypes.number,
    staffWithOpenClaims: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 2 — paid this month card · period-bound ────────────────────────────

export const PayrollOperationsCard = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.count)
  const trendLabels = trend.map((t) => t.month)

  return (
    <CCol xs={12} sm={6} xl={4} xxl={3}>
      <CWidgetStatsD
        className="h-100"
        color="success"
        icon={<BadgeDollarSign size={48} className="my-4 text-white" />}
        values={[
          { title: 'claims paid', value: stats?.paidThisMonthCount ?? 0 },
          { title: 'total payout', value: formatMyr(stats?.paidThisMonthTotalMyr) },
        ]}
        chart={
          <CChartLine
            className="position-absolute w-100 h-100"
            data={{
              labels: trendLabels,
              datasets: [
                {
                  backgroundColor: 'rgba(255,255,255,.1)',
                  borderColor: 'rgba(255,255,255,.55)',
                  pointHoverBackgroundColor: '#fff',
                  borderWidth: 2,
                  data: trendCounts,
                  fill: true,
                },
              ],
            }}
            options={bgChartOptions}
          />
        }
      />
    </CCol>
  )
}

PayrollOperationsCard.propTypes = {
  stats: PropTypes.shape({
    paidThisMonthCount: PropTypes.number,
    paidThisMonthTotalMyr: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 2 — salary assignments card · snapshot ─────────────────────────────

export const PayrollAssignmentsCard = ({ stats }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.count)
  const trendLabels = trend.map((t) => t.month)

  return (
    <CCol xs={12} sm={6} xl={4} xxl={3}>
      <CWidgetStatsD
        className="h-100"
        color="primary"
        icon={<Users size={48} className="my-4 text-white" />}
        values={[
          { title: 'active assignments', value: stats?.activeAssignments ?? 0 },
          { title: 'drafts in progress', value: stats?.assignmentDrafts ?? 0 },
        ]}
        chart={
          <CChartLine
            className="position-absolute w-100 h-100"
            data={{
              labels: trendLabels,
              datasets: [
                {
                  backgroundColor: 'rgba(255,255,255,.1)',
                  borderColor: 'rgba(255,255,255,.55)',
                  pointHoverBackgroundColor: '#fff',
                  borderWidth: 2,
                  data: trendCounts,
                  fill: true,
                },
              ],
            }}
            options={bgChartOptions}
          />
        }
      />
    </CCol>
  )
}

PayrollAssignmentsCard.propTypes = {
  stats: PropTypes.shape({
    activeAssignments: PropTypes.number,
    assignmentDrafts: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
}

// ─── Zone 3 — 6-month submissions chart ──────────────────────────────────────

export const PayrollActivityChart = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Claims Submitted</div>
          <div className="text-body-secondary small mt-1">
            Volume trend across the last 6 months
          </div>
        </div>
        {periodLabel && (
          <span className="text-body-secondary small text-nowrap ms-2">{periodLabel}</span>
        )}
      </CCardHeader>
      <CCardBody>
        <CChartBar
          data={{
            labels: trend.map((t) => t.month),
            datasets: [
              {
                label: 'Submissions',
                backgroundColor: getStyle('--cui-success'),
                data: trend.map((t) => t.count),
                borderRadius: 4,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: {
                beginAtZero: true,
                grid: { color: getStyle('--cui-border-color-translucent') },
                ticks: { stepSize: 5 },
              },
            },
          }}
          style={{ minHeight: '220px' }}
        />
      </CCardBody>
    </CCard>
  )
}

PayrollActivityChart.propTypes = {
  stats: PropTypes.shape({
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 4 — type doughnut + status progress breakdown ──────────────────────

const STATUS_ROWS = [
  { key: 'pending', label: 'Pending', color: 'warning' },
  { key: 'pendingReview', label: 'Pending Review', color: 'warning' },
  { key: 'pendingApproval', label: 'Pending Approval', color: 'info' },
  { key: 'approved', label: 'Approved', color: 'success' },
  { key: 'paid', label: 'Paid', color: 'primary' },
  { key: 'rejected', label: 'Rejected', color: 'danger' },
  { key: 'cancelled', label: 'Cancelled', color: 'secondary' },
]

export const PayrollStatusBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { salary: 0, expense: 0, other: 0 }
  const byStatus = stats?.byStatus ?? {}
  const statusTotal = STATUS_ROWS.reduce((sum, r) => sum + (byStatus[r.key] ?? 0), 0)

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Claims Breakdown</div>
          <div className="text-body-secondary small mt-1">By type and workflow status</div>
        </div>
        {periodLabel && (
          <span className="text-body-secondary small text-nowrap ms-2">{periodLabel}</span>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol xs={12} md={5}>
            <div className="text-body-secondary small mb-2">By type</div>
            <CChartDoughnut
              style={{ maxHeight: '200px' }}
              data={{
                labels: ['Salary', 'Expense', 'Exceptional'],
                datasets: [
                  {
                    data: [byType.salary, byType.expense, byType.other],
                    backgroundColor: [
                      getStyle('--cui-success'),
                      getStyle('--cui-primary'),
                      getStyle('--cui-info'),
                    ],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
              }}
            />
          </CCol>
          <CCol xs={12} md={7}>
            <div className="text-body-secondary small mb-2">By status</div>
            {STATUS_ROWS.map((row) => {
              const count = byStatus[row.key] ?? 0
              const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0
              return (
                <div key={row.key} className="mb-2">
                  <CRow className="align-items-center g-0 mb-1">
                    <CCol xs="auto" className="text-body-secondary small me-auto">
                      {row.label}
                    </CCol>
                    <CCol xs="auto" className="text-body-secondary small fw-semibold">
                      {count}
                    </CCol>
                  </CRow>
                  <CProgress thin color={row.color} value={pct} />
                </div>
              )
            })}
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

PayrollStatusBreakdown.propTypes = {
  stats: PropTypes.shape({
    byType: PropTypes.shape({
      salary: PropTypes.number,
      expense: PropTypes.number,
      other: PropTypes.number,
    }),
    byStatus: PropTypes.shape({
      pending: PropTypes.number,
      pendingReview: PropTypes.number,
      pendingApproval: PropTypes.number,
      approved: PropTypes.number,
      paid: PropTypes.number,
      rejected: PropTypes.number,
      cancelled: PropTypes.number,
    }),
  }),
  periodLabel: PropTypes.string,
}
