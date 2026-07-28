import React from 'react'
import PropTypes from 'prop-types'
import { CListGroup, CListGroupItem } from '@coreui/react'
import { Link } from 'react-router-dom'

const DashboardMetricList = ({ title, metrics, className = '' }) => (
  <section
    className={`dashboard-metric-list ${className}`.trim()}
    aria-label={title || 'Current metrics'}
  >
    {title && <h4 className="dashboard-metric-list__title">{title}</h4>}
    <CListGroup className="dashboard-metric-list__items">
      {metrics.map((metric) => (
        <CListGroupItem
          as={metric.to ? Link : undefined}
          to={metric.to}
          key={metric.key}
          className={`dashboard-metric-list__item ${
            metric.to ? 'dashboard-metric-list__item--link text-decoration-none' : ''
          }`.trim()}
          aria-label={
            metric.to ? `${metric.value} ${metric.label}. View matching records.` : undefined
          }
        >
          <span
            aria-hidden="true"
            className={`dashboard-metric-list__tone dashboard-metric-list__tone--${
              metric.tone || 'primary'
            }`}
          />
          <span className="dashboard-metric-list__summary">
            <strong className="dashboard-metric-list__value">{metric.value}</strong>
            {metric.unit && <span className="dashboard-metric-list__unit"> {metric.unit}</span>}
            <span aria-hidden="true" className="dashboard-metric-list__separator">
              {' '}
              ·{' '}
            </span>
            <span className="dashboard-metric-list__label">{metric.label}</span>
            {metric.detail && (
              <span className="dashboard-metric-list__detail"> · {metric.detail}</span>
            )}
          </span>
        </CListGroupItem>
      ))}
    </CListGroup>
  </section>
)

DashboardMetricList.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      unit: PropTypes.string,
      label: PropTypes.string.isRequired,
      detail: PropTypes.string,
      tone: PropTypes.oneOf(['primary', 'warning', 'danger', 'success', 'muted']),
      to: PropTypes.string,
    }),
  ).isRequired,
}

export default DashboardMetricList
