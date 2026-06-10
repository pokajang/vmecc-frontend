import { dedupePhotos, createInspectionIdentity } from 'src/views/inspection/inspectionSharedUtils'
import { normalizeInspectionDraft } from 'src/views/inspection/utils'

export const INSPECTION_DRAFT_META_KEY = '__inspection'
export const INSPECTION_FORM_VERSION = 'inspection'

export const defaultInspectionForm = {
  selectedLocation: '',
  inspectionType: '',
  description: '',
  photos: [],
}

const normalizePhoto = (photo = {}) => {
  if (!photo || typeof photo !== 'object') return null
  const url = String(photo.url || '').trim()
  if (!url) return null
  return {
    id: String(photo.id || '').trim(),
    fileName: String(photo.fileName || '').trim(),
    description: String(photo.description || ''),
    url,
  }
}

const normalizePhotos = (photos) =>
  dedupePhotos((Array.isArray(photos) ? photos : []).map(normalizePhoto))

const deriveType = (source = {}) =>
  String(
    source.inspectionType ||
      source.incidentType ||
      source.findings?.[0]?.confirmedType ||
      source.findings?.[0]?.type ||
      '',
  ).trim()

const deriveDescription = (source = {}) =>
  String(
    source.description ||
      source.findings?.[0]?.selectedDescription ||
      source.findings?.[0]?.description ||
      '',
  )

const derivePhotos = (source = {}) => {
  const directPhotos = normalizePhotos(source.photos)
  if (directPhotos.length > 0) return directPhotos
  return normalizePhotos(
    (Array.isArray(source.findings) ? source.findings : []).map((finding) => finding?.photo),
  )
}

export const normalizeInspectionForm = (form = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  return {
    selectedLocation: String(source.selectedLocation || '').trim(),
    inspectionType: deriveType(source),
    description: deriveDescription(source),
    photos: derivePhotos(source),
  }
}

export const recordToInspectionForm = (record = {}) => {
  const normalized = normalizeInspectionDraft(record)
  return normalizeInspectionForm({
    selectedLocation: normalized.selectedLocation || normalized.location || '',
    inspectionType: normalized.incidentType || '',
    description: normalized.description || '',
    photos: normalized.photos || [],
    findings: normalized.findings || [],
  })
}

export const draftToInspectionForm = (draft = {}) => {
  const normalized = normalizeInspectionDraft(draft)
  return normalizeInspectionForm({
    selectedLocation: normalized.selectedLocation || normalized.location || '',
    inspectionType: normalized.incidentType || '',
    description: normalized.description || '',
    photos: normalized.photos || [],
    findings: normalized.findings || [],
  })
}

export const buildInspectionPayloadSnapshot = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const inspectionType = String(normalizedForm.inspectionType || '').trim()
  const location = String(normalizedForm.selectedLocation || '').trim()
  const description = String(normalizedForm.description || '').trim()
  const photos = normalizePhotos(normalizedForm.photos)
  const primaryPhoto = photos[0] || null
  const findings =
    inspectionType || location || description
      ? [
          {
            id: 'inspection-summary-finding',
            confirmedType: inspectionType,
            confirmedLocation: location,
            selectedDescription: description,
            type: inspectionType,
            location,
            description,
            photo: primaryPhoto,
            photoId: String(primaryPhoto?.id || '').trim(),
          },
        ]
      : []

  return {
    ...normalizedForm,
    incidentType: inspectionType,
    location,
    selectedLocation: location,
    description,
    photos,
    findings,
  }
}

export const attachInspectionDraftMeta = (payload = {}, context = {}) => ({
  ...(payload && typeof payload === 'object' ? payload : {}),
  [INSPECTION_DRAFT_META_KEY]: {
    formVersion: INSPECTION_FORM_VERSION,
    mode: String(context.mode || '').trim() === 'edit' ? 'edit' : 'new',
    editReportId: String(context.editReportId || '').trim(),
  },
})

