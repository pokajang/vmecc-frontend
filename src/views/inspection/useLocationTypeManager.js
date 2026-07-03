import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { loadCustomLocationTypes, saveCustomLocationTypes } from './customLocationTypesStorage'
import { getInspectionLocationDefaults } from './inspectionLocationDefaults'
import {
  createInspectionLocationOption,
  deleteInspectionLocationOption,
  fetchInspectionLocationOptions,
  findLocationOptionByName,
  isInspectionLocationMigrationComplete,
  loadCachedInspectionLocationCatalog,
  markInspectionLocationMigrationComplete,
  saveCachedInspectionLocationCatalog,
  updateInspectionLocationOption,
} from './inspectionLocationApi'
import {
  buildPinnedVisibleOptions,
  getTypeIconOptions,
  normalizeTypeKey,
  pickLeastUsedTypeIconKey,
  resolveTypeIcon,
  resolveTypeIconKey,
} from './typeOptionUtils'

export const LOCATION_VISIBLE_LIMIT = 3
export const SUB_LOCATION_VISIBLE_LIMIT = 6
export const LOCATION_TOGGLE_VALUE = '__inspection_location_types_toggle__'

const LOCATION_DRAFT_MAIN = 'main'
const LOCATION_DRAFT_SUB = 'sub'

const normalizeLocationRow = (row, kind = LOCATION_DRAFT_MAIN, parentValue = '') => {
  const value = String(row?.value || row?.title || '').trim()
  if (!value) return null
  const resolvedKind = String(row?.kind || kind).trim() === LOCATION_DRAFT_SUB ? 'sub' : 'main'
  const resolvedParent = String(row?.parentValue || parentValue || '').trim()
  if (resolvedKind === LOCATION_DRAFT_SUB && !resolvedParent) return null
  return {
    ...row,
    kind: resolvedKind,
    parentValue: resolvedParent,
    value,
    title: String(row?.title || value).trim(),
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
    icon:
      resolvedKind === LOCATION_DRAFT_MAIN
        ? row?.icon || resolveTypeIcon(row?.iconKey, 'location')
        : row?.icon || null,
    subLocations: Array.isArray(row?.subLocations) ? row.subLocations : [],
  }
}

const sameKey = (left, right) => normalizeTypeKey(left) === normalizeTypeKey(right)

const getOptionId = (row) => row?.id ?? row?.locationId ?? row?.location_id ?? ''

const withInspectionLocationDisplayLabels = (rows = [], inspectionType = '') => {
  const isHydraulic = sameKey(inspectionType, 'Hydraulic Rescue Tools Inspection')
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const value = String(row?.value || row?.title || '').trim()
    const title = isHydraulic && sameKey(value, 'FRT') ? 'Fire Rescue Tender (FRT)' : row?.title
    return {
      ...row,
      ...(title ? { title } : {}),
      subLocations: withInspectionLocationDisplayLabels(row?.subLocations || [], inspectionType),
    }
  })
}

const mergeMainLocations = (seedRows, customRows) => {
  const byKey = new Map()
  ;(Array.isArray(seedRows) ? seedRows : []).forEach((row) => {
    const normalized = normalizeLocationRow(row)
    if (!normalized) return
    byKey.set(normalizeTypeKey(normalized.value), {
      ...normalized,
      system: true,
    })
  })
  ;(Array.isArray(customRows) ? customRows : [])
    .filter((row) => row.kind !== LOCATION_DRAFT_SUB)
    .forEach((row) => {
      const normalized = normalizeLocationRow(row)
      if (!normalized) return
      const key = normalizeTypeKey(normalized.value)
      if (row.hidden) {
        byKey.delete(key)
        return
      }
      byKey.set(key, {
        ...(byKey.get(key) || {}),
        ...normalized,
        custom: true,
      })
    })

  return Array.from(byKey.values())
}

const replaceMainLocationRow = (rows, nextRow) => {
  const normalized = normalizeLocationRow(nextRow)
  if (!normalized) return Array.isArray(rows) ? rows : []
  let replaced = false
  const nextRows = (Array.isArray(rows) ? rows : []).map((row) => {
    if (String(getOptionId(row)) && String(getOptionId(row)) === String(getOptionId(normalized))) {
      replaced = true
      return { ...row, ...normalized }
    }
    if (!String(getOptionId(row)) && sameKey(row.value, normalized.value)) {
      replaced = true
      return { ...row, ...normalized }
    }
    return row
  })
  return replaced ? nextRows : [...nextRows, normalized]
}

