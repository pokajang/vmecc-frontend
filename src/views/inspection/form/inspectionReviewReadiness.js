import {
  getInspectionFormValidationState,
  isInspectionFormValid,
  normalizeInspectionForm,
} from './inspectionFormHelpers'

export const getInspectionReviewReadiness = ({
  form = {},
  hasInspectionBody = false,
  selectedTypeDefinition = null,
  showComingSoonNotice = false,
} = {}) => {
  const normalizedForm = normalizeInspectionForm(form)

  if (showComingSoonNotice) {
    return { canReview: false, reason: 'coming-soon' }
  }

  if (!selectedTypeDefinition && !String(normalizedForm.inspectionType || '').trim()) {
    return { canReview: false, reason: 'missing-type' }
  }

  if (!hasInspectionBody) {
    return { canReview: false, reason: 'inspection-body-unavailable' }
  }

  const validationState = getInspectionFormValidationState(normalizedForm)
  if (!isInspectionFormValid(normalizedForm) || validationState.errorCount > 0) {
    return { canReview: false, reason: 'incomplete', validationState }
  }

  return { canReview: true, reason: 'ready', validationState }
}
