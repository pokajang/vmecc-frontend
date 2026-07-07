export const upsertScbaCatalogSections = (current = [], section, normalizeScbaCustomSections) => {
  if (!section?.key) return Array.isArray(current) ? current : []
  const normalized = normalizeScbaCustomSections([section])[0]
  if (!normalized) return Array.isArray(current) ? current : []
  return [
    ...(Array.isArray(current) ? current : []).filter(
      (candidate) => String(candidate?.key || '') !== normalized.key,
    ),
    normalized,
  ]
}

export const ensureScbaCatalogSectionForSave = async ({
  currentForm,
  sectionKey,
  normalizeScbaCustomSections,
  createScbaCatalogSection,
}) => {
  const currentSections = normalizeScbaCustomSections(
    currentForm?.scbaCustomSections || currentForm?.scba_custom_sections,
  )
  const section = currentSections.find((candidate) => candidate.key === sectionKey)
  if (!section) return null
  if (section.catalogSectionId) {
    return {
      ensuredSection: section,
      nextForm: null,
      cacheSection: null,
    }
  }

  const saved = await createScbaCatalogSection({
    title: section.title,
    shortLabel: section.shortLabel,
    fields: section.fields,
  })

  if (!saved) {
    return {
      ensuredSection: section,
      nextForm: null,
      cacheSection: null,
    }
  }

  const ensuredSection = {
    ...section,
    id: saved.id || section.id,
    catalogSectionId: saved.catalogSectionId,
    key: saved.key || section.key,
  }

  return {
    ensuredSection,
    cacheSection: saved,
    nextForm: {
      ...currentForm,
      scbaCustomSections: currentSections.map((candidate) =>
        candidate.key === sectionKey
          ? {
              ...candidate,
              id: saved.id || candidate.id,
              catalogSectionId: saved.catalogSectionId,
              key: saved.key || candidate.key,
              rows: (candidate.rows || []).map((row) => ({
                ...row,
                catalogSectionId: saved.catalogSectionId,
                sectionKey: saved.key || candidate.key,
              })),
            }
          : candidate,
      ),
    },
  }
}

export const saveScbaItemToInspection = async ({
  modal,
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
}) => {
  const brand = String(modal?.brand || '').trim()
  const serialNo = String(modal?.serialNo || '').trim()
  const rowId =
    modal?.mode === 'edit' && modal?.rowId
      ? modal.rowId
      : `${effectiveSectionKey}:custom:${slugSegment(mainLocation)}:${slugSegment(brand)}:${slugSegment(
          serialNo,
        )}:${uid()}`
  const existing = getScbaExistingCheck(latestForm, effectiveSectionKey, rowId) || {}
  let catalogRowPatch = {}

  if (!getScbaChecksField(effectiveSectionKey) && catalogSectionId) {
    const itemPayload = {
      location: mainLocation,
      mainLocation,
      brand,
      serialNo,
      displayName: `${brand} ${serialNo}`.trim(),
      equipmentDescription: modal?.equipmentDescription,
    }
    const savedItem =
      modal?.mode === 'edit' && modal?.catalogItemId
        ? await updateScbaCatalogItem(modal.catalogItemId, itemPayload)
        : await createScbaCatalogItem(catalogSectionId, itemPayload)
    catalogRowPatch = savedItem
      ? {
          id: savedItem.id || rowId,
          catalogItemId: savedItem.catalogItemId,
          catalogSectionId: savedItem.catalogSectionId || catalogSectionId,
        }
      : {}
  }

  const nextRowId = String(catalogRowPatch.id || rowId)
  const nextRow = composeScbaCheckRow(
    effectiveSectionKey,
    {
      ...existing,
      id: nextRowId,
      ...catalogRowPatch,
      sectionKey: effectiveSectionKey,
      location: mainLocation,
      mainLocation,
      brand,
      serialNo,
      size: modal?.size,
      cylinderType: modal?.cylinderType,
      equipmentDescription: modal?.equipmentDescription,
      equipmentSource: 'custom',
      isCustomEquipment: true,
    },
    existing,
    {
      ...catalogRowPatch,
      brand,
      serialNo,
      size: modal?.size,
      cylinderType: modal?.cylinderType,
      equipmentDescription: modal?.equipmentDescription,
      equipmentSource: 'custom',
      isCustomEquipment: true,
    },
  )

  const checksFieldKey = getScbaChecksField(effectiveSectionKey)
  if (checksFieldKey) {
    const currentChecks = Array.isArray(latestForm?.[checksFieldKey])
      ? latestForm[checksFieldKey]
      : []
    return {
      ...latestForm,
      [checksFieldKey]: [
        nextRow,
        ...currentChecks.filter(
          (check) => String(check?.id || '') !== rowId && String(check?.id || '') !== nextRowId,
        ),
      ],
    }
  }

  return {
    ...latestForm,
    scbaCustomSections: updateScbaCustomSectionRows(latestForm, effectiveSectionKey, (rows) =>
      upsertScbaRowsById(rows, nextRow, [rowId, nextRowId]),
    ),
  }
}

export const saveScbaSectionToInspection = async ({
  modal,
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
}) => {
  const currentSections = normalizeScbaCustomSections(
    currentForm?.scbaCustomSections || currentForm?.scba_custom_sections,
  )
  const editingSection = currentSections.find((section) => section.key === modal?.sectionKey)
  const savedSection =
    modal?.mode === 'edit' && modal?.catalogSectionId
      ? await updateScbaCatalogSection(modal.catalogSectionId, {
          title,
          shortLabel: resolvedShortLabel,
          fields,
        })
      : await createScbaCatalogSection({
          title,
          shortLabel: resolvedShortLabel,
          fields,
        })

  const sectionKey = buildScbaCustomSectionKey({
    savedSection,
    modal,
    editingSection,
    title,
    slugSegment,
    uid,
  })
  const nextSection = buildNextScbaCustomSection({
    editingSection,
    savedSection,
    sectionKey,
    title,
    shortLabel: resolvedShortLabel,
    fields,
  })

  return {
    savedSection,
    nextSection,
    nextForm: {
      ...currentForm,
      scbaCustomSections:
        modal?.mode === 'edit'
          ? currentSections.map((section) =>
              section.key === modal.sectionKey ? nextSection : section,
            )
          : [...currentSections, nextSection],
    },
  }
}

export const archiveScbaCatalogState = ({ currentSections = [], target }) => {
  if (!target) return Array.isArray(currentSections) ? currentSections : []
  if (target.type === 'section') {
    return (Array.isArray(currentSections) ? currentSections : []).filter(
      (section) => section.catalogSectionId !== target.section.catalogSectionId,
    )
  }
  if (target.type === 'item') {
    return (Array.isArray(currentSections) ? currentSections : []).map((section) =>
      section.key === target.sectionKey
        ? {
            ...section,
            rows: (section.rows || []).filter(
              (row) => row.catalogItemId !== target.row.catalogItemId,
            ),
          }
        : section,
    )
  }
  return Array.isArray(currentSections) ? currentSections : []
}
