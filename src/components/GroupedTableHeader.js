import React from 'react'
import { CTableDataCell, CTableRow } from '@coreui/react'

const toUpperLabel = (value, fallback = 'Unknown') =>
  String(value || fallback)
    .trim()
    .toUpperCase()

export const CountBadge = ({ count = 0, noun = 'records' }) => (
  <span className="badge rounded-pill bg-body-tertiary text-body-secondary fw-normal">
    {count} {count === 1 && noun.endsWith('s') ? noun.slice(0, -1) : noun}
  </span>
)

export const GroupTotalBadge = ({ label = 'Total', value = '-', title = '' }) => (
  <span
    className="badge rounded-pill bg-body-tertiary text-body-secondary fw-normal"
    title={title || undefined}
  >
    <span>{label}</span>: <span className="fw-semibold text-body">{value}</span>
  </span>
)

export const MonthGroupLabel = ({
  label = '',
  periodLabel = '',
  count = 0,
  countNoun = 'records',
  testId = 'month-group-label',
  className = '',
}) => {
  const resolvedLabel = label || periodLabel || 'Unknown month'
  return (
    <div
      className={`d-inline-flex align-items-center gap-2 ${className}`.trim()}
      data-testid={testId}
    >
      <span
        className="text-body-secondary fw-semibold small"
        style={{ letterSpacing: '0.06em' }}
        data-testid={`${testId}-month`}
      >
        {toUpperLabel(resolvedLabel, 'Unknown month')}
      </span>
      <CountBadge count={count} noun={countNoun} />
    </div>
  )
}

export const UserGroupLabel = ({
  name = '',
  ownerLabel = '',
  count = 0,
  countNoun = 'records',
  testId = 'user-group-label',
  className = '',
}) => {
  const resolvedName = String(name || ownerLabel || 'Unknown').trim() || 'Unknown'
  return (
    <div
      className={`d-inline-flex align-items-center gap-2 ${className}`.trim()}
      data-testid={testId}
    >
      <span className="text-body-secondary fw-semibold" data-testid={`${testId}-name`}>
        {resolvedName}
      </span>
      <CountBadge count={count} noun={countNoun} />
    </div>
  )
}

const GroupedTableHeaderRow = ({
  colSpan,
  label,
  count,
  countNoun = 'records',
  children,
  className = 'table-light',
  cellClassName = 'fw-semibold text-body-secondary',
  testId,
}) => (
  <CTableRow className={className}>
    <CTableDataCell colSpan={colSpan} className={cellClassName}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <MonthGroupLabel label={label} count={count} countNoun={countNoun} testId={testId} />
        {children}
      </div>
    </CTableDataCell>
  </CTableRow>
)

export default GroupedTableHeaderRow
