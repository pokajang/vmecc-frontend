import { getImplementedInspectionTypeDefinitions } from '../app/inspectionTypeRegistry'
import { normalizeInspectionForm } from './inspectionFormHelpers'
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getFireExtinguisherRowValidation,
  isFireExtinguisherDefectStatus,
} from '../types/fire-extinguisher/helpers'
import { HYDRAULIC_CHECK_FIELDS } from '../types/hydraulic/helpers'
import { normalizeInspectionIssues } from '../types/inspectionIssues'
import {
  getScbaFieldEvidenceKeys,
  normalizeScbaBackPlateChecks,
  normalizeScbaCylinderChecks,
  normalizeScbaCustomSections,
  normalizeScbaFaceMaskChecks,
  SCBA_BACK_PLATE_FIELDS,
  SCBA_CYLINDER_FIELDS,
  SCBA_FACE_MASK_FIELDS,
} from '../types/scba/helpers'
import { buildInspectionReadinessFromBlockers } from './inspectionReadiness'
import { resolveInspectionHierarchy } from '../domain/inspectionHierarchy'
import { isInspectionIssueStatus } from '../domain/inspectionStatusSemantics'

const text = (value) => String(value || '').trim()

export const getPendingSubmissionTypeKey = (inspectionType) => text(inspectionType).toLowerCase()

const stripDraftMap = (form = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  const {
    inspectionTypeDrafts: _inspectionTypeDrafts,
    inspection_type_drafts: _inspectionTypeDraftsSnake,
    ...snapshot
  } = source
  return snapshot
}

export const getPendingSubmissionDrafts = (form = {}) => {
  const normalized = normalizeInspectionForm(form)
  const drafts =
    normalized.inspectionTypeDrafts && typeof normalized.inspectionTypeDrafts === 'object'
      ? Object.entries(normalized.inspectionTypeDrafts).reduce((next, [key, draft]) => {
          const typeKey = getPendingSubmissionTypeKey(key)
          if (!typeKey || !draft || typeof draft !== 'object' || Array.isArray(draft)) return next
          next[typeKey] = stripDraftMap(draft)
          return next
        }, {})
      : {}
  const byType = { ...drafts }
  const activeTypeKey = getPendingSubmissionTypeKey(normalized.inspectionType)
  if (activeTypeKey) {
    byType[activeTypeKey] = stripDraftMap(normalized)
  }

  return byType
}

const countVisibleSectionRows = (sections = []) =>
  (Array.isArray(sections) ? sections : []).reduce(
    (count, section) =>
      count + (Array.isArray(section?.visibleRows) ? section.visibleRows.length : 0),
    0,
  )

const countVisibleGroupRows = (groups = []) =>
  (Array.isArray(groups) ? groups : []).reduce(
    (count, group) => count + (Array.isArray(group?.rows) ? group.rows.length : 0),
    0,
  )

const countStructuredRows = (definition, form, summary) => {
  if (definition?.fieldRefKey === 'scbaChecks') {
    return getScbaSubmissionRows(form).length
  }
  if (definition?.fieldRefKey === 'frtChecks') {
    return (
      (Array.isArray(form.frtDailyChecks) ? form.frtDailyChecks.length : 0) +
      (Array.isArray(form.frtOneOffChecks) ? form.frtOneOffChecks.length : 0)
    )
  }
  const field = text(definition?.checksField)
  if (field && Array.isArray(form[field])) return form[field].length
  if (Array.isArray(summary?.visibleChecks)) return summary.visibleChecks.length
  if (Array.isArray(summary?.visibleSections))
    return countVisibleSectionRows(summary.visibleSections)
  if (Array.isArray(summary?.visibleGroups)) return countVisibleGroupRows(summary.visibleGroups)
  return Number(summary?.totalCount || 0) || 0
}

