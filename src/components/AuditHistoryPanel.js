import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { normalizeHistoryEntries } from './auditHistory'

const renderDetails = (details = {}, formatValue = (value) => value) => {
  const entries = Object.entries(details || {}).filter(([, value]) => {
    if (value === null || typeof value === 'undefined') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return String(value).trim() !== ''
  })
  if (!entries.length) return null

  return (
    <div className="small text-body-secondary mt-1">
      {entries
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${formatValue(value)}`)
        .join(' | ')}
    </div>
  )
}

const AuditHistoryPanel = ({
  title = 'History',
  entries = [],
  emptyMessage = 'No history yet.',
  formatDateTime = (value) => value || '-',
  formatValue = (value) =>
    Array.isArray(value) || (value && typeof value === 'object')
      ? JSON.stringify(value)
      : String(value ?? '-'),
}) => {
  const rows = normalizeHistoryEntries(entries)

  return (
    <CCard>
      <CCardHeader>{title}</CCardHeader>
      <CCardBody>
        {rows.length === 0 ? (
          <div className="text-body-secondary small">{emptyMessage}</div>
        ) : (
          <div className="d-grid gap-2">
            {rows.map((entry) => (
              <div
                key={entry.id}
                className="d-flex flex-column flex-md-row justify-content-between gap-2 py-1"
              >
                <div>
                  <div className="fw-semibold">{entry.action || '-'}</div>
                  <div className="small text-body-secondary">
                    {entry.targetLabel ? `${entry.targetLabel} | ` : ''}
                    {formatDateTime(entry.occurredAt)}
                  </div>
                  {entry.summary ? (
                    <div className="small text-body-secondary mt-1">{entry.summary}</div>
                  ) : (
                    renderDetails(entry.details, formatValue)
                  )}
                  {entry.remarks ? (
                    <div className="small text-body-secondary mt-1">{entry.remarks}</div>
                  ) : null}
                </div>
                <div className="small text-body-secondary text-md-end">
                  by <span className="fw-semibold text-body">{entry.actorName || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AuditHistoryPanel
