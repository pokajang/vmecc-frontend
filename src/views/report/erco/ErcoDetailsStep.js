import React from 'react'
import { CAlert } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { formatErcoLocation, resolveRespondingTeamLabel } from './utils'
import { sortResponders } from './chronologyUtils'
import TypeManagerModal from './TypeManagerModal'
import useIncidentTitleManager from './useIncidentTitleManager'
import { useChronology } from './useChronology'
import {
  ChronologySection,
  DetailsStepActions,
  IncidentSummaryPanel,
  SummaryGenerationModal,
  IncidentSummaryTextarea,
  IncidentTitleField,
  PreMobModeModal,
  ChronologyStartModeModal,
} from './erco-form-components'
import useIncidentTitleSuggestions from './useIncidentTitleSuggestions'

// Placeholder: builds a template-based summary from form data.
// Replace with a real API call when AI generation is wired up.
const buildDummySummary = ({ form, teamLabel, respondersSummaryValue, chronologyRows }) => {
  const incidentType = String(form.incidentType || '').trim() || 'Incident'
  const weather = String(form.weather || '').trim() || 'N/A'
  const area = formatErcoLocation(form.location) || 'N/A'
  const incidentDate = String(form.incidentDate || '').trim() || 'N/A'
  const incidentTime = String(form.incidentTime || '').trim() || 'N/A'
  const keyRows = (Array.isArray(chronologyRows) ? chronologyRows : [])
    .filter((row) => String(row?.time || '').trim() || String(row?.action || '').trim())
    .slice(0, 4)

  const chronologyText =
    keyRows.length === 0
      ? 'Chronology details are pending update.'
      : keyRows
          .map((row) => {
            const time = String(row?.time || '').trim() || '--:--'
            const action = String(row?.action || '').trim() || 'Action recorded.'
            return `${time} ${action}`
          })
          .join(' | ')

  return [
    `${incidentType} reported at ${area} on ${incidentDate} ${incidentTime} under ${weather} weather.`,
    `Responding team: ${teamLabel}. Members involved: ${respondersSummaryValue}.`,
    `Operational chronology: ${chronologyText}`,
    'Status: Initial response actions completed and incident details logged for supervisor review.',
  ].join(' ')
}

