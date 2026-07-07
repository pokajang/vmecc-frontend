import { calculateFireExtinguisherDaysLeft } from '../domain/fireExtinguisherDateUtils'
import { getFireExtinguisherCanonicalAssetKey } from '../types/fire-extinguisher/identity'

export const buildHydraulicFillBlankOkPatch = (check = {}, hydraulicCheckFields = []) =>
  (Array.isArray(hydraulicCheckFields) ? hydraulicCheckFields : []).reduce((next, field) => {
    if (!String(check?.[field.key] || '').trim()) next[field.key] = 'OK'
    return next
  }, {})

export const buildHighAngleFillBlankGoodPatch = (check = {}, goodStatus = 'Good') =>
  String(check?.condition || '').trim() ? {} : { condition: goodStatus }

export const buildScbaFillBlankGoodPatch = (sectionFields = [], check = {}, goodStatus = 'Good') =>
  (Array.isArray(sectionFields) ? sectionFields : []).reduce((patch, field) => {
    if (field.kind === 'status' && !String(check?.[field.key] || '').trim()) {
      patch[field.key] = goodStatus
    }
    return patch
  }, {})

export const buildErAuxCheckRow = (row, existing = {}, patch = {}) => ({
  id: String(row?.id || existing?.id || '').trim(),
  location: String(row?.location || existing?.location || '').trim(),
  mainLocation: String(
    row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
  ).trim(),
  equipment: String(row?.equipment || existing?.equipment || '').trim(),
  equipmentId: row?.equipmentId ?? existing?.equipmentId ?? '',
  equipmentKey: String(row?.equipmentKey || existing?.equipmentKey || '').trim(),
  equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
  equipmentDescription: String(
    row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
  ).trim(),
  defaultQuantity: String(row?.defaultQuantity || existing?.defaultQuantity || '').trim(),
  isCustomEquipment: row?.isCustomEquipment === true || existing?.isCustomEquipment === true,
  quantity: String(existing?.quantity ?? row?.quantity ?? row?.defaultQuantity ?? ''),
  condition: String(existing?.condition || ''),
  remarks: String(existing?.remarks || existing?.remark || ''),
  defectRemarks: String(existing?.defectRemarks || existing?.defect_remarks || ''),
  additionalNotes: String(existing?.additionalNotes || existing?.additional_notes || ''),
  defectPhotos: Array.isArray(existing?.defectPhotos)
    ? existing.defectPhotos
    : Array.isArray(existing?.defect_photos)
      ? existing.defect_photos
      : [],
  photos: Array.isArray(existing?.photos) ? existing.photos : [],
  ...patch,
})

export const buildHydraulicCheckRow = (
  row,
  existing = {},
  patch = {},
  hydraulicCheckFields = [],
) => ({
  id: String(row?.id || existing?.id || '').trim(),
  location: String(row?.location || existing?.location || '').trim(),
  mainLocation: String(
    row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
  ).trim(),
  equipment: String(row?.equipment || existing?.equipment || '').trim(),
  equipmentId: row?.equipmentId ?? existing?.equipmentId ?? '',
  equipmentKey: String(row?.equipmentKey || existing?.equipmentKey || '').trim(),
  equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
  equipmentDescription: String(
    row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
  ).trim(),
  isCustomEquipment: row?.isCustomEquipment === true || existing?.isCustomEquipment === true,
  physicalCondition: String(existing?.physicalCondition || ''),
  mechanicalCondition: String(existing?.mechanicalCondition || ''),
  noLeakage: String(existing?.noLeakage || ''),
  functionTest: String(existing?.functionTest || ''),
  remarks: String(existing?.remarks || ''),
  photos: Array.isArray(existing?.photos) ? existing.photos : [],
  ...(Array.isArray(hydraulicCheckFields) ? hydraulicCheckFields : []).reduce((next, field) => {
    next[field.remarksKey] = String(existing?.[field.remarksKey] || '')
    next[field.photosKey] = Array.isArray(existing?.[field.photosKey])
      ? existing[field.photosKey]
      : []
    return next
  }, {}),
  ...patch,
})

