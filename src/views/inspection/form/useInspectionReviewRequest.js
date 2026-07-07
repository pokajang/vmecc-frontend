import { useMemo } from 'react'
import { getInspectionFormValidationState, isInspectionFormValid } from './inspectionFormHelpers'
import { focusFirstMissingInspectionField } from './inspectionFormFocus'

const useInspectionReviewRequest = ({
  descriptionRef,
  erAuxChecksRef,
  fireExtinguisherChecksRef,
  frtChecksRef,
  getLatestForm,
  highAngleChecksRef,
  hseObservationRef,
  hydraulicChecksRef,
  inspectedAtRef,
  inspectionTypeRef,
  onRequestReview,
  photosRef,
  pushToast,
  scbaChecksRef,
  selectedLocationRef,
  setFieldErrors,
  setValidationState,
  validateCurrentForm = true,
  validationState,
}) => {
  const focusFieldRefs = useMemo(
    () => ({
      inspectionType: inspectionTypeRef,
      inspectedAt: inspectedAtRef,
      selectedLocation: selectedLocationRef,
      erAuxSession: erAuxChecksRef,
      erAuxChecks: erAuxChecksRef,
      erAuxRemarks: erAuxChecksRef,
      fireExtinguisherSession: fireExtinguisherChecksRef,
      fireExtinguisherChecks: fireExtinguisherChecksRef,
      fireExtinguisherRemarks: fireExtinguisherChecksRef,
      hydraulicChecks: hydraulicChecksRef,
      hydraulicRemarks: hydraulicChecksRef,
      frtSession: frtChecksRef,
      frtCompartment: selectedLocationRef,
      frtDailyChecks: frtChecksRef,
      frtDailyRemarks: frtChecksRef,
      frtOneOffChecks: frtChecksRef,
      frtOneOffRemarks: frtChecksRef,
      highAngleSession: highAngleChecksRef,
      highAngleChecks: highAngleChecksRef,
      highAngleRemarks: highAngleChecksRef,
      scbaSession: scbaChecksRef,
      scbaChecks: scbaChecksRef,
      scbaRemarks: scbaChecksRef,
      hseSession: hseObservationRef,
      hseSelection: hseObservationRef,
      hseDetails: hseObservationRef,
      description: descriptionRef,
      photos: photosRef,
    }),
    [
      descriptionRef,
      erAuxChecksRef,
      fireExtinguisherChecksRef,
      frtChecksRef,
      highAngleChecksRef,
      hseObservationRef,
      hydraulicChecksRef,
      inspectedAtRef,
      inspectionTypeRef,
      photosRef,
      scbaChecksRef,
      selectedLocationRef,
    ],
  )

  const requestReview = () => {
    const currentForm = getLatestForm()
    if (!validateCurrentForm) {
      setValidationState(null)
      setFieldErrors({})
      onRequestReview?.(currentForm)
      return
    }
    const nextValidationState = getInspectionFormValidationState(currentForm)
    if (!isInspectionFormValid(currentForm)) {
      setValidationState(nextValidationState)
      setFieldErrors(nextValidationState.missing)
      focusFirstMissingInspectionField({
        currentForm,
        validation: nextValidationState,
        fieldRefs: focusFieldRefs,
      })
      pushToast('Complete the inspection form before review.', {
        title: 'Incomplete form',
        color: 'warning',
      })
      return
    }
    setValidationState(null)
    setFieldErrors({})
    onRequestReview?.(currentForm)
  }

  const validationStatusMessage =
    validationState?.errorCount > 0
      ? `${validationState.errorCount} item${
          validationState.errorCount === 1 ? '' : 's'
        } need attention before review.`
      : ''

  return {
    requestReview,
    validationStatusMessage,
  }
}

export default useInspectionReviewRequest
