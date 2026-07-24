import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader, CProgress } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import DashboardEmptyState from './DashboardEmptyState'

export const DashboardActivityChart = ({
  title,
  description,
  periodLabel,
  trend,
  valueKey = 'count',
  datasetLabel,
  emptyMessage,
}) => {
  const hasTrend = trend.length > 0

  return (
    <CCard className="dashboard-chart-card h-100">
      <CCardHeader className="dashboard-chart-card__header d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">{title}</div>
          <div className="text-body-secondary small mt-1">{description}</div>
        </div>
        {periodLabel && <span className="dashboard-chart-card__period">{periodLabel}</span>}
      </CCardHeader>
      <CCardBody>
        {hasTrend ? (
          <CChartBar
            className="dashboard-activity-chart"
            aria-label={`${title} by month`}
            role="img"
            data={{
              labels: trend.map((entry) => entry.month),
              datasets: [
                {
                  label: datasetLabel,
                  backgroundColor: getStyle('--cui-primary'),
                  data: trend.map((entry) => entry[valueKey] ?? 0),
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
        ) : (
          <DashboardEmptyState message={emptyMessage} />
        )}
      </CCardBody>
    </CCard>
  )
}

DashboardActivityChart.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  periodLabel: PropTypes.string,
  trend: PropTypes.arrayOf(PropTypes.shape({ month: PropTypes.string })).isRequired,
  valueKey: PropTypes.string,
  datasetLabel: PropTypes.string.isRequired,
  emptyMessage: PropTypes.string.isRequired,
}

export const DashboardBreakdownRows = ({ title, rows, scale = 'total' }) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const maximum = rows.reduce((max, row) => Math.max(max, row.value), 0)
  const denominator = scale === 'max' ? maximum : total

  return (
    <section className="dashboard-breakdown-rows" aria-label={title}>
      <h4 className="dashboard-breakdown-rows__title">{title}</h4>
      <div className="dashboard-breakdown-rows__items">
        {rows.map((row) => {
          const percentage = denominator > 0 ? Math.round((row.value / denominator) * 100) : 0

          return (
            <div key={row.key} className="dashboard-breakdown-rows__item">
              <div className="dashboard-breakdown-rows__label-row">
                <span className="dashboard-breakdown-rows__label">{row.label}</span>
                <span className="dashboard-breakdown-rows__value">{row.value}</span>
              </div>
              <CProgress thin color={row.tone || 'primary'} value={percentage} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

DashboardBreakdownRows.propTypes = {
  title: PropTypes.string.isRequired,
  scale: PropTypes.oneOf(['total', 'max']),
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      tone: PropTypes.string,
    }),
  ).isRequired,
}
