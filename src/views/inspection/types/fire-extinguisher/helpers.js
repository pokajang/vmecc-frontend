import {
  normalizeFireExtinguisherCatalogRows,
  normalizeFireExtinguisherLastInspection,
} from '../../inspectionFireExtinguisherApi'
import { calculateFireExtinguisherDaysLeft } from '../../domain/fireExtinguisherDateUtils'
import { getFireExtinguisherCanonicalAssetKey } from './identity'

export const FIRE_EXTINGUISHER_INSPECTION_TYPE = 'Fire Extinguisher Inspection'

export const FIRE_EXTINGUISHER_CHECK_FIELDS = [
  {
    key: 'physicalCondition',
    label: 'FE Physical Condition',
    options: ['Good', 'Not Good', 'N/A'],
    remarksKey: 'physicalConditionRemarks',
    photosKey: 'physicalConditionPhotos',
  },
  {
    key: 'signageCondition',
    label: 'FE Signage Condition',
    options: ['Good', 'Not Good', 'N/A'],
    remarksKey: 'signageConditionRemarks',
    photosKey: 'signageConditionPhotos',
  },
  {
    key: 'boxKeyAvailability',
    label: 'FE Box Key Availability',
    options: ['Yes', 'No', 'N/A'],
    remarksKey: 'boxKeyAvailabilityRemarks',
    photosKey: 'boxKeyAvailabilityPhotos',
  },
  {
    key: 'boxGlassAvailability',
    label: 'FE Box Glass Availability',
    options: ['Yes', 'No', 'N/A'],
    remarksKey: 'boxGlassAvailabilityRemarks',
    photosKey: 'boxGlassAvailabilityPhotos',
  },
  {
    key: 'operationalCondition',
    label: 'Operational Condition',
    options: ['Good', 'Not Good', 'N/A'],
    aliases: {
      Operational: 'Good',
      'Not Operational': 'Not Good',
    },
    remarksKey: 'operationalConditionRemarks',
    photosKey: 'operationalConditionPhotos',
  },
]

const DEFECT_VALUES = new Set(['not good', 'no', 'not operational'])

const text = (value) => String(value || '').trim()
const zoneText = (value) => text(value).replace(/^Zone\s+/i, '')
const normalizeFeType = (value) => text(value).replace(/CO[\u00b2\ufffd]/gi, 'CO2')

const normalizeStatus = (value, field = {}) => {
  const raw = text(value)
  if (!raw) return ''
  const options = field.options || []
  const aliases = field.aliases || {}
  const aliasMatch = Object.entries(aliases).find(
    ([alias]) => alias.toLowerCase() === raw.toLowerCase(),
  )
  if (aliasMatch) return aliasMatch[1]
  return options.find((option) => option.toLowerCase() === raw.toLowerCase()) || raw
}

export const isFireExtinguisherInspectionType = (inspectionType) =>
  text(inspectionType).toLowerCase() === FIRE_EXTINGUISHER_INSPECTION_TYPE.toLowerCase()

export const isFireExtinguisherDefectStatus = (status) =>
  DEFECT_VALUES.has(text(status).toLowerCase())

