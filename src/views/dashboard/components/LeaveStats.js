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
} from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import {
  sparklineOptions,
  sparklineDataset,
  MODULE_ACCENTS,
  PeriodLabel,
  TileTitle,
} from '../utils/chartDefaults'

const { base: ACCENT, dark: ACCENT_DARK, sparkline: ACCENT_SPARK } = MODULE_ACCENTS.leave

// ─── Zone 1 — four KPI tiles ──────────────────────────────────────────────────

export const LeaveKpiTiles = ({ stats, periodLabel }) => {
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
      {/* Tile 1 — Pending approvals · warning */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={stats?.pendingApprovals ?? 0}
          title={<TileTitle>Pending Leave Approvals<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>

      {/* Tile 2 — Approved days this period · success */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="success"
          value={
            <>
              {stats?.approvedDaysThisPeriod ?? 0}{' '}
              <span className="fs-6 fw-normal">days</span>
            </>
          }
          title={<TileTitle>Leave Days Approved<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-success'), true)}
        />
      </CCol>

      {/* Tile 3 — Staff currently on leave · snapshot · info */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="info"
          value={
            <>
              {stats?.staffCurrentlyOnLeave ?? 0}{' '}
              <span className="fs-6 fw-normal">staff</span>
            </>
          }
          title={<TileTitle>Staff Currently on Leave<PeriodLabel label="Today" /></TileTitle>}
          chart={sparkline(getStyle('--cui-info'), true)}
        />
      </CCol>

      {/* Tile 4 — Staff with pending requests · module-accented teal gradient */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100 text-white"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}
          value={
            <>
              {stats?.staffWithPendingRequests ?? 0}{' '}
              <span className="fs-6 fw-normal">staff</span>
            </>
          }
          title={<TileTitle>Staff with Pending Leave<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(ACCENT_SPARK, true)}
        />
      </CCol>
    </>
  )
}

LeaveKpiTiles.propTypes = {
  stats: PropTypes.shape({
    pendingApprovals: PropTypes.number,
    approvedDaysThisPeriod: PropTypes.number,
    staffCurrentlyOnLeave: PropTypes.number,
    staffWithPendingRequests: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 3 — monthly submissions chart ──────────────────────────────────────

export const LeaveActivityChart = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Leave Requests Submitted</div>
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
                backgroundColor: getStyle('--cui-info'),
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

LeaveActivityChart.propTypes = {
  stats: PropTypes.shape({
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 4 — team breakdown ──────────────────────────────────────────────────

export const LeaveTeamBreakdown = ({ stats, periodLabel }) => {
  const byTeam = stats?.byTeam ?? []
  const teamMax = byTeam.length > 0 ? byTeam[0].count : 1

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Leave by Team</div>
          <div className="text-body-secondary small mt-1">Requests ranked by volume</div>
        </div>
        {periodLabel && (
          <span className="text-body-secondary small text-nowrap ms-2">{periodLabel}</span>
        )}
      </CCardHeader>
      <CCardBody>
        {byTeam.map((row) => {
          const pct = Math.round((row.count / teamMax) * 100)
          return (
            <div key={row.team} className="mb-3">
              <CRow className="align-items-center g-0 mb-1">
                <CCol xs="auto" className="text-body-secondary small me-auto">
                  {row.team}
                </CCol>
                <CCol xs="auto" className="text-body-secondary small fw-semibold">
                  {row.count}
                </CCol>
              </CRow>
              <CProgress thin color="info" value={pct} />
            </div>
          )
        })}
      </CCardBody>
    </CCard>
  )
}

LeaveTeamBreakdown.propTypes = {
  stats: PropTypes.shape({
    byTeam: PropTypes.arrayOf(
      PropTypes.shape({ team: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}
