import {
  getErAuxMissingFields,
  getErAuxValidationDetails,
  isErAuxInspectionType,
} from 'src/views/inspection/types/er-aux/helpers'
import {
  getFireExtinguisherMissingFields,
  getFireExtinguisherValidationDetails,
  isFireExtinguisherInspectionType,
} from 'src/views/inspection/types/fire-extinguisher/helpers'
import {
  getFrtMissingFields,
  getFrtValidationDetails,
  isFrtDailyInspectionType,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  getGeneralMissingFields,
  getGeneralValidationDetails,
  isGeneralInspectionType,
} from 'src/views/inspection/types/general/helpers'
import {
  getHighAngleMissingFields,
  isHighAngleInspectionType,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  getHseMissingFields,
  getHseValidationDetails,
  isHseInspectionType,
} from 'src/views/inspection/types/hse/helpers'
import {
  getInspectionIssueValidationDetails,
  normalizeInspectionIssues,
} from 'src/views/inspection/types/inspectionIssues'
import {
  getHydraulicMissingFields,
  isHydraulicInspectionType,
} from 'src/views/inspection/types/hydraulic/helpers'
import { getScbaMissingFields, isScbaInspectionType } from 'src/views/inspection/types/scba/helpers'

const SHARED_STRUCTURED_MISSING = {
  erAuxSession: false,
  erAuxChecks: false,
  erAuxRemarks: false,
  hydraulicChecks: false,
  hydraulicRemarks: false,
  frtSession: false,
  frtDailyChecks: false,
  frtDailyRemarks: false,
  frtOneOffChecks: false,
  frtOneOffRemarks: false,
  highAngleSession: false,
  highAngleChecks: false,
  highAngleRemarks: false,
  scbaSession: false,
  scbaChecks: false,
  scbaRemarks: false,
}

const FIRST_MISSING_FIELD_ORDER = [
  'inspectionType',
  'inspectedAt',
  'selectedLocation',
  'erAuxSession',
  'erAuxChecks',
  'erAuxRemarks',
  'fireExtinguisherSession',
  'fireExtinguisherChecks',
  'fireExtinguisherRemarks',
  'hydraulicChecks',
  'hydraulicRemarks',
  'frtSession',
  'frtCompartment',
  'frtDailyChecks',
  'frtDailyRemarks',
  'frtOneOffChecks',
  'frtOneOffRemarks',
  'highAngleSession',
  'highAngleChecks',
  'highAngleRemarks',
  'scbaSession',
  'scbaChecks',
  'scbaRemarks',
  'hseSession',
  'hseSelection',
  'hseDetails',
  'inspectionIssues',
  'description',
  'photos',
]

export const buildInspectionFormMissingFields = (
  normalizedForm = {},
  getInspectionLocationMissingFields,
) => {
  const baseMissing = {
    inspectionType: !String(normalizedForm.inspectionType || '').trim(),
    inspectedAt: !String(normalizedForm.inspectedAt || '').trim(),
    selectedLocation: getInspectionLocationMissingFields(normalizedForm).selectedLocation,
    photos: normalizedForm.photos.length === 0,
  }

  if (isHydraulicInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getHydraulicMissingFields(normalizedForm),
    }
  }

  if (isErAuxInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getErAuxMissingFields(normalizedForm),
    }
  }

  if (isFireExtinguisherInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getFireExtinguisherMissingFields(normalizedForm),
    }
  }

  if (isScbaInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getScbaMissingFields(normalizedForm),
    }
  }

  if (isFrtDailyInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getFrtMissingFields(normalizedForm),
    }
  }

  if (isHighAngleInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getHighAngleMissingFields(normalizedForm),
    }
  }

  if (isHseInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...SHARED_STRUCTURED_MISSING,
      ...getHseMissingFields(normalizedForm),
    }
  }

  if (isGeneralInspectionType(normalizedForm.inspectionType)) {
    const issueDetails = getInspectionIssueValidationDetails(normalizedForm.inspectionIssues)
    const issues = normalizeInspectionIssues(normalizedForm.inspectionIssues)
    return {
      ...baseMissing,
      ...SHARED_STRUCTURED_MISSING,
      inspectionIssues: issues.length === 0 || issueDetails.errorCount > 0,
      ...getGeneralMissingFields(normalizedForm),
    }
  }

  return {
    ...baseMissing,
    description: !String(normalizedForm.description || '').trim(),
    ...SHARED_STRUCTURED_MISSING,
  }
}