const getRowLabel = (row = {}, fallback = 'Inspection item') =>
  text(
    row.idLocNo ||
      row.equipment ||
      row.description ||
      row.item ||
      row.name ||
      row.label ||
      row.serialNo ||
      row.serial_no ||
      row.id,
  ) || fallback

const getReviewLocation = (definition = {}, row = {}, form = {}) => {
  return resolveInspectionHierarchy({ source: definition, row, form })
}

const getStructuredRowStatus = (row = {}) => {
  const explicitStatus = text(row.status || row.condition)
  if (!explicitStatus) return 'Recorded'
  if (isInspectionIssueStatus(explicitStatus)) {
    return 'Issue'
  }
  return explicitStatus
}

const getRowRemarks = (row = {}) =>
  text(row.remarks || row.remark || row.defectRemarks || row.defect_remarks)

const mapRowsToGroups = (
  rows = [],
  form = {},
  fallbackLabel = 'Inspection item',
  definition = {},
) =>
  (Array.isArray(rows) ? rows : []).map((row, index) => ({
    ...getReviewLocation(definition, row, form),
    label: getRowLabel(row, `${fallbackLabel} ${index + 1}`),
    status: getStructuredRowStatus(row),
    description: text(row.description || row.details || row.sectionLabel || row.label),
    remarks: getRowRemarks(row),
  }))

const getSummaryRows = (summary = {}) => {
  if (Array.isArray(summary.visibleChecks)) return summary.visibleChecks
  if (Array.isArray(summary.visibleSections)) {
    return summary.visibleSections.flatMap((section) =>
      (Array.isArray(section?.visibleRows) ? section.visibleRows : []).map((row) => ({
        ...row,
        sectionLabel: text(section.title || section.label || section.name),
      })),
    )
  }
  if (Array.isArray(summary.visibleGroups)) {
    return summary.visibleGroups.flatMap((group) =>
      (Array.isArray(group?.rows) ? group.rows : []).map((row) => ({
        ...row,
        sectionLabel: text(group.title || group.label || group.name),
      })),
    )
  }
  return []
}

const buildFireExtinguisherMetrics = (form = {}) => {
  const rows = Array.isArray(form.fireExtinguisherChecks) ? form.fireExtinguisherChecks : []
  const validations = rows.map(getFireExtinguisherRowValidation)
  return {
    count: rows.length,
    checkedCount: validations.filter((row) => row.isComplete).length,
    defectCount: validations.filter((row) => row.hasDefect).length,
    incompleteCount: validations.filter((row) => !row.isComplete).length,
    evidenceIssueCount: validations.reduce(
      (count, row) =>
        count + (Array.isArray(row.missingRemarkKeys) ? row.missingRemarkKeys.length : 0),
      0,
    ),
  }
}

const getFireExtinguisherIssueDescription = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.filter((field) => isFireExtinguisherDefectStatus(row[field.key]))
    .map((field) => `${field.label}: ${text(row[field.key])}`)
    .join(' | ')

const getFireExtinguisherIssueRemarks = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.filter((field) => isFireExtinguisherDefectStatus(row[field.key]))
    .map((field) => text(row[field.remarksKey]))
    .filter(Boolean)
    .join(' | ') || text(row.remarks)

const buildErAuxMetrics = (form = {}) => {
  const rows = Array.isArray(form.erAuxChecks) ? form.erAuxChecks : []
  const checkedRows = rows.filter((row) => text(row.quantity) && text(row.condition))
  const defectRows = rows.filter((row) => text(row.condition).toLowerCase() === 'defect')
  return {
    count: rows.length,
    checkedCount: checkedRows.length,
    defectCount: rows.filter((row) => isInspectionIssueStatus(row.condition)).length,
    incompleteCount: rows.length - checkedRows.length,
    evidenceIssueCount: defectRows.filter((row) => !text(row.defectRemarks)).length,
  }
}

