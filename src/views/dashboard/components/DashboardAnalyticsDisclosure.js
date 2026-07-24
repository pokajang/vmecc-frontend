import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const MOBILE_QUERY = '(max-width: 767.98px)'

const getIsMobile = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY).matches
    : false

const DashboardAnalyticsDisclosure = ({ children, title }) => {
  const [isOpen, setIsOpen] = useState(() => !getIsMobile())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const updateDisclosure = (event) => setIsOpen(!event.matches)

    mediaQuery.addEventListener('change', updateDisclosure)

    return () => mediaQuery.removeEventListener('change', updateDisclosure)
  }, [])

  return (
    <details
      className="dashboard-analytics"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="dashboard-analytics__summary">
        <span className="dashboard-analytics__title">{title}</span>
        <span className="dashboard-analytics__hint">
          {isOpen ? 'Hide details' : 'View details'}
        </span>
      </summary>
      <div className="dashboard-analytics__content">{children}</div>
    </details>
  )
}

DashboardAnalyticsDisclosure.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
}

export default DashboardAnalyticsDisclosure
