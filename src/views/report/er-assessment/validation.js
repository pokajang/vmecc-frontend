import { ER_ASSESSMENT_STEPS, getErAssessmentType } from './constants'
import { ER_FIELD_LABELS, ER_RESPONSE_FIELD_LABEL } from './constants'
import { normalizeErAssessmentForm } from './erAssessmentFormDomain'

const required = (value) => String(value || '').trim().length > 0

export const validateErAssessmentStep = (rawForm, step, assessmentTypes) => {
  const form = normalizeErAssessmentForm(rawForm, assessmentTypes)
  const errors = {}

  if (step === 'setup') {
    if (!required(form.company)) errors.company = `${ER_FIELD_LABELS.company} is required.`
    if (!required(form.assessmentDate)) errors.assessmentDate = 'Assessment date is required.'
    if (!required(form.location)) errors.location = 'Location is required.'
    if (!required(form.scopeOfWork))
      errors.scopeOfWork = `${ER_FIELD_LABELS.scopeOfWork} is required.`
    if (!getErAssessmentType(form.assessmentType, assessmentTypes)) {
      errors.assessmentType = 'Select an assessment type.'
    }
  }

  if (step === 'requirements') {
    form.responses.forEach((row, index) => {
      if (!required(row.response)) errors[`response-${index}`] = 'Select Yes, No, or N/A.'
      if (row.response === 'No' && !required(row.remarks)) {
        errors[`remarks-${index}`] = `${ER_RESPONSE_FIELD_LABEL} is required when response is No.`
      }
    })
  }

  if (step === 'rescue') {
    if (!required(form.rescuePlan)) errors.rescuePlan = 'Rescue plan details are required.'
    if (!form.rescueAccessLayout?.url) {
      errors.rescueAccessLayout = 'Attach or capture a rescue access layout.'
    }
  }

  if (step === 'equipment' && !form.rescueEquipment.some(required)) {
    errors.rescueEquipment = 'Add at least one item of rescue equipment.'
  }

  if (step === 'signoff') {
    ;['inspectedBy', 'jobLeader'].forEach((key) => {
      if (!required(form[key].name)) errors[`${key}.name`] = 'Name is required.'
      if (!required(form[key].company)) errors[`${key}.company`] = 'Company is required.'
      if (!required(form[key].signature)) errors[`${key}.signature`] = 'Signature is required.'
    })
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export const validateErAssessmentForm = (form, assessmentTypes) => {
  const errors = {}
  ER_ASSESSMENT_STEPS.forEach(({ key }) =>
    Object.assign(errors, validateErAssessmentStep(form, key, assessmentTypes).errors),
  )
  return { isValid: Object.keys(errors).length === 0, errors }
}

export const firstErAssessmentError = (errors = {}) => {
  const field = Object.keys(errors)[0] || ''
  const stage =
    field.startsWith('response') || field.startsWith('remarks')
      ? 'requirements'
      : field.startsWith('rescuePlan') || field.startsWith('rescueAccessLayout')
        ? 'rescue'
        : field.startsWith('rescueEquipment')
          ? 'equipment'
          : field.startsWith('inspectedBy') || field.startsWith('jobLeader')
            ? 'signoff'
            : 'setup'
  return { stage, field }
}
