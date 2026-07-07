import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import {
  SCBA_BACK_PLATE_FIELDS,
  SCBA_CYLINDER_FIELDS,
  SCBA_FACE_MASK_FIELDS,
  SCBA_SECTION_DEFINITIONS,
} from './scbaReference'

export {
  SCBA_BACK_PLATE_FIELDS,
  SCBA_CYLINDER_FIELDS,
  SCBA_FACE_MASK_FIELDS,
  SCBA_SECTION_DEFINITIONS,
} from './scbaReference'

export const SCBA_INSPECTION_TYPE = 'SCBA Inspection'

export const SCBA_STATUS_OPTIONS = [
  { value: 'Good', label: 'Good' },
  { value: 'Not Good', label: 'Not Good' },
]

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

export const getScbaFieldEvidenceKeys = (field = {}) => ({
  remarksKey: `${field.key}Remarks`,
  photosKey: `${field.key}Photos`,
})

const fieldMapBySection = {
  backPlate: SCBA_BACK_PLATE_FIELDS,
  cylinder: SCBA_CYLINDER_FIELDS,
  faceMask: SCBA_FACE_MASK_FIELDS,
}

const sectionTitleByKey = Object.fromEntries(
  SCBA_SECTION_DEFINITIONS.map((section) => [section.key, section.title]),
)

const sectionShortLabelByKey = Object.fromEntries(
  SCBA_SECTION_DEFINITIONS.map((section) => [section.key, section.shortLabel]),
)

const sectionKeyByField = Object.entries(fieldMapBySection).reduce((next, [sectionKey, fields]) => {
  fields.forEach((field) => {
    next[field.key] = sectionKey
  })
  return next
}, {})

const normalizeScbaStatus = (value) => {
  const text = String(value || '').trim()
  const option = SCBA_STATUS_OPTIONS.find((row) => row.value.toLowerCase() === text.toLowerCase())
  return option?.value || ''
}

const toSeedMap = (rows) => new Map(rows.map((row) => [String(row.id || '').trim(), row]))

const getRowLabel = (row = {}) => {
  const serialNo = String(row.serialNo || '').trim()
  const brand = String(row.brand || '').trim()
  if (serialNo && brand) return `${brand} ${serialNo}`
  return serialNo || brand || 'SCBA item'
}

const toSnakeKey = (value = '') =>
  String(value || '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()

const normalizeScbaRow = (item = {}, sectionOrKey) => {
  if (!item || typeof item !== 'object') return null
  const section =
    typeof sectionOrKey === 'string'
      ? SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === sectionOrKey)
      : sectionOrKey
  if (!section) return null
  const sectionKey = String(section.key || '').trim()
  if (!sectionKey) return null

  const location = String(item.location || item.mainLocation || item.main_location || '').trim()
  const brand = String(item.brand || '').trim()
  const serialNo = String(item.serialNo || item.serial_no || item.serialNumber || '').trim()
  const fallbackId = `${sectionKey}:${slugSegment(location)}:${slugSegment(brand)}:${slugSegment(serialNo)}`
  const normalized = {
    ...item,
    id: String(item.id || fallbackId).trim(),
    catalogItemId: item.catalogItemId || item.catalog_item_id || '',
    catalogSectionId: item.catalogSectionId || item.catalog_section_id || '',
    sectionKey,
    location,
    mainLocation: String(item.mainLocation || item.main_location || location).trim(),
    brand,
    serialNo,
    size: String(item.size || '').trim(),
    cylinderType: String(item.cylinderType || item.cylinder_type || item.type || '').trim(),
    equipmentDescription: String(
      item.equipmentDescription || item.equipment_description || item.description || '',
    ).trim(),
    equipmentSource: String(item.equipmentSource || item.equipment_source || '').trim(),
    isCustomEquipment: item.isCustomEquipment === true || item.is_custom_equipment === true,
    removed: item.removed === true || item.is_removed === true,
    removedAt: String(item.removedAt || item.removed_at || '').trim(),
    removedBy: String(item.removedBy || item.removed_by || '').trim(),
    removedReason: String(item.removedReason || item.removed_reason || '').trim(),
    remarks: String(item.remarks || item.remark || '').trim(),
    photos: normalizePhotos(item.photos),
  }

  ;(section.fields || []).forEach((field) => {
    const snakeKey = toSnakeKey(field.key)
    normalized[field.key] =
      field.kind === 'status'
        ? normalizeScbaStatus(item[field.key] || item[snakeKey])
        : String(item[field.key] || item[snakeKey] || '').trim()
    if (field.kind === 'status') {
      const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
      const snakeRemarksKey = toSnakeKey(remarksKey)
      const snakePhotosKey = toSnakeKey(photosKey)
      normalized[remarksKey] = String(
        item[remarksKey] ||
          item[snakeRemarksKey] ||
          (normalizeScbaStatus(item[field.key] || item[snakeKey]) === 'Not Good'
            ? item.remarks || item.remark || ''
            : ''),
      ).trim()
      normalized[photosKey] = normalizePhotos(item[photosKey] || item[snakePhotosKey])
    }
  })

  return normalized
}

