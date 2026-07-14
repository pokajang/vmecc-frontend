import { useMemo, useRef } from 'react'
import { getInspectionFormValidationState, isInspectionFormValid } from './inspectionFormHelpers'
import { focusFirstMissingInspectionField } from './inspectionFormFocus'
import { buildInspectionValidationStatusMessage } from './inspectionValidationFeedback'
import { buildInspectionReadiness } from './inspectionReadiness'

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
  isPhotoProcessing = false,
  draftSyncState = null,
  pendingOperationCount = 0,
  sessionState = 'active',
  permanentFailureCount = 0,
  prepareCurrentForm,
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
  const reviewRequestLockRef = useRef(false)
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

  const requestReview = async () => {
    if (reviewRequestLockRef.current) return
    reviewRequestLockRef.current = true
    try {
      const initialForm = getLatestForm()
      const currentForm =
        typeof prepareCurrentForm === 'function'
          ? await prepareCurrentForm(initialForm)
          : initialForm
      if (!currentForm) throw new Error('Unable to refresh the inspection session before review.')
      if (!validateCurrentForm) {
        setValidationState(null)
        setFieldErrors({})
        await onRequestReview?.(currentForm)
        return
      }
      const nextValidationState = getInspectionFormValidationState(currentForm)
      const readiness = buildInspectionReadiness({
        localValidationErrors: nextValidationState.missing,
        mediaProcessingCount: isPhotoProcessing ? 1 : 0,
        versionConflicts: draftSyncState?.status === 'conflict' ? 1 : 0,
        sessionState,
        permanentFailureCount,
      })
      if (!isInspectionFormValid(currentForm) || !readiness.isReadyToReview) {
        setValidationState(nextValidationState)
        setFieldErrors(nextValidationState.missing)
        if (!isInspectionFormValid(currentForm)) {
          focusFirstMissingInspectionField({
            currentForm,
            validation: nextValidationState,
            fieldRefs: focusFieldRefs,
          })
        }
        pushToast(readiness.blockers[0]?.message || 'Complete the inspection form before review.', {
          title: 'Review blocked',
          color: 'warning',
        })
        return
      }
      setValidationState(null)
      setFieldErrors({})
      await onRequestReview?.(currentForm)
    } catch (error) {
      pushToast(error?.message || 'Unable to refresh the inspection session before review.', {
        title: 'Review blocked',
        color: 'warning',
      })
    } finally {
      reviewRequestLockRef.current = false
    }
  }

  const readiness = buildInspectionReadiness({
    localValidationErrors: validationState?.missing || {},
    mediaProcessingCount: isPhotoProcessing ? 1 : 0,
    pendingOperationCount,
    retryableFailureCount: draftSyncState?.status === 'failed' ? 1 : 0,
    versionConflicts: draftSyncState?.status === 'conflict' ? 1 : 0,
    sessionState,
    permanentFailureCount,
  })

  const validationStatusMessage = isPhotoProcessing
    ? 'Wait for the current photo to finish before review.'
    : draftSyncState?.status === 'conflict'
      ? 'Resolve the saved draft conflict before review.'
      : buildInspectionValidationStatusMessage(validationState)

  return {
    readiness,
    requestReview,
    validationStatusMessage,
  }
}

export default useInspectionReviewRequest
