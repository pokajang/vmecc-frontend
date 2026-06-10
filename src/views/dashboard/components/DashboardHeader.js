import React, { useLayoutEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CButtonGroup, CCol, CRow } from '@coreui/react'

export const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'ytd', label: 'YTD' },
]

export const resolvePeriodLabel = (period) => {
  const now = new Date()
  const fmt = (d, opts) => d.toLocaleDateString('en-MY', opts)
  const monthYear = (d) => fmt(d, { month: 'long', year: 'numeric' })
  const shortMonthYear = (d) => fmt(d, { month: 'short', year: 'numeric' })

  if (period === 'this_month') return monthYear(now)
  if (period === 'last_month') {
    return monthYear(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  }
  if (period === '3m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return `${shortMonthYear(from)} – ${shortMonthYear(now)}`
  }
  if (period === '6m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    return `${shortMonthYear(from)} – ${shortMonthYear(now)}`
  }
  if (period === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1)
    return `${shortMonthYear(from)} – ${shortMonthYear(now)}`
  }
  return ''
}

const useAppHeaderHeight = () => {
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const appHeader = document.querySelector('header.header')
    if (!appHeader) return

    const measure = () => {
      const style = getComputedStyle(appHeader)
      const marginBottom = parseFloat(style.marginBottom) || 0
      const headerBottom = appHeader.getBoundingClientRect().bottom
      setHeight(Math.max(0, Math.ceil(headerBottom + marginBottom)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(appHeader)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [])

  return height
}

const DashboardHeader = ({ period, onPeriodChange, userName }) => {
  const periodLabel = resolvePeriodLabel(period)
  const stickyTop = useAppHeaderHeight()

  return (
    <div
      className="mb-4 pb-3 border-bottom"
      style={{
        position: 'sticky',
        top: stickyTop,
        zIndex: 10,
        background: 'var(--cui-body-bg)',
        paddingTop: '1rem',
      }}
    >
      <CRow className="align-items-center gy-3">
        <CCol xs={12} md>
          <h4 className="mb-1 fw-semibold">Dashboard Overview</h4>
          <div className="text-body-secondary small">
            {userName ? `Welcome back, ${userName} · ` : ''}
            Operations overview &middot; <span className="fw-medium text-body">{periodLabel}</span>
          </div>
        </CCol>
        <CCol xs={12} md="auto">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <CButtonGroup size="sm" role="group" aria-label="Select data period">
              {PERIOD_OPTIONS.map((opt) => (
                <CButton
                  key={opt.value}
                  color={period === opt.value ? 'success' : 'outline-secondary'}
                  onClick={() => onPeriodChange(opt.value)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {opt.label}
                </CButton>
              ))}
            </CButtonGroup>
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

DashboardHeader.propTypes = {
  period: PropTypes.string.isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  userName: PropTypes.string,
}

export default DashboardHeader