export const buildFireExtinguisherCheckRow = (
  row,
  existing = {},
  patch = {},
  fireExtinguisherCheckFields = [],
  context = {},
) => {
  const catalogId = row?.catalogId ?? existing?.catalogId ?? ''
  const activeIdentityKey = String(
    row?.activeIdentityKey || existing?.activeIdentityKey || '',
  ).trim()
  const mainLocation = String(
    row?.mainLocation || existing?.mainLocation || context.mainLocation || '',
  ).trim()
  const subLocation = String(row?.subLocation || existing?.subLocation || '').trim()
  const idLocNo = String(row?.idLocNo || existing?.idLocNo || '').trim()
  const barcodeNo = String(row?.barcodeNo || existing?.barcodeNo || '').trim()

  return {
    id: String(row?.id || existing?.id || '').trim(),
    catalogId,
    canonicalAssetKey: getFireExtinguisherCanonicalAssetKey({
      ...existing,
      ...row,
      catalogId,
      activeIdentityKey,
      mainLocation,
      subLocation,
      idLocNo,
      barcodeNo,
    }),
    activeIdentityKey,
    sourceRowNumber: String(row?.sourceRowNumber || existing?.sourceRowNumber || '').trim(),
    equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
    zone: String(row?.zone || existing?.zone || context.zone || '').trim(),
    mainLocation,
    subLocation,
    location: mainLocation,
    locationPath: [mainLocation, subLocation].filter(Boolean),
    idLocNo,
    barcodeNo,
    feType: String(row?.feType || existing?.feType || '')
      .trim()
      .replace(/CO[\u00b2\ufffd]/gi, 'CO2'),
    certificationValidity: String(
      row?.certificationValidity || existing?.certificationValidity || '',
    ).trim(),
    daysLeftToExpire: calculateFireExtinguisherDaysLeft(
      row?.certificationValidity || existing?.certificationValidity || '',
    ),
    remarks: String(existing?.remarks || '').trim(),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...(Array.isArray(fireExtinguisherCheckFields) ? fireExtinguisherCheckFields : []).reduce(
      (next, field) => {
        next[field.key] = String(existing?.[field.key] || '')
        next[field.remarksKey] = String(existing?.[field.remarksKey] || '')
        next[field.photosKey] = Array.isArray(existing?.[field.photosKey])
          ? existing[field.photosKey]
          : []
        return next
      },
      {},
    ),
    ...patch,
  }
}

export const buildScbaCheckRow = (sectionKey, row, existing = {}, patch = {}) => {
  const base = {
    id: String(row?.id || existing?.id || '').trim(),
    catalogItemId: row?.catalogItemId ?? existing?.catalogItemId ?? '',
    catalogSectionId: row?.catalogSectionId ?? existing?.catalogSectionId ?? '',
    sectionKey,
    location: String(row?.location || existing?.location || '').trim(),
    mainLocation: String(
      row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
    ).trim(),
    brand: String(row?.brand || existing?.brand || '').trim(),
    serialNo: String(row?.serialNo || existing?.serialNo || '').trim(),
    size: String(row?.size || existing?.size || '').trim(),
    cylinderType: String(row?.cylinderType || existing?.cylinderType || '').trim(),
    equipmentDescription: String(
      row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
    ).trim(),
    equipmentSource: String(existing?.equipmentSource || row?.equipmentSource || 'seed').trim(),
    isCustomEquipment: row?.isCustomEquipment === true || existing?.isCustomEquipment === true,
    removed: existing?.removed === true || row?.removed === true,
    removedAt: String(existing?.removedAt || row?.removedAt || '').trim(),
    removedBy: String(existing?.removedBy || row?.removedBy || '').trim(),
    removedReason: String(existing?.removedReason || row?.removedReason || '').trim(),
    remarks: String(existing?.remarks || ''),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
  }

  Object.keys(existing || {}).forEach((key) => {
    if (!(key in base)) base[key] = existing[key]
  })

  return {
    ...base,
    ...patch,
  }
}

