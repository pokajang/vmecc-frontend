import { useEffect, useMemo } from 'react'
import { clearAiHelperUiState, publishAiHelperUiState } from 'src/components/ai-helper/uiState'
import { getInspectionFormValidationState } from './inspectionFormHelpers'

const selectedTypeToken = (selectedType) => {
  const value = String(selectedType || '')
    .trim()
    .toLowerCase()
  if (value.includes('fire truck') || value.includes('frt daily')) return 'fire_truck_daily'
  if (value.includes('fire extinguisher')) return 'fire_extinguisher'
  if (value.includes('health safety environment') || value === 'hse inspection') return 'hse'
  if (value.includes('scba')) return 'scba'
  if (value.includes('hydraulic')) return 'hydraulic_rescue'
  return null
}

const MISSING_FIELD_TOKENS = {
  inspectedAt: 'inspection_date',
  selectedLocation: 'location',
  photos: 'evidence',
  description: 'description',
  inspectionIssues: 'findings',
  erAuxSession: 'inspection_scope',
  erAuxChecks: 'checks',
  erAuxRemarks: 'remarks',
  fireExtinguisherSession: 'inspection_scope',
  fireExtinguisherChecks: 'checks',
  fireExtinguisherRemarks: 'remarks',
  hydraulicChecks: 'checks',
  hydraulicRemarks: 'remarks',
  frtSession: 'fire_truck',
  frtCompartment: 'compartment',
  frtDailyChecks: 'daily_readiness',
  frtDailyRemarks: 'remarks',
  frtOneOffChecks: 'one_off_checks',
  frtOneOffRemarks: 'remarks',
  highAngleSession: 'inspection_scope',
  highAngleChecks: 'checks',
  highAngleRemarks: 'remarks',
  scbaSession: 'inspection_scope',
  scbaChecks: 'checks',
  scbaRemarks: 'remarks',
  hseSession: 'inspection_scope',
  hseSelection: 'unsafe_act_or_condition',
  hseDetails: 'observation',
}

export const buildInspectionAiHelperUiState = ({
  canReview,
  canSaveDraft,
  draftStatus,
  form,
  selectedType,
}) => {
  const type = selectedTypeToken(selectedType)
  if (!type) return null

  const validation = getInspectionFormValidationState(form)
  const missingFields = [
    ...new Set(
      Object.entries(validation.missing || {})
        .filter(([, missing]) => Boolean(missing))
        .map(([field]) => MISSING_FIELD_TOKENS[field])
        .filter(Boolean),
    ),
  ].slice(0, 12)
  const isSubmitted = String(draftStatus || '').toLowerCase() === 'submitted'
  const availableActions = []
  if (!isSubmitted && canReview && validation.errorCount === 0) {
    availableActions.push('continue_review')
  } else if (!isSubmitted && canSaveDraft) {
    availableActions.push('save_draft')
  }

  return {
    record_kind: 'inspection',
    record_status: isSubmitted ? 'submitted' : 'draft',
    selected_type: type,
    current_step: isSubmitted || validation.errorCount === 0 ? 'review' : 'complete_checklist',
    missing_fields: isSubmitted ? [] : missingFields,
    available_actions: availableActions,
  }
}

const useInspectionAiHelperUiState = ({
  canReview,
  canSaveDraft,
  draftStatus,
  form,
  selectedType,
}) => {
  const state = useMemo(
    () =>
      buildInspectionAiHelperUiState({
        canReview,
        canSaveDraft,
        draftStatus,
        form,
        selectedType,
      }),
    [canReview, canSaveDraft, draftStatus, form, selectedType],
  )

  useEffect(() => {
    if (!state) {
      clearAiHelperUiState()
      return undefined
    }
    publishAiHelperUiState(state)

    return clearAiHelperUiState
  }, [state])
}

export default useInspectionAiHelperUiState
