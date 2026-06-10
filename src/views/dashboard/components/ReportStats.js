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
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import {
  sparklineOptions,
  sparklineDataset,
  MODULE_ACCENTS,
  PeriodLabel,
  TileTitle,
} from '../utils/chartDefaults'

const { base: ACCENT, dark: ACCENT_DARK, sparkline: ACCENT_SPARK } = MODULE_ACCENTS.reports

// ─── Zone 1 — three KPI tiles ─────────────────────────────────────────────────

export const ReportKpiTiles = ({ stats, periodLabel }) => {
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
      {/* Tile 1 — Pending review · warning */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={stats?.pendingReview ?? 0}
          title={<TileTitle>Reports Pending Review<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>

      {/* Tile 2 — Pending approval · warning */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={stats?.pendingApproval ?? 0}
          title={<TileTitle>Reports Pending Approval<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>

      {/* Tile 3 — Submitted this period · module-accented rose gradient */}
      <CCol xs={6} xl={4} xxl={3}>
        <CWidgetStatsA
          className="h-100 text-white"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}
          value={
            <>
              {stats?.submittedThisPeriod ?? 0}{' '}
              <span className="fs-6 fw-normal">reports</span>
            </>
          }
          title={<TileTitle>Reports Submitted<PeriodLabel label={pl} /></TileTitle>}
          chart={sparkline(ACCENT_SPARK, true)}
        />
      </CCol>
    </>
  )
}

ReportKpiTiles.propTypes = {
  stats: PropTypes.shape({
    pendingReview: PropTypes.number,
    pendingApproval: PropTypes.number,
    submittedThisPeriod: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 3 — monthly submissions chart ──────────────────────────────────────

export const ReportActivityChart = ({ stats, periodLabel }) => {
  const trend = stats?.monthlyTrend ?? []

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Reports Submitted</div>
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
                label: 'Reports',
                backgroundColor: ACCENT,
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

ReportActivityChart.propTypes = {
  stats: PropTypes.shape({
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, count: PropTypes.number }),
    ),
  }),
  periodLabel: PropTypes.string,
}

// ─── Zone 4 — type doughnut + ERCO incidents + personnel breakdown ─────────────

export const ReportBreakdown = ({ stats, periodLabel }) => {
  const byType = stats?.byType ?? { erco: 0, drill: 0, fitnessTest: 0 }
  const ercoByType = stats?.ercoByIncidentType ?? []
  const byPersonnel = stats?.byPersonnel ?? []
  const incidentMax = ercoByType.length > 0 ? ercoByType[0].count : 1
  const personnelMax = byPersonnel.length > 0 ? byPersonnel[0].count : 1

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Reports Breakdown</div>
          <div className="text-body-secondary small mt-1">By type, incident, and personnel</div>
        </div>
        {periodLabel && (
          <span className="text-body-secondary small text-nowrap ms-2">{periodLabel}</span>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">

          {/* By report type — doughnut */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">By report type</div>
            <CChartDoughnut
              style={{ maxHeight: '200px' }}
              data={{
                labels: ['ERCO', 'Drill', 'Fitness Test'],
                datasets: [
                  {
                    data: [byType.erco, byType.drill, byType.fitnessTest],
                    backgroundColor: [ACCENT, getStyle('--cui-warning'), getStyle('--cui-info')],
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

          {/* ERCO by incident type — ranked list */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">ERCO by incident type</div>
            {ercoByType.map((row) => {
              const pct = Math.round((row.count / incidentMax) * 100)
              return (
                <div key={row.type} className="mb-2">
                  <CRow className="align-items-center g-0 mb-1">
                    <CCol xs="auto" className="text-body-secondary small me-auto">
                      {row.type}
                    </CCol>
                    <CCol xs="auto" className="text-body-secondary small fw-semibold">
                      {row.count}
                    </CCol>
                  </CRow>
                  <CProgress thin color="danger" value={pct} />
                </div>
              )
            })}
          </CCol>

          {/* By personnel — ranked list */}
          <CCol xs={12} md={4}>
            <div className="text-body-secondary small mb-2">By personnel</div>
            {byPersonnel.map((row) => {
              const pct = Math.round((row.count / personnelMax) * 100)
              return (
                <div key={row.name} className="mb-2">
                  <CRow className="align-items-center g-0 mb-1">
                    <CCol xs="auto" className="text-body-secondary small me-auto">
                      {row.name}
                    </CCol>
                    <CCol xs="auto" className="text-body-secondary small fw-semibold">
                      {row.count}
                    </CCol>
                  </CRow>
                  <CProgress thin color="secondary" value={pct} />
                </div>
              )
            })}
          </CCol>

        </CRow>
      </CCardBody>
    </CCard>
  )
}

ReportBreakdown.propTypes = {
  stats: PropTypes.shape({
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
  }),
  periodLabel: PropTypes.string,
}
