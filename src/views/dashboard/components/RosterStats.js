import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol } from '@coreui/react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart } from './DashboardCharts'

export const RosterKpiTiles = ({ stats }) => (
  <CCol xs={12}>
    <DashboardMetricList
      metrics={[
        {
          key: 'teams-on-duty',
          value: stats?.teamsOnDuty ?? 0,
          unit: 'teams',
          label: 'on duty now',
          tone: 'success',
        },
        {
          key: 'drafts-pending-publish',
          value: stats?.draftsPendingPublish ?? 0,
          label: 'draft days to publish',
          tone: 'warning',
        },
      ]}
    />
  </CCol>
)

export const RosterActivityChart = ({ stats }) => (
  <DashboardActivityChart
    title="Roster coverage"
    description="Scheduled days per month"
    trend={stats?.monthlyTrend ?? []}
    valueKey="scheduledDays"
    datasetLabel="Scheduled days"
    emptyMessage="No roster coverage is available for this period."
  />
)

export const RosterTeamBreakdown = ({ stats }) => {
  const teams = stats?.teams ?? []

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header">
        <div className="fw-semibold">Team shift summary</div>
        <div className="text-body-secondary small mt-1">Shifts covered in the current period</div>
      </CCardHeader>
      <CCardBody className="p-0">
        {teams.length === 0 ? (
          <DashboardEmptyState message="No team shift summary is available for this period." />
        ) : (
          <>
            <div
              className="table-responsive dashboard-team-table-scroll dashboard-team-table-desktop"
              tabIndex={0}
              aria-label="Team shift summary table. Scroll horizontally to view all columns."
            >
              <table className="dashboard-team-table">
                <caption className="visually-hidden">
                  Team shift summary for the current period
                </caption>
                <thead>
                  <tr>
                    {['Team', 'Staff', 'Day', 'Night', 'Total'].map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.name}>
                      <td>
                        <span className="dashboard-team-badge">{team.name}</span>
                      </td>
                      <td>{team.memberCount}</td>
                      <td>{team.dayShifts}</td>
                      <td>{team.nightShifts}</td>
                      <td>{team.totalShifts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="dashboard-team-summary-list" aria-label="Team shift summaries">
              {teams.map((team) => (
                <li key={team.name} className="dashboard-team-summary-list__item">
                  <div className="dashboard-team-summary-list__primary">
                    <strong className="dashboard-team-summary-list__name">{team.name}</strong>
                    <span className="dashboard-team-summary-list__total">
                      <strong>{team.totalShifts}</strong> shifts
                    </span>
                  </div>
                  <div className="dashboard-team-summary-list__details">
                    <span>{team.memberCount} staff</span>
                    <span>Day {team.dayShifts}</span>
                    <span>Night {team.nightShifts}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

const rosterStatsShape = {
  teamsOnDuty: PropTypes.number,
  draftsPendingPublish: PropTypes.number,
  monthlyTrend: PropTypes.arrayOf(
    PropTypes.shape({ month: PropTypes.string, scheduledDays: PropTypes.number }),
  ),
  teams: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      memberCount: PropTypes.number,
      dayShifts: PropTypes.number,
      nightShifts: PropTypes.number,
      totalShifts: PropTypes.number,
    }),
  ),
}

RosterKpiTiles.propTypes = { stats: PropTypes.shape(rosterStatsShape) }
RosterActivityChart.propTypes = { stats: PropTypes.shape(rosterStatsShape) }
RosterTeamBreakdown.propTypes = { stats: PropTypes.shape(rosterStatsShape) }