const buildHydraulicMetrics = (form = {}) => {
  const rows = Array.isArray(form.hydraulicChecks) ? form.hydraulicChecks : []
  const checkedRows = rows.filter((row) =>
    HYDRAULIC_CHECK_FIELDS.every((field) => text(row[field.key])),
  )
  const defectFields = rows.flatMap((row) =>
    HYDRAULIC_CHECK_FIELDS.filter((field) => text(row[field.key]).toLowerCase() === 'defect').map(
      (field) => ({ row, field }),
    ),
  )
  return {
    count: rows.length,
    checkedCount: checkedRows.length,
    defectCount: defectFields.length,
    incompleteCount: rows.length - checkedRows.length,
    evidenceIssueCount: defectFields.filter(({ row, field }) => !text(row[field.remarksKey]))
      .length,
  }
}

const buildHighAngleMetrics = (form = {}) => {
  const rows = Array.isArray(form.highAngleChecks) ? form.highAngleChecks : []
  const checkedRows = rows.filter((row) => text(row.condition))
  const issueRows = rows.filter((row) => text(row.condition).toLowerCase() === 'not good')
  return {
    count: rows.length,
    checkedCount: checkedRows.length,
    defectCount: issueRows.length,
    incompleteCount: rows.length - checkedRows.length,
    evidenceIssueCount: issueRows.filter((row) => !text(row.conditionRemarks || row.remarks))
      .length,
  }
}

const buildFrtMetrics = (form = {}) => {
  const dailyRows = Array.isArray(form.frtDailyChecks) ? form.frtDailyChecks : []
  const oneOffRows = Array.isArray(form.frtOneOffChecks) ? form.frtOneOffChecks : []
  const completeDailyRows = dailyRows.filter((row) =>
    text(row.rowKind).toLowerCase() === 'reading' ? text(row.readingValue) : text(row.status),
  )
  const completeOneOffRows = oneOffRows.filter((row) => text(row.condition))
  const dailyIssueRows = dailyRows.filter((row) => text(row.status).toLowerCase() === 'issue')
  const oneOffIssueRows = oneOffRows.filter(
    (row) => text(row.condition).toLowerCase() === 'not good',
  )

  return {
    count: dailyRows.length + oneOffRows.length,
    checkedCount: completeDailyRows.length + completeOneOffRows.length,
    defectCount: dailyIssueRows.length + oneOffIssueRows.length,
    incompleteCount:
      dailyRows.length + oneOffRows.length - completeDailyRows.length - completeOneOffRows.length,
    evidenceIssueCount: [...dailyIssueRows, ...oneOffIssueRows].filter((row) => !text(row.remarks))
      .length,
  }
}

const getScbaSubmissionRows = (form = {}) => {
  const sectionRows = [
    {
      title: 'Back Plate',
      fields: SCBA_BACK_PLATE_FIELDS,
      rows: normalizeScbaBackPlateChecks(form.scbaBackPlateChecks || form.scba_back_plate_checks),
    },
    {
      title: 'Cylinder',
      fields: SCBA_CYLINDER_FIELDS,
      rows: normalizeScbaCylinderChecks(form.scbaCylinderChecks || form.scba_cylinder_checks),
    },
    {
      title: 'Face Mask',
      fields: SCBA_FACE_MASK_FIELDS,
      rows: normalizeScbaFaceMaskChecks(form.scbaFaceMaskChecks || form.scba_face_mask_checks),
    },
    ...normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections)
      .filter((section) => section.removed !== true)
      .map((section) => ({
        title: text(section.title) || 'SCBA',
        fields: section.fields || [],
        rows: section.rows || [],
      })),
  ]

  return sectionRows.flatMap((section) =>
    (Array.isArray(section.rows) ? section.rows : [])
      .filter((row) => row?.removed !== true)
      .map((row) => ({
        row,
        fields: section.fields || [],
        sectionLabel: section.title,
      })),
  )
}

const getScbaIssueFields = (row = {}, fields = []) =>
  fields.filter(
    (field) => field.kind === 'status' && text(row[field.key]).toLowerCase() === 'not good',
  )

