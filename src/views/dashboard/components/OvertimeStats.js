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
import { Clock, Building2 } from 'lucide-react'
import {
  sparklineOptions,
  bgChartOptions,
  sparklineDataset,
  MODULE_ACCENTS,
  PeriodLabel,
  TileTitle,
} from '../utils/chartDefaults'

const { base: ACCENT, dark: ACCENT_DARK, sparkline: ACCENT_SPARK } = MODULE_ACCENTS.overtime

// ─── Zone 1 — four KPI tiles ──────────────────────────────────────────────────

export const OvertimeKpiTiles = ({ stats, periodLabel }) => {
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
      {/* Tile 1 — Pending OT approvals · warning */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={stats?.pendingApprovals ?? 0}
          title={<TileTitle>Pending OT Approvals<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>

      {/* Tile 2 — Approved hours this period · success */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="success"
          value={
            <>
              {stats?.approvedHoursThisPeriod ?? 0}{' '}
              <span className="fs-6 fw-normal">hrs</span>
            </>
          }
          title={<TileTitle>Approved OT Hours<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-success'), true)}
        />
      </CCol>

      {/* Tile 3 — Staff with open requests · primary */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="primary"
          value={
            <>
              {stats?.staffWithOpenRequests ?? 0}{' '}
              <span className="fs-6 fw-normal">staff</span>
            </>
          }
          title={<TileTitle>Staff with Open OT<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-primary'), true)}
        />
      </CCol>

      {/* Tile 4 — Submitted this period · module-accented amber gradient */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100 text-white"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}
          value={
            <>
              {stats?.submittedThisPeriod ?? 0}{' '}
              <span className="fs-6 fw-normal">requests</span>
            </>
          }
          title={<TileTitle>OT Submitted<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(ACCENT_SPARK, true)}
        />
      </CCol>
    </>
  )
}

OvertimeKpiTiles.propTypes = {
  stats: PropTypes.shape({
    pendingApprovals: PropTypes.number,
    approvedHoursThisPeriod: PropTypes.number,
    staffWithOpenRequests: PropTypes.number,
    submittedThisPeriod: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 2 — operations card ─────────────────────────────────────────────────

export const OvertimeOperationsCard = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.count)
  const trendLabels = trend.map((t) => t.month)

  return (
    <CCol xs={12} sm={6} xl={4} xxl={3}>
      <CWidgetStatsD
        className="h-100"
        color="warning"
        icon={<Clock size={48} className="my-4 text-white" />}
        values={[
          { title: 'requests approved', value: stats?.approvedRequestsThisPeriod ?? 0 },
          { title: 'hours approved', value: `${stats?.approvedHoursThisPeriod ?? 0} hrs` },
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
      {periodLabel && (
        <div className="text-center text-body-secondary small mt-1">{periodLabel}</div>
      )}
    </CCol>
  )
}

OvertimeOperationsCard.propTypes = {
  stats: PropTypes.shape({
    approvedRequestsThisPeriod: PropTypes.number,
    approvedHoursThisPeriod: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 2 — team snapshot card ─────────────────────────────────────────────

export const OvertimeTeamCard = ({ stats }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.count)
  const trendLabels = trend.map((t) => t.month)
  const byTeam = stats?.byTeam ?? []
  const topTeam = byTeam[0]

  return (
    <CCol xs={12} sm={6} xl={4} xxl={3}>
      <CWidgetStatsD
        className="h-100"
        color="info"
        icon={<Building2 size={48} className="my-4 text-white" />}
        values={[
          {
            title: 'highest OT team',
            value: topTeam ? `${topTeam.team} · ${topTeam.count}` : '—',
          },
          { title: 'teams with OT requests', value: byTeam.length },
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
      <div className="text-center text-body-secondary small mt-1">Current</div>
    </CCol>
  )
}

OvertimeTeamCard.propTypes = {
  stats: PropTypes.shape({
    byTeam: PropTypes.arrayOf(
      PropTypes.shape({ team: PropTypes.string, count: PropTypes.number }),
    ),
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
}

// ─── Zone 3 — monthly submissions chart ──────────────────────────────────────

export const OvertimeActivityChart = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">OT Requests Submitted</div>
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
                backgroundColor: getStyle('--cui-warning'),
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

OvertimeActivityChart.propTypes = {
  stats: PropTypes.shape({
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 4 — type doughnut + status progress + team list ────────────────────

const OT_STATUS_ROWS = [
  { key: 'pending', label: 'Pending', color: 'warning' },
  { key: 'approved', label: 'Approved', color: 'success' },
  { key: 'rejected', label: 'Rejected', color: 'danger' },
  { key: 'cancelled', label: 'Cancelled', color: 'secondary' },
]

export const OvertimeStatusBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { weekday: 0, weekend: 0, holiday: 0 }
  const byStatus = stats?.byStatus ?? {}
  const byTeam = stats?.byTeam ?? []
  const statusTotal = OT_STATUS_ROWS.reduce((sum, r) => sum + (byStatus[r.key] ?? 0), 0)
  const teamMax = byTeam.length > 0 ? byTeam[0].count : 1

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Overtime Breakdown</div>
          <div className="text-body-secondary small mt-1">By type, status, and team</div>
        </div>
        {periodLabel && (
          <span className="text-body-secondary small text-nowrap ms-2">{periodLabel}</span>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          {/* By type — doughnut */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">By type</div>
            <CChartDoughnut
              style={{ maxHeight: '200px' }}
              data={{
                labels: ['Weekday', 'Weekend', 'Holiday'],
                datasets: [
                  {
                    data: [byType.weekday, byType.weekend, byType.holiday],
                    backgroundColor: [
                      getStyle('--cui-warning'),
                      getStyle('--cui-primary'),
                      getStyle('--cui-danger'),
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

          {/* By status — progress bars */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">By status</div>
            {OT_STATUS_ROWS.map((row) => {
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

          {/* By team — ranked list */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">By team</div>
            {byTeam.map((row) => {
              const pct = Math.round((row.count / teamMax) * 100)
              return (
                <div key={row.team} className="mb-2">
                  <CRow className="align-items-center g-0 mb-1">
                    <CCol xs="auto" className="text-body-secondary small me-auto">
                      {row.team}
                    </CCol>
                    <CCol xs="auto" className="text-body-secondary small fw-semibold">
                      {row.count}
                    </CCol>
                  </CRow>
                  <CProgress thin color="warning" value={pct} />
                </div>
              )
            })}
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

OvertimeStatusBreakdown.propTypes = {
  stats: PropTypes.shape({
    byType: PropTypes.shape({
      weekday: PropTypes.number,
      weekend: PropTypes.number,
      holiday: PropTypes.number,
    }),
    byStatus: PropTypes.shape({
      pending: PropTypes.number,
      approved: PropTypes.number,
      rejected: PropTypes.number,
      cancelled: PropTypes.number,
    }),
    byTeam: PropTypes.arrayOf(
      PropTypes.shape({ team: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}
