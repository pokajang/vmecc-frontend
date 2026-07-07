export const createInitialScbaItemModalState = () => ({
  visible: false,
  mode: 'add',
  sectionKey: '',
  rowId: '',
  catalogItemId: '',
  brand: '',
  serialNo: '',
  size: '',
  cylinderType: '',
  equipmentDescription: '',
  error: '',
})

export const createInitialScbaSectionModalState = () => ({
  visible: false,
  mode: 'add',
  sectionKey: '',
  catalogSectionId: '',
  title: '',
  shortLabel: '',
  checksText: '',
  error: '',
})

export const buildAddScbaItemModalState = (sectionKey) => ({
  ...createInitialScbaItemModalState(),
  visible: true,
  sectionKey,
})

export const buildEditScbaItemModalState = (sectionKey, row = {}) => ({
  ...createInitialScbaItemModalState(),
  visible: true,
  mode: 'edit',
  sectionKey,
  rowId: String(row.id || '').trim(),
  catalogItemId: String(row.catalogItemId || row.catalog_item_id || '').trim(),
  brand: String(row.brand || '').trim(),
  serialNo: String(row.serialNo || '').trim(),
  size: String(row.size || '').trim(),
  cylinderType: String(row.cylinderType || '').trim(),
  equipmentDescription: String(row.equipmentDescription || row.description || '').trim(),
})

export const buildAddScbaSectionModalState = () => ({
  ...createInitialScbaSectionModalState(),
  visible: true,
})

export const buildEditScbaSectionModalState = (section = {}) => ({
  ...createInitialScbaSectionModalState(),
  visible: true,
  mode: 'edit',
  sectionKey: String(section.key || '').trim(),
  catalogSectionId: String(section.catalogSectionId || section.catalog_section_id || '').trim(),
  title: String(section.title || '').trim(),
  shortLabel: String(section.shortLabel || '').trim(),
  checksText: (section.fields || []).map((field) => field.label).join('\n'),
})

export const buildClosedScbaModalState = (current) => ({
  ...current,
  visible: false,
  error: '',
})

export const getScbaItemModalError = (modal = {}) => {
  const sectionKey = String(modal.sectionKey || '').trim()
  const brand = String(modal.brand || '').trim()
  const serialNo = String(modal.serialNo || '').trim()
  if (!sectionKey || (!brand && !serialNo)) {
    return 'Enter at least a brand or serial number.'
  }
  return ''
}

export const parseScbaSectionLabels = (checksText = '') =>
  String(checksText || '')
    .split(/\n|,/)
    .map((label) => label.trim())
    .filter(Boolean)

export const getScbaSectionModalError = (title, labels = []) =>
  !String(title || '').trim() || !Array.isArray(labels) || labels.length === 0
    ? 'Enter a section title and at least one check.'
    : ''

export const buildScbaSectionFields = ({
  labels = [],
  editingSection,
  slugSegment,
  customFieldKeyFromLabel,
}) => {
  const uniqueLabels = Array.from(new Set(Array.isArray(labels) ? labels : []))
  const existingKeysByLabel = new Map(
    (editingSection?.fields || []).map((field) => [
      slugSegment(field.label),
      String(field.key || '').trim(),
    ]),
  )

  return uniqueLabels.map((label) => ({
    key: existingKeysByLabel.get(slugSegment(label)) || customFieldKeyFromLabel(label),
    label,
    kind: 'status',
  }))
}

export const buildScbaCustomSectionKey = ({
  savedSection,
  modal,
  editingSection,
  title,
  slugSegment,
  uid,
}) =>
  savedSection?.key ||
  (modal?.mode === 'edit' && editingSection?.key
    ? editingSection.key
    : `customScba-${slugSegment(title)}-${uid()}`)

