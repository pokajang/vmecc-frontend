import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  createInitialWizardState,
  holidayWizardReducer,
  validateNationalDefaults,
} from '../components/holidayWizardHelpers'

export default function useHolidayWizardController({
  visible,
  isWizardMode,
  initialYear,
  existingNationalDefaults,
  onConfirmWizard,
  isSaving,
}) {
  const [wizardState, dispatch] = useReducer(
    holidayWizardReducer,
    createInitialWizardState(initialYear, existingNationalDefaults),
  )

  useEffect(() => {
    if (!visible || !isWizardMode) return
    dispatch({ type: 'RESET', year: initialYear, savedNationalDefaults: existingNationalDefaults })
  }, [visible, isWizardMode, initialYear, existingNationalDefaults])

  const wizardAdditionalScope = wizardState.additionalDraft.scope || 'National'
  const wizardAdditionalDate = String(wizardState.additionalDraft.date || '')
  const wizardDerivedYear = wizardAdditionalDate
    ? String(new Date(wizardAdditionalDate).getFullYear() || '')
    : ''

  const wizardRowsForSubmit = useMemo(
    () => [
      ...wizardState.defaultNationalDraft
        .filter((row) => Boolean(row.applicable))
        .map((row) => ({
          fixedHolidayKey: row.key,
          isDefaultNational: true,
          name: row.name,
          date: row.date,
          scope: 'National',
          state: 'All States',
        })),
      ...wizardState.pendingAdditionalRows.map((row) => ({
        isDefaultNational: false,
        name: row.name,
        date: row.date,
        scope: row.scope === 'State' ? 'State' : 'National',
        state: row.scope === 'State' ? row.state || 'All States' : 'All States',
      })),
    ],
    [wizardState.defaultNationalDraft, wizardState.pendingAdditionalRows],
  )

  const handleWizardProceed = useCallback(() => {
    const validationError = validateNationalDefaults(wizardState.defaultNationalDraft)
    if (validationError) {
      dispatch({ type: 'SET_STEP_ERROR', error: validationError })
      return
    }
    dispatch({ type: 'PROCEED_STEP' })
  }, [wizardState.defaultNationalDraft])

  const handleWizardAdditionalAdd = useCallback(() => {
    const name = String(wizardState.additionalDraft.name || '').trim()
    const date = String(wizardState.additionalDraft.date || '').trim()
    const scopeValue = wizardState.additionalDraft.scope === 'State' ? 'State' : 'National'
    const stateValue =
      scopeValue === 'State'
        ? String(wizardState.additionalDraft.state || '').trim() || 'All States'
        : 'All States'

    if (!name || !date) {
      dispatch({ type: 'SET_STEP_ERROR', error: 'Holiday name and date are required.' })
      return
    }

    dispatch({
      type: 'STAGE_ADDITIONAL',
      row: {
        name,
        date,
        scope: scopeValue,
        state: stateValue,
      },
    })
  }, [wizardState.additionalDraft])

  const handleWizardGoSummary = useCallback(() => {
    if (wizardState.isAdditionalFormVisible) {
      const hasUnsaved =
        String(wizardState.additionalDraft.name || '').trim() ||
        String(wizardState.additionalDraft.date || '').trim()
      if (hasUnsaved) {
        dispatch({
          type: 'SET_STEP_ERROR',
          error: 'You have an unsaved holiday in the form. Save or cancel it before continuing.',
        })
        return
      }
    }
    dispatch({ type: 'PROCEED_TO_SUMMARY' })
  }, [
    wizardState.additionalDraft.date,
    wizardState.additionalDraft.name,
    wizardState.isAdditionalFormVisible,
  ])

  const handleWizardSubmit = useCallback(async () => {
    if (typeof onConfirmWizard !== 'function' || isSaving) return
    const validationError = validateNationalDefaults(wizardState.defaultNationalDraft)
    if (validationError) {
      dispatch({ type: 'SET_STEP_ERROR', error: validationError })
      return
    }

    const result = await onConfirmWizard({
      nationalDefaults: wizardState.defaultNationalDraft,
      additionalHolidays: wizardState.pendingAdditionalRows,
      allRows: wizardRowsForSubmit,
    })

    if (!result?.ok && result?.error) {
      dispatch({ type: 'SET_STEP_ERROR', error: result.error })
    }
  }, [
    isSaving,
    onConfirmWizard,
    wizardRowsForSubmit,
    wizardState.defaultNationalDraft,
    wizardState.pendingAdditionalRows,
  ])

  const handleWizardFormSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (wizardState.step === 'default-national') {
        handleWizardProceed()
        return
      }
      if (wizardState.step === 'additional' && wizardState.isAdditionalFormVisible) {
        handleWizardAdditionalAdd()
      }
    },
    [
      handleWizardAdditionalAdd,
      handleWizardProceed,
      wizardState.isAdditionalFormVisible,
      wizardState.step,
    ],
  )

  return {
    wizardState,
    dispatch,
    wizardAdditionalScope,
    wizardAdditionalDate,
    wizardDerivedYear,
    handleWizardProceed,
    handleWizardAdditionalAdd,
    handleWizardGoSummary,
    handleWizardSubmit,
    handleWizardFormSubmit,
  }
}
