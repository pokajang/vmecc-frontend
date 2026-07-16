import React, { useCallback, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { ReportPhotoImage } from 'src/components/report-workflow/ReportViewComponents'
import { recordTypeUsage } from './typeUsageStorage'
import { ACTIVE_CARD_STYLE, TOGGLE_CARD_PROPS } from './typeOptionUtils'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'
import {
  buildSecondaryOptions,
  CompletedStep,
  DescriptionStep,
  getAngleOptions,
  SecondaryFindingsSection,
} from './InspectionAiConfirmPanelSections'

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
  const [summaryAccepted, setSummaryAccepted] = useState(false)

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
  const acceptedSummary = [conditionText, actionText].filter(Boolean).join('\n\n')

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
        nameLabel="Inspection Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(value) => {
          incident.setNewTypeName(value)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. SCBA"
        descriptionLabel="Short description (optional)"
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
        showIconPicker
      />

      <div className="d-grid gap-4">
        {/* Header */}
        <div className="fw-semibold text-muted">
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
          <div className="fw-semibold text-muted">{uploadedPhotoLabel}</div>
          <ReportPhotoImage
            photo={photo}
            alt={photo.fileName}
            style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
          />
          <div className="text-body-secondary small mt-1">{photo.fileName}</div>
        </div>

        <div className="rounded-3 border bg-body p-3 d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <div className="fw-semibold text-muted">Editable AI Summary</div>
              <div className="small text-body-secondary">
                Accept the suggested summary for the common path, or edit the details before review.
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <CButton
                size="sm"
                color={summaryAccepted ? 'success' : 'primary'}
                onClick={() => {
                  setSummaryAccepted(true)
                  setDescStep(2)
                }}
              >
                Accept summary
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => {
                  setSummaryAccepted(false)
                  setDescStep(0)
                }}
              >
                Edit details
              </CButton>
            </div>
          </div>
          <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
            {acceptedSummary || 'No AI summary text is available yet.'}
          </div>
        </div>

        {/* Inspection type */}
        <div className="d-grid gap-2">
          <div className="fw-semibold text-muted">Choose Type</div>
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
          <details className="rounded-3 border bg-body p-3">
            <summary className="fw-semibold text-muted">Custom type management</summary>
            <div className="small text-body-secondary mt-2">
              Add or edit inspection templates without interrupting the primary review path.
            </div>
            <CreateActionButton
              label="Add type"
              className="inspection-compact-action-btn mt-2"
              onClick={incident.openAddModal}
            />
          </details>
        </div>

        {/* Description - sequential steps */}
        {!summaryAccepted ? (
          <div className="d-grid gap-2">
            <div className="fw-semibold text-muted">Set Description</div>

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
        ) : null}

        {/* Secondary findings (shown only after description is completed) */}
        {descStep > 1 ? (
          <SecondaryFindingsSection
            secondaryFindings={secondaryFindings}
            secondaryActions={secondaryActions}
            secondaryDrafts={secondaryDrafts}
            setSecondaryActions={setSecondaryActions}
            setSecondaryDrafts={setSecondaryDrafts}
          />
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
