import { normalizeFireExtinguisherCatalogRows } from '../../inspectionFireExtinguisherApi'

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
    options: ['Operational', 'Not Operational', 'N/A'],
    remarksKey: 'operationalConditionRemarks',
    photosKey: 'operationalConditionPhotos',
  },
]

const DEFECT_VALUES = new Set(['not good', 'no', 'not operational'])

const text = (value) => String(value || '').trim()
const normalizeFeType = (value) => text(value).replace(/CO[\u00b2\ufffd]/gi, 'CO2')

const normalizeStatus = (value, options = []) => {
  const raw = text(value)
  if (!raw) return ''
  return options.find((option) => option.toLowerCase() === raw.toLowerCase()) || raw
}

export const isFireExtinguisherInspectionType = (inspectionType) =>
  text(inspectionType).toLowerCase() === FIRE_EXTINGUISHER_INSPECTION_TYPE.toLowerCase()

export const isFireExtinguisherDefectStatus = (status) =>
  DEFECT_VALUES.has(text(status).toLowerCase())

const fireRowIdentity = (row = {}) =>
  text(row.catalogId || row.catalog_id || row.id) ||
  text(row.sourceRowNumber || row.source_row_number) ||
  `${text(row.idLocNo || row.id_loc_no)}:${text(row.barcodeNo || row.barcode_no)}`

