import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { reportContextLabel } from '../utils/reportContext'

const actionLabel = (action) => {
  const normalized = String(action || '').toLowerCase()
  return normalized ? `awaiting ${normalized}` : 'awaiting action'
}

const WorkflowStatsContexts = ({ contexts, ariaLabel }) => {
  if (!Array.isArray(contexts) || contexts.length === 0) return null

  return (
    <div className="dashboard-report-family__contexts" aria-label={ariaLabel}>
      {contexts.map((context, index) => (
        <Link
          key={`${context.claimType || 'workflow'}-${context.action}-${context.teamId || 'organization'}-${context.role}-${index}`}
          to={context.to}
          className="dashboard-report-family__context"
        >
          <span className="dashboard-report-family__context-action">
            <strong>{context.count}</strong> {actionLabel(context.action)}
          </span>
          <span className="dashboard-report-family__context-detail">
            {reportContextLabel(context)}
          </span>
        </Link>
      ))}
    </div>
  )
}

WorkflowStatsContexts.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  contexts: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string,
      claimType: PropTypes.string,
      count: PropTypes.number.isRequired,
      role: PropTypes.string,
      routingSource: PropTypes.string,
      scopeLabel: PropTypes.string,
      teamId: PropTypes.number,
      teamName: PropTypes.string,
      to: PropTypes.string.isRequired,
    }),
  ),
}

export default WorkflowStatsContexts