export const buildHighAngleCheckRow = (row, existing = {}, patch = {}, context = {}) => ({
  id: String(row?.id || existing?.id || '').trim(),
  rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
  mainLocation: String(
    row?.mainLocation || existing?.mainLocation || context.mainLocation || '',
  ).trim(),
  location: String(row?.location || existing?.location || '').trim(),
  subLocation: String(row?.subLocation || existing?.subLocation || '').trim(),
  equipment: String(row?.equipment || existing?.equipment || '').trim(),
  quantity: String(row?.quantity || existing?.quantity || '').trim(),
  equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
  isWorkbookSeedRow: row?.isWorkbookSeedRow === true || existing?.isWorkbookSeedRow === true,
  isExtensionRow:
    row?.isExtensionRow === true ||
    existing?.isExtensionRow === true ||
    String(row?.equipmentSource || existing?.equipmentSource || '').trim() === 'custom',
  condition: String(existing?.condition || ''),
  remarks: String(existing?.remarks || ''),
  conditionRemarks: String(
    existing?.conditionRemarks || existing?.condition_remarks || existing?.remarks || '',
  ),
  conditionPhotos: Array.isArray(existing?.conditionPhotos)
    ? existing.conditionPhotos
    : Array.isArray(existing?.condition_photos)
      ? existing.condition_photos
      : [],
  additionalNotes: String(existing?.additionalNotes || existing?.additional_notes || ''),
  additionalPhotos: Array.isArray(existing?.additionalPhotos)
    ? existing.additionalPhotos
    : Array.isArray(existing?.additional_photos)
      ? existing.additional_photos
      : [],
  ...patch,
})

export const buildFrtDailyCheckRow = (row, existing = {}, patch = {}) => ({
  id: String(row?.id || existing?.id || '').trim(),
  checklistKind: 'daily',
  rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
  mainLocation: 'FIRE TRUCK',
  location: String(row?.location || existing?.location || '').trim(),
  compartment: String(row?.compartment || existing?.compartment || row?.location || '').trim(),
  equipment: String(row?.equipment || existing?.equipment || '').trim(),
  quantity: String(row?.quantity || existing?.quantity || '').trim(),
  rowKind: String(row?.rowKind || existing?.rowKind || 'status').trim() || 'status',
  status: String(existing?.status || ''),
  readingValue: String(existing?.readingValue || ''),
  remarks: String(existing?.remarks || ''),
  photos: Array.isArray(existing?.photos) ? existing.photos : [],
  additionalNotes: String(existing?.additionalNotes || existing?.additional_notes || ''),
  additionalPhotos: Array.isArray(existing?.additionalPhotos)
    ? existing.additionalPhotos
    : Array.isArray(existing?.additional_photos)
      ? existing.additional_photos
      : [],
  ...patch,
})

export const buildFrtOneOffCheckRow = (row, existing = {}, patch = {}) => ({
  id: String(row?.id || existing?.id || '').trim(),
  checklistKind: 'oneOff',
  rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
  mainLocation: 'FIRE TRUCK',
  location: String(row?.location || existing?.location || '').trim(),
  compartment: String(row?.compartment || existing?.compartment || row?.location || '').trim(),
  equipment: String(row?.equipment || existing?.equipment || '').trim(),
  condition: String(existing?.condition || ''),
  remarks: String(existing?.remarks || ''),
  photos: Array.isArray(existing?.photos) ? existing.photos : [],
  additionalNotes: String(existing?.additionalNotes || existing?.additional_notes || ''),
  additionalPhotos: Array.isArray(existing?.additionalPhotos)
    ? existing.additionalPhotos
    : Array.isArray(existing?.additional_photos)
      ? existing.additional_photos
      : [],
  ...patch,
})
