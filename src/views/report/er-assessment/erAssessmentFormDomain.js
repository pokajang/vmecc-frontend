import {
  ER_ASSESSMENT_DOCUMENT,
  ER_ASSESSMENT_SCHEMA_VERSION,
  ER_ASSESSMENT_STEPS,
  ER_ASSESSMENT_TEMPLATE_VERSION,
  ER_ASSEMBLY_AREA_FIELD_SUFFIX,
  getErAssessmentType,
} from './constants'

const text = (value) => String(value ?? '').trim()

const normalizePhoto = (photo = {}) => {
  const mediaId = text(photo?.mediaId || photo?.media_id || photo?.id)
  const url = text(photo?.url || photo?.dataUrl || photo?.data_url)
  if (!mediaId && !url) return null
  const resolvedId = mediaId || url

  return {
    id: text(photo?.id || resolvedId),
    mediaId,
    url,
    thumbnailUrl: text(photo?.thumbnailUrl || photo?.thumbnail_url),
    fileName: text(photo?.fileName || photo?.file_name || photo?.name),
    description: text(photo?.description || photo?.caption),
    mimeType: text(photo?.mimeType || photo?.mime_type),
    sizeBytes: Math.max(0, Number(photo?.sizeBytes ?? photo?.size_bytes ?? photo?.size ?? 0)),
    width: Math.max(0, Number(photo?.width ?? photo?.width_px ?? 0)),
    height: Math.max(0, Number(photo?.height ?? photo?.height_px ?? 0)),
    thumbnailSizeBytes: Math.max(
      0,
      Number(photo?.thumbnailSizeBytes ?? photo?.thumbnail_size_bytes ?? 0),
    ),
    thumbnailWidth: Math.max(0, Number(photo?.thumbnailWidth ?? photo?.thumbnail_width ?? 0)),
    thumbnailHeight: Math.max(0, Number(photo?.thumbnailHeight ?? photo?.thumbnail_height ?? 0)),
    checksumSha256: text(photo?.checksumSha256 || photo?.checksum_sha256 || ''),
    leaseId: text(photo?.leaseId || photo?.lease_id || ''),
    leaseExpiresAt: text(photo?.leaseExpiresAt || photo?.lease_expires_at || ''),
    leaseAbsoluteExpiresAt: text(
      photo?.leaseAbsoluteExpiresAt || photo?.lease_absolute_expires_at || '',
    ),
    uploadId: text(photo?.uploadId || photo?.upload_id || ''),
  }
}

export const createEmptyErAssessmentForm = () => ({
  workflowStep: 'setup',
  company: '',
  assessmentDate: new Date().toISOString().slice(0, 10),
  location: '',
  scopeOfWork: '',
  assessmentType: '',
  responses: [],
  rescuePlan: '',
  rescueAccessLayout: null,
  rescueEquipment: [''],
  inspectedBy: { name: '', company: '', signature: '' },
  jobLeader: { name: '', company: '', signature: '' },
})

const normalizeSignatory = (value = {}) => ({
  name: text(value?.name),
  company: text(value?.company),
  signature: text(value?.signature),
})

export const normalizeErAssessmentForm = (value = {}, assessmentTypes) => {
  const empty = createEmptyErAssessmentForm()
  const source = value && typeof value === 'object' ? value : {}
  const type = getErAssessmentType(
    source.assessmentType || source.assessmentTypeLabel || source.incidentType,
    assessmentTypes,
  )
  const requirements = type?.requirements || []
  const incoming = Array.isArray(source.responses) ? source.responses : []
  const byRequirement = new Map(
    incoming.flatMap((row) => [
      [text(row?.requirementId), row],
      [text(row?.requirement), row],
    ]),
  )
  const rescueEquipment = (
    Array.isArray(source.rescueEquipment) && source.rescueEquipment.length
      ? source.rescueEquipment
      : ['']
  )
    .map(text)
    .slice(0, 10)
  return {
    ...empty,
    workflowStep: ER_ASSESSMENT_STEPS.some((step) => step.key === source.workflowStep)
      ? source.workflowStep
      : 'setup',
    company: text(source.company),
    assessmentDate: text(source.assessmentDate || source.reportDate || empty.assessmentDate),
    location: text(source.location),
    scopeOfWork: text(source.scopeOfWork || source.details || source.description),
    assessmentType: type?.value || '',
    responses: requirements.map((requirement, index) => {
      const requirementId = text(type?.requirementIds?.[index])
      const isEscapeRoutes = text(requirementId).endsWith(ER_ASSEMBLY_AREA_FIELD_SUFFIX)
      const row =
        byRequirement.get(requirementId) || byRequirement.get(requirement) || incoming[index] || {}
      return {
        requirementId,
        requirement,
        response: text(row?.response),
        remarks: text(row?.remarks),
        assemblyArea: isEscapeRoutes ? text(row?.assemblyArea) : '',
        photos: (Array.isArray(row?.photos) ? row.photos : [])
          .map(normalizePhoto)
          .filter((rowPhoto) => Boolean(rowPhoto?.mediaId || rowPhoto?.url)),
      }
    }),
    rescuePlan: text(source.rescuePlan || source.summary),
    rescueAccessLayout:
      source.rescueAccessLayout && typeof source.rescueAccessLayout === 'object'
        ? source.rescueAccessLayout
        : null,
    rescueEquipment,
    inspectedBy: normalizeSignatory(source.inspectedBy),
    jobLeader: normalizeSignatory(source.jobLeader),
  }
}

export const selectErAssessmentType = (form, assessmentType, assessmentTypes) =>
  normalizeErAssessmentForm({ ...form, assessmentType, responses: [] }, assessmentTypes)

export const toSerializableErAssessmentForm = (form, assessmentTypes) => {
  const normalized = normalizeErAssessmentForm(form, assessmentTypes)
  return {
    ...normalized,
    schemaVersion: ER_ASSESSMENT_SCHEMA_VERSION,
    templateVersion: ER_ASSESSMENT_TEMPLATE_VERSION,
    document: ER_ASSESSMENT_DOCUMENT,
    rescueEquipment: normalized.rescueEquipment.map(text).filter(Boolean),
  }
}

export const isErAssessmentDirty = (form, assessmentTypes) => {
  const value = toSerializableErAssessmentForm(form, assessmentTypes)
  return Boolean(
    value.company ||
      value.location ||
      value.scopeOfWork ||
      value.assessmentType ||
      value.responses.some(
        (row) =>
          row.response ||
          row.remarks ||
          row.assemblyArea ||
          (Array.isArray(row.photos) && row.photos.length > 0),
      ) ||
      value.rescuePlan ||
      value.rescueAccessLayout ||
      value.rescueEquipment.length ||
      value.inspectedBy.name ||
      value.jobLeader.name,
  )
}

export const normalizeErAssessmentRecordToForm = (record) =>
  normalizeErAssessmentForm({ ...record, workflowStep: 'signoff' })