export const getInspectionDraftMeta = (payload = {}) => {
  const source = payload?.[INSPECTION_DRAFT_META_KEY]
  return {
    formVersion: String(source?.formVersion || '').trim(),
    mode: String(source?.mode || '').trim() === 'edit' ? 'edit' : 'new',
    editReportId: String(source?.editReportId || '').trim(),
  }
}

export const isInspectionDraftPayload = (payload = {}) =>
  getInspectionDraftMeta(payload).formVersion === INSPECTION_FORM_VERSION

export const buildInspectionDraftPayload = ({ form, mode = 'new', editReportId = '' }) =>
  attachInspectionDraftMeta(
    {
      ...buildInspectionPayloadSnapshot(form),
      savedAt: new Date().toISOString(),
    },
    { mode, editReportId },
  )

const buildBaseInspectionRecord = ({
  form,
  reportTypeSlug = 'inspection',
  reportTypeIdPrefix = 'INS',
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const payloadSnapshot = buildInspectionPayloadSnapshot(form)
  const { id, displayId } = createInspectionIdentity(reportTypeIdPrefix, nowIso, sequence)
  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'inspection',
    status: 'Draft',
    incidentType: payloadSnapshot.incidentType,
    location: payloadSnapshot.location,
    description: payloadSnapshot.description,
    photos: payloadSnapshot.photos,
    findings: payloadSnapshot.findings,
    submittedAt: '',
    submittedBy: '',
    ...(user?.name || user?.email ? { _preparedBy: user?.name || user?.email || '' } : {}),
  }
}

export const buildInspectionReviewRecord = ({
  form,
  mode = 'new',
  editingRecord = null,
  reportTypeSlug = 'inspection',
  reportTypeIdPrefix = 'INS',
  user,
  sequence,
}) => {
  const previewRecord = buildBaseInspectionRecord({
    form,
    reportTypeSlug,
    reportTypeIdPrefix,
    user,
    sequence,
  })

  if (mode !== 'edit') return previewRecord

  return {
    ...previewRecord,
    id: String(editingRecord?.id || '').trim() || previewRecord.id,
    displayId: String(editingRecord?.displayId || '').trim() || previewRecord.displayId,
    ...(editingRecord?.version !== undefined ? { version: editingRecord.version } : {}),
    ...(editingRecord?.revision !== undefined ? { revision: editingRecord.revision } : {}),
  }
}

export const buildInspectionSubmittedRecord = (
  reviewRecord = {},
  user,
  nowIso = new Date().toISOString(),
) => ({
  ...(reviewRecord && typeof reviewRecord === 'object' ? reviewRecord : {}),
  status: 'Submitted',
  submittedAt: nowIso,
  submittedBy: user?.name || user?.email || '',
})

export const isInspectionFormValid = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  return Boolean(
    String(normalizedForm.selectedLocation || '').trim() &&
      String(normalizedForm.inspectionType || '').trim() &&
      String(normalizedForm.description || '').trim() &&
      normalizedForm.photos.length > 0,
  )
}

export const createInspectionFormSignature = (form = {}) =>
  JSON.stringify(buildInspectionPayloadSnapshot(form))

export const selectInspectionInitialForm = ({
  routeMode = 'new',
  routeRecordId = '',
  workspace = null,
  draftPayload = null,
  record = null,
}) => {
  const normalizedRecordId = String(routeRecordId || '').trim()
  const workspaceMode = String(workspace?.mode || '').trim() === 'edit' ? 'edit' : 'new'
  const workspaceRecordId = String(workspace?.recordId || '').trim()

  if (workspace?.form && workspaceMode === routeMode && workspaceRecordId === normalizedRecordId) {
    return { source: 'workspace', form: normalizeInspectionForm(workspace.form) }
  }

  if (isInspectionDraftPayload(draftPayload)) {
    const meta = getInspectionDraftMeta(draftPayload)
    if (meta.mode === routeMode && String(meta.editReportId || '').trim() === normalizedRecordId) {
      return { source: 'draft', form: draftToInspectionForm(draftPayload) }
    }
  }

  if (routeMode === 'edit' && record) {
    return { source: 'record', form: recordToInspectionForm(record) }
  }

  return { source: 'empty', form: normalizeInspectionForm(defaultInspectionForm) }
}
