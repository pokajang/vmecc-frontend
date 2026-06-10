import React, { useCallback, useState } from 'react'
import { CAlert, CBadge, CButton, CFormCheck, CFormTextarea } from '@coreui/react'
import { Eye } from 'lucide-react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import EditControls from 'src/components/EditControls'
import IconOptionGrid from 'src/components/IconOptionGrid'
import TypeManagerModal from './TypeManagerModal'
import { recordTypeUsage } from './typeUsageStorage'
import { ACTIVE_CARD_STYLE, TOGGLE_CARD_PROPS } from './typeOptionUtils'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'

const DESCRIPTION_CARD_BG = 'var(--cui-light-bg-subtle, #f8f9fa)'

const ANGLE_STEPS = [
  { key: 'condition', label: 'Current Condition' },
  { key: 'action', label: 'Action Taken' },
]

const getAngleOptions = (descriptions, angle) =>
  (descriptions || []).find((d) => d.angle === angle)?.options || []

const DescriptionStep = ({
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

  // Textarea holds only custom (non-option) text
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
      <div className="fw-semibold">{title}</div>
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

const CompletedStep = ({ title, text, onEdit }) => (
  <div className="rounded-3 border border-light-subtle p-3 d-flex justify-content-between align-items-start gap-2">
    <div style={{ minWidth: 0 }}>
      <div className="fw-semibold mb-1">{title}</div>
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

const buildSecondaryOptions = (note) => {
  const base = String(note || '').trim()
  return [
    base,
    base ? `Observed condition: ${base}` : 'Observed additional condition in this area.',
  ].filter(Boolean)
}

const SecondarySuggestionCard = ({
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

  const selectOption = (i) => {
    onChangeValue(options[i])
  }

  return (
    <div
      className="rounded-3 border p-3 d-grid gap-3"
      style={{
        backgroundColor: DESCRIPTION_CARD_BG,
        opacity: action === 'dismiss' ? 0.5 : 1,
      }}
    >
      <div className="fw-semibold">{secondary.type}</div>
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
            onChange={() => selectOption(i)}
            disabled={action === 'dismiss'}
          />
        ))}
      </div>
      <CFormTextarea
        rows={3}
        placeholder="or describe the additional finding"
        value={textareaValue}
        disabled={action === 'dismiss'}
        onChange={(e) => {
          onChangeValue(e.target.value)
        }}
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

const InspectionAiConfirmPanel = ({
  userId,
  photo,
  photos = [],
  aiResult,
  isPromotedSecondary = false,
  initialLocation = '',
  pushToast,
  onConfirm,
  onDiscard,
  onSaveDraft,
  onReset,
}) => {
  const [confirmedType, setConfirmedType] = useState(aiResult.detectedType || '')
  const [confirmedLocation, setConfirmedLocation] = useState(initialLocation)

  // Sequential description steps: 0 = condition active, 1 = action active, 2 = all done
  const [descStep, setDescStep] = useState(0)
  const [editSnapshot, setEditSnapshot] = useState(null)
  const [conditionText, setConditionText] = useState(
    () => getAngleOptions(aiResult.descriptions, 'condition')[0] || '',
  )
  const [actionText, setActionText] = useState(
    () => getAngleOptions(aiResult.descriptions, 'action')[0] || '',
  )

  const [secondaryActions, setSecondaryActions] = useState({})
  const [secondaryDrafts, setSecondaryDrafts] = useState(() => {
    const rows = Array.isArray(aiResult.secondaryFindings) ? aiResult.secondaryFindings : []
    const next = {}
    rows.forEach((row, i) => {
      const options = buildSecondaryOptions(row?.note)
      next[i] = options[0] || ''
    })
    return next
  })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const updateField = useCallback((field, value) => {
    if (field === 'incidentType') setConfirmedType(value)
  }, [])

  const incident = useIncidentTypeManager({
    userId,
    selectedType: confirmedType,
    updateSetupField: updateField,
    pushToast,
  })

  const confirmDeleteType = () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    if (target.kind === 'incident') incident.removeType(target.value)
  }

  const openStepEditor = (step) => {
    if (step === 0) setEditSnapshot({ step, value: conditionText })
    if (step === 1) setEditSnapshot({ step, value: actionText })
    setDescStep(step)
  }

  const saveStepEditor = () => {
    setEditSnapshot(null)
    setDescStep(2)
  }

  const cancelStepEditor = () => {
    if (editSnapshot?.step === 0) setConditionText(String(editSnapshot.value || ''))
    if (editSnapshot?.step === 1) setActionText(String(editSnapshot.value || ''))
    setEditSnapshot(null)
    setDescStep(2)
  }

  const buildConfirmPayload = () => {
    const secondaryFindings = Array.isArray(aiResult.secondaryFindings)
      ? aiResult.secondaryFindings
      : []
    const promotedSecondaries = secondaryFindings.reduce((acc, secondary, i) => {
      const action = secondaryActions[i]
      const note = String(secondaryDrafts[i] || secondary.note || '').trim()
      if (action !== 'add') return acc
      acc.push({
        ...secondary,
        note,
      })
      return acc
    }, [])
    const selectedDescription = [conditionText, actionText].filter(Boolean).join('\n\n')
    return {
      findingData: {
        photo,
        confirmedType,
        confirmedLocation,
        selectedDescription,
        aiDescriptions: aiResult.descriptions || [],
        aiConfidence: aiResult.confidence || 'medium',
      },
      promotedSecondaries,
    }
  }

  const handleConfirm = () => {
    const { findingData, promotedSecondaries } = buildConfirmPayload()
    onConfirm(findingData, promotedSecondaries, { goReview: true })
  }

  const handleSaveDraft = () => {
    if (typeof onSaveDraft !== 'function') return
    const { findingData, promotedSecondaries } = buildConfirmPayload()
    onSaveDraft(findingData, promotedSecondaries)
  }

  const secondaryFindings = Array.isArray(aiResult.secondaryFindings)
    ? aiResult.secondaryFindings
    : []
  const uploadedPhotoLabel = photos.length > 1 ? 'Uploaded Photos' : 'Uploaded Photo'

  return (
    <>
      <ActionConfirmModal
        visible={Boolean(deleteTarget)}
        title="Delete Type"
        message={
          deleteTarget?.label
            ? `Delete "${deleteTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteType}
      />

      <TypeManagerModal
        visible={incident.showAddTypeModal}
        onClose={incident.closeAddModal}
        editMode={incident.incidentEditMode}
        onSetEditMode={incident.setIncidentEditMode}
        editTitle="Edit Inspection Types / Templates"
        addTitle="Add Inspection Type / Template"
        options={incident.typeOptions}
        onStartEdit={incident.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTarget({ kind: 'incident', value, label })}
        nameLabel="Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(value) => {
          incident.setNewTypeName(value)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Fire Water Pump House Inspection"
        descriptionLabel="Short Description (Optional)"
        descriptionValue={incident.newTypeDescription}
        onChangeDescription={incident.setNewTypeDescription}
        descriptionPlaceholder="One-line subtext for this card."
        error={incident.addTypeError}
        editingKey={incident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={incident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={incident.iconOptions}
        iconValue={incident.newTypeIconKey}
        onChangeIcon={incident.setNewTypeIconKey}
      />

      <div className="d-grid gap-4">
        {/* Header */}
        <div className="fw-semibold">
          {isPromotedSecondary ? 'Additional Finding' : 'AI Analysis Result'}
        </div>
        {!isPromotedSecondary ? (
          <CAlert color="warning" dismissible className="mb-0">
            The analysis and prefilled fields below are AI-generated and may be inaccurate. Please
            review all selections.
          </CAlert>
        ) : null}

        {/* Photo preview */}
        <div className="d-grid gap-1">
          <div className="fw-semibold">{uploadedPhotoLabel}</div>
          <img
            src={photo.url}
            alt={photo.fileName}
            style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }}
          />
          <div className="text-body-secondary small mt-1">{photo.fileName}</div>
        </div>

        {/* Inspection type */}
        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Choose Inspection Type</div>
            <CreateActionButton label="Add type" onClick={incident.openAddModal} />
          </div>
          <IconOptionGrid
            options={incident.visibleTypeOptions}
            value={confirmedType}
            onChange={(value) => {
              if (value === INCIDENT_TYPE_TOGGLE_VALUE) {
                incident.setShowAllIncidentTypes((prev) => !prev)
                return
              }
              recordTypeUsage(userId, 'incident', value)
              setConfirmedType(value)
            }}
            variant="compact"
            columns={{ xs: 6, md: 3 }}
            cardProps={(option, isSelected) => {
              if (option?.value === INCIDENT_TYPE_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
              return isSelected ? { style: ACTIVE_CARD_STYLE } : {}
            }}
          />
        </div>

        {/* Description - sequential steps */}
        <div className="d-grid gap-2">
          <div className="fw-semibold">Set Description</div>

          {/* Completed steps */}
          {descStep > 0 && (
            <CompletedStep
              title="Current Condition"
              text={conditionText}
              onEdit={descStep > 1 ? () => openStepEditor(0) : undefined}
            />
          )}
          {descStep > 1 && (
            <CompletedStep
              title="Action Taken"
              text={actionText}
              onEdit={() => openStepEditor(1)}
            />
          )}

          {/* Active step */}
          {descStep === 0 && (
            <DescriptionStep
              title="Current Condition"
              options={getAngleOptions(aiResult.descriptions, 'condition')}
              value={conditionText}
              onChange={setConditionText}
              onContinue={() => (editSnapshot?.step === 0 ? saveStepEditor() : setDescStep(1))}
              onCancel={cancelStepEditor}
              isRowEdit={editSnapshot?.step === 0}
            />
          )}
          {descStep === 1 && (
            <DescriptionStep
              title="Action Taken"
              options={getAngleOptions(aiResult.descriptions, 'action')}
              value={actionText}
              onChange={setActionText}
              onBack={() => setDescStep(0)}
              onContinue={() => (editSnapshot?.step === 1 ? saveStepEditor() : setDescStep(2))}
              onCancel={cancelStepEditor}
              isLast
              isRowEdit={editSnapshot?.step === 1}
            />
          )}
        </div>

        {/* Secondary findings (shown only after description is completed) */}
        {descStep > 1 ? (
          <div className="d-grid gap-2">
            <div className="d-flex align-items-center justify-content-between">
              <div className="fw-semibold">Also Noticed</div>
              <div className="text-body-secondary small">
                {secondaryFindings.length} suggestion(s)
              </div>
            </div>
            {secondaryFindings.length === 0 ? (
              <div className="text-body-secondary small">
                No additional AI suggestions for this photo.
              </div>
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
        ) : null}

        {/* Actions */}
        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
          <CButton color="light" onClick={onReset || onDiscard}>
            Reset
          </CButton>
          <CButton color="secondary" variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </CButton>
          <CButton color="primary" onClick={handleConfirm} disabled={!confirmedType}>
            Save &amp; Review
          </CButton>
        </div>
      </div>
    </>
  )
}

export default InspectionAiConfirmPanel
