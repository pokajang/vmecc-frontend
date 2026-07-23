import React from 'react'
import PropTypes from 'prop-types'

const DashboardEmptyState = ({ message }) => (
  <div className="dashboard-empty-state" role="status">
    {message}
  </div>
)

DashboardEmptyState.propTypes = {
  message: PropTypes.string.isRequired,
}

export default DashboardEmptyState
