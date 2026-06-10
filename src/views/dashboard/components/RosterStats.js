import React from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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

// ─── Zone 1 — two KPI tiles ───────────────────────────────────────────────────

export const RosterKpiTiles = ({ stats }) => {
  const trend = stats?.monthlyTrend ?? []
  const trendCounts = trend.map((t) => t.scheduledDays)
  const trendLabels = trend.map((t) => t.month)

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
      {/* Tile 1 — Teams on duty right now · success */}
      <CCol xs={6} lg={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="success"
          value={
            <>
              {stats?.teamsOnDuty ?? 0}{' '}
              <span className="fs-6 fw-normal">teams</span>
            </>
          }
          title={<TileTitle>Teams on Duty<PeriodLabel label="Right Now" /></TileTitle>}
          chart={sparkline(getStyle('--cui-success'), true)}
        />
      </CCol>

      {/* Tile 2 — Draft rosters pending publish · warning */}
      <CCol xs={6} lg={4} xxl={3}>
        <CWidgetStatsA
          className="h-100"
          color="warning"
          value={
            <>
              {stats?.draftsPendingPublish ?? 0}{' '}
              <span className="fs-6 fw-normal">days</span>
            </>
          }
          title={<TileTitle>Draft Roster Days<PeriodLabel label="Unpublished" /></TileTitle>}
          chart={sparkline(getStyle('--cui-warning'))}
        />
      </CCol>
    </>
  )
}

RosterKpiTiles.propTypes = {
  stats: PropTypes.shape({
    teamsOnDuty: PropTypes.number,
    draftsPendingPublish: PropTypes.number,
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, scheduledDays: PropTypes.number }),
    ),
  }),
}

// ─── Zone 3 — monthly scheduled days chart ────────────────────────────────────

export const RosterActivityChart = ({ stats }) => {
  const trend = stats?.monthlyTrend ?? []

  return (
    <CCard className="h-100">
      <CCardHeader>
        <div className="fw-semibold">Roster Coverage</div>
        <div className="text-body-secondary small mt-1">Scheduled days per month</div>
      </CCardHeader>
      <CCardBody>
        <CChartBar
          data={{
            labels: trend.map((t) => t.month),
            datasets: [
              {
                label: 'Scheduled Days',
                backgroundColor: MODULE_ACCENTS.roster.base,
                data: trend.map((t) => t.scheduledDays),
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

RosterActivityChart.propTypes = {
  stats: PropTypes.shape({
    monthlyTrend: PropTypes.arrayOf(
      PropTypes.shape({ month: PropTypes.string, scheduledDays: PropTypes.number }),
    ),
  }),
}

// ─── Zone 4 — per-team shift breakdown table ──────────────────────────────────

const TEAM_COLORS = {
  alpha:   { bg: '#eef2ff', text: '#4338ca' },
  bravo:   { bg: '#ecfdf5', text: '#059669' },
  charlie: { bg: '#fffbeb', text: '#d97706' },
  delta:   { bg: '#fff1f2', text: '#e11d48' },
}

const getTeamColor = (name) => {
  const key = (name || '').trim().toLowerCase()
  return TEAM_COLORS[key] || { bg: '#f1f5f9', text: '#475569' }
}

export const RosterTeamBreakdown = ({ stats }) => {
  const teams = stats?.teams ?? []

  return (
    <CCard className="h-100">
      <CCardHeader>
        <div className="fw-semibold">Team Shift Summary</div>
        <div className="text-body-secondary small mt-1">Shifts covered per team · Current period</div>
      </CCardHeader>
      <CCardBody className="p-0">
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cui-secondary-bg)' }}>
                {['Team', 'Staff', 'Day', 'Night', 'Total'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: 'var(--cui-secondary-color)',
                      borderBottom: '1px solid var(--cui-border-color)',
                      textAlign: h === 'Team' ? 'left' : 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => {
                const { bg, text } = getTeamColor(team.name)
                return (
                  <tr
                    key={team.name}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--cui-border-color)' : undefined,
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        className="rounded-pill px-2 py-1 fw-semibold"
                        style={{ background: bg, color: text, fontSize: '0.82rem' }}
                      >
                        {team.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
                      {team.memberCount}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
                      {team.dayShifts}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
                      {team.nightShifts}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                      {team.totalShifts}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CCardBody>
    </CCard>
  )
}

RosterTeamBreakdown.propTypes = {
  stats: PropTypes.shape({
    teams: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        memberCount: PropTypes.number,
        dayShifts: PropTypes.number,
        nightShifts: PropTypes.number,
        totalShifts: PropTypes.number,
      }),
    ),
  }),
}
