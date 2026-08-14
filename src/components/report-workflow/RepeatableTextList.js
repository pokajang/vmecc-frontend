import React from 'react'
import { CButton, CFormInput } from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'

const RepeatableTextList = ({
  id,
  label,
  rows = [],
  maxRows,
  maxLength,
  placeholder = '',
  addLabel = 'Add',
  showHeading = true,
  onAdd,
  onChange,
  onRemove,
}) => {
  const safeRows = Array.isArray(rows) ? rows : []
  const atLimit = Number.isFinite(maxRows) && safeRows.length >= maxRows
  const nearLimit = Number.isFinite(maxRows) && safeRows.length >= maxRows - 1

  return (
    <section
      className="workflow-repeatable-list"
      aria-labelledby={showHeading ? id : undefined}
      aria-label={showHeading ? undefined : label}
    >
      <div
        className={`workflow-repeatable-list__header ${showHeading ? '' : 'justify-content-end'}`.trim()}
      >
        {showHeading ? (
          <div id={id} className="workflow-repeatable-list__title">
            {label}
            {nearLimit ? (
              <span className="workflow-repeatable-list__count">
                {safeRows.length}/{maxRows}
              </span>
            ) : null}
          </div>
        ) : null}
        <CButton type="button" color="light" size="sm" disabled={atLimit} onClick={onAdd}>
          <Plus size={14} aria-hidden="true" /> {addLabel}
        </CButton>
      </div>
      <div className="workflow-repeatable-list__rows">
        {safeRows.map((row, index) => (
          <div key={row?.id || `${id}-${index}`} className="workflow-repeatable-list__row">
            <CFormInput
              aria-label={`${label} entry ${index + 1}`}
              maxLength={maxLength}
              value={typeof row === 'string' ? row : row?.value || row?.text || ''}
              placeholder={placeholder}
              onChange={(event) => onChange?.(index, event.target.value, row)}
            />
            <CButton
              type="button"
              color="light"
              aria-label={`Remove ${label} entry ${index + 1}`}
              disabled={safeRows.length <= 1}
              onClick={() => onRemove?.(index, row)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </CButton>
          </div>
        ))}
      </div>
    </section>
  )
}

export default RepeatableTextList
