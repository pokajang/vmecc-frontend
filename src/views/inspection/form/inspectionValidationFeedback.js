const FIELD_REASONS = {
  inspectionType: 'select an inspection type',
  inspectedAt: 'set the inspection date and time',
  selectedLocation: 'complete the inspection location',
  description: 'describe the inspection',
  photos: 'add at least one inspection photo',
  inspectionIssues: 'add and complete at least one finding',
  erAuxSession: 'set the ER Aux inspector and inspection date',
  erAuxChecks: 'complete the quantity and condition for every ER Aux item',
  erAuxRemarks: 'add remarks for every ER Aux defect',
  fireExtinguisherSession: 'start or restore the fire extinguisher inspection session',
  fireExtinguisherChecks: 'complete every fire extinguisher status',
  fireExtinguisherRemarks: 'add remarks for every failed fire extinguisher status',
  hydraulicChecks: 'complete every hydraulic equipment status',
  hydraulicRemarks: 'add remarks for every hydraulic defect or N/A status',
  frtSession: 'set the FRT inspector, inspection date, shift, and truck',
  frtCompartment: 'select a fire truck compartment',
  frtDailyChecks: 'complete every FRT daily status or reading',
  frtDailyRemarks: 'add remarks for every FRT daily issue',
  frtOneOffChecks: 'complete every FRT one-off condition',
  frtOneOffRemarks: 'add remarks for every FRT one-off issue',
  highAngleSession: 'set the High Angle inspector and inspection date',
  highAngleChecks: 'complete every High Angle equipment condition',
  highAngleRemarks: 'add remarks for every High Angle issue',
  scbaSession: 'set the SCBA inspector and inspection date',
  scbaChecks: 'complete every required SCBA status',
  scbaRemarks: 'add remarks for every SCBA issue',
  hseSession: 'set the HSE inspector and inspection date',
  hseSelection: 'select Area Satisfactory or at least one HSE finding',
  hseDetails: 'complete the required HSE observation details',
}

export const getInspectionValidationReasons = (validationState = {}) => {
  const missing =
    validationState?.missing && typeof validationState.missing === 'object'
      ? validationState.missing
      : {}
  const reasons = Object.entries(missing)
    .filter(([, isMissing]) => Boolean(isMissing))
    .map(([field]) => FIELD_REASONS[field])
    .filter(Boolean)

  return [...new Set(reasons)]
}

export const buildInspectionValidationStatusMessage = (validationState = {}) => {
  const reasons = getInspectionValidationReasons(validationState)
  if (reasons.length === 0) {
    return validationState?.errorCount > 0
      ? 'Cannot continue to review: complete the highlighted inspection items.'
      : ''
  }

  return `Cannot continue to review: ${reasons.join('; ')}.`
}