export const getFirstMissingInspectionFieldName = (missing = {}) =>
  FIRST_MISSING_FIELD_ORDER.find((field) => Boolean(missing[field]))

export const buildInspectionFormValidationState = (normalizedForm = {}, missing = {}) => {
  const firstField = getFirstMissingInspectionFieldName(missing)
  const isErAux = isErAuxInspectionType(normalizedForm.inspectionType)
  const isFireExtinguisher = isFireExtinguisherInspectionType(normalizedForm.inspectionType)
  const isFrt = isFrtDailyInspectionType(normalizedForm.inspectionType)
  const isHse = isHseInspectionType(normalizedForm.inspectionType)
  const isGeneral = isGeneralInspectionType(normalizedForm.inspectionType)
  const erAux = isErAux
    ? getErAuxValidationDetails(normalizedForm)
    : {
        incompleteCheckDetails: [],
        incompleteEvidenceDetails: [],
        firstTarget: null,
        errorCount: 0,
      }
  const fireExtinguisher = isFireExtinguisher
    ? getFireExtinguisherValidationDetails(normalizedForm)
    : {
        rowDetails: [],
        missingStatusesByRow: {},
        missingRemarksByRow: {},
        missingPhotosByRow: {},
        firstTarget: null,
        errorCount: 0,
      }
  const hse = isHse
    ? getHseValidationDetails(normalizedForm)
    : { missingFields: {}, firstTarget: null, errorCount: 0 }
  const frt = isFrt
    ? getFrtValidationDetails(normalizedForm)
    : { rowDetails: [], firstTarget: null, errorCount: 0 }
  const general = isGeneral
    ? getGeneralValidationDetails(normalizedForm)
    : { missingFields: {}, firstTarget: null, errorCount: 0 }
  const issueValidation = isGeneral
    ? getInspectionIssueValidationDetails(normalizedForm.inspectionIssues)
    : { incompleteIssues: [], firstTarget: null, errorCount: 0 }
  const missingRequiredGeneralIssueCount =
    isGeneral && missing.inspectionIssues && issueValidation.errorCount === 0 ? 1 : 0

  const errorCount =
    Object.entries(missing).reduce((count, [field, value]) => {
      if (!value) return count
      if (isGeneral && field === 'inspectionIssues') return count
      if (isErAux && ['erAuxChecks', 'erAuxRemarks'].includes(field)) return count
      if (
        isFireExtinguisher &&
        ['fireExtinguisherChecks', 'fireExtinguisherRemarks'].includes(field)
      ) {
        return count
      }
      if (isHse && field === 'hseDetails') return count
      if (
        isFrt &&
        ['frtDailyChecks', 'frtDailyRemarks', 'frtOneOffChecks', 'frtOneOffRemarks'].includes(field)
      ) {
        return count
      }
      return count + 1
    }, 0) +
    erAux.errorCount +
    fireExtinguisher.errorCount +
    hse.errorCount +
    frt.errorCount +
    issueValidation.errorCount +
    missingRequiredGeneralIssueCount

  const firstTarget =
    firstField === 'erAuxChecks' || firstField === 'erAuxRemarks'
      ? erAux.firstTarget || { field: firstField }
      : firstField === 'fireExtinguisherChecks' || firstField === 'fireExtinguisherRemarks'
        ? fireExtinguisher.firstTarget || { field: firstField }
        : ['frtDailyChecks', 'frtDailyRemarks', 'frtOneOffChecks', 'frtOneOffRemarks'].includes(
              firstField,
            )
          ? frt.firstTarget || { field: firstField }
          : firstField === 'hseDetails'
            ? hse.firstTarget || { field: firstField }
            : firstField === 'inspectionIssues'
              ? issueValidation.firstTarget || { field: firstField }
              : isGeneral && ['description', 'photos'].includes(firstField)
                ? general.firstTarget || { field: firstField }
                : firstField
                  ? { field: firstField }
                  : null

  return {
    missing,
    errorCount,
    firstTarget,
    erAux,
    fireExtinguisher,
    frt,
    hse,
    general,
    inspectionIssues: issueValidation,
  }
}
