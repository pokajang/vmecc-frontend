import React, { useState } from 'react'
import { CBadge, CButton, CFormCheck, CFormTextarea } from '@coreui/react'
import { Eye } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import EditControls from 'src/components/EditControls'

const DESCRIPTION_CARD_BG = 'var(--cui-light-bg-subtle, #f8f9fa)'

export const getAngleOptions = (descriptions, angle) =>
  (descriptions || []).find((d) => d.angle === angle)?.options || []

export const DescriptionStep = ({
  title,
  options,
  value,
  onChange,
  onContinue,
  onBack,
  onCancel,
  isLast,
  isRowEdit,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const i = options.indexOf(value)
    return i >= 0 ? i : options.length > 0 ? 0 : -1
  })
  const [textareaValue, setTextareaValue] = useState(() =>
    options.includes(value) ? '' : value || '',
  )

  const selectOption = (i) => {
    setSelectedIdx(i)
    setTextareaValue('')
    onChange(options[i])
  }

  return (
    <div
      className="rounded-3 border p-3 d-grid gap-3"
      style={{ backgroundColor: DESCRIPTION_CARD_BG }}
    >
      <div className="fw-semibold text-muted">{title}</div>
      <div className="text-body-secondary small">
        AI analysis recommendation - you may choose or write one.
      </div>
      <div className="d-grid gap-2">
        {options.map((opt, i) => (
          <CFormCheck
            key={i}
            type="radio"
            id={`desc-${title}-${i}`}
            label={opt}
            checked={selectedIdx === i}
            onChange={() => selectOption(i)}
          />
        ))}
      </div>
      <CFormTextarea
        rows={3}
        aria-label="Describe the inspection finding"
        placeholder="or describe what you see"
        value={textareaValue}
        onChange={(e) => {
          setSelectedIdx(-1)
          setTextareaValue(e.target.value)
          onChange(e.target.value)
        }}
      />
      <div className="d-flex justify-content-end">
        {onBack ? (
          <CButton size="sm" color="light" className="me-2" onClick={onBack}>
            Back
          </CButton>
        ) : null}
        {isRowEdit ? (
          <CButton size="sm" color="light" className="me-2" onClick={onCancel}>
            Cancel
          </CButton>
        ) : null}
        <CButton
          size="sm"
          color="primary"
          onClick={onContinue}
          disabled={!String(value || '').trim()}
        >
          {isRowEdit ? 'Save' : isLast ? 'Save' : 'Save and Next'}
        </CButton>
      </div>
    </div>
  )
}

export const CompletedStep = ({ title, text, onEdit }) => (
  <div className="rounded-3 border border-light-subtle p-3 d-flex justify-content-between align-items-start gap-2">
    <div style={{ minWidth: 0 }}>
      <div className="fw-semibold text-muted mb-1">{title}</div>
      <div
        className="text-body-secondary"
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      >
        {text}
      </div>
    </div>
    {onEdit ? <EditControls editMode={false} onEdit={onEdit} className="flex-shrink-0" /> : null}
  </div>
)

export const buildSecondaryOptions = (note) => {
  const base = String(note || '').trim()
  return [
    base,
    base ? `Observed condition: ${base}` : 'Observed additional condition in this area.',
  ].filter(Boolean)
}

export const SecondarySuggestionCard = ({
  index,
  secondary,
  value,
  action,
  onChangeValue,
  onSetAction,
}) => {
  const options = buildSecondaryOptions(secondary.note)
  const selectedIdx = options.indexOf(value)
  const textareaValue = selectedIdx >= 0 ? '' : value

  return (
    <div
      className="rounded-3 border p-3 d-grid gap-3"
      style={{
        backgroundColor: DESCRIPTION_CARD_BG,
        opacity: action === 'dismiss' ? 0.5 : 1,
      }}
    >
      <div className="fw-semibold text-muted">{secondary.type}</div>
      <div className="text-body-secondary small">
        AI suggestion - choose one, or write your own wording.
      </div>
      <div className="d-grid gap-2">
        {options.map((opt, i) => (
          <CFormCheck
            key={i}
            type="radio"
            id={`secondary-${index}-${i}`}
            label={opt}
            checked={selectedIdx === i}
            onChange={() => onChangeValue(options[i])}
            disabled={action === 'dismiss'}
          />
        ))}
      </div>
      <CFormTextarea
        rows={3}
        aria-label="Describe the additional inspection finding"
        placeholder="or describe the additional finding"
        value={textareaValue}
        disabled={action === 'dismiss'}
        onChange={(e) => onChangeValue(e.target.value)}
      />
      <div className="d-flex justify-content-end gap-2">
        <CButton size="sm" color="light" onClick={() => onSetAction('dismiss')}>
          Dismiss
        </CButton>
        <CButton size="sm" color="primary" onClick={() => onSetAction('add')}>
          Save
        </CButton>
      </div>
    </div>
  )
}

export const SecondaryFindingsSection = ({
  secondaryFindings,
  secondaryActions,
  secondaryDrafts,
  setSecondaryActions,
  setSecondaryDrafts,
}) => (
  <div className="d-grid gap-2">
    <div className="d-flex align-items-center justify-content-between">
      <div className="fw-semibold text-muted">Also Noticed</div>
      <div className="text-body-secondary small">{secondaryFindings.length} suggestion(s)</div>
    </div>
    {secondaryFindings.length === 0 ? (
      <div className="text-body-secondary small">No additional AI suggestions for this photo.</div>
    ) : null}
    {secondaryFindings.filter((_, i) => secondaryActions[i] === 'dismiss').length > 0 ? (
      <div className="rounded-3 border border-light-subtle p-2 d-grid gap-2">
        {secondaryFindings
          .map((secondary, i) => ({ secondary, i }))
          .filter((row) => secondaryActions[row.i] === 'dismiss')
          .map(({ secondary, i }) => (
            <div
              key={`dismissed-${i}`}
              className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-2 py-1"
            >
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="text-body-secondary small">{secondary.type}</div>
                <CBadge color="light" className="text-body-secondary">
                  Dismissed
                </CBadge>
              </div>
              <CreateActionButton
                label="Show"
                icon={<Eye size={13} className="me-1 align-text-bottom" />}
                className="text-body-secondary"
                onClick={() => setSecondaryActions((prev) => ({ ...prev, [i]: undefined }))}
              />
            </div>
          ))}
      </div>
    ) : null}
    <div className="d-grid gap-2">
      {secondaryFindings.map((secondary, i) => {
        const action = secondaryActions[i]
        if (action === 'dismiss') return null
        if (action === 'add') {
          return (
            <CompletedStep
              key={i}
              title={secondary.type}
              text={String(secondaryDrafts[i] || secondary.note || '')}
              onEdit={() => setSecondaryActions((prev) => ({ ...prev, [i]: undefined }))}
            />
          )
        }
        return (
          <SecondarySuggestionCard
            key={i}
            index={i}
            secondary={secondary}
            value={String(secondaryDrafts[i] || '')}
            action={action}
            onChangeValue={(value) =>
              setSecondaryDrafts((prev) => ({ ...prev, [i]: String(value || '') }))
            }
            onSetAction={(nextAction) =>
              setSecondaryActions((prev) => ({ ...prev, [i]: nextAction }))
            }
          />
        )
      })}
    </div>
  </div>
)