const normalizeScbaSectionChecks = (checks, sectionKey) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((item) => {
    const normalized = normalizeScbaRow(item, sectionKey)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const normalizeScbaBackPlateChecks = (checks) =>
  normalizeScbaSectionChecks(checks, 'backPlate')

export const normalizeScbaCylinderChecks = (checks) =>
  normalizeScbaSectionChecks(checks, 'cylinder')

export const normalizeScbaFaceMaskChecks = (checks) =>
  normalizeScbaSectionChecks(checks, 'faceMask')

const normalizeCustomScbaFields = (fields = []) => {
  const used = new Set()
  return (Array.isArray(fields) ? fields : [])
    .map((field, index) => {
      const label = String(field?.label || field?.name || field || '').trim()
      if (!label) return null
      const providedKey = String(field?.key || '').trim()
      const baseKey = slugSegment(providedKey || label) || `check-${index + 1}`
      let key =
        providedKey && /^[a-z][a-zA-Z0-9]*$/.test(providedKey)
          ? providedKey
          : baseKey.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())
      let suffix = 2
      while (used.has(key)) {
        key = `${baseKey}${suffix}`.replace(/-([a-z0-9])/g, (_, character) =>
          character.toUpperCase(),
        )
        suffix += 1
      }
      used.add(key)
      return {
        key,
        label,
        kind: 'status',
      }
    })
    .filter(Boolean)
}

export const normalizeScbaCustomSections = (sections = []) => {
  const usedSectionKeys = new Set(SCBA_SECTION_DEFINITIONS.map((section) => section.key))
  return (Array.isArray(sections) ? sections : [])
    .map((section, index) => {
      if (!section || typeof section !== 'object') return null
      const title = String(section.title || section.name || '').trim()
      const fields = normalizeCustomScbaFields(section.fields || section.checks || [])
      if (!title || fields.length === 0) return null
      const providedKey = String(section.key || '').trim()
      const baseKey = slugSegment(providedKey || section.id || title) || `custom-${index + 1}`
      let key = providedKey || `customScba-${baseKey}`
      let suffix = 2
      while (usedSectionKeys.has(key)) {
        key = providedKey ? `${providedKey}-${suffix}` : `customScba-${baseKey}-${suffix}`
        suffix += 1
      }
      usedSectionKeys.add(key)
      const normalizedSection = {
        id: String(section.id || key).trim(),
        catalogSectionId: section.catalogSectionId || section.catalog_section_id || '',
        key,
        title,
        shortLabel: String(section.shortLabel || section.short_label || title).trim(),
        isCustomSection: true,
        source: String(section.source || 'custom').trim() || 'custom',
        canEdit: section.canEdit !== false,
        canDelete: section.canDelete !== false,
        removed: section.removed === true || section.is_removed === true,
        removedAt: String(section.removedAt || section.removed_at || '').trim(),
        removedBy: String(section.removedBy || section.removed_by || '').trim(),
        removedReason: String(section.removedReason || section.removed_reason || '').trim(),
        fields,
        rows: [],
      }
      normalizedSection.rows = (Array.isArray(section.rows) ? section.rows : [])
        .map((row) => normalizeScbaRow(row, normalizedSection))
        .filter(Boolean)
        .map((row) => ({
          ...row,
          catalogSectionId: row.catalogSectionId || normalizedSection.catalogSectionId || '',
          sectionKey: key,
          equipmentSource: row.equipmentSource || 'custom',
          isCustomEquipment: true,
          label: getRowLabel(row),
        }))
      return normalizedSection
    })
    .filter(Boolean)
}

const getMainLocation = (form = {}) =>
  String(form.mainLocation || form.main_location || form.selectedLocation || form.location || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)[0] || ''

const getScbaSectionChecks = (form = {}, sectionKey) => {
  if (sectionKey === 'backPlate') {
    return normalizeScbaBackPlateChecks(form.scbaBackPlateChecks || form.scba_back_plate_checks)
  }
  if (sectionKey === 'cylinder') {
    return normalizeScbaCylinderChecks(form.scbaCylinderChecks || form.scba_cylinder_checks)
  }
  return normalizeScbaFaceMaskChecks(form.scbaFaceMaskChecks || form.scba_face_mask_checks)
}

const getCustomScbaSectionChecks = (form = {}, sectionKey) => {
  const section = normalizeScbaCustomSections(
    form.scbaCustomSections || form.scba_custom_sections,
  ).find((entry) => entry.key === sectionKey)
  return section?.rows || []
}

export const isScbaInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(SCBA_INSPECTION_TYPE)

const isScbaRowComplete = (row = {}, fields = []) =>
  fields.every((field) => String(row?.[field.key] || '').trim())

const getScbaRowIssueFields = (row = {}, fields = []) =>
  fields.filter(
    (field) => field.kind === 'status' && normalizeScbaStatus(row?.[field.key]) === 'Not Good',
  )

export const getScbaRowRetainedEvidenceFields = (row = {}, fields = []) =>
  fields.filter((field) => {
    if (field.kind !== 'status') return false
    if (normalizeScbaStatus(row?.[field.key]) === 'Not Good') return false
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    return String(row?.[remarksKey] || '').trim() || normalizePhotos(row?.[photosKey]).length > 0
  })

const getScbaIncompleteIssueEvidenceCount = (row = {}, fields = []) =>
  getScbaRowIssueFields(row, fields).filter((field) => {
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    return !String(row?.[remarksKey] || '').trim() || normalizePhotos(row?.[photosKey]).length === 0
  }).length

const buildVisibleSection = (section, form) => {
  const mainLocation = getMainLocation(form)
  if (section.isCustomSection) {
    const currentChecks = getCustomScbaSectionChecks(form, section.key)
    const visibleRows = currentChecks
      .filter((row) => {
        if (row.removed === true) return false
        const rowLocation = String(row.location || row.mainLocation || '').trim()
        return !rowLocation || normalizeKey(rowLocation) === normalizeKey(mainLocation)
      })
      .map((row) => ({
        ...row,
        sectionKey: section.key,
        label: getRowLabel(row),
        equipmentSource: row.equipmentSource || 'custom',
        isCustomEquipment: true,
        isWorkbookSeedRow: false,
        isExtensionRow: true,
      }))

    const checkedCount = visibleRows.filter((row) => isScbaRowComplete(row, section.fields)).length
    const issueCount = visibleRows.reduce(
      (count, row) => count + getScbaRowIssueFields(row, section.fields).length,
      0,
    )
    const incompleteRemarksCount = visibleRows.filter(
      (row) => getScbaIncompleteIssueEvidenceCount(row, section.fields) > 0,
    ).length
    const incompletePhotoCount = visibleRows.reduce(
      (count, row) => count + getScbaIncompleteIssueEvidenceCount(row, section.fields),
      0,
    )
    const retainedEvidenceCount = visibleRows.reduce(
      (count, row) => count + getScbaRowRetainedEvidenceFields(row, section.fields).length,
      0,
    )

    return {
      ...section,
      visibleRows,
      checkedCount,
      issueCount,
      incompleteRemarksCount,
      incompletePhotoCount,
      retainedEvidenceCount,
    }
  }

  const seededRows = section.rows.filter(
    (row) => normalizeKey(row.location || row.mainLocation) === normalizeKey(mainLocation),
  )
  const seededById = toSeedMap(seededRows)
  const currentChecks = getScbaSectionChecks(form, section.key)
  const currentById = new Map(currentChecks.map((row) => [String(row.id || ''), row]))

  const visibleRows = seededRows.map((row) => {
    const current = currentById.get(String(row.id || '')) || {}
    return {
      ...row,
      ...current,
      id: row.id,
      sectionKey: section.key,
      location: row.location,
      mainLocation: row.mainLocation,
      brand: current.brand || row.brand,
      serialNo: current.serialNo || row.serialNo,
      size: current.size || row.size || '',
      cylinderType: current.cylinderType || row.cylinderType || '',
      label: getRowLabel({ ...row, ...current }),
      isWorkbookSeedRow: true,
      isExtensionRow: false,
    }
  })

  currentById.forEach((row) => {
    if (
      row.removed !== true &&
      normalizeKey(row.location || row.mainLocation) === normalizeKey(mainLocation) &&
      !seededById.has(String(row.id || ''))
    ) {
      visibleRows.push({
        ...row,
        sectionKey: section.key,
        label: getRowLabel(row),
        isWorkbookSeedRow: false,
        isExtensionRow: true,
      })
    }
  })

  const checkedCount = visibleRows.filter((row) => isScbaRowComplete(row, section.fields)).length
  const issueCount = visibleRows.reduce(
    (count, row) => count + getScbaRowIssueFields(row, section.fields).length,
    0,
  )
  const incompleteRemarksCount = visibleRows.filter(
    (row) => getScbaIncompleteIssueEvidenceCount(row, section.fields) > 0,
  ).length
  const incompletePhotoCount = visibleRows.reduce(
    (count, row) => count + getScbaIncompleteIssueEvidenceCount(row, section.fields),
    0,
  )
  const retainedEvidenceCount = visibleRows.reduce(
    (count, row) => count + getScbaRowRetainedEvidenceFields(row, section.fields).length,
    0,
  )

  return {
    ...section,
    visibleRows,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
    incompletePhotoCount,
    retainedEvidenceCount,
  }
}

export const getScbaVisibleSections = (form = {}) => [
  ...SCBA_SECTION_DEFINITIONS.map((section) => buildVisibleSection(section, form)).filter(
    (section) => section.visibleRows.length > 0,
  ),
  ...normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections)
    .filter((section) => section.removed !== true)
    .map((section) => buildVisibleSection(section, form)),
]