const isScbaRowComplete = (row = {}, fields = []) =>
  fields.length > 0 && fields.every((field) => text(row[field.key]))

const getScbaEvidenceIssueCount = (row = {}, fields = []) =>
  getScbaIssueFields(row, fields).filter((field) => {
    const { remarksKey } = getScbaFieldEvidenceKeys(field)
    return !text(row[remarksKey])
  }).length

const buildScbaMetrics = (form = {}) => {
  const rows = getScbaSubmissionRows(form)
  const checkedRows = rows.filter(({ row, fields }) => isScbaRowComplete(row, fields))
  return {
    count: rows.length,
    checkedCount: checkedRows.length,
    defectCount: rows.reduce(
      (count, { row, fields }) => count + getScbaIssueFields(row, fields).length,
      0,
    ),
    incompleteCount: rows.length - checkedRows.length,
    evidenceIssueCount: rows.reduce(
      (count, { row, fields }) => count + getScbaEvidenceIssueCount(row, fields),
      0,
    ),
  }
}

const getScbaReviewStatus = (row = {}, fields = []) => {
  if (!isScbaRowComplete(row, fields)) return 'Needs attention'
  if (getScbaIssueFields(row, fields).length > 0) return 'Issue'
  return 'Checked'
}

const buildGenericMetrics = (definition, form, summary) => {
  if (definition?.key === 'general-inspection') {
    const issues = normalizeInspectionIssues(form.inspectionIssues || form.issues)
    return {
      count: issues.length,
      checkedCount: issues.length,
      defectCount: issues.length,
      incompleteCount: issues.filter((issue) => !text(issue.description)).length,
      evidenceIssueCount: 0,
    }
  }

  if (definition?.fieldRefKey === 'hseObservation') {
    const selections = Array.isArray(summary?.selections) ? summary.selections : []
    const observationCount = selections.length > 0 ? 1 : 0
    return {
      count: observationCount,
      checkedCount: observationCount,
      defectCount: Array.isArray(summary?.findingSelections) ? summary.findingSelections.length : 0,
      incompleteCount: 0,
      evidenceIssueCount: 0,
    }
  }

  if (definition?.fieldRefKey === 'erAuxChecks') return buildErAuxMetrics(form)
  if (definition?.fieldRefKey === 'hydraulicChecks') return buildHydraulicMetrics(form)
  if (definition?.fieldRefKey === 'highAngleChecks') return buildHighAngleMetrics(form)
  if (definition?.fieldRefKey === 'frtChecks') return buildFrtMetrics(form)
  if (definition?.fieldRefKey === 'scbaChecks') return buildScbaMetrics(form)

  const count = countStructuredRows(definition, form, summary)
  return {
    count,
    checkedCount: Number(summary?.checkedCount || 0) || 0,
    defectCount:
      Number(summary?.defectCount || summary?.issueCount || summary?.incompletePhotoCount || 0) ||
      0,
    incompleteCount: Math.max(0, count - (Number(summary?.checkedCount || 0) || 0)),
    evidenceIssueCount:
      Number(
        summary?.incompleteRemarksCount ||
          summary?.incompletePhotoCount ||
          summary?.incompleteDefectEvidenceCount ||
          summary?.incompleteNaReasonCount ||
          0,
      ) || 0,
  }
}

