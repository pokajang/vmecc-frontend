import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import DashboardEmptyState from './DashboardEmptyState'
import DashboardMetricList from './DashboardMetricList'
import { DashboardActivityChart, DashboardBreakdownRows } from './DashboardCharts'
import { reportContextLabel } from '../utils/reportContext'

const familyFallbacks = {
  inspection: { label: 'Inspection', route: '/inspection' },
  erco: { label: 'ERCO', route: '/report/erco' },
  drill: { label: 'Drill', route: '/report/drill' },
  'fitness-test': { label: 'Fitness test', route: '/report/fitness-test' },
}

const appendQuery = (route, query) => `${route}${route.includes('?') ? '&' : '?'}${query}`

export const ReportKpiTiles = ({ stats }) => {
  const families = Object.entries(stats?.families ?? {})

  if (families.length === 0) {
    return (
      <CCol xs={12}>
        <DashboardMetricList
          title={stats?.scope?.label}
          metrics={[
            {
              key: 'pending-review',
              value: stats?.pendingReview ?? 0,
              label: 'awaiting your review',
              tone: 'warning',
            },
            {
              key: 'pending-approval',
              value: stats?.pendingApproval ?? 0,
              label: 'awaiting your approval',
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
  }

  return (
    <CCol xs={12}>
      <section className="dashboard-report-status" aria-labelledby="dashboard-report-status-title">
        <div className="dashboard-report-status__header">
          <h4 id="dashboard-report-status-title" className="dashboard-report-status__title">
            Reporting families
          </h4>
          <p className="dashboard-report-status__scope">
            {stats?.scope?.label || 'Actions assigned to you'}
          </p>
        </div>
        <div className="dashboard-report-status__families">
          {families.map(([key, family]) => {
            const fallback = familyFallbacks[key] ?? familyFallbacks.erco
            const route = family.route || fallback.route
            const periodQuery = new URLSearchParams({
              scope: 'all',
              ...(stats?.period?.dateFrom ? { date_from: stats.period.dateFrom } : {}),
              ...(stats?.period?.dateTo ? { date_to: stats.period.dateTo } : {}),
            }).toString()

            return (
              <article className="dashboard-report-family" key={key}>
                <div className="dashboard-report-family__heading">
                  <h5>{family.label || fallback.label}</h5>
                  <Link
                    to={appendQuery(route, 'scope=all')}
                    className="dashboard-report-family__records"
                  >
                    Records
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
                <div className="dashboard-report-family__metrics">
                  <Link
                    to={appendQuery(route, 'scope=actionable&action=review')}
                    className="dashboard-report-family__metric"
                  >
                    <strong>{family.pendingReview ?? 0}</strong>
                    <span>your reviews</span>
                  </Link>
                  <Link
                    to={appendQuery(route, 'scope=actionable&action=approve')}
                    className="dashboard-report-family__metric"
                  >
                    <strong>{family.pendingApproval ?? 0}</strong>
                    <span>your approvals</span>
                  </Link>
                  <Link
                    to={appendQuery(route, periodQuery)}
                    className="dashboard-report-family__metric"
                  >
                    <strong>{family.submittedThisPeriod ?? 0}</strong>
                    <span>this period</span>
                  </Link>
                </div>
                {Array.isArray(family.contexts) && family.contexts.length > 0 && (
                  <div
                    className="dashboard-report-family__contexts"
                    aria-label={`${family.label || fallback.label} assigned actions by team and role`}
                  >
                    {family.contexts.map((context, index) => (
                      <Link
                        key={`${context.action}-${context.teamId || 'organization'}-${context.assignmentSource}-${index}`}
                        to={context.to}
                        className="dashboard-report-family__context"
                      >
                        <span className="dashboard-report-family__context-action">
                          <strong>{context.count}</strong>{' '}
                          {context.action === 'approve'
                            ? 'awaiting approval'
                            : context.action === 'submitted'
                              ? 'submitted this period'
                              : 'awaiting review'}
                        </span>
                        <span className="dashboard-report-family__context-detail">
                          {reportContextLabel(context)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </CCol>
  )
}

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
  const byType = stats?.byType ?? { inspection: 0, erco: 0, drill: 0, fitnessTest: 0 }
  const ercoByType = stats?.ercoByIncidentType ?? []
  const byPersonnel = stats?.byPersonnel ?? []
  const reportTypeRows = [
    { key: 'inspection', label: 'Inspection', value: byType.inspection, tone: 'warning' },
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
    inspection: PropTypes.number,
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
  scope: PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
  }),
  period: PropTypes.shape({
    dateFrom: PropTypes.string,
    dateTo: PropTypes.string,
  }),
  families: PropTypes.objectOf(
    PropTypes.shape({
      label: PropTypes.string,
      route: PropTypes.string,
      pendingReview: PropTypes.number,
      pendingApproval: PropTypes.number,
      submittedThisPeriod: PropTypes.number,
      contexts: PropTypes.arrayOf(
        PropTypes.shape({
          action: PropTypes.oneOf(['review', 'approve', 'submitted']),
          count: PropTypes.number,
          teamId: PropTypes.number,
          teamName: PropTypes.string,
          actingRole: PropTypes.string,
          actingRoleCode: PropTypes.string,
          assignmentSource: PropTypes.string,
          coverageUntil: PropTypes.string,
          to: PropTypes.string.isRequired,
        }),
      ),
    }),
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
