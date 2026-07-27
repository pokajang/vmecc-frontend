import React from 'react'
import { CAlert } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import {
  isAiHelperErrorRetryable,
  normalizeAiHelperError,
  safeAiHelperError,
} from 'src/components/ai-helper/constants'
import { streamAiHelperMessage } from 'src/services/api/aiHelperApi'
import {
  ReportBasicPathSummary,
  ReportMobileActionGroup,
  ReportMobileContextPanel,
} from '../components/ReportWorkflowUi'
import { formatErcoLocation, resolveRespondingTeamLabel } from './utils'
import { sortResponders } from './chronologyUtils'
import {
  buildErcoAiContext,
  buildErcoAiPayload,
  buildErcoReviewPrompt,
  buildErcoSummaryPrompt,
  assertErcoAiMessageWithinLimit,
  ERCO_EMBEDDED_TASK,
  normalizeGeneratedSummary,
  parseAiReviewItems,
} from './aiAssist'
import useIncidentTitleManager from './useIncidentTitleManager'
import { useChronology } from './useChronology'
import {
  ChronologySection,
  DetailsStepActions,
  ErcoAiReviewModal,
  IncidentSummaryPanel,
  SummaryGenerationModal,
  IncidentSummaryTextarea,
  IncidentTitleField,
  PreMobModeModal,
  ChronologyStartModeModal,
} from './erco-form-components'
import useIsMobile, { ERCO_MOBILE_QUERY } from './erco-form-components/useIsMobile'
import useIncidentTitleSuggestions from './useIncidentTitleSuggestions'

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
  saveLabel = 'Save Draft',
  draftStatus = '',
  showActions = true,
}) => {
  const isMobile = useIsMobile()
  const [isTitleMenuOpen, setIsTitleMenuOpen] = React.useState(false)
  const [deleteTitleTarget, setDeleteTitleTarget] = React.useState(null)
  const [showSummaryGenerationModal, setShowSummaryGenerationModal] = React.useState(false)
  const [summaryGenerationStage, setSummaryGenerationStage] = React.useState('confirm')
  const [summaryGenerationMode, setSummaryGenerationMode] = React.useState('generate')
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false)
  const [generatedSummaryDraft, setGeneratedSummaryDraft] = React.useState('')
  const [summaryGenerationError, setSummaryGenerationError] = React.useState('')
  const [summaryGenerationCanRetry, setSummaryGenerationCanRetry] = React.useState(true)
  const [showAiReviewModal, setShowAiReviewModal] = React.useState(false)
  const [aiReviewStage, setAiReviewStage] = React.useState('confirm')
  const [isReviewingWithAi, setIsReviewingWithAi] = React.useState(false)
  const [aiReviewItems, setAiReviewItems] = React.useState([])
  const [aiReviewError, setAiReviewError] = React.useState('')
  const [aiReviewCanRetry, setAiReviewCanRetry] = React.useState(true)
  const summaryAbortControllerRef = React.useRef(null)
  const reviewAbortControllerRef = React.useRef(null)
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
  const respondersCount = selectedResponderNames.length

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
  const chronologyCount = chronologyRows.length
  const dateTimeLabel = `${String(form.incidentDate || '').trim() || '--'} ${String(
    form.incidentTime || '',
  ).trim()}`.trim()
  const basicPathMobileSummary = `${
    [String(form.incidentType || '').trim(), formatErcoLocation(form.location), teamLabel]
      .filter(Boolean)
      .join(' - ') || '-'
  } - ${chronologyCount} chronology row${chronologyCount === 1 ? '' : 's'} - ${respondersCount} responder${respondersCount === 1 ? '' : 's'}`

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

  React.useEffect(
    () => () => {
      summaryAbortControllerRef.current?.abort()
      reviewAbortControllerRef.current?.abort()
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

  const openAiReviewModal = React.useCallback(() => {
    setShowAiReviewModal(true)
    setAiReviewStage('confirm')
    setAiReviewError('')
    setAiReviewCanRetry(true)
    setAiReviewItems([])
  }, [])

  const closeAiReviewModal = React.useCallback(() => {
    if (isReviewingWithAi) return
    setShowAiReviewModal(false)
    setAiReviewStage('confirm')
    setAiReviewError('')
    setAiReviewItems([])
  }, [isReviewingWithAi])

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

  const handleRunAiReview = React.useCallback(async () => {
    if (isReviewingWithAi) return
    setAiReviewError('')
    setAiReviewStage('loading')
    setIsReviewingWithAi(true)
    const abortController = new AbortController()
    reviewAbortControllerRef.current = abortController
    let streamedText = ''
    let doneText = ''
    let doneEmbeddedResult = null
    let streamError = null

    try {
      const payload = buildCurrentAiPayload()
      const message = assertErcoAiMessageWithinLimit(buildErcoReviewPrompt(payload))
      await streamAiHelperMessage(
        {
          thread_id: null,
          new_thread: true,
          conversation_purpose: 'embedded_helper',
          embedded_task: ERCO_EMBEDDED_TASK.REVIEW_REPORT,
          message,
          page_context: buildErcoAiContext(),
          response_language: 'en',
        },
        {
          onDelta: (eventPayload) => {
            streamedText += String(eventPayload?.text || '')
          },
          onDone: (eventPayload) => {
            doneText = String(eventPayload?.message?.content || '')
            doneEmbeddedResult =
              eventPayload?.embedded_result || eventPayload?.message?.embedded_result || null
          },
          onError: (eventPayload) => {
            streamError = normalizeAiHelperError(eventPayload, 'Ask AI could not check the report.')
          },
        },
        { signal: abortController.signal },
      )

      if (streamError) throw streamError

      const nextItems = parseAiReviewItems(doneEmbeddedResult || doneText || streamedText)
      if (nextItems.length === 0) {
        throw new Error('Ask AI returned an empty review.')
      }

      setAiReviewItems(nextItems)
      setAiReviewStage('results')
    } catch (error) {
      setAiReviewCanRetry(isAiHelperErrorRetryable(error))
      setAiReviewError(
        safeAiHelperError(error, error?.message || 'Ask AI could not check the report.'),
      )
      setAiReviewStage('error')
    } finally {
      if (reviewAbortControllerRef.current === abortController) {
        reviewAbortControllerRef.current = null
      }
      setIsReviewingWithAi(false)
    }
  }, [buildCurrentAiPayload, isReviewingWithAi])

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
        mobileDrawerQuery={ERCO_MOBILE_QUERY}
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
      <ErcoAiReviewModal
        visible={showAiReviewModal}
        stage={aiReviewStage}
        items={aiReviewItems}
        errorMessage={aiReviewError}
        canRetry={aiReviewCanRetry}
        onClose={closeAiReviewModal}
        onRun={handleRunAiReview}
        onRetry={handleRunAiReview}
      />

      <TypeManagerModal
        visible={titleManager.showAddTitleModal}
        mobileDrawer
        mobileDrawerQuery={ERCO_MOBILE_QUERY}
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

      {isMobile ? (
        <ReportMobileContextPanel
          title="Incident Context"
          items={[
            { label: 'Type', value: String(form.incidentType || '').trim() || '--' },
            { label: 'Area', value: formatErcoLocation(form.location) || '--' },
            { label: 'Date & Time', value: dateTimeLabel },
            { label: 'Team', value: teamLabel || '--' },
            { label: 'Responders', value: `${respondersCount} selected` },
            { label: 'Chronology', value: `${chronologyCount} rows` },
          ]}
        />
      ) : (
        <IncidentSummaryPanel
          teamLabel={teamLabel}
          shiftLabel={shiftLabel}
          incidentSummaryItems={incidentSummaryItems}
        />
      )}

      <ReportBasicPathSummary
        title="Basic Report Path"
        description="Complete the report title and incident summary first. Chronology and operational audit details remain available below when needed."
        mobileSummary={basicPathMobileSummary}
        items={[
          { label: 'Type', value: String(form.incidentType || '').trim() || '-' },
          { label: 'Location', value: formatErcoLocation(form.location) || '-' },
          { label: 'Team', value: teamLabel || '-' },
          { label: 'Chronology', value: `${chronologyCount} rows` },
          { label: 'Responders', value: respondersSummaryValue || '-', fullWidth: true },
        ]}
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

      <details
        ref={chronologyDetailsRef}
        className="rounded-3 border bg-body p-3"
        data-erco-field="chronology"
      >
        <summary className="fw-semibold">Chronology</summary>
        <div className="mt-3">
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
            chronologyRowProps={chronologyRowProps}
            rowModal={rowModal}
            onOpenAddRowModal={openAddRowModal}
            onOpenEditRowModal={openEditRowModal}
            onCloseRowModal={closeRowModal}
            onRowModalDraftChange={setRowModalDraft}
            onCommitRowModal={commitRowModal}
          />
        </div>
      </details>

      <IncidentSummaryTextarea
        value={form.summary}
        invalid={Boolean(fieldErrors.summary)}
        error={fieldErrors.summary}
        onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
        onGenerate={openSummaryGenerationModal}
        onReview={openAiReviewModal}
        isGenerating={isGeneratingSummary}
        isReviewing={isReviewingWithAi}
      />

      {showActions ? (
        isMobile ? (
          <ReportMobileActionGroup
            onSaveDraft={onSaveDraft}
            onPrimary={onContinue}
            saveLabel={saveLabel}
            statusMessage={draftStatus}
          />
        ) : (
          <DetailsStepActions
            onBack={onBack}
            onClear={onClear}
            onSaveDraft={onSaveDraft}
            saveLabel={saveLabel}
            primaryLabel="Continue"
            primaryType="button"
            onPrimary={onContinue}
            statusMessage={draftStatus}
          />
        )
      ) : null}
    </div>
  )
}

export default ErcoDetailsStep
