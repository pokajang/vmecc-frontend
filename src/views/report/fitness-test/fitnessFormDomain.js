import { createReportSubmissionKey, uid } from '../utils'
import { getLocalDateInputValue } from 'src/utils/localDate'
import {
  FITNESS_FORM_VERSION,
  FITNESS_PROTOCOL,
  FITNESS_RESULT_LABELS,
  FITNESS_WORKFLOW_STEPS,
} from './constants'

const text = (value) => String(value ?? '').trim()

const currentReportingMonth = () => getLocalDateInputValue().slice(0, 7)

const optionalInteger = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : ''
}

const normalizeDate = (value) => {
  const result = text(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : ''
}

const emptyCheckpointCompletion = () =>
  Object.fromEntries(FITNESS_PROTOCOL.proficiency.checkpoints.map(({ id }) => [id, false]))

const normalizeCheckpointCompletion = (proficiency = {}) => {
  const supplied = proficiency.checkpointCompletion
  const hasExplicitCompletion =
    (supplied && typeof supplied === 'object' && !Array.isArray(supplied)) ||
    Array.isArray(proficiency.completedCheckpoints)
  const completedIds = new Set(
    Array.isArray(proficiency.completedCheckpoints)
      ? proficiency.completedCheckpoints.map((value) => text(value).toLowerCase())
      : [],
  )
  const legacyComplete =
    !hasExplicitCompletion &&
    optionalInteger(proficiency.durationSeconds) > 0 &&
    Boolean(normalizeDate(proficiency.testedOn))

  return Object.fromEntries(
    FITNESS_PROTOCOL.proficiency.checkpoints.map(({ id }) => [
      id,
      legacyComplete || Boolean(supplied?.[id]) || completedIds.has(id),
    ]),
  )
}

export const getProficiencyCheckpointSummary = (proficiency = {}) => {
  const completion = normalizeCheckpointCompletion(proficiency)
  const total = FITNESS_PROTOCOL.proficiency.checkpoints.length
  const completed = Object.values(completion).filter(Boolean).length
  return { completed, total, allCompleted: completed === total, completion }
}

const calculateAge = (birthDate, referenceMonth) => {
  const birth = new Date(`${text(birthDate)}T00:00:00`)
  const reference = new Date(`${text(referenceMonth)}-01T00:00:00`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return ''
  let age = reference.getFullYear() - birth.getFullYear()
  if (reference.getMonth() < birth.getMonth()) age -= 1
  return age >= 0 ? age : ''
}

export const resolveFitnessResult = (fitness = {}) => {
  const values = [fitness.sitUps, fitness.jumpingJacks, fitness.pushUps]
  const complete = values.every((value) => value !== '' && Number.isFinite(Number(value)))
  if (!complete || !normalizeDate(fitness.testedOn)) return 'incomplete'
  return Number(fitness.sitUps) >= FITNESS_PROTOCOL.fitness.sitUps &&
    Number(fitness.jumpingJacks) >= FITNESS_PROTOCOL.fitness.jumpingJacks &&
    Number(fitness.pushUps) >= FITNESS_PROTOCOL.fitness.pushUps
    ? 'pass'
    : 'failed'
}

export const resolveProficiencyResult = (proficiency = {}) => {
  const duration = optionalInteger(proficiency.durationSeconds)
  if (duration === '' || duration <= 0 || !normalizeDate(proficiency.testedOn)) return 'incomplete'
  const { allCompleted } = getProficiencyCheckpointSummary(proficiency)
  return allCompleted && duration < FITNESS_PROTOCOL.proficiency.timeLimitSeconds
    ? 'pass'
    : 'failed'
}

const normalizeParticipant = (row, reportingMonth, index) => {
  const name = text(row?.name || row?.email)
  if (!name) return null
  const fitness = {
    sitUps: optionalInteger(row?.fitness?.sitUps),
    jumpingJacks: optionalInteger(row?.fitness?.jumpingJacks),
    pushUps: optionalInteger(row?.fitness?.pushUps),
    testedOn: normalizeDate(row?.fitness?.testedOn),
  }
  const proficiency = {
    durationSeconds: optionalInteger(row?.proficiency?.durationSeconds),
    testedOn: normalizeDate(row?.proficiency?.testedOn),
    checkpointCompletion: normalizeCheckpointCompletion(row?.proficiency),
  }
  const birthDate = normalizeDate(row?.birthDate || row?.dateOfBirth || row?.date_of_birth)
  const suppliedAge = optionalInteger(row?.ageSnapshot ?? row?.age)
  return {
    id: text(row?.id || row?.memberId || row?.userId) || uid(),
    memberId: text(row?.memberId || row?.userId || row?.user_id || row?.id),
    name,
    role: text(row?.role),
    source: text(row?.source) || 'roster',
    rosterStatus: text(row?.rosterStatus),
    birthDate,
    ageSnapshot: suppliedAge === '' ? calculateAge(birthDate, reportingMonth) : suppliedAge,
    order: Number.isFinite(Number(row?.order)) ? Number(row.order) : index,
    fitness: { ...fitness, result: resolveFitnessResult(fitness) },
    proficiency: { ...proficiency, result: resolveProficiencyResult(proficiency) },
  }
}

const normalizeShiftGroup = (row, reportingMonth, index) => {
  const shift = text(row?.shift || row?.teamName || row?.name) || `Shift ${index + 1}`
  const seen = new Set()
  const participants = (Array.isArray(row?.participants) ? row.participants : [])
    .map((participant, participantIndex) =>
      normalizeParticipant(participant, reportingMonth, participantIndex),
    )
    .filter(Boolean)
    .filter((participant) => {
      const key = text(participant.memberId || participant.name).toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  return {
    id: text(row?.id) || uid(),
    shift,
    assessor: {
      userId: text(row?.assessor?.userId || row?.assessor?.id),
      name: text(row?.assessor?.name || row?.assessorName),
    },
    participants,
  }
}

export const createDefaultFitnessTestForm = () => ({
  schemaVersion: 1,
  fitnessSchemaVersion: FITNESS_FORM_VERSION,
  submissionKey: createReportSubmissionKey('fitness-test'),
  workflowStep: 'period',
  reportingMonth: currentReportingMonth(),
  documentReference: FITNESS_PROTOCOL.documentReference,
  protocolRevision: FITNESS_PROTOCOL.revision,
  shiftGroups: [],
  excludedMemberKeys: [],
  excludedParticipantSnapshots: [],
  notes: '',
})

export const normalizeFitnessTestForm = (source = {}) => {
  const fallback = createDefaultFitnessTestForm()
  const reportingMonth = /^\d{4}-\d{2}$/.test(text(source.reportingMonth))
    ? text(source.reportingMonth)
    : /^\d{4}-\d{2}/.test(text(source.reportDate))
      ? text(source.reportDate).slice(0, 7)
      : fallback.reportingMonth
  const sourceGroups = Array.isArray(source.shiftGroups) ? source.shiftGroups : []
  const workflowStep = FITNESS_WORKFLOW_STEPS.includes(text(source.workflowStep))
    ? text(source.workflowStep)
    : source.setupConfirmed
      ? 'results'
      : 'period'

  return {
    ...fallback,
    submissionKey: text(source.submissionKey) || fallback.submissionKey,
    workflowStep,
    reportingMonth,
    documentReference: text(source.documentReference) || FITNESS_PROTOCOL.documentReference,
    protocolRevision: text(source.protocolRevision) || FITNESS_PROTOCOL.revision,
    shiftGroups: sourceGroups
      .map((group, index) => normalizeShiftGroup(group, reportingMonth, index))
      .filter((group) => group.participants.length > 0 || text(group.assessor.name)),
    excludedMemberKeys: [
      ...new Set(
        (Array.isArray(source.excludedMemberKeys) ? source.excludedMemberKeys : [])
          .map((value) => text(value).toLowerCase())
          .filter(Boolean),
      ),
    ],
    excludedParticipantSnapshots: (Array.isArray(source.excludedParticipantSnapshots)
      ? source.excludedParticipantSnapshots
      : []
    )
      .map((participant, index) => {
        const normalizedParticipant = normalizeParticipant(participant, reportingMonth, index)
        return normalizedParticipant
          ? { ...normalizedParticipant, shift: text(participant?.shift) }
          : null
      })
      .filter(Boolean),
    notes: text(source.notes || source.summary || source.details),
  }
}

export const flattenFitnessParticipants = (form) =>
  (Array.isArray(form?.shiftGroups) ? form.shiftGroups : []).flatMap((group) =>
    (Array.isArray(group?.participants) ? group.participants : []).map((participant) => ({
      ...participant,
      shift: group.shift,
      groupId: group.id,
    })),
  )

export const getFitnessCompletionSummary = (form) => {
  const participants = flattenFitnessParticipants(form)
  const statuses = participants.flatMap((participant) => [
    resolveFitnessResult(participant.fitness),
    resolveProficiencyResult(participant.proficiency),
  ])
  const incompleteParticipants = participants.filter(
    (participant) =>
      resolveFitnessResult(participant.fitness) === 'incomplete' ||
      resolveProficiencyResult(participant.proficiency) === 'incomplete',
  ).length
  return {
    participants: participants.length,
    passedAssessments: statuses.filter((status) => status === 'pass').length,
    failedAssessments: statuses.filter((status) => status === 'failed').length,
    incompleteAssessments: statuses.filter((status) => status === 'incomplete').length,
    incompleteParticipants,
    missingAssessors: (Array.isArray(form?.shiftGroups) ? form.shiftGroups : []).filter(
      (group) => group.participants?.length && !text(group.assessor?.name),
    ).length,
  }
}

export const createFitnessParticipant = (member, reportingMonth, index = 0) =>
  normalizeParticipant(
    {
      ...member,
      id: member?.memberId || member?.userId || member?.id || uid(),
      order: index,
      fitness: {},
      proficiency: {},
    },
    reportingMonth,
    index,
  )

export const updateFitnessParticipantResults = (participant, patch = {}) => {
  const next = {
    ...participant,
    ...patch,
    fitness: { ...participant.fitness, ...(patch.fitness || {}) },
    proficiency: {
      ...participant.proficiency,
      ...(patch.proficiency || {}),
      checkpointCompletion: {
        ...(participant.proficiency?.checkpointCompletion || emptyCheckpointCompletion()),
        ...(patch.proficiency?.checkpointCompletion || {}),
      },
    },
  }
  next.ageSnapshot = optionalInteger(next.ageSnapshot)
  next.fitness.sitUps = optionalInteger(next.fitness.sitUps)
  next.fitness.jumpingJacks = optionalInteger(next.fitness.jumpingJacks)
  next.fitness.pushUps = optionalInteger(next.fitness.pushUps)
  next.proficiency.durationSeconds = optionalInteger(next.proficiency.durationSeconds)
  next.proficiency.checkpointCompletion = normalizeCheckpointCompletion(next.proficiency)
  next.fitness.result = resolveFitnessResult(next.fitness)
  next.proficiency.result = resolveProficiencyResult(next.proficiency)
  return next
}

export const fitnessResultLabel = (result) =>
  FITNESS_RESULT_LABELS[text(result)] || FITNESS_RESULT_LABELS.incomplete

export const formatFitnessDuration = (seconds) => {
  const value = optionalInteger(seconds)
  if (value === '') return '--'
  const minutes = Math.floor(value / 60)
  return `${minutes}:${String(value % 60).padStart(2, '0')}`
}

export const isFitnessTestDirty = (form) => {
  const normalized = normalizeFitnessTestForm(form)
  return Boolean(
    normalized.shiftGroups.length ||
      normalized.excludedMemberKeys.length ||
      normalized.notes ||
      normalized.reportingMonth !== currentReportingMonth(),
  )
}

export const toSerializableFitnessTestForm = (form) => normalizeFitnessTestForm(form)
