import {
  flattenFitnessParticipants,
  resolveFitnessResult,
  resolveProficiencyResult,
} from './fitnessFormDomain'

export const FITNESS_TEST_FIELD_ORDER = ['reportingMonth', 'shiftGroups', 'results', 'assessors']

const FIELD_STAGE = {
  reportingMonth: 'period',
  shiftGroups: 'personnel',
  results: 'results',
  assessors: 'signoff',
}
const result = (errors) => ({ isValid: Object.keys(errors).length === 0, errors })

export const validateFitnessPeriod = (form) =>
  result(
    /^\d{4}-\d{2}$/.test(String(form?.reportingMonth || ''))
      ? {}
      : { reportingMonth: 'Reporting month is required.' },
  )

export const validateFitnessPersonnel = (form) =>
  result(
    flattenFitnessParticipants(form).length
      ? {}
      : { shiftGroups: 'Select at least one participant.' },
  )

export const validateFitnessResults = (form) => {
  const participants = flattenFitnessParticipants(form)
  const invalidAge = participants.some((participant) => {
    const age = Number(participant.ageSnapshot)
    return !Number.isInteger(age) || age < 18 || age > 100
  })
  const incomplete = participants.some(
    (participant) =>
      resolveFitnessResult(participant.fitness) === 'incomplete' ||
      resolveProficiencyResult(participant.proficiency) === 'incomplete',
  )
  return result(
    invalidAge || incomplete
      ? {
          results: invalidAge
            ? 'Enter a valid age from 18 to 100 for every participant.'
            : 'Complete the fitness results, CP1–CP6 status, combined time, and test dates for every participant.',
        }
      : {},
  )
}

export const validateFitnessSignoff = (form) =>
  result(
    form.shiftGroups.some(
      (group) => group.participants.length && !String(group.assessor?.name || '').trim(),
    )
      ? { assessors: 'Enter an assessor for every participating shift.' }
      : {},
  )

export const validateFitnessTestForm = (form) => {
  const validations = [
    validateFitnessPeriod(form),
    validateFitnessPersonnel(form),
    validateFitnessResults(form),
    validateFitnessSignoff(form),
  ]
  return result(Object.assign({}, ...validations.map((item) => item.errors)))
}

export const orderedFitnessTestErrorFields = (errors = {}) =>
  FITNESS_TEST_FIELD_ORDER.filter((field) => Object.hasOwn(errors, field))

export const firstFitnessTestError = (errors = {}) => {
  const field = orderedFitnessTestErrorFields(errors)[0] || ''
  return { field, stage: FIELD_STAGE[field] || 'period' }
}

export const validateFitnessTestSetup = validateFitnessPeriod