const buildBlockers = ({ definition, form, metrics, draftSyncState, sessionRetryCount }) => {
  const blockers = []
  const shouldApplyFormMissingFields =
    metrics.count <= 0 ||
    definition?.key === 'general-inspection' ||
    definition?.fieldRefKey === 'hseObservation'
  const missing = shouldApplyFormMissingFields ? definition?.getMissingFields?.(form) || {} : {}
  Object.entries(missing).forEach(([key, missingValue]) => {
    if (missingValue) blockers.push({ key, message: 'Required inspection details are incomplete.' })
  })
  if (metrics.incompleteCount > 0) {
    blockers.push({
      key: 'incomplete-items',
      message: `${metrics.incompleteCount} saved item${metrics.incompleteCount === 1 ? '' : 's'} need attention.`,
    })
  }
  if (metrics.evidenceIssueCount > 0) {
    blockers.push({
      key: 'evidence',
      message: 'Remarks or evidence photos are missing for issue rows.',
    })
  }
  if (sessionRetryCount > 0) {
    blockers.push({
      key: 'fire-extinguisher-session-sync',
      retryCount: sessionRetryCount,
      message: `${sessionRetryCount} fire extinguisher session update${
        sessionRetryCount === 1 ? '' : 's'
      } could not sync. Retry to continue.`,
    })
  }
  if (
    definition?.key === 'fire-extinguisher-inspection' &&
    form?.inspectionSessionCanSubmit === false
  ) {
    blockers.push({
      key: 'inspection-session-submit-forbidden',
      message: 'Only the session starter or a supervisor can submit this inspection.',
    })
  }
  if (draftSyncState?.status === 'local_saved' || draftSyncState?.status === 'syncing') {
    blockers.push({
      key: 'draft-sync-pending',
      message: 'Syncing...',
    })
  }
  if (draftSyncState?.status === 'failed') {
    blockers.push({
      key: 'draft-sync-failed',
      retryCount: 1,
      message: draftSyncState.lastError || 'Draft sync failed. Retry is available.',
      nonBlocking: true,
    })
  }
  if (draftSyncState?.status === 'conflict') {
    blockers.push({
      key: 'draft-version-conflict',
      message:
        draftSyncState.lastError ||
        'This draft changed in another tab or device. Resolve the local and server copies before submitting.',
    })
  }
  return blockers
}

const buildGroups = (definition, form, summary = {}) => {
  if (definition?.key === 'fire-extinguisher-inspection') {
    return (Array.isArray(form.fireExtinguisherChecks) ? form.fireExtinguisherChecks : []).map(
      (row) => {
        const validation = getFireExtinguisherRowValidation(row)
        return {
          ...getReviewLocation(definition, row, form),
          label: text(row.idLocNo || row.id || row.barcodeNo) || 'Fire extinguisher',
          status: validation.hasDefect
            ? 'Issue'
            : validation.isComplete
              ? 'Checked'
              : 'Needs attention',
          description: getFireExtinguisherIssueDescription(row),
          remarks: getFireExtinguisherIssueRemarks(row),
        }
      },
    )
  }

  if (definition?.key === 'general-inspection') {
    return normalizeInspectionIssues(form.inspectionIssues || form.issues).map((issue, index) => ({
      ...getReviewLocation(definition, issue, form),
      label: text(issue.description) || `Finding ${index + 1}`,
      status: text(issue.description) ? 'Issue' : 'Needs attention',
      description: text(issue.description),
      remarks: getRowRemarks(issue),
    }))
  }

  if (definition?.fieldRefKey === 'hseObservation') {
    const summary = definition?.getSummary?.(form) || {}
    const groups = []
    if (summary?.selections?.length) {
      groups.push({
        ...getReviewLocation(definition, form, form),
        label: summary.visibleChecks?.[0]?.label || 'HSE observation',
        status: 'Recorded',
      })
    }
    return groups
  }

  if (definition?.fieldRefKey === 'scbaChecks') {
    return getScbaSubmissionRows(form).map(({ row, fields, sectionLabel }, index) => ({
      ...getReviewLocation(definition, row, form),
      label: getRowLabel(
        {
          ...row,
          label:
            text(row.label) || text(`${sectionLabel} ${row.brand || ''} ${row.serialNo || ''}`),
        },
        `${definition?.title || 'SCBA'} ${index + 1}`,
      ),
      status: getScbaReviewStatus(row, fields),
      description: getScbaIssueFields(row, fields)
        .map((field) => `${field.label}: ${text(row[field.key])}`)
        .join(' | '),
      remarks: getRowRemarks(row),
    }))
  }

  if (definition?.fieldRefKey === 'frtChecks') {
    return mapRowsToGroups(
      [
        ...(Array.isArray(form.frtDailyChecks) ? form.frtDailyChecks : []),
        ...(Array.isArray(form.frtOneOffChecks) ? form.frtOneOffChecks : []),
      ],
      form,
      definition?.title,
      definition,
    )
  }

  const field = text(definition?.checksField)
  if (field && Array.isArray(form[field]))
    return mapRowsToGroups(form[field], form, definition?.title, definition)

  const summaryRows = getSummaryRows(summary)
  if (summaryRows.length > 0)
    return mapRowsToGroups(summaryRows, form, definition?.title, definition)

  return []
}