const replaceSubLocationRow = (rows, parentValue, nextRow) => {
  const normalized = normalizeLocationRow(nextRow, LOCATION_DRAFT_SUB, parentValue)
  if (!normalized) return Array.isArray(rows) ? rows : []
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (!sameKey(row.value, parentValue)) return row
    let replaced = false
    const subLocations = (Array.isArray(row.subLocations) ? row.subLocations : []).map((sub) => {
      if (
        String(getOptionId(sub)) &&
        String(getOptionId(sub)) === String(getOptionId(normalized))
      ) {
        replaced = true
        return { ...sub, ...normalized }
      }
      if (!String(getOptionId(sub)) && sameKey(sub.value, normalized.value)) {
        replaced = true
        return { ...sub, ...normalized }
      }
      return sub
    })
    return {
      ...row,
      subLocations: replaced ? subLocations : [...subLocations, normalized],
    }
  })
}

const removeLocationRow = (rows, targetRow, parentValue = '') => {
  const targetId = String(getOptionId(targetRow) || '')
  if (parentValue) {
    return (Array.isArray(rows) ? rows : []).map((row) => {
      if (!sameKey(row.value, parentValue)) return row
      return {
        ...row,
        subLocations: (Array.isArray(row.subLocations) ? row.subLocations : []).filter((sub) =>
          targetId ? String(getOptionId(sub)) !== targetId : !sameKey(sub.value, targetRow?.value),
        ),
      }
    })
  }
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    targetId ? String(getOptionId(row)) !== targetId : !sameKey(row.value, targetRow?.value),
  )
}

const mergeSubLocations = (mainRow, parentValue, customRows) => {
  const byKey = new Map()
  ;(Array.isArray(mainRow?.subLocations) ? mainRow.subLocations : []).forEach((row) => {
    const normalized = normalizeLocationRow(row, LOCATION_DRAFT_SUB, parentValue)
    if (!normalized) return
    byKey.set(normalizeTypeKey(normalized.value), {
      ...normalized,
      system: true,
    })
  })
  ;(Array.isArray(customRows) ? customRows : [])
    .filter((row) => row.kind === LOCATION_DRAFT_SUB && sameKey(row.parentValue, parentValue))
    .forEach((row) => {
      const normalized = normalizeLocationRow(row, LOCATION_DRAFT_SUB, parentValue)
      if (!normalized) return
      const key = normalizeTypeKey(normalized.value)
      if (row.hidden) {
        byKey.delete(key)
        return
      }
      byKey.set(key, {
        ...(byKey.get(key) || {}),
        ...normalized,
        custom: true,
      })
    })

  return Array.from(byKey.values())
}