export const normalizeFireExtinguisherChecks = (checks = []) =>
  (Array.isArray(checks) ? checks : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const catalogId = row.catalogId ?? row.catalog_id ?? ''
      const sourceRowNumber = text(row.sourceRowNumber || row.source_row_number)
      const idLocNo = text(row.idLocNo || row.id_loc_no)
      const barcodeNo = text(row.barcodeNo || row.barcode_no)
      const mainLocation = text(row.mainLocation || row.main_location || row.location)
      const subLocation = text(row.subLocation || row.sub_location)
      const id = text(row.id) || `fe:${catalogId || sourceRowNumber || `${idLocNo}:${barcodeNo}`}`
      return {
        ...row,
        id,
        catalogId,
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
        certificationValidity: text(row.certificationValidity || row.certification_validity),
        certificationValidityRaw: text(
          row.certificationValidityRaw || row.certification_validity_raw,
        ),
        daysLeftToExpire: text(row.daysLeftToExpire || row.days_left_to_expire),
        remarks: text(row.remarks || row.remark),
        photos: Array.isArray(row.photos) ? row.photos : [],
        ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
          next[field.key] = normalizeStatus(row[field.key], field.options)
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
  const byIdentity = new Map(normalizedChecks.map((row) => [fireRowIdentity(row), row]))

  return normalizedCatalog.map((row) => {
    const existing = byIdentity.get(fireRowIdentity(row))
    return existing
      ? {
          ...row,
          ...existing,
          zone: text(existing.zone) || row.zone,
          mainLocation: text(existing.mainLocation) || row.mainLocation,
          location: text(existing.location) || row.location,
          subLocation: text(existing.subLocation) || row.subLocation,
          locationPath:
            Array.isArray(existing.locationPath) && existing.locationPath.length > 0
              ? existing.locationPath
              : row.locationPath,
          idLocNo: text(existing.idLocNo) || row.idLocNo,
          barcodeNo: text(existing.barcodeNo) || row.barcodeNo,
          feType: text(existing.feType) || row.feType,
          certificationValidity: text(existing.certificationValidity) || row.certificationValidity,
          certificationValidityRaw:
            text(existing.certificationValidityRaw) || row.certificationValidityRaw,
          daysLeftToExpire: text(existing.daysLeftToExpire) || row.daysLeftToExpire,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
        }
      : row
  })
}

export const getFireExtinguisherVisibleChecks = (form = {}) => {
  const mainLocation = text(form.mainLocation)
  const subLocation = text(form.subLocation)
  const catalogRows = form.fireExtinguisherCatalogRows || []
  const merged = mergeCatalogAndChecks(catalogRows, form.fireExtinguisherChecks)
  const fallback = normalizeFireExtinguisherChecks(form.fireExtinguisherChecks)
  const rows = merged.length > 0 ? merged : fallback

  return rows.filter((row) => {
    if (mainLocation && text(row.mainLocation).toLowerCase() !== mainLocation.toLowerCase()) {
      return false
    }
    if (subLocation && text(row.subLocation).toLowerCase() !== subLocation.toLowerCase()) {
      return false
    }
    return true
  })
}

export const getFireExtinguisherCheckSummary = (form = {}) => {
  const visibleChecks = getFireExtinguisherVisibleChecks(form)
  const completedCount = visibleChecks.filter((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.every((field) => text(row[field.key])),
  ).length
  const defectCount = visibleChecks.filter((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) => isFireExtinguisherDefectStatus(row[field.key])),
  ).length
  return {
    visibleChecks,
    totalCount: visibleChecks.length,
    completedCount,
    defectCount,
  }
}

const hasPhotos = (value) => Array.isArray(value) && value.length > 0

export const getFireExtinguisherRowValidation = (row = {}) => {
  const missingStatusKeys = FIRE_EXTINGUISHER_CHECK_FIELDS.filter(
    (field) => !text(row[field.key]),
  ).map((field) => field.key)
  const missingRemarkKeys = FIRE_EXTINGUISHER_CHECK_FIELDS.filter(
    (field) => isFireExtinguisherDefectStatus(row[field.key]) && !text(row[field.remarksKey]),
  ).map((field) => field.remarksKey)

  return {
    rowId: text(row.id),
    missingStatusKeys,
    missingRemarkKeys,
    isComplete: missingStatusKeys.length === 0 && missingRemarkKeys.length === 0,
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

export const getFireExtinguisherValidationDetails = (form = {}) => {
  const visibleChecks = getFireExtinguisherVisibleChecks(form)
  const rowDetails = visibleChecks.map(getFireExtinguisherRowValidation)
  const missingStatusesByRow = rowDetails.reduce((next, detail) => {
    if (detail.missingStatusKeys.length > 0) next[detail.rowId] = detail.missingStatusKeys
    return next
  }, {})
  const missingRemarksByRow = rowDetails.reduce((next, detail) => {
    if (detail.missingRemarkKeys.length > 0) next[detail.rowId] = detail.missingRemarkKeys
    return next
  }, {})
  const firstMissingRow = rowDetails.find(
    (detail) => detail.missingStatusKeys.length > 0 || detail.missingRemarkKeys.length > 0,
  )

  return {
    rowDetails,
    missingStatusesByRow,
    missingRemarksByRow,
    firstTarget: firstMissingRow
      ? {
          field:
            firstMissingRow.missingStatusKeys.length > 0
              ? 'fireExtinguisherChecks'
              : 'fireExtinguisherRemarks',
          rowId: firstMissingRow.rowId,
          checkKey: firstMissingRow.missingStatusKeys[0] || '',
          detailKey: firstMissingRow.missingRemarkKeys[0] || '',
        }
      : null,
    errorCount:
      Object.values(missingStatusesByRow).reduce((sum, keys) => sum + keys.length, 0) +
      Object.values(missingRemarksByRow).reduce((sum, keys) => sum + keys.length, 0),
  }
}

export const getFireExtinguisherMissingFields = (form = {}) => {
  const visibleChecks = getFireExtinguisherVisibleChecks(form)
  const sessionMissing =
    !text(form.fireExtinguisherInspectedBy) || !text(form.fireExtinguisherInspectionDate)
  const checksMissing =
    visibleChecks.length === 0 ||
    visibleChecks.some((row) =>
      FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) => !text(row[field.key])),
    )
  const remarksMissing = visibleChecks.some((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.some(
      (field) => isFireExtinguisherDefectStatus(row[field.key]) && !text(row[field.remarksKey]),
    ),
  )
  return {
    fireExtinguisherSession: sessionMissing,
    fireExtinguisherChecks: checksMissing,
    fireExtinguisherRemarks: remarksMissing,
  }
}

export const buildFireExtinguisherChecklist = (form = {}) =>
  getFireExtinguisherVisibleChecks(form).flatMap((row) =>
    FIRE_EXTINGUISHER_CHECK_FIELDS.map((field) => ({
      id: `fire-extinguisher:${row.id}:${field.key}`,
      inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
      label: `${row.idLocNo || row.barcodeNo || 'Fire extinguisher'} - ${field.label}: ${
        row[field.key] || 'Pending'
      }`,
      selected: true,
      selectedAt: '',
    })),
  )

export const buildFireExtinguisherDescription = (form = {}) => {
  const summary = getFireExtinguisherCheckSummary(form)
  return `Fire extinguisher inspection for ${text(form.selectedLocation || form.location)} by ${
    text(form.fireExtinguisherInspectedBy) || 'inspector'
  } on ${text(form.fireExtinguisherInspectionDate) || 'inspection date'}: ${
    summary.completedCount
  }/${summary.totalCount} extinguishers completed, ${summary.defectCount} with defects.`
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
      row.certificationValidityRaw,
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
