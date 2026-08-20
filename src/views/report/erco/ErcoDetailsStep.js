import React from 'react'
import { CAlert } from '@coreui/react'
import DisclosureCard from 'src/components/DisclosureCard'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import {
  isAiHelperErrorRetryable,
  normalizeAiHelperError,
  safeAiHelperError,
} from 'src/components/ai-helper/constants'
import { streamAiHelperMessage } from 'src/services/api/aiHelperApi'
import { ReportMobileActionGroup } from '../components/ReportWorkflowUi'
import { resolveRespondingTeamLabel } from './utils'
import { sortResponders } from './chronologyUtils'
import {
  buildErcoAiContext,
  buildErcoAiPayload,
  buildErcoSummaryPrompt,
  assertErcoAiMessageWithinLimit,
  ERCO_EMBEDDED_TASK,
  normalizeGeneratedSummary,
} from './aiAssist'
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
import { REPORT_ACTION_LABELS } from '../reportActionLabels'
import useReportIsMobile, { REPORT_MOBILE_QUERY } from '../hooks/useReportIsMobile'
import useIncidentTitleSuggestions from './useIncidentTitleSuggestions'

const ErcoDetailsStep = ({
  form,
  fieldErrors,
  setForm,
  pushToast,
  onBack,
  onContinue,
  onClear,
  userId,
  showActions = true,
  isSaving = false,
}) => {
  const isMobile = useReportIsMobile()
  const [isTitleMenuOpen, setIsTitleMenuOpen] = React.useState(false)
  const [deleteTitleTarget, setDeleteTitleTarget] = React.useState(null)
  const [showSummaryGenerationModal, setShowSummaryGenerationModal] = React.useState(false)
  const [summaryGenerationStage, setSummaryGenerationStage] = React.useState('confirm')
  const [summaryGenerationMode, setSummaryGenerationMode] = React.useState('generate')
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false)
  const [generatedSummaryDraft, setGeneratedSummaryDraft] = React.useState('')
  const [summaryGenerationError, setSummaryGenerationError] = React.useState('')
  const [summaryGenerationCanRetry, setSummaryGenerationCanRetry] = React.useState(true)
  const summaryAbortControllerRef = React.useRef(null)
  const chronologyDetailsRef = React.useRef(null)

  React.useEffect(() => {
    if (fieldErrors.chronology && chronologyDetailsRef.current) {
      chronologyDetailsRef.current.open = true
    }
  }, [fieldErrors.chronology])

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
    draggingEventRowId,
    dragOverEventRowId,
    hoveredEventRowId,
    setHoveredEventRowId,
    focusedEventRowId,
    setFocusedEventRowId,
    swappedRowIds,
    eventFieldRefs,
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
    moveChronologyEventPayload,
    handleEventGripPointerDown,
    handleAddSimpleRow,
    handleAddPreMobRows,
    handlePreMobAppend,
    handlePreMobReplace,
    handleAddDemobRows,
    handleResetChronology,
    handleSetResponseStartTime,
    handleUseIncidentTime,
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
  const { incidentTitleOptions, incidentTitleValueOption } = useIncidentTitleSuggestions({
    userId,
    form,
    titleTypeOptions: titleManager.typeOptions,
  })

  React.useEffect(
    () => () => {
      summaryAbortControllerRef.current?.abort()
    },
    [],
  )

  const chronologyRowProps = {
    rowsCount: chronologyRows.length,
    eventFieldRefs,
    draggingEventRowId,
    dragOverEventRowId,
    hoveredEventRowId,
    setHoveredEventRowId,
    focusedEventRowId,
    setFocusedEventRowId,
    swappedRowIds,
    updateChronologyRow,
    moveChronologyEventPayload,
    removeChronologyRow,
    addChronologyRowAfter,
    handleEventGripPointerDown,
    incidentTime: form.incidentTime,
  }

  const buildCurrentAiPayload = React.useCallback(
    () =>
      buildErcoAiPayload({
        form,
        teamLabel,
        shiftLabel,
        respondersSummaryValue,
        chronologyRows,
      }),
    [chronologyRows, form, respondersSummaryValue, shiftLabel, teamLabel],
  )

  const openSummaryGenerationModal = React.useCallback(() => {
    setSummaryGenerationMode(String(form.summary || '').trim() ? 'improve' : 'generate')
    setShowSummaryGenerationModal(true)
    setSummaryGenerationStage('confirm')
    setSummaryGenerationError('')
    setSummaryGenerationCanRetry(true)
    setGeneratedSummaryDraft('')
  }, [form.summary])

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
    const abortController = new AbortController()
    summaryAbortControllerRef.current = abortController
    let streamedText = ''
    let doneText = ''
    let doneEmbeddedResult = null
    let streamError = null

    try {
      const payload = buildCurrentAiPayload()
      const message = assertErcoAiMessageWithinLimit(
        buildErcoSummaryPrompt(payload, summaryGenerationMode),
      )
      await streamAiHelperMessage(
        {
          thread_id: null,
          new_thread: true,
          conversation_purpose: 'embedded_helper',
          embedded_task:
            summaryGenerationMode === 'improve'
              ? ERCO_EMBEDDED_TASK.IMPROVE_SUMMARY
              : ERCO_EMBEDDED_TASK.GENERATE_SUMMARY,
          message,
          page_context: buildErcoAiContext(),
          response_language: 'en',
        },
        {
          onDelta: (payload) => {
            streamedText += String(payload?.text || '')
          },
          onDone: (payload) => {
            doneText = String(payload?.message?.content || '')
            doneEmbeddedResult =
              payload?.embedded_result || payload?.message?.embedded_result || null
          },
          onError: (payload) => {
            streamError = normalizeAiHelperError(payload, 'Ask AI could not generate the summary.')
          },
        },
        { signal: abortController.signal },
      )

      if (streamError) throw streamError

      const nextSummary = normalizeGeneratedSummary(doneEmbeddedResult || doneText || streamedText)
      if (!nextSummary) {
        throw new Error('Ask AI returned an empty summary.')
      }

      setGeneratedSummaryDraft(nextSummary)
      setSummaryGenerationStage('preview')
    } catch (error) {
      setSummaryGenerationCanRetry(isAiHelperErrorRetryable(error))
      setSummaryGenerationError(
        safeAiHelperError(error, error?.message || 'Unable to generate summary right now.'),
      )
      setSummaryGenerationStage('error')
    } finally {
      if (summaryAbortControllerRef.current === abortController) {
        summaryAbortControllerRef.current = null
      }
      setIsGeneratingSummary(false)
    }
  }, [buildCurrentAiPayload, isGeneratingSummary, summaryGenerationMode])

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
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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
        canRetry={summaryGenerationCanRetry}
        mode={summaryGenerationMode}
        onClose={closeSummaryGenerationModal}
        onGenerate={handleGenerateSummary}
        onRetry={handleGenerateSummary}
        onUseGenerated={applyGeneratedSummary}
      />
      <TypeManagerModal
        visible={titleManager.showAddTitleModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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
        nameLabel="Incident Title"
        nameValue={titleManager.newTitleName}
        onChangeName={(value) => {
          titleManager.setNewTitleName(value)
          if (titleManager.addTitleError) titleManager.setAddTitleError('')
        }}
        namePlaceholder="e.g. Wild Boar Sighting"
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

      <IncidentSummaryPanel form={form} />

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

      <DisclosureCard
        ref={chronologyDetailsRef}
        summary={<span className="fw-semibold">Chronology</span>}
        data-erco-field="chronology"
      >
        <div>
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
            handleUseIncidentTime={handleUseIncidentTime}
            incidentTime={form.incidentTime}
            isChronologyOutOfOrder={isChronologyOutOfOrder}
            sortChronologyByTime={sortChronologyByTime}
            chronologyRows={chronologyRows}
            chronologyRowProps={chronologyRowProps}
            rowModal={rowModal}
            onOpenAddRowModal={openAddRowModal}
            onOpenEditRowModal={openEditRowModal}
            onCloseRowModal={closeRowModal}
            onRowModalDraftChange={setRowModalDraft}
            onCommitRowModal={commitRowModal}
          />
        </div>
      </DisclosureCard>

      <IncidentSummaryTextarea
        value={form.summary}
        invalid={Boolean(fieldErrors.summary)}
        error={fieldErrors.summary}
        onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
        onGenerate={openSummaryGenerationModal}
        isGenerating={isGeneratingSummary}
      />

      {showActions ? (
        isMobile ? (
          <ReportMobileActionGroup onPrimary={onContinue} isSaving={isSaving} />
        ) : (
          <DetailsStepActions
            onBack={onBack}
            onClear={onClear}
            primaryLabel={REPORT_ACTION_LABELS.CONTINUE}
            primaryType="button"
            onPrimary={onContinue}
            isSaving={isSaving}
          />
        )
      ) : null}
    </div>
  )
}

export default ErcoDetailsStep