export const buildPendingSubmissionSummary = ({
  form = {},
  draftSyncState = null,
  fireExtinguisherSessionRetryCount = 0,
} = {}) => {
  const drafts = getPendingSubmissionDrafts(form)
  const syncTypeKey = getPendingSubmissionTypeKey(draftSyncState?.pendingType)
  const syncStatus = text(draftSyncState?.status)
  const syncIsBlocking = ['failed', 'conflict', 'local_saved', 'syncing'].includes(syncStatus)
  const syncAppliesToAll =
    syncIsBlocking &&
    (text(draftSyncState?.scope || draftSyncState?.pendingScope).toLowerCase() === 'all' ||
      !syncTypeKey)

  const items = getImplementedInspectionTypeDefinitions()
    .map((definition) => {
      const typeKey = getPendingSubmissionTypeKey(definition.inspectionType)
      const draft = drafts[typeKey]
      if (!draft) return null
      const normalizedDraft = normalizeInspectionForm({
        ...draft,
        inspectionType: definition.inspectionType,
      })
      const pendingForm = stripDraftMap(normalizedDraft)
      const summary = definition.getSummary?.(normalizedDraft) || {}
      const metrics =
        definition.key === 'fire-extinguisher-inspection'
          ? buildFireExtinguisherMetrics(normalizedDraft)
          : buildGenericMetrics(definition, normalizedDraft, summary)
      if (metrics.count <= 0 && summary?.hasContent !== true) return null

      const typeSyncState =
        syncAppliesToAll || (syncTypeKey && syncTypeKey === typeKey)
          ? draftSyncState
          : { status: 'synced', lastError: '', pendingReason: '', pendingType: '' }
      const sessionRetryCount =
        definition.key === 'fire-extinguisher-inspection'
          ? Number(fireExtinguisherSessionRetryCount || 0) || 0
          : 0
      const blockers = buildBlockers({
        definition,
        form: normalizedDraft,
        metrics,
        draftSyncState: ['failed', 'conflict', 'local_saved', 'syncing'].includes(
          typeSyncState?.status,
        )
          ? typeSyncState
          : null,
        sessionRetryCount,
      })
      const readiness = buildInspectionReadinessFromBlockers(blockers)
      const status =
        typeSyncState?.status === 'conflict'
          ? 'blocked'
          : typeSyncState?.status === 'syncing' || typeSyncState?.status === 'local_saved'
            ? 'syncing'
            : !readiness.isReadyToSubmit
              ? 'needs_attention'
              : 'ready'

      return {
        key: definition.key,
        typeKey,
        inspectionType: definition.inspectionType,
        title: definition.title,
        status,
        blockers,
        readiness,
        metrics,
        form: pendingForm,
        groups: buildGroups(definition, normalizedDraft, summary),
      }
    })
    .filter(Boolean)

  return {
    items,
    totalCount: items.reduce((count, item) => count + Number(item.metrics?.count || 0), 0),
    readyCount: items.filter((item) => item.status === 'ready').length,
    blockedCount: items.filter((item) => item.status !== 'ready').length,
  }
}