export const getScbaCheckSummary = (form = {}) => {
  const visibleSections = getScbaVisibleSections(form)
  const visibleRows = visibleSections.flatMap((section) =>
    section.visibleRows.map((row) => ({ ...row, sectionKey: section.key })),
  )

  return {
    totalCount: visibleRows.length,
    checkedCount: visibleSections.reduce((count, section) => count + section.checkedCount, 0),
    issueCount: visibleSections.reduce((count, section) => count + section.issueCount, 0),
    incompleteRemarksCount: visibleSections.reduce(
      (count, section) => count + section.incompleteRemarksCount,
      0,
    ),
    incompletePhotoCount: visibleSections.reduce(
      (count, section) => count + section.incompletePhotoCount,
      0,
    ),
    retainedEvidenceCount: visibleSections.reduce(
      (count, section) => count + section.retainedEvidenceCount,
      0,
    ),
    visibleChecks: visibleRows,
    visibleRows,
    visibleSections,
  }
}

export const getScbaMissingFields = (form = {}) => {
  const { visibleSections } = getScbaCheckSummary(form)
  const hasVisibleRows = visibleSections.some((section) => section.visibleRows.length > 0)
  const hasIncompleteRows = visibleSections.some((section) =>
    section.visibleRows.some((row) => !isScbaRowComplete(row, section.fields)),
  )
  const hasMissingRemarks = visibleSections.some((section) =>
    section.visibleRows.some((row) => getScbaIncompleteIssueEvidenceCount(row, section.fields) > 0),
  )

  return {
    scbaSession: false,
    scbaChecks: !hasVisibleRows || hasIncompleteRows,
    scbaRemarks: hasMissingRemarks,
  }
}

