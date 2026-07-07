import { useMemo, useState } from 'react'
import { uid } from 'src/views/inspection/inspectionSharedUtils'
import {
  archiveScbaCatalogItem,
  archiveScbaCatalogSection,
  createScbaCatalogItem,
  createScbaCatalogSection,
  saveCachedScbaCatalog,
  updateScbaCatalogItem,
  updateScbaCatalogSection,
} from 'src/views/inspection/inspectionScbaCatalogApi'
import {
  getScbaCheckSummary,
  getScbaFieldEvidenceKeys,
  normalizeScbaCustomSections,
  SCBA_SECTION_DEFINITIONS,
  SCBA_STATUS_OPTIONS,
} from './inspectionFormHelpers'
import { buildScbaFormAfterMarkAll } from './inspectionBulkActions'
import {
  buildAddScbaItemModalState,
  buildAddScbaSectionModalState,
  buildClosedScbaModalState,
  buildEditScbaItemModalState,
  buildEditScbaSectionModalState,
  buildNextScbaCustomSection,
  buildScbaArchiveItemTarget,
  buildScbaArchiveSectionTarget,
  buildScbaCustomSectionKey,
  buildScbaRemoveItemTarget,
  buildScbaRemoveSectionTarget,
  buildScbaRemovedMeta,
  buildScbaSectionFields,
  createInitialScbaItemModalState,
  createInitialScbaSectionModalState,
  getScbaItemModalError,
  getScbaSectionModalError,
  markScbaRowRemoved,
  markScbaSectionRemoved,
  parseScbaSectionLabels,
  restoreScbaRow,
  restoreScbaSection as restoreScbaSectionState,
  scbaRowHasInspectionData as rowHasScbaInspectionData,
  upsertScbaRowsById,
} from './inspectionScbaCatalogHelpers'
import {
  archiveScbaCatalogState,
  ensureScbaCatalogSectionForSave,
  saveScbaItemToInspection,
  saveScbaSectionToInspection,
  upsertScbaCatalogSections,
} from './inspectionScbaCatalogActions'
import { buildScbaCheckRow, buildScbaFillBlankGoodPatch } from './inspectionCheckBuilders'
import { buildScbaResetPatch } from './inspectionResetActions'
import {
  customFieldKeyFromLabel,
  getScbaChecksField,
  slugSegment,
} from './inspectionScbaRuntimeUtils'