const ErcoDetailsStep = ({
  form,
  fieldErrors,
  setForm,
  pushToast,
  onBack,
  onContinue,
  onClear,
  onSaveDraft,
  userId,
  showActions = true,
}) => {
  const [isTitleMenuOpen, setIsTitleMenuOpen] = React.useState(false)
  const [deleteTitleTarget, setDeleteTitleTarget] = React.useState(null)
  const [showSummaryGenerationModal, setShowSummaryGenerationModal] = React.useState(false)
  const [summaryGenerationStage, setSummaryGenerationStage] = React.useState('confirm')
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false)
  const [generatedSummaryDraft, setGeneratedSummaryDraft] = React.useState('')
  const [summaryGenerationError, setSummaryGenerationError] = React.useState('')

  const teamLabel = resolveRespondingTeamLabel(form.respondingTeamName, form.respondingAttendance)
  const shiftLabel = String(form.respondingTeamShift || '').trim()
  const updateIncidentTitleField = React.useCallback(
    (value, source = 'manual') =>
      setForm((prev) => ({
        ...prev,
        details: String(value || ''),
        detailsSource: String(source || 'manual'),
      })),
    [setForm],
  )

  const titleManager = useIncidentTitleManager({
    userId,
    selectedTitle: form.details,
    updateTitleField: updateIncidentTitleField,
    pushToast,
  })

  const selectedResponderNames = sortResponders(
    Array.isArray(form.respondingAttendance) ? form.respondingAttendance : [],
  )
    .filter((row) => row?.present)
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean)
  const respondersSummaryValue =
    selectedResponderNames.length === 0 ? 'None selected' : selectedResponderNames.join(', ')

  const {
    chronologyRows,
    hasPreMobRows,
    hasDemobRows,
    hasAnyPresetRows,
    isChronologyDefault,
    showChronologyStarter,
    draggingRowId,
    dragOverRowId,
    draggingEventRowId,
    dragOverEventRowId,
    hoveredEventRowId,
    setHoveredEventRowId,
    focusedEventRowId,
    setFocusedEventRowId,
    swappedRowIds,
    swapEffectScope,
    eventFieldRefs,
    rowContainerRefs,
    isAdvanceMenuOpen,
    setIsAdvanceMenuOpen,
    showPreMobModeModal,
    setShowPreMobModeModal,
    showStartModeModal,
    setShowStartModeModal,
    startTimeEditMode,
    responseStartTime,
    setResponseStartTime,
    updateChronologyRow,
    addChronologyRowAfter,
    removeChronologyRow,
    moveChronologyRow,
    handleRowGripPointerDown,
    handleEventGripPointerDown,
    handleAddSimpleRow,
    handleAddPreMobRows,
    handlePreMobAppend,
    handlePreMobReplace,
    handleAddDemobRows,
    handleResetChronology,
    handleSetResponseStartTime,
    handleSaveResponseStartTime,
    handleCancelResponseStartTimeEdit,
    applyStartMode,
    isChronologyOutOfOrder,
    sortChronologyByTime,
    canUndo,
    undoChronology,
    rowModal,
    openAddRowModal,
    openEditRowModal,
    closeRowModal,
    setRowModalDraft,
    commitRowModal,
  } = useChronology({ form, setForm, pushToast })

  const incidentSummaryItems = [
    { label: 'Incident Type', value: String(form.incidentType || '').trim() || '--' },
    { label: 'Weather', value: String(form.weather || '').trim() || '--' },
    { label: 'Area', value: formatErcoLocation(form.location) || '--' },
    { label: 'Incident Date', value: String(form.incidentDate || '').trim() || '--' },
    { label: 'Incident Time', value: String(form.incidentTime || '').trim() || '--' },
    { label: 'Responding Team', value: teamLabel },
    { label: 'Responding Members', value: respondersSummaryValue, fullWidth: true },
  ]

  const { incidentTitleOptions, incidentTitleValueOption } = useIncidentTitleSuggestions({
    userId,
    form,
    titleTypeOptions: titleManager.typeOptions,
  })

  const chronologyRowProps = {
    rowsCount: chronologyRows.length,
    eventFieldRefs,
    draggingRowId,
    dragOverRowId,
    draggingEventRowId,
    dragOverEventRowId,
    hoveredEventRowId,
    setHoveredEventRowId,
    focusedEventRowId,
    setFocusedEventRowId,
    swappedRowIds,
    swapEffectScope,
    updateChronologyRow,
    moveChronologyRow,
    removeChronologyRow,
    addChronologyRowAfter,
    handleRowGripPointerDown,
    handleEventGripPointerDown,
    incidentTime: form.incidentTime,
  }

  const openSummaryGenerationModal = React.useCallback(() => {
    setShowSummaryGenerationModal(true)
    setSummaryGenerationStage('confirm')
    setSummaryGenerationError('')
    setGeneratedSummaryDraft('')
  }, [])

  const closeSummaryGenerationModal = React.useCallback(() => {
    if (isGeneratingSummary) return
    setShowSummaryGenerationModal(false)
    setSummaryGenerationStage('confirm')
    setSummaryGenerationError('')
    setGeneratedSummaryDraft('')
  }, [isGeneratingSummary])

  const handleGenerateSummary = React.useCallback(async () => {
    if (isGeneratingSummary) return
    setSummaryGenerationError('')
    setSummaryGenerationStage('loading')
    setIsGeneratingSummary(true)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      const nextSummary = buildDummySummary({
        form,
        teamLabel,
        respondersSummaryValue,
        chronologyRows,
      })
      setGeneratedSummaryDraft(nextSummary)
      setSummaryGenerationStage('preview')
    } catch {
      setSummaryGenerationError('Unable to generate summary right now. Please try again.')
      setSummaryGenerationStage('error')
    } finally {
      setIsGeneratingSummary(false)
    }
  }, [chronologyRows, form, isGeneratingSummary, respondersSummaryValue, teamLabel])

  const applyGeneratedSummary = React.useCallback(() => {
    if (!generatedSummaryDraft) return
    setForm((prev) => ({ ...prev, summary: generatedSummaryDraft }))
    setShowSummaryGenerationModal(false)
    setSummaryGenerationStage('confirm')
    setSummaryGenerationError('')
    setGeneratedSummaryDraft('')
    pushToast?.('Generated summary loaded into Summary field.', {
      title: 'Summary updated',
      color: 'success',
    })
  }, [generatedSummaryDraft, pushToast, setForm])

  return (
    <div className="mb-3 d-grid gap-4">
      <ActionConfirmModal
        visible={Boolean(deleteTitleTarget)}
        title="Delete Title"
        message={
          deleteTitleTarget?.label
            ? `Delete "${deleteTitleTarget.label}"? This cannot be undone.`
            : 'Delete this title?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTitleTarget(null)}
        onConfirm={() => {
          const target = deleteTitleTarget
          setDeleteTitleTarget(null)
          if (!target?.value) return
          titleManager.removeType(target.value)
        }}
      />
      <SummaryGenerationModal
        visible={showSummaryGenerationModal}
        stage={summaryGenerationStage}
        currentSummary={String(form.summary || '')}
        generatedSummary={generatedSummaryDraft}
        errorMessage={summaryGenerationError}
        onClose={closeSummaryGenerationModal}
        onGenerate={handleGenerateSummary}
        onRetry={handleGenerateSummary}
        onUseGenerated={applyGeneratedSummary}
      />

      <TypeManagerModal
        visible={titleManager.showAddTitleModal}
        onClose={titleManager.closeAddModal}
        editMode={titleManager.titleEditMode}
        onSetEditMode={titleManager.setTitleEditMode}
        editTitle="Edit Incident Titles"
        addTitle="Add Incident Title"
        options={titleManager.typeOptions}
        systemTypeSet={titleManager.systemTypeSet}
        systemOverrideSet={titleManager.systemOverrideSet}
        onResetSystemOverride={titleManager.resetSystemOverride}
        onStartEdit={titleManager.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTitleTarget({ value, label })}
        nameLabel="Title"
        nameValue={titleManager.newTitleName}
        onChangeName={(value) => {
          titleManager.setNewTitleName(value)
          if (titleManager.addTitleError) titleManager.setAddTitleError('')
        }}
        namePlaceholder="e.g. Wild Boar Sighting"
        nameHint="Use a general title only. Area/zone will be auto-filled from Incident Summary."
        showDescriptionField={false}
        error={titleManager.addTitleError}
        editingKey={titleManager.editingTitleKey}
        editingLabel="Editing title"
        editButtonLabel="Edit Titles"
        onSave={titleManager.saveType}
        saveLabel="Save Title"
        updateLabel="Update Title"
      />

      <PreMobModeModal
        visible={showPreMobModeModal}
        onClose={() => setShowPreMobModeModal(false)}
        onAppend={handlePreMobAppend}
        onReplace={handlePreMobReplace}
      />

      <ChronologyStartModeModal
        visible={showStartModeModal}
        responseStartTime={responseStartTime}
        onClose={() => setShowStartModeModal(false)}
        onManual={() => applyStartMode('manual')}
        onPremob={() => applyStartMode('premob')}
      />

      {fieldErrors.respondingAttendance ? (
        <CAlert color="danger">{fieldErrors.respondingAttendance}</CAlert>
      ) : null}

      <IncidentSummaryPanel
        teamLabel={teamLabel}
        shiftLabel={shiftLabel}
        incidentSummaryItems={incidentSummaryItems}
      />

      <IncidentTitleField
        fieldError={fieldErrors.details}
        titleManager={titleManager}
        incidentTitleOptions={incidentTitleOptions}
        incidentTitleValueOption={incidentTitleValueOption}
        detailsValue={String(form.details || '')}
        isTitleMenuOpen={isTitleMenuOpen}
        setIsTitleMenuOpen={setIsTitleMenuOpen}
        updateIncidentTitleField={updateIncidentTitleField}
      />

      <ChronologySection
        fieldError={fieldErrors.chronology}
        showChronologyStarter={showChronologyStarter}
        isChronologyDefault={isChronologyDefault}
        canUndo={canUndo}
        undoChronology={undoChronology}
        handleResetChronology={handleResetChronology}
        handleAddSimpleRow={handleAddSimpleRow}
        isAdvanceMenuOpen={isAdvanceMenuOpen}
        setIsAdvanceMenuOpen={setIsAdvanceMenuOpen}
        hasAnyPresetRows={hasAnyPresetRows}
        hasPreMobRows={hasPreMobRows}
        hasDemobRows={hasDemobRows}
        handleAddPreMobRows={handleAddPreMobRows}
        handleAddDemobRows={handleAddDemobRows}
        startTimeEditMode={startTimeEditMode}
        responseStartTime={responseStartTime}
        setResponseStartTime={setResponseStartTime}
        handleSaveResponseStartTime={handleSaveResponseStartTime}
        handleCancelResponseStartTimeEdit={handleCancelResponseStartTimeEdit}
        handleSetResponseStartTime={handleSetResponseStartTime}
        isChronologyOutOfOrder={isChronologyOutOfOrder}
        sortChronologyByTime={sortChronologyByTime}
        chronologyRows={chronologyRows}
        rowContainerRefs={rowContainerRefs}
        chronologyRowProps={chronologyRowProps}
        rowModal={rowModal}
        onOpenAddRowModal={openAddRowModal}
        onOpenEditRowModal={openEditRowModal}
        onCloseRowModal={closeRowModal}
        onRowModalDraftChange={setRowModalDraft}
        onCommitRowModal={commitRowModal}
      />

      <IncidentSummaryTextarea
        value={form.summary}
        invalid={Boolean(fieldErrors.summary)}
        onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
        onGenerate={openSummaryGenerationModal}
        isGenerating={isGeneratingSummary}
      />

      {showActions ? (
        <DetailsStepActions
          onBack={onBack}
          onClear={onClear}
          onSaveDraft={onSaveDraft}
          primaryLabel="Continue"
          primaryType="button"
          onPrimary={onContinue}
        />
      ) : null}
    </div>
  )
}

export default ErcoDetailsStep
