import React from 'react'
import PropTypes from 'prop-types'

export const sparklineOptions = {
  plugins: { legend: { display: false } },
  maintainAspectRatio: false,
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: {
        display: true,
        color: 'rgba(255,255,255,0.65)',
        font: { size: 9 },
        maxRotation: 0,
        minRotation: 0,
      },
    },
    y: { display: false, grid: { display: false } },
  },
  elements: {
    line: { borderWidth: 1, tension: 0.4 },
    point: { radius: 4, hitRadius: 10, hoverRadius: 4 },
  },
}

export const bgChartOptions = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: {
    line: { tension: 0.4 },
    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
  },
}

export const sparklineDataset = (color, filled = false) => ({
  backgroundColor: filled ? 'rgba(255,255,255,.15)' : 'transparent',
  borderColor: 'rgba(255,255,255,.6)',
  pointBackgroundColor: color,
  fill: filled,
})

// One source of truth for module accent colors.
// Referenced in Dashboard.js (section headers) and stats components (gradients, chart fills).
export const MODULE_ACCENTS = {
  payroll: { base: '#1b7a4a', dark: '#145c38', sparkline: '#6fcf97' },
  overtime: { base: '#b45309', dark: '#92400e', sparkline: '#fcd34d' },
  leave: { base: '#0e7490', dark: '#0a5a6e', sparkline: '#67e8f9' },
  roster: { base: '#4f46e5', dark: '#3730a3', sparkline: '#a5b4fc' },
  reports: { base: '#be185d', dark: '#9d174d', sparkline: '#f9a8d4' },
  inspection: { base: '#7c3aed', dark: '#5b21b6', sparkline: '#c4b5fd' },
}

export const PeriodLabel = ({ label }) => (
  <div className="mt-2">
    <span
      style={{
        display: 'inline-block',
        background: 'rgba(255,255,255,0.22)',
        borderRadius: '20px',
        padding: '2px 10px',
        fontSize: '0.875rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </span>
  </div>
)
PeriodLabel.propTypes = { label: PropTypes.string.isRequired }

export const TileTitle = ({ children }) => (
  <div style={{ fontSize: '1rem', lineHeight: 1.35 }}>{children}</div>
)
TileTitle.propTypes = { children: PropTypes.node.isRequired }