const makeChecklistId = (inspectionType, label) =>
  `${slugSegment(inspectionType) || 'scba-inspection'}:${slugSegment(label)}`

export const buildScbaChecklist = (form = {}) => {
  const inspectionType = String(form.inspectionType || SCBA_INSPECTION_TYPE).trim()
  const summary = getScbaCheckSummary(form)
  const rows = []

  summary.visibleSections.forEach((section) => {
    if (
      section.visibleRows.length > 0 &&
      section.visibleRows.every((row) => isScbaRowComplete(row, section.fields))
    ) {
      const label = `${section.title} section completed`
      rows.push({
        id: makeChecklistId(inspectionType, label),
        label,
        inspectionType,
        selected: true,
        selectedAt: '',
      })
    }

    section.visibleRows.forEach((row) => {
      getScbaRowIssueFields(row, section.fields).forEach((field) => {
        const label = `${section.shortLabel} ${row.label} - ${field.label}: Not Good`
        rows.push({
          id: makeChecklistId(inspectionType, label),
          label,
          inspectionType,
          selected: true,
          selectedAt: '',
        })
      })
    })
  })

  return rows
}

export const buildScbaDescription = (form = {}) => {
  const location = String(form.location || form.selectedLocation || getMainLocation(form)).trim()
  const inspectedBy = String(form.scbaInspectedBy || form.scba_inspected_by || '').trim()
  const inspectionDate = String(form.scbaInspectionDate || form.scba_inspection_date || '').trim()
  const summary = getScbaCheckSummary(form)

  const headerParts = [`SCBA checked${location ? ` at ${location}` : ''}`]
  if (inspectedBy) headerParts.push(`by ${inspectedBy}`)
  if (inspectionDate) headerParts.push(`on ${inspectionDate}`)
  const header = `${headerParts.join(' ')}.`

  const issueRows = summary.visibleSections.flatMap((section) =>
    section.visibleRows
      .map((row) => {
        const issueFields = getScbaRowIssueFields(row, section.fields)
        if (issueFields.length === 0) return null
        const issues = issueFields.map((field) => field.label).join(', ')
        const fieldRemarks = issueFields
          .map((field) => {
            const { remarksKey } = getScbaFieldEvidenceKeys(field)
            const remarks = String(row[remarksKey] || '').trim()
            return remarks ? `${field.label}: ${remarks}` : ''
          })
          .filter(Boolean)
          .join('; ')
        return `- ${section.shortLabel} ${row.label}: ${issues}${
          fieldRemarks ? ` - ${fieldRemarks}` : ''
        }`
      })
      .filter(Boolean),
  )

  if (issueRows.length > 0) {
    return [header, `Issue field(s): ${summary.issueCount}.`, ...issueRows].join('\n')
  }

  return `${header} ${summary.totalCount} SCBA item(s) recorded with no issues.`
}

export const getScbaSectionFields = (sectionKey, form = {}) => {
  const staticFields = sectionByKey.get(sectionKey)?.fields
  if (staticFields) return staticFields
  const customSection = normalizeScbaCustomSections(
    form.scbaCustomSections || form.scba_custom_sections,
  ).find((section) => section.key === sectionKey)
  return customSection?.fields || []
}

export const getScbaSectionTitle = (sectionKey) => sectionTitleByKey[sectionKey] || 'SCBA'

export const getScbaSectionShortLabel = (sectionKey) => sectionShortLabelByKey[sectionKey] || 'SCBA'

export const getScbaFieldSectionKey = (fieldKey) => sectionKeyByField[fieldKey] || ''