const useLocationTypeManager = ({
  userId,
  inspectionType = '',
  mainLocation = '',
  subLocation = '',
  selectedLocations = [],
  updateSetupField,
  pushToast,
}) => {
  const fallbackMainLocation =
    String(mainLocation || '').trim() || String(selectedLocations?.[0] || '').trim()
  const [showAllMainLocationTypes, setShowAllMainLocationTypes] = useState(false)
  const [showAllSubLocationTypes, setShowAllSubLocationTypes] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationEditMode, setLocationEditMode] = useState(false)
  const [customLocationTypes, setCustomLocationTypes] = useState([])
  const [locationDraftKind, setLocationDraftKind] = useState(LOCATION_DRAFT_MAIN)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [newLocationIconKey, setNewLocationIconKey] = useState('')
  const [editingLocationKey, setEditingLocationKey] = useState('')
  const [editingLocationParentKey, setEditingLocationParentKey] = useState('')
  const [addLocationError, setAddLocationError] = useState('')
  const [backendMainLocations, setBackendMainLocations] = useState([])
  const [catalogSource, setCatalogSource] = useState('fallback')

  useEffect(() => {
    setCustomLocationTypes(loadCustomLocationTypes(userId))
  }, [userId])

  useEffect(() => {
    let active = true
    const cached = loadCachedInspectionLocationCatalog(inspectionType)
    if (cached.length > 0) {
      setBackendMainLocations(cached)
      setCatalogSource('cache')
    } else {
      setBackendMainLocations([])
      setCatalogSource('fallback')
    }

    fetchInspectionLocationOptions(inspectionType)
      .then(({ data }) => {
        if (!active) return
        setBackendMainLocations(data)
        setCatalogSource('api')
        saveCachedInspectionLocationCatalog(inspectionType, data)
      })
      .catch(() => {
        if (!active) return
        setCatalogSource(cached.length > 0 ? 'cache' : 'fallback')
      })

    return () => {
      active = false
    }
  }, [inspectionType])

  const iconOptions = useMemo(() => getTypeIconOptions('location'), [])
  const fallbackMainLocations = useMemo(
    () => getInspectionLocationDefaults(inspectionType),
    [inspectionType],
  )
  const seededMainLocations = useMemo(
    () =>
      withInspectionLocationDisplayLabels(
        backendMainLocations.length > 0 ? backendMainLocations : fallbackMainLocations,
        inspectionType,
      ),
    [backendMainLocations, fallbackMainLocations, inspectionType],
  )
  const customRowsForMerge = useMemo(
    () => (catalogSource === 'api' ? [] : customLocationTypes),
    [catalogSource, customLocationTypes],
  )
  const mainLocationOptions = useMemo(
    () => mergeMainLocations(seededMainLocations, customRowsForMerge),
    [customRowsForMerge, seededMainLocations],
  )
  const selectedMainLocationRow = useMemo(
    () => mainLocationOptions.find((row) => sameKey(row.value, fallbackMainLocation)) || null,
    [fallbackMainLocation, mainLocationOptions],
  )
  const selectedMainLocationTitle = String(
    selectedMainLocationRow?.title || fallbackMainLocation || '',
  ).trim()
  const subLocationOptions = useMemo(
    () => mergeSubLocations(selectedMainLocationRow, fallbackMainLocation, customRowsForMerge),
    [customRowsForMerge, fallbackMainLocation, selectedMainLocationRow],
  )

  useEffect(() => {
    if (
      catalogSource !== 'api' ||
      !userId ||
      customLocationTypes.length === 0 ||
      isInspectionLocationMigrationComplete(userId)
    ) {
      return
    }

    let active = true
    const migrate = async () => {
      let nextRows = backendMainLocations
      try {
        const mainRows = customLocationTypes.filter(
          (row) => row.kind !== LOCATION_DRAFT_SUB && !row.hidden,
        )
        const subRows = customLocationTypes.filter(
          (row) => row.kind === LOCATION_DRAFT_SUB && !row.hidden,
        )

        for (const row of mainRows) {
          const value = String(row.value || row.title || '').trim()
          if (!value || findLocationOptionByName(nextRows, value)) continue
          const created = await createInspectionLocationOption({
            inspectionType,
            name: value,
            description: row.description || '',
            iconKey: row.iconKey || '',
          })
          if (created) nextRows = replaceMainLocationRow(nextRows, created)
        }

        for (const row of subRows) {
          const parentValue = String(row.parentValue || '').trim()
          const value = String(row.value || row.title || '').trim()
          const parent = findLocationOptionByName(nextRows, parentValue)
          if (!parent || !value) continue
          if (findLocationOptionByName(parent.subLocations, value)) continue
          const created = await createInspectionLocationOption({
            inspectionType,
            parentId: getOptionId(parent),
            name: value,
            description: row.description || '',
          })
          if (created) nextRows = replaceSubLocationRow(nextRows, parent.value, created)
        }

        if (!active) return
        setBackendMainLocations(nextRows)
        saveCachedInspectionLocationCatalog(inspectionType, nextRows)
        markInspectionLocationMigrationComplete(userId)
        setCustomLocationTypes([])
        saveCustomLocationTypes(userId, [])
      } catch {
        // Keep local custom rows available through fallback/cache until the next successful migration.
      }
    }

    migrate()

    return () => {
      active = false
    }
  }, [backendMainLocations, catalogSource, customLocationTypes, inspectionType, userId])

  const visibleMainLocationOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: mainLocationOptions,
        selected: fallbackMainLocation,
        visibleLimit: LOCATION_VISIBLE_LIMIT,
        showAll: showAllMainLocationTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllMainLocationTypes ? 'Show less' : 'Show more',
          description: showAllMainLocationTypes ? 'Hide extra locations.' : 'View all locations.',
          icon: showAllMainLocationTypes ? ChevronUp : ChevronDown,
        },
      }),
    [fallbackMainLocation, mainLocationOptions, showAllMainLocationTypes],
  )

  const visibleSubLocationOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: subLocationOptions,
        selected: subLocation,
        visibleLimit: SUB_LOCATION_VISIBLE_LIMIT,
        showAll: showAllSubLocationTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllSubLocationTypes ? 'Show less' : 'Show more',
          description: showAllSubLocationTypes
            ? 'Hide extra sub-locations.'
            : 'View all sub-locations.',
          icon: showAllSubLocationTypes ? ChevronUp : ChevronDown,
        },
      }),
    [showAllSubLocationTypes, subLocation, subLocationOptions],
  )

  const editLocationOptions =
    locationDraftKind === LOCATION_DRAFT_SUB ? subLocationOptions : mainLocationOptions
  const editingLocationRow = useMemo(() => {
    const editKey = String(editingLocationKey || '').trim()
    if (!editKey) return null
    return editLocationOptions.find((row) => sameKey(row.value, editKey)) || null
  }, [editLocationOptions, editingLocationKey])

  const resetDraft = () => {
    setNewLocationName('')
    setNewLocationDescription('')
    setNewLocationIconKey('')
    setEditingLocationKey('')
    setEditingLocationParentKey('')
  }

  const openAddLocationModal = (kind = LOCATION_DRAFT_MAIN) => {
    setLocationDraftKind(kind === LOCATION_DRAFT_SUB ? LOCATION_DRAFT_SUB : LOCATION_DRAFT_MAIN)
    setAddLocationError('')
    resetDraft()
    setNewLocationIconKey(pickLeastUsedTypeIconKey('location', customLocationTypes))
    setLocationEditMode(false)
    setShowAddLocationModal(true)
  }

  const openAddMainLocationModal = () => openAddLocationModal(LOCATION_DRAFT_MAIN)
  const openAddSubLocationModal = () => openAddLocationModal(LOCATION_DRAFT_SUB)

  const closeAddModal = () => {
    setShowAddLocationModal(false)
    setLocationEditMode(false)
    resetDraft()
    setAddLocationError('')
  }

  const selectMainLocation = (value, nextSubLocation = '', ids = {}) => {
    const selectedRow = mainLocationOptions.find((row) => sameKey(row.value, value))
    const mainLocationId = String(ids.mainLocationId || getOptionId(selectedRow) || '').trim()
    updateSetupField?.('locationSelection', {
      mainLocation: String(value || '').trim(),
      subLocation: String(nextSubLocation || '').trim(),
      ...(mainLocationId ? { mainLocationId } : {}),
      ...(ids.subLocationId ? { subLocationId: String(ids.subLocationId) } : {}),
    })
  }

  const setMainLocation = (value) => {
    selectMainLocation(value)
  }

  const setSubLocation = (value) => {
    const nextValue = String(value || '').trim()
    const selectedRow = subLocationOptions.find((row) => sameKey(row.value, nextValue))
    const nextSubLocation = sameKey(nextValue, subLocation) ? '' : nextValue
    const subLocationId = nextSubLocation ? String(getOptionId(selectedRow) || '').trim() : ''
    updateSetupField?.('locationSelection', {
      mainLocation: fallbackMainLocation,
      subLocation: nextSubLocation,
      ...(subLocationId ? { subLocationId } : {}),
    })
  }

  const selectSubLocation = (value, nextSubLocationId = '') => {
    const selectedRow = subLocationOptions.find((row) => sameKey(row.value, value))
    const subLocationId = String(nextSubLocationId || getOptionId(selectedRow) || '').trim()
    updateSetupField?.('locationSelection', {
      mainLocation: fallbackMainLocation,
      subLocation: String(value || '').trim(),
      ...(subLocationId ? { subLocationId } : {}),
    })
  }

  const saveType = async () => {
    const title = String(newLocationName || '').trim()
    const description = String(newLocationDescription || '').trim()
    const editKey = String(editingLocationKey || '').trim()
    const parentValue =
      locationDraftKind === LOCATION_DRAFT_SUB
        ? String(editingLocationParentKey || fallbackMainLocation || '').trim()
        : ''

    if (!title) {
      setAddLocationError(
        locationDraftKind === LOCATION_DRAFT_SUB
          ? 'Sub-location name is required.'
          : 'Main location name is required.',
      )
      return
    }
    if (locationDraftKind === LOCATION_DRAFT_SUB && !parentValue) {
      setAddLocationError('Choose a main location before adding a sub-location.')
      return
    }

    const optionsToCheck =
      locationDraftKind === LOCATION_DRAFT_SUB ? subLocationOptions : mainLocationOptions
    const exists = optionsToCheck.some((row) => {
      if (editKey && sameKey(row.value, editKey)) return false
      return sameKey(row.value, title)
    })
    if (exists) {
      setAddLocationError(
        locationDraftKind === LOCATION_DRAFT_SUB
          ? 'This sub-location already exists under the selected main location.'
          : 'This main location already exists.',
      )
      return
    }

    const editingRow = editKey
      ? editLocationOptions.find((row) => sameKey(row.value, editKey))
      : null
    const editingId = getOptionId(editingRow)
    const parentId = getOptionId(selectedMainLocationRow)

    if (catalogSource === 'api') {
      try {
        if (locationDraftKind === LOCATION_DRAFT_SUB && !parentId) {
          setAddLocationError('Choose a saved main location before adding a sub-location.')
          return
        }

        const savedRow =
          editKey && editingId
            ? await updateInspectionLocationOption(editingId, {
                inspectionType,
                name: title,
                description,
                iconKey: locationDraftKind === LOCATION_DRAFT_MAIN ? newLocationIconKey : '',
              })
            : await createInspectionLocationOption({
                inspectionType,
                parentId: locationDraftKind === LOCATION_DRAFT_SUB ? parentId : null,
                name: title,
                description,
                iconKey: locationDraftKind === LOCATION_DRAFT_MAIN ? newLocationIconKey : '',
              })

        if (!savedRow) {
          setAddLocationError('Unable to save this location.')
          return
        }

        const nextRows =
          locationDraftKind === LOCATION_DRAFT_SUB
            ? replaceSubLocationRow(backendMainLocations, fallbackMainLocation, savedRow)
            : replaceMainLocationRow(backendMainLocations, {
                ...savedRow,
                subLocations: savedRow.subLocations || [],
              })
        setBackendMainLocations(nextRows)
        saveCachedInspectionLocationCatalog(inspectionType, nextRows)

        if (locationDraftKind === LOCATION_DRAFT_SUB) {
          selectSubLocation(savedRow.value || title, getOptionId(savedRow))
        } else {
          selectMainLocation(
            savedRow.value || title,
            editKey && sameKey(fallbackMainLocation, editKey) ? subLocation : '',
            { mainLocationId: getOptionId(savedRow) },
          )
        }

        pushToast?.(
          editKey
            ? editingRow && !editingRow.custom
              ? `Shared ${locationDraftKind === LOCATION_DRAFT_SUB ? 'sub-location' : 'location'} updated.`
              : `${locationDraftKind === LOCATION_DRAFT_SUB ? 'Sub-location' : 'Main location'} "${title}" updated.`
            : `${locationDraftKind === LOCATION_DRAFT_SUB ? 'Sub-location' : 'Main location'} "${title}" added.`,
          {
            title: editKey ? 'Location updated' : 'Location added',
            color: 'success',
          },
        )

        if (editKey) {
          resetDraft()
          setLocationEditMode(true)
          return
        }
        closeAddModal()
        return
      } catch (error) {
        setAddLocationError(error?.message || 'Unable to save this location to the database.')
        return
      }
    }

    const existingLocationRow =
      editKey && locationDraftKind === LOCATION_DRAFT_MAIN
        ? mainLocationOptions.find((row) => sameKey(row.value, editKey))
        : null
    const nextRow = {
      kind: locationDraftKind,
      parentValue,
      value: title,
      title,
      description,
      iconKey: locationDraftKind === LOCATION_DRAFT_MAIN ? newLocationIconKey : '',
      ...(locationDraftKind === LOCATION_DRAFT_MAIN && existingLocationRow?.subLocations?.length
        ? { subLocations: existingLocationRow.subLocations }
        : {}),
    }
    const nextRows = editKey
      ? customLocationTypes.map((row) => {
          const rowKind = String(row.kind || LOCATION_DRAFT_MAIN)
          const rowParent = String(row.parentValue || '')
          if (
            rowKind === locationDraftKind &&
            sameKey(row.value, editKey) &&
            sameKey(rowParent, parentValue)
          ) {
            return nextRow
          }
          return row
        })
      : [...customLocationTypes, nextRow]

    const didReplace = editKey && nextRows.some((row) => row === nextRow)
    const hiddenEditedSeedRow = {
      kind: locationDraftKind,
      parentValue,
      value: editKey,
      title: editKey,
      hidden: true,
    }
    const rowsToSaveUnmigrated =
      didReplace || !editKey ? nextRows : [...customLocationTypes, hiddenEditedSeedRow, nextRow]
    const rowsToSave =
      editKey && locationDraftKind === LOCATION_DRAFT_MAIN
        ? rowsToSaveUnmigrated.map((row) =>
            String(row.kind || LOCATION_DRAFT_MAIN) === LOCATION_DRAFT_SUB &&
            sameKey(row.parentValue, editKey)
              ? { ...row, parentValue: title }
              : row,
          )
        : rowsToSaveUnmigrated

    setCustomLocationTypes(rowsToSave)
    saveCustomLocationTypes(userId, rowsToSave)

    if (locationDraftKind === LOCATION_DRAFT_SUB) {
      selectSubLocation(title)
    } else {
      selectMainLocation(
        title,
        editKey && sameKey(fallbackMainLocation, editKey) ? subLocation : '',
      )
    }

    pushToast?.(
      editKey
        ? `${locationDraftKind === LOCATION_DRAFT_SUB ? 'Sub-location' : 'Main location'} "${title}" updated.`
        : `${locationDraftKind === LOCATION_DRAFT_SUB ? 'Sub-location' : 'Main location'} "${title}" added.`,
      {
        title: editKey ? 'Location updated' : 'Location added',
        color: 'success',
      },
    )

    if (editKey) {
      resetDraft()
      setLocationEditMode(true)
      return
    }
    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    const kind = String(row?.kind || locationDraftKind) === LOCATION_DRAFT_SUB ? 'sub' : 'main'
    setLocationDraftKind(kind)
    setNewLocationName(String(row?.title || value).trim())
    setNewLocationDescription(String(row?.description || '').trim())
    setNewLocationIconKey(kind === LOCATION_DRAFT_MAIN ? resolveTypeIconKey(row, 'location') : '')
    setEditingLocationKey(value.toLowerCase())
    setEditingLocationParentKey(String(row?.parentValue || fallbackMainLocation || '').trim())
    setAddLocationError('')
    setLocationEditMode(false)
  }

  const removeType = (value) => {
    const deleteKey = String(value || '').trim()
    if (!deleteKey) return
    const parentValue = locationDraftKind === LOCATION_DRAFT_SUB ? fallbackMainLocation : ''
    const targetRow = editLocationOptions.find((row) => sameKey(row.value, deleteKey))

    if (catalogSource === 'api') {
      const targetId = getOptionId(targetRow)
      if (!targetId) {
        setAddLocationError('Unable to archive this location because it is missing a database ID.')
        return
      }
      deleteInspectionLocationOption(targetId, { inspectionType })
        .then(() => {
          const nextRows = removeLocationRow(backendMainLocations, targetRow, parentValue)
          setBackendMainLocations(nextRows)
          saveCachedInspectionLocationCatalog(inspectionType, nextRows)

          if (locationDraftKind === LOCATION_DRAFT_SUB) {
            if (sameKey(subLocation, deleteKey)) {
              updateSetupField?.('locationSelection', {
                mainLocation: fallbackMainLocation,
                subLocation: '',
              })
            }
          } else if (sameKey(fallbackMainLocation, deleteKey)) {
            updateSetupField?.('locationSelection', {
              mainLocation: '',
              subLocation: '',
            })
          }

          if (!targetRow?.custom) {
            pushToast?.(
              `Shared ${locationDraftKind === LOCATION_DRAFT_SUB ? 'sub-location' : 'location'} removed from catalog.`,
              { title: 'Catalog updated', color: 'warning' },
            )
            return
          }
          pushToast?.('Location removed.', { title: 'Location removed', color: 'warning' })
        })
        .catch((error) => {
          pushToast?.(error?.message || 'Unable to archive this location.', {
            title: 'Location not removed',
            color: 'danger',
          })
        })
      return
    }

    const matchingCustom = customLocationTypes.some(
      (row) =>
        String(row.kind || LOCATION_DRAFT_MAIN) === locationDraftKind &&
        sameKey(row.value, deleteKey) &&
        sameKey(row.parentValue || '', parentValue),
    )
    const nextRows = matchingCustom
      ? customLocationTypes.filter(
          (row) =>
            !(
              String(row.kind || LOCATION_DRAFT_MAIN) === locationDraftKind &&
              sameKey(row.value, deleteKey) &&
              sameKey(row.parentValue || '', parentValue)
            ),
        )
      : [
          ...customLocationTypes,
          {
            kind: locationDraftKind,
            parentValue,
            value: deleteKey,
            title: deleteKey,
            hidden: true,
          },
        ]

    setCustomLocationTypes(nextRows)
    saveCustomLocationTypes(userId, nextRows)

    if (locationDraftKind === LOCATION_DRAFT_SUB) {
      if (sameKey(subLocation, deleteKey)) {
        updateSetupField?.('locationSelection', {
          mainLocation: fallbackMainLocation,
          subLocation: '',
        })
      }
    } else if (sameKey(fallbackMainLocation, deleteKey)) {
      updateSetupField?.('locationSelection', {
        mainLocation: '',
        subLocation: '',
      })
    }

    pushToast?.('Location removed.', { title: 'Location removed', color: 'warning' })
  }

  const resetSystemOverride = (value) => {
    const key = String(value || '').trim()
    if (!key) return
    const nextRows = customLocationTypes.filter(
      (row) =>
        !(
          String(row.kind || LOCATION_DRAFT_MAIN) === locationDraftKind &&
          sameKey(row.value, key) &&
          sameKey(
            row.parentValue || '',
            locationDraftKind === LOCATION_DRAFT_SUB ? fallbackMainLocation : '',
          )
        ),
    )
    setCustomLocationTypes(nextRows)
    saveCustomLocationTypes(userId, nextRows)
    pushToast?.('Location reset to default.', { title: 'Reset complete', color: 'info' })
  }

  return {
    showAllLocationTypes: showAllMainLocationTypes,
    setShowAllLocationTypes: setShowAllMainLocationTypes,
    showAllMainLocationTypes,
    setShowAllMainLocationTypes,
    showAllSubLocationTypes,
    setShowAllSubLocationTypes,
    showAddLocationModal,
    locationEditMode,
    setLocationEditMode,
    locationDraftKind,
    isEditingSubLocation: locationDraftKind === LOCATION_DRAFT_SUB,
    typeOptions: mainLocationOptions,
    visibleTypeOptions: visibleMainLocationOptions,
    mainLocationOptions,
    visibleMainLocationOptions,
    selectedMainLocationTitle,
    subLocationOptions,
    visibleSubLocationOptions,
    editLocationOptions,
    systemTypeSet: new Set(),
    systemOverrideSet: new Set(),
    openAddModal: openAddMainLocationModal,
    openAddMainLocationModal,
    openAddSubLocationModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    resetSystemOverride,
    setMainLocation,
    setSubLocation,
    newLocationName,
    setNewLocationName,
    newLocationDescription,
    setNewLocationDescription,
    newLocationIconKey,
    setNewLocationIconKey,
    iconOptions,
    editingLocationRow,
    editingLocationKey,
    editingSystemType: false,
    addLocationError,
    setAddLocationError,
  }
}

export default useLocationTypeManager
