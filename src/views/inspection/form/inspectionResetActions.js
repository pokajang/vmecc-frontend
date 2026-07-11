import { getScbaFieldEvidenceKeys } from '../types/scba/helpers'

const text = (value) => String(value || '').trim()

const hasPhotos = (value) => Array.isArray(value) && value.some(Boolean)

const hasText = (value) => text(value) !== ''

const hasAny = (row = {}, keys = []) => keys.some((key) => hasText(row?.[key]))

const hasAnyPhotos = (row = {}, keys = []) => keys.some((key) => hasPhotos(row?.[key]))

const buildFieldResetPatch = (fields = []) =>
  (Array.isArray(fields) ? fields : []).reduce((patch, field) => {
    if (!field?.key) return patch
    patch[field.key] = ''
    if (field.remarksKey) patch[field.remarksKey] = ''
    if (field.photosKey) patch[field.photosKey] = []
    return patch
  }, {})

export const getInspectionRowLabel = (row = {}, fallback = 'this row') => {
  const source = row || {}
  return (
    text(
      source.idLocNo ||
        source.equipment ||
        source.barcodeNo ||
        source.serialNo ||
        source.brand ||
        source.plateNo ||
        source.rowNumber ||
        source.label,
    ) || fallback
  )
}

export const buildFireExtinguisherResetPatch = (fields = []) => ({
  remarks: '',
  photos: [],
  sessionResult: null,
  sessionStatus: '',
  sessionCheckedBy: '',
  sessionCheckedAt: null,
  sessionResultVersion: null,
  sessionSyncPending: false,
  ...buildFieldResetPatch(fields),
})

export const hasFireExtinguisherInspectionData = (row = {}, fields = []) =>
  hasAny(row, ['remarks']) ||
  hasAnyPhotos(row, ['photos']) ||
  (Array.isArray(fields) ? fields : []).some(
    (field) =>
      hasText(row?.[field.key]) ||
      hasText(row?.[field.remarksKey]) ||
      hasPhotos(row?.[field.photosKey]),
  )

export const buildHydraulicResetPatch = (fields = []) => ({
  remarks: '',
  photos: [],
  ...buildFieldResetPatch(fields),
})

export const hasHydraulicInspectionData = (row = {}, fields = []) =>
  hasAny(row, ['remarks']) ||
  hasAnyPhotos(row, ['photos']) ||
  (Array.isArray(fields) ? fields : []).some(
    (field) =>
      hasText(row?.[field.key]) ||
      hasText(row?.[field.remarksKey]) ||
      hasPhotos(row?.[field.photosKey]),
  )

export const buildErAuxResetPatch = (row = {}) => ({
  quantity: text(row.defaultQuantity),
  condition: '',
  remarks: '',
  defectRemarks: '',
  additionalNotes: '',
  defectPhotos: [],
  photos: [],
})

export const hasErAuxInspectionData = (row = {}) =>
  (hasText(row.quantity) && text(row.quantity) !== text(row.defaultQuantity)) ||
  hasAny(row, ['condition', 'remarks', 'defectRemarks', 'additionalNotes']) ||
  hasAnyPhotos(row, ['defectPhotos', 'photos'])

export const buildHighAngleResetPatch = () => ({
  condition: '',
  remarks: '',
  conditionRemarks: '',
  conditionPhotos: [],
  additionalNotes: '',
  additionalPhotos: [],
})

export const hasHighAngleInspectionData = (row = {}) =>
  hasAny(row, ['condition', 'remarks', 'conditionRemarks', 'additionalNotes']) ||
  hasAnyPhotos(row, ['conditionPhotos', 'additionalPhotos'])

export const buildFrtResetPatch = (row = {}) => ({
  ...(text(row.checklistKind) === 'oneOff' ? { condition: '' } : { status: '', readingValue: '' }),
  remarks: '',
  photos: [],
  additionalNotes: '',
  additionalPhotos: [],
})

export const hasFrtInspectionData = (row = {}) =>
  hasAny(row, ['status', 'readingValue', 'condition', 'remarks', 'additionalNotes']) ||
  hasAnyPhotos(row, ['photos', 'additionalPhotos'])

export const buildScbaResetPatch = (fields = []) => ({
  remarks: '',
  photos: [],
  ...(Array.isArray(fields) ? fields : []).reduce((patch, field) => {
    if (!field?.key) return patch
    patch[field.key] = ''
    if (field.kind === 'status') {
      const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
      patch[remarksKey] = ''
      patch[photosKey] = []
    }
    return patch
  }, {}),
})

export const hasScbaInspectionData = (row = {}, fields = []) =>
  hasAny(row, ['remarks']) ||
  hasAnyPhotos(row, ['photos']) ||
  (Array.isArray(fields) ? fields : []).some((field) => {
    if (!field?.key) return false
    if (hasText(row?.[field.key])) return true
    if (field.kind !== 'status') return false
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    return hasText(row?.[remarksKey]) || hasPhotos(row?.[photosKey])
  })