export const buildNextScbaCustomSection = ({
  editingSection,
  savedSection,
  sectionKey,
  title,
  shortLabel,
  fields,
}) => ({
  ...(editingSection || {}),
  ...(savedSection || {}),
  id: savedSection?.id || editingSection?.id || sectionKey,
  catalogSectionId: savedSection?.catalogSectionId || editingSection?.catalogSectionId || '',
  key: sectionKey,
  title: savedSection?.title || title,
  shortLabel: savedSection?.shortLabel || shortLabel,
  isCustomSection: true,
  fields: savedSection?.fields || fields,
  rows: (editingSection?.rows || []).map((row) => ({
    ...row,
    sectionKey,
    catalogSectionId: savedSection?.catalogSectionId || row.catalogSectionId || '',
  })),
})

export const upsertScbaRowsById = (rows = [], nextRow, ids = []) => {
  const blockedIds = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '')))
  return [
    nextRow,
    ...(Array.isArray(rows) ? rows : []).filter((row) => !blockedIds.has(String(row?.id || ''))),
  ]
}

export const buildScbaRemovedMeta = (user) => ({
  removed: true,
  removedAt: new Date().toISOString(),
  removedBy: String(user?.name || user?.email || user?.id || '').trim(),
})

export const scbaRowHasInspectionData = (row = {}, fields = [], getScbaFieldEvidenceKeys) => {
  if (String(row.remarks || '').trim() || (Array.isArray(row.photos) && row.photos.length > 0)) {
    return true
  }

  return (Array.isArray(fields) ? fields : []).some((field) => {
    if (String(row[field.key] || '').trim()) return true
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    return (
      String(row[remarksKey] || '').trim() ||
      (Array.isArray(row[photosKey]) && row[photosKey].length > 0)
    )
  })
}

export const buildScbaRemoveItemTarget = (sectionKey, row = {}, hasData) => {
  const rowId = String(row.id || '').trim()
  if (!rowId || row.isCustomEquipment !== true) return null
  return {
    type: 'item',
    sectionKey,
    row,
    message: hasData
      ? 'This item has checks, remarks, or photos. Remove it from this inspection?'
      : 'Remove this item from this inspection?',
  }
}

export const markScbaRowRemoved = (row, removedMeta, rowId) =>
  String(row?.id || '') === String(rowId || '') ? { ...row, ...removedMeta } : row

export const restoreScbaRow = (row, rowId) =>
  String(row?.id || '') === String(rowId || '')
    ? {
        ...row,
        removed: false,
        removedAt: '',
        removedBy: '',
        removedReason: '',
      }
    : row

export const buildScbaRemoveSectionTarget = (section = {}, hasData) => {
  const sectionKey = String(section.key || '').trim()
  if (!sectionKey || section.isCustomSection !== true) return null
  return {
    type: 'section',
    section,
    message: hasData
      ? 'This section contains items or inspection evidence. Remove it from this inspection?'
      : 'Remove this section from this inspection?',
  }
}

export const markScbaSectionRemoved = (section, sectionKey, removedMeta) =>
  section.key === sectionKey
    ? {
        ...section,
        ...removedMeta,
        rows: (section.rows || []).map((row) => ({ ...row, ...removedMeta })),
      }
    : section

export const restoreScbaSection = (section, sectionKey) =>
  section.key === sectionKey
    ? {
        ...section,
        removed: false,
        removedAt: '',
        removedBy: '',
        removedReason: '',
        rows: (section.rows || []).map((row) => ({
          ...row,
          removed: false,
          removedAt: '',
          removedBy: '',
          removedReason: '',
        })),
      }
    : section

export const buildScbaArchiveSectionTarget = (section = {}) =>
  !section?.catalogSectionId
    ? null
    : {
        type: 'section',
        section,
        message: 'Archive this for future inspections? Previous reports are unchanged.',
      }

export const buildScbaArchiveItemTarget = (sectionKey, row = {}) =>
  !row?.catalogItemId
    ? null
    : {
        type: 'item',
        sectionKey,
        row,
        message: 'Archive this for future inspections? Previous reports are unchanged.',
      }