const useInspectionScbaRuntime = ({
  form,
  getLatestForm,
  mainLocation,
  pushToast,
  setScbaCatalogSections,
  updateForm,
  user,
}) => {
  const [scbaItemModal, setScbaItemModal] = useState(() => createInitialScbaItemModalState())
  const [scbaSectionModal, setScbaSectionModal] = useState(() =>
    createInitialScbaSectionModalState(),
  )
  const [scbaRemoveTarget, setScbaRemoveTarget] = useState(null)
  const [scbaArchiveTarget, setScbaArchiveTarget] = useState(null)
  const [isSavingScbaCatalog, setIsSavingScbaCatalog] = useState(false)

  const scbaSectionFieldMap = useMemo(() => {
    const next = SCBA_SECTION_DEFINITIONS.reduce((map, section) => {
      map[section.key] = Array.isArray(section.fields) ? section.fields : []
      return map
    }, {})
    normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections).forEach(
      (section) => {
        next[section.key] = Array.isArray(section.fields) ? section.fields : []
      },
    )
    return next
  }, [form.scbaCustomSections, form.scba_custom_sections])

  const scbaCustomSectionMap = useMemo(
    () =>
      normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections).reduce(
        (next, section) => {
          next[section.key] = section
          return next
        },
        {},
      ),
    [form.scbaCustomSections, form.scba_custom_sections],
  )

  const scbaStaticSectionKeys = useMemo(
    () =>
      SCBA_SECTION_DEFINITIONS.reduce((next, section) => {
        next[section.key] = Array.isArray(section.fields) ? section.fields : []
        return next
      }, {}),
    [],
  )

  const composeScbaCheckRow = (sectionKey, row, existing = {}, patch = {}) => ({
    ...buildScbaCheckRow(sectionKey, row, existing),
    ...(scbaSectionFieldMap[sectionKey] || []).reduce((next, field) => {
      next[field.key] = String(existing?.[field.key] || row?.[field.key] || '')
      if (field.kind === 'status') {
        const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
        next[remarksKey] = String(existing?.[remarksKey] || '')
        next[photosKey] = Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
      }
      return next
    }, {}),
    equipmentSource: String(
      row?.equipmentSource ||
        existing?.equipmentSource ||
        (scbaCustomSectionMap[sectionKey] ? 'custom' : 'seed'),
    ).trim(),
    isCustomEquipment:
      row?.isCustomEquipment === true ||
      existing?.isCustomEquipment === true ||
      Boolean(scbaCustomSectionMap[sectionKey]),
    ...patch,
  })

  const getScbaExistingCheck = (currentForm, sectionKey, rowId) => {
    const checksFieldKey = getScbaChecksField(sectionKey)
    if (checksFieldKey) {
      const checks = Array.isArray(currentForm[checksFieldKey]) ? currentForm[checksFieldKey] : []
      return checks.find((check) => String(check.id || '') === rowId)
    }
    const customSection = normalizeScbaCustomSections(
      currentForm.scbaCustomSections || currentForm.scba_custom_sections,
    ).find((section) => section.key === sectionKey)
    return (customSection?.rows || []).find((check) => String(check.id || '') === rowId)
  }

  const updateScbaCustomSectionRows = (currentForm, sectionKey, updater) =>
    normalizeScbaCustomSections(
      currentForm.scbaCustomSections || currentForm.scba_custom_sections,
    ).map((section) =>
      section.key === sectionKey
        ? { ...section, rows: updater(section.rows || [], section) }
        : section,
    )

  const upsertScbaCatalogSectionCache = (section) => {
    if (!section?.key) return
    setScbaCatalogSections((current) => {
      const next = upsertScbaCatalogSections(current, section, normalizeScbaCustomSections)
      saveCachedScbaCatalog(next)
      return next
    })
  }

  const ensureScbaCatalogSection = async (currentForm, sectionKey) => {
    const result = await ensureScbaCatalogSectionForSave({
      currentForm,
      sectionKey,
      normalizeScbaCustomSections,
      createScbaCatalogSection,
    })
    if (result?.cacheSection) upsertScbaCatalogSectionCache(result.cacheSection)
    if (result?.nextForm) updateForm(result.nextForm)
    return result?.ensuredSection || null
  }

  function updateScbaGroupedCheck(sectionKey, row, patch) {
    const checksFieldKey = getScbaChecksField(sectionKey)
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    if (!checksFieldKey) {
      const existing = getScbaExistingCheck(currentForm, sectionKey, rowId)
      const nextCheck = composeScbaCheckRow(sectionKey, row, existing, patch)
      updateForm({
        ...currentForm,
        scbaCustomSections: updateScbaCustomSectionRows(currentForm, sectionKey, (rows) => [
          nextCheck,
          ...rows.filter((check) => String(check.id || '') !== rowId),
        ]),
      })
      return
    }
    const currentChecks = Array.isArray(currentForm[checksFieldKey])
      ? currentForm[checksFieldKey]
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = composeScbaCheckRow(sectionKey, row, existing, patch)

    updateForm({
      ...currentForm,
      [checksFieldKey]: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const markScbaRowOk = (sectionKey, row) => {
    const currentForm = getLatestForm()
    const existing = getScbaExistingCheck(currentForm, sectionKey, String(row?.id || ''))
    updateScbaGroupedCheck(
      sectionKey,
      row,
      buildScbaFillBlankGoodPatch(
        scbaSectionFieldMap[sectionKey] || [],
        { ...row, ...(existing || {}) },
        SCBA_STATUS_OPTIONS[0].value,
      ),
    )
  }

  const resetScbaGroupedCheck = (sectionKey, row) => {
    updateScbaGroupedCheck(
      sectionKey,
      row,
      buildScbaResetPatch(scbaSectionFieldMap[sectionKey] || []),
    )
  }

  const openAddScbaItemModal = (sectionKey) => {
    setScbaSectionModal((current) => buildClosedScbaModalState(current))
    setScbaItemModal(buildAddScbaItemModalState(sectionKey))
  }

  const openEditScbaItemModal = (sectionKey, row = {}) => {
    setScbaSectionModal((current) => buildClosedScbaModalState(current))
    setScbaItemModal(buildEditScbaItemModalState(sectionKey, row))
  }

  const closeScbaItemModal = () => setScbaItemModal((current) => buildClosedScbaModalState(current))

  const saveScbaItemModal = async () => {
    const sectionKey = String(scbaItemModal.sectionKey || '').trim()
    const itemModalError = getScbaItemModalError(scbaItemModal)
    if (itemModalError) {
      setScbaItemModal((current) => ({ ...current, error: itemModalError }))
      return
    }

    const currentForm = getLatestForm()
    setIsSavingScbaCatalog(true)
    let effectiveSectionKey = sectionKey
    let catalogSectionId = ''
    try {
      if (!getScbaChecksField(sectionKey)) {
        const ensuredSection = await ensureScbaCatalogSection(currentForm, sectionKey)
        effectiveSectionKey = ensuredSection?.key || sectionKey
        catalogSectionId = ensuredSection?.catalogSectionId || ''
      }
    } catch (error) {
      setScbaItemModal((current) => ({
        ...current,
        error: error?.message || 'Unable to save SCBA catalog item.',
      }))
      setIsSavingScbaCatalog(false)
      return
    }
    const latestForm = getLatestForm()
    try {
      const nextForm = await saveScbaItemToInspection({
        modal: scbaItemModal,
        mainLocation,
        effectiveSectionKey,
        catalogSectionId,
        latestForm,
        getScbaChecksField,
        getScbaExistingCheck,
        composeScbaCheckRow,
        updateScbaCustomSectionRows,
        upsertScbaRowsById,
        createScbaCatalogItem,
        updateScbaCatalogItem,
        slugSegment,
        uid,
      })
      updateForm(nextForm)
    } catch (error) {
      setScbaItemModal((current) => ({
        ...current,
        error: error?.message || 'Unable to save SCBA catalog item.',
      }))
      setIsSavingScbaCatalog(false)
      return
    }
    setIsSavingScbaCatalog(false)
    closeScbaItemModal()
  }

  const scbaRowHasInspectionData = (row = {}, sectionKey = '') =>
    rowHasScbaInspectionData(row, scbaSectionFieldMap[sectionKey] || [], getScbaFieldEvidenceKeys)

  const requestRemoveScbaItem = (sectionKey, row = {}) => {
    setScbaRemoveTarget(
      buildScbaRemoveItemTarget(sectionKey, row, scbaRowHasInspectionData(row, sectionKey)),
    )
  }

  const removeScbaItemFromInspection = (sectionKey, row = {}) => {
    const rowId = String(row.id || '').trim()
    if (!rowId || row.isCustomEquipment !== true) return
    const currentForm = getLatestForm()
    const checksFieldKey = getScbaChecksField(sectionKey)
    const removedMeta = buildScbaRemovedMeta(user)
    if (checksFieldKey) {
      const currentChecks = Array.isArray(currentForm[checksFieldKey])
        ? currentForm[checksFieldKey]
        : []
      updateForm({
        ...currentForm,
        [checksFieldKey]: currentChecks.map((check) =>
          markScbaRowRemoved(check, removedMeta, rowId),
        ),
      })
      return
    }
    updateForm({
      ...currentForm,
      scbaCustomSections: updateScbaCustomSectionRows(currentForm, sectionKey, (rows) =>
        rows.map((check) => markScbaRowRemoved(check, removedMeta, rowId)),
      ),
    })
  }

  const restoreScbaItem = (sectionKey, row = {}) => {
    const rowId = String(row.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    updateForm({
      ...currentForm,
      scbaCustomSections: updateScbaCustomSectionRows(currentForm, sectionKey, (rows) =>
        rows.map((check) => restoreScbaRow(check, rowId)),
      ),
    })
  }

  const openAddScbaSectionModal = () => {
    setScbaItemModal((current) => buildClosedScbaModalState(current))
    setScbaSectionModal(buildAddScbaSectionModalState())
  }

  const openEditScbaSectionModal = (section = {}) => {
    setScbaItemModal((current) => buildClosedScbaModalState(current))
    setScbaSectionModal(buildEditScbaSectionModalState(section))
  }

  const closeScbaSectionModal = () =>
    setScbaSectionModal((current) => buildClosedScbaModalState(current))

  const saveScbaSectionModal = async () => {
    const title = String(scbaSectionModal.title || '').trim()
    const labels = parseScbaSectionLabels(scbaSectionModal.checksText)
    const sectionModalError = getScbaSectionModalError(title, labels)
    if (sectionModalError) {
      setScbaSectionModal((current) => ({ ...current, error: sectionModalError }))
      return
    }
    const currentForm = getLatestForm()
    const fields = buildScbaSectionFields({
      labels,
      editingSection: normalizeScbaCustomSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      ).find((section) => section.key === scbaSectionModal.sectionKey),
      slugSegment,
      customFieldKeyFromLabel,
    })
    const resolvedShortLabel = String(scbaSectionModal.shortLabel || title).trim()
    setIsSavingScbaCatalog(true)
    try {
      const result = await saveScbaSectionToInspection({
        modal: scbaSectionModal,
        currentForm,
        normalizeScbaCustomSections,
        title,
        resolvedShortLabel,
        fields,
        updateScbaCatalogSection,
        createScbaCatalogSection,
        buildScbaCustomSectionKey,
        buildNextScbaCustomSection,
        slugSegment,
        uid,
      })
      if (result?.savedSection) upsertScbaCatalogSectionCache(result.nextSection)
      updateForm(result.nextForm)
    } catch (error) {
      setScbaSectionModal((current) => ({
        ...current,
        error: error?.message || 'Unable to save SCBA catalog section.',
      }))
      setIsSavingScbaCatalog(false)
      return
    }
    setIsSavingScbaCatalog(false)
    closeScbaSectionModal()
  }

  const requestRemoveScbaSection = (section = {}) => {
    const hasData =
      (section.rows || []).length > 0 ||
      (section.rows || []).some((row) =>
        scbaRowHasInspectionData(row, String(section.key || '').trim()),
      )
    setScbaRemoveTarget(buildScbaRemoveSectionTarget(section, hasData))
  }

  const removeScbaSectionFromInspection = (section = {}) => {
    const sectionKey = String(section.key || '').trim()
    if (!sectionKey || section.isCustomSection !== true) return
    const currentForm = getLatestForm()
    const removedMeta = buildScbaRemovedMeta(user)
    updateForm({
      ...currentForm,
      scbaCustomSections: normalizeScbaCustomSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      ).map((candidate) => markScbaSectionRemoved(candidate, sectionKey, removedMeta)),
    })
  }

  const restoreScbaSection = (section = {}) => {
    const sectionKey = String(section.key || '').trim()
    if (!sectionKey) return
    const currentForm = getLatestForm()
    updateForm({
      ...currentForm,
      scbaCustomSections: normalizeScbaCustomSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      ).map((candidate) => restoreScbaSectionState(candidate, sectionKey)),
    })
  }

  const requestArchiveScbaSection = (section = {}) => {
    setScbaArchiveTarget(buildScbaArchiveSectionTarget(section))
  }

  const requestArchiveScbaItem = (sectionKey, row = {}) => {
    setScbaArchiveTarget(buildScbaArchiveItemTarget(sectionKey, row))
  }

  const archiveScbaCatalogTarget = async () => {
    if (!scbaArchiveTarget) return
    try {
      if (scbaArchiveTarget.type === 'section') {
        await archiveScbaCatalogSection(scbaArchiveTarget.section.catalogSectionId)
      } else if (scbaArchiveTarget.type === 'item') {
        await archiveScbaCatalogItem(scbaArchiveTarget.row.catalogItemId)
      }
      setScbaCatalogSections((current) =>
        archiveScbaCatalogState({ currentSections: current, target: scbaArchiveTarget }),
      )
      setScbaArchiveTarget(null)
    } catch (error) {
      pushToast?.({
        title: 'SCBA catalog',
        body: error?.message || 'Unable to archive SCBA catalog item.',
        color: 'danger',
      })
    }
  }

  const markAllScbaOk = () => {
    const currentForm = getLatestForm()
    const visibleSections = getScbaCheckSummary(currentForm).visibleSections || []
    updateForm(
      buildScbaFormAfterMarkAll({
        currentForm,
        visibleSections,
        getScbaChecksField,
        updateScbaCustomSectionRows,
        composeScbaCheckRow,
        buildScbaFillBlankGoodPatch,
        scbaSectionFieldMap,
        scbaGoodStatus: SCBA_STATUS_OPTIONS[0].value,
      }),
    )
  }

  return {
    archiveScbaCatalogTarget,
    closeScbaItemModal,
    closeScbaSectionModal,
    getScbaExistingCheck,
    isSavingScbaCatalog,
    markAllScbaOk,
    markScbaRowOk,
    openAddScbaItemModal,
    openAddScbaSectionModal,
    openEditScbaItemModal,
    openEditScbaSectionModal,
    removeScbaItemFromInspection,
    removeScbaSectionFromInspection,
    requestArchiveScbaItem,
    requestArchiveScbaSection,
    requestRemoveScbaItem,
    requestRemoveScbaSection,
    restoreScbaItem,
    restoreScbaSection,
    saveScbaItemModal,
    saveScbaSectionModal,
    scbaArchiveTarget,
    scbaItemModal,
    scbaRemoveTarget,
    scbaSectionModal,
    scbaStaticSectionKeys,
    setScbaArchiveTarget,
    setScbaItemModal,
    setScbaRemoveTarget,
    setScbaSectionModal,
    updateScbaGroupedCheck,
    resetScbaGroupedCheck,
  }
}

export default useInspectionScbaRuntime