export const formatFireExtinguisherDaysLeft = (
  certificationValidity,
  referenceDate = new Date(),
) => {
  const days = calculateFireExtinguisherDaysLeft(certificationValidity, referenceDate)
  if (days === '') return ''

  const numericDays = Number(days)
  if (Number.isNaN(numericDays)) return ''
  if (numericDays < 0) return `${Math.abs(numericDays)} days expired`
  return `${numericDays} days left`
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const formatFireExtinguisherLastInspection = (
  lastInspection,
  referenceDate = new Date(),
) => {
  const timestamp = text(lastInspection?.inspectedAt || lastInspection?.submittedAt)
  if (!timestamp) return 'No previous submitted inspection'

  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'No previous submitted inspection'

  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const dayDiff = Math.round((startOfDay(reference) - startOfDay(parsed)) / 86400000)
  let when = parsed.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (dayDiff === 0) {
    when = `today at ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (dayDiff === 1) {
    when = 'yesterday'
  } else if (dayDiff > 1 && dayDiff <= 30) {
    when = `${dayDiff} days ago`
  }

  const actor = text(lastInspection?.inspectedBy || lastInspection?.submittedBy)
  return `Last inspected: ${when}${actor ? ` by ${actor}` : ''}`
}

const fireRowIdentity = (row = {}) =>
  getFireExtinguisherCanonicalAssetKey(row) ||
  text(row.catalogId || row.catalog_id || row.id) ||
  text(row.sourceRowNumber || row.source_row_number) ||
  `${text(row.idLocNo || row.id_loc_no)}:${text(row.barcodeNo || row.barcode_no)}`

export const normalizeFireExtinguisherChecks = (checks = []) =>
  (Array.isArray(checks) ? checks : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const rowWithoutDerivedValidity = { ...row }
      delete rowWithoutDerivedValidity.certificationValidityRaw
      delete rowWithoutDerivedValidity.certification_validity_raw
      delete rowWithoutDerivedValidity.daysLeftToExpire
      delete rowWithoutDerivedValidity.days_left_to_expire
      const catalogId = row.catalogId ?? row.catalog_id ?? ''
      const activeIdentityKey = text(row.activeIdentityKey || row.active_identity_key)
      const sourceRowNumber = text(row.sourceRowNumber || row.source_row_number)
      const idLocNo = text(row.idLocNo || row.id_loc_no)
      const barcodeNo = text(row.barcodeNo || row.barcode_no)
      const mainLocation = text(row.mainLocation || row.main_location || row.location)
      const subLocation = text(row.subLocation || row.sub_location)
      const id = text(row.id) || `fe:${catalogId || sourceRowNumber || `${idLocNo}:${barcodeNo}`}`
      const certificationValidity = text(row.certificationValidity || row.certification_validity)
      const lastInspection = normalizeFireExtinguisherLastInspection(row)

      return {
        ...rowWithoutDerivedValidity,
        id,
        catalogId,
        canonicalAssetKey: getFireExtinguisherCanonicalAssetKey({
          ...row,
          catalogId,
          activeIdentityKey,
          zone: row.zone,
          mainLocation,
          subLocation,
          idLocNo,
          barcodeNo,
        }),
        activeIdentityKey,
        sourceRowNumber,
        equipmentSource: text(row.equipmentSource || row.equipment_source || row.source) || 'seed',
        zone: text(row.zone),
        mainLocation,
        location: mainLocation,
        subLocation,
        locationPath: [mainLocation, subLocation].filter(Boolean),
        idLocNo,
        barcodeNo,
        feType: normalizeFeType(row.feType || row.fe_type),
        certificationValidity,
        daysLeftToExpire: calculateFireExtinguisherDaysLeft(certificationValidity),
        ...(lastInspection ? { lastInspection } : {}),
        remarks: text(row.remarks || row.remark),
        photos: Array.isArray(row.photos) ? row.photos : [],
        ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
          next[field.key] = normalizeStatus(row[field.key], field)
          next[field.remarksKey] = text(row[field.remarksKey])
          next[field.photosKey] = Array.isArray(row[field.photosKey]) ? row[field.photosKey] : []
          return next
        }, {}),
      }
    })
    .filter(Boolean)

const mergeCatalogAndChecks = (catalogRows = [], checks = []) => {
  const normalizedCatalog = normalizeFireExtinguisherCatalogRows(catalogRows)
  const normalizedChecks = normalizeFireExtinguisherChecks(checks)
  const byIdentity = new Map()
  const orderedIdentities = []

  normalizedCatalog.forEach((row) => {
    const identity = fireRowIdentity(row)
    if (!identity || byIdentity.has(identity)) return
    byIdentity.set(identity, row)
    orderedIdentities.push(identity)
  })

  normalizedChecks.forEach((row) => {
    const identity = fireRowIdentity(row)
    if (!identity) return
    const existing = byIdentity.get(identity)
    if (!existing) {
      byIdentity.set(identity, {
        ...row,
        integritySource: 'saved-only',
      })
      orderedIdentities.push(identity)
      return
    }
    byIdentity.set(identity, {
      ...existing,
      ...row,
      canonicalAssetKey: text(row.canonicalAssetKey) || existing.canonicalAssetKey,
      activeIdentityKey: text(row.activeIdentityKey) || existing.activeIdentityKey,
      zone: text(row.zone) || existing.zone,
      mainLocation: text(row.mainLocation) || existing.mainLocation,
      location: text(row.location) || existing.location,
      subLocation: text(row.subLocation) || existing.subLocation,
      locationPath:
        Array.isArray(row.locationPath) && row.locationPath.length > 0
          ? row.locationPath
          : existing.locationPath,
      idLocNo: text(row.idLocNo) || existing.idLocNo,
      barcodeNo: text(row.barcodeNo) || existing.barcodeNo,
      feType: text(row.feType) || existing.feType,
      certificationValidity: text(row.certificationValidity) || existing.certificationValidity,
      daysLeftToExpire: calculateFireExtinguisherDaysLeft(
        text(row.certificationValidity) || existing.certificationValidity,
      ),
      lastInspection: row.lastInspection || existing.lastInspection || null,
      canEdit: existing.canEdit,
      canDelete: existing.canDelete,
      integritySource: 'catalog+saved',
    })
  })

  return orderedIdentities.map((identity) => byIdentity.get(identity)).filter(Boolean)
}

export const getFireExtinguisherVisibleChecks = (form = {}) => {
  const zone = zoneText(form.zone)
  const mainLocation = text(form.mainLocation)
  const subLocation = text(form.subLocation)
  const focusedAssetKey = text(form.fireExtinguisherFocusedAssetKey)
  if (!mainLocation || !subLocation) return []

  const catalogRows = form.fireExtinguisherCatalogRows || []
  const merged = mergeCatalogAndChecks(catalogRows, form.fireExtinguisherChecks)
  const fallback = normalizeFireExtinguisherChecks(form.fireExtinguisherChecks)
  const rows = merged.length > 0 ? merged : fallback

  return rows
    .filter((row) => {
      const rowZone = zoneText(row.zone)
      if (zone && rowZone && rowZone.toLowerCase() !== zone.toLowerCase()) {
        return false
      }
      if (mainLocation && text(row.mainLocation).toLowerCase() !== mainLocation.toLowerCase()) {
        return false
      }
      if (subLocation && text(row.subLocation).toLowerCase() !== subLocation.toLowerCase()) {
        return false
      }
      if (focusedAssetKey && getFireExtinguisherCanonicalAssetKey(row) !== focusedAssetKey) {
        return false
      }
      return true
    })
    .map((row) => ({
      ...row,
      isOrphanedSavedRow: row.integritySource === 'saved-only',
    }))
}

export const getFireExtinguisherCheckSummary = (form = {}) => {
  const visibleChecks = getFireExtinguisherVisibleChecks(form)
  const completedCount = visibleChecks.filter(
    (row) => getFireExtinguisherRowValidation(row).isComplete,
  ).length
  const defectCount = visibleChecks.filter((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) => isFireExtinguisherDefectStatus(row[field.key])),
  ).length
  const defectFieldCount = visibleChecks.reduce(
    (count, row) => count + getFireExtinguisherDefectFields(row).length,
    0,
  )
  const incompleteDefectRemarkCount = visibleChecks.reduce(
    (count, row) => count + getFireExtinguisherIncompleteDefectRemarkCount(row),
    0,
  )
  const incompleteDefectPhotoCount = visibleChecks.reduce(
    (count, row) => count + getFireExtinguisherIncompleteDefectPhotoCount(row),
    0,
  )
  return {
    visibleChecks,
    totalCount: visibleChecks.length,
    completedCount,
    defectCount,
    defectFieldCount,
    incompleteDefectRemarkCount,
    incompleteDefectPhotoCount,
  }
}

const hasPhotos = (value) => Array.isArray(value) && value.some(Boolean)

const getFireExtinguisherDefectFields = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.filter((field) => isFireExtinguisherDefectStatus(row[field.key]))

const getFireExtinguisherIncompleteDefectRemarkCount = (row = {}) =>
  getFireExtinguisherDefectFields(row).filter((field) => !text(row[field.remarksKey])).length

const getFireExtinguisherIncompleteDefectPhotoCount = (row = {}) =>
  getFireExtinguisherDefectFields(row).filter((field) => !hasPhotos(row[field.photosKey])).length

export const isFireExtinguisherSessionCompletedRow = (row = {}) =>
  text(row?.sessionResult?.status || row?.sessionStatus).toLowerCase() === 'completed'

const hasFireExtinguisherRowInput = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.some(
    (field) =>
      text(row[field.key]) || text(row[field.remarksKey]) || hasPhotos(row[field.photosKey]),
  ) ||
  text(row.remarks || row.remark) ||
  hasPhotos(row.photos)

export const isFireExtinguisherInspectionCandidateRow = (row = {}) =>
  hasFireExtinguisherRowInput(row)

export const getFireExtinguisherRowValidation = (row = {}) => {
  if (isFireExtinguisherSessionCompletedRow(row)) {
    return {
      rowId: text(row.id),
      missingStatusKeys: [],
      missingRemarkKeys: [],
      missingPhotoKeys: [],
      isComplete: true,
      hasDefect: FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) =>
        isFireExtinguisherDefectStatus(row[field.key]),
      ),
    }
  }

  const missingStatusKeys = FIRE_EXTINGUISHER_CHECK_FIELDS.filter(
    (field) => !text(row[field.key]),
  ).map((field) => field.key)
  const missingRemarkKeys = FIRE_EXTINGUISHER_CHECK_FIELDS.filter(
    (field) => isFireExtinguisherDefectStatus(row[field.key]) && !text(row[field.remarksKey]),
  ).map((field) => field.remarksKey)
  const missingPhotoKeys = FIRE_EXTINGUISHER_CHECK_FIELDS.filter(
    (field) => isFireExtinguisherDefectStatus(row[field.key]) && !hasPhotos(row[field.photosKey]),
  ).map((field) => field.photosKey)

  return {
    rowId: text(row.id),
    missingStatusKeys,
    missingRemarkKeys,
    missingPhotoKeys,
    isComplete:
      missingStatusKeys.length === 0 &&
      missingRemarkKeys.length === 0 &&
      missingPhotoKeys.length === 0,
    hasDefect: FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) =>
      isFireExtinguisherDefectStatus(row[field.key]),
    ),
  }
}

export const getFireExtinguisherRowWorkflowState = (row = {}) => {
  const validation = getFireExtinguisherRowValidation(row)
  const hasDefectEvidence = FIRE_EXTINGUISHER_CHECK_FIELDS.some(
    (field) => text(row[field.remarksKey]) || hasPhotos(row[field.photosKey]),
  )

  return {
    ...validation,
    hasDefectEvidence,
    canMarkAllGood: !validation.hasDefect && !hasDefectEvidence,
  }
}

export const getFirstIncompleteFireExtinguisherRow = (rows = []) =>
  (Array.isArray(rows) ? rows : []).find(
    (row) => !getFireExtinguisherRowValidation(row).isComplete,
  ) || null

export const getFireExtinguisherInspectionCandidateRows = (form = {}) => {
  const checks = normalizeFireExtinguisherChecks(form.fireExtinguisherChecks)
  const candidateKeys = new Set(
    checks
      .filter(
        (row) =>
          isFireExtinguisherSessionCompletedRow(row) ||
          isFireExtinguisherInspectionCandidateRow(row),
      )
      .map(fireRowIdentity)
      .filter(Boolean),
  )

  if (candidateKeys.size === 0) return []

  return getFireExtinguisherVisibleChecks(form).filter((row) =>
    candidateKeys.has(fireRowIdentity(row)),
  )
}

export const getFireExtinguisherSubmissionCandidateRows = (form = {}) => {
  const catalogRows = normalizeFireExtinguisherCatalogRows(form.fireExtinguisherCatalogRows)
  const checks = normalizeFireExtinguisherChecks(form.fireExtinguisherChecks)
  const candidateRows = mergeCatalogAndChecks(catalogRows, checks).filter(
    (row) =>
      isFireExtinguisherSessionCompletedRow(row) || isFireExtinguisherInspectionCandidateRow(row),
  )
  const candidateKeys = new Set(candidateRows.map(fireRowIdentity).filter(Boolean))
  return Array.from(candidateKeys)
    .map((identity) => candidateRows.find((row) => fireRowIdentity(row) === identity))
    .filter(Boolean)
}

export const getFireExtinguisherValidationDetails = (form = {}, options = {}) => {
  const visibleChecks = Array.isArray(options.checks)
    ? options.checks
    : getFireExtinguisherSubmissionCandidateRows(form)
  const rowDetails = visibleChecks.map(getFireExtinguisherRowValidation)
  const missingStatusesByRow = rowDetails.reduce((next, detail) => {
    if (detail.missingStatusKeys.length > 0) next[detail.rowId] = detail.missingStatusKeys
    return next
  }, {})
  const missingRemarksByRow = rowDetails.reduce((next, detail) => {
    if (detail.missingRemarkKeys.length > 0) next[detail.rowId] = detail.missingRemarkKeys
    return next
  }, {})
  const missingPhotosByRow = rowDetails.reduce((next, detail) => {
    if (detail.missingPhotoKeys.length > 0) next[detail.rowId] = detail.missingPhotoKeys
    return next
  }, {})
  const firstMissingRow = rowDetails.find(
    (detail) =>
      detail.missingStatusKeys.length > 0 ||
      detail.missingRemarkKeys.length > 0 ||
      detail.missingPhotoKeys.length > 0,
  )

  return {
    rowDetails,
    missingStatusesByRow,
    missingRemarksByRow,
    missingPhotosByRow,
    firstTarget: firstMissingRow
      ? {
          field:
            firstMissingRow.missingStatusKeys.length > 0
              ? 'fireExtinguisherChecks'
              : 'fireExtinguisherRemarks',
          rowId: firstMissingRow.rowId,
          checkKey: firstMissingRow.missingStatusKeys[0] || '',
          detailKey:
            firstMissingRow.missingStatusKeys.length > 0
              ? ''
              : firstMissingRow.missingRemarkKeys[0] || firstMissingRow.missingPhotoKeys[0] || '',
        }
      : null,
    errorCount:
      Object.values(missingStatusesByRow).reduce((sum, keys) => sum + keys.length, 0) +
      Object.values(missingRemarksByRow).reduce((sum, keys) => sum + keys.length, 0) +
      Object.values(missingPhotosByRow).reduce((sum, keys) => sum + keys.length, 0),
  }
}

export const getFireExtinguisherMissingFields = (form = {}, options = {}) => {
  const visibleChecks = Array.isArray(options.checks)
    ? options.checks
    : getFireExtinguisherSubmissionCandidateRows(form)
  const rowDetails = visibleChecks.map(getFireExtinguisherRowValidation)
  const checksMissing =
    visibleChecks.length === 0 || rowDetails.some((detail) => detail.missingStatusKeys.length > 0)
  const remarksMissing = rowDetails.some(
    (detail) => detail.missingRemarkKeys.length > 0 || detail.missingPhotoKeys.length > 0,
  )
  return {
    fireExtinguisherSession: false,
    fireExtinguisherChecks: checksMissing,
    fireExtinguisherRemarks: remarksMissing,
  }
}

export const buildFireExtinguisherChecklist = (form = {}, options = {}) =>
  (Array.isArray(options.checks)
    ? options.checks
    : getFireExtinguisherInspectionCandidateRows(form)
  ).flatMap((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.map((field) => {
      const status = text(row[field.key])
      if (!status) return null
      return {
        id: `fire-extinguisher:${row.id}:${field.key}`,
        inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
        label: `${row.idLocNo || row.barcodeNo || 'Fire extinguisher'} - ${field.label}: ${status}`,
        selected: true,
        selectedAt: '',
      }
    }).filter(Boolean),
  )

export const buildFireExtinguisherDescription = (form = {}, options = {}) => {
  const location = text(form.selectedLocation || form.location)
  const visibleChecks = Array.isArray(options.checks)
    ? options.checks
    : getFireExtinguisherInspectionCandidateRows(form)
  const totalCount = visibleChecks.length
  const defectFieldCount = visibleChecks.reduce(
    (count, row) => count + getFireExtinguisherDefectFields(row).length,
    0,
  )
  const remarkRows = visibleChecks.flatMap((row) => {
    const itemLabel = row.idLocNo || row.barcodeNo || 'Fire extinguisher'
    const defectRows = getFireExtinguisherDefectFields(row).map((field) => {
      const remarks = text(row[field.remarksKey])
      return `- ${itemLabel} - ${field.label}${remarks ? `: ${remarks}` : ''}`
    })
    const generalRemarks = text(row.remarks)
    if (generalRemarks) {
      defectRows.push(`- ${itemLabel} - General equipment remarks: ${generalRemarks}`)
    }
    return defectRows
  })

  if (remarkRows.length > 0) {
    return [
      `Fire extinguishers checked${location ? ` at ${location}` : ''}.`,
      `Defect/remark item(s): ${defectFieldCount}.`,
      ...remarkRows,
    ].join('\n')
  }

  return `Fire extinguishers checked${location ? ` at ${location}` : ''}: ${totalCount} extinguisher(s), no defects recorded.`
}

export const filterFireExtinguisherRows = (rows = [], search = '') => {
  const query = text(search).toLowerCase().replace(/\s+/g, ' ')
  if (!query) return rows
  return rows.filter((row) =>
    [
      row.zone,
      row.mainLocation,
      row.subLocation,
      row.idLocNo,
      row.barcodeNo,
      row.feType,
      row.certificationValidity,
      row.daysLeftToExpire,
      row.remarks,
    ]
      .map(text)
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .includes(query),
  )
}
