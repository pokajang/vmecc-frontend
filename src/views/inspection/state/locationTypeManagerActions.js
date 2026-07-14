import {
  createInspectionLocationOption,
  deleteInspectionLocationOption,
  updateInspectionLocationOption,
} from '../domain/api/inspectionLocationApi'
import {
  FIRE_PARENT_SEPARATOR,
  getOptionId,
  LOCATION_DRAFT_MAIN,
  LOCATION_DRAFT_SUB,
  LOCATION_DRAFT_ZONE,
  removeLocationRow,
  replaceMainLocationRow,
  replaceSubLocationRow,
  sameFireZoneKey,
  sameKey,
} from './locationTypeManagerHelpers'

export const saveLocationTypeAction = async ({
  newLocationName,
  newLocationDescription,
  editingLocationKey,
  locationDraftKind,
  editingLocationParentKey,
  fireLocationParentValue,
  fallbackMainLocation,
  isFireExtinguisherLocationFlow,
  selectedZoneValue,
  setAddLocationError,
  mainLocationOptions,
  subLocationOptions,
  areaOptions,
  editLocationOptions,
  selectedMainLocationRow,
  selectedZoneRow,
  catalogSource,
  siteLocationCatalog,
  inspectionType,
  newLocationIconKey,
  backendMainLocations,
  setBackendMainLocations,
  saveCachedInspectionLocationCatalog,
  selectSubLocation,
  setZone,
  selectMainLocation,
  sameKey,
  subLocation,
  pushToast,
  resetDraft,
  setLocationEditMode,
  closeAddModal,
  customLocationTypes,
  setCustomLocationTypes,
  saveCustomLocationTypes,
  userId,
}) => {
  const title = String(newLocationName || '').trim()
  const description = String(newLocationDescription || '').trim()
  const editKey = String(editingLocationKey || '').trim()
  const parentValue =
    locationDraftKind === LOCATION_DRAFT_ZONE
      ? ''
      : locationDraftKind === LOCATION_DRAFT_SUB
        ? String(
            editingLocationParentKey || fireLocationParentValue || fallbackMainLocation || '',
          ).trim()
        : isFireExtinguisherLocationFlow
          ? String(editingLocationParentKey || selectedZoneValue || '').trim()
          : ''

  if (!title) {
    setAddLocationError(
      locationDraftKind === LOCATION_DRAFT_SUB
        ? 'Sub-location name is required.'
        : 'Main location name is required.',
    )
    return
  }
  if (locationDraftKind !== LOCATION_DRAFT_ZONE && isFireExtinguisherLocationFlow && !parentValue) {
    setAddLocationError(
      locationDraftKind === LOCATION_DRAFT_SUB
        ? 'Choose a main area before adding a location.'
        : 'Choose a zone before adding a main area.',
    )
    return
  }
  if (locationDraftKind === LOCATION_DRAFT_SUB && !parentValue) {
    setAddLocationError('Choose a main location before adding a sub-location.')
    return
  }

  const optionsToCheck =
    locationDraftKind === LOCATION_DRAFT_ZONE
      ? mainLocationOptions
      : locationDraftKind === LOCATION_DRAFT_SUB
        ? subLocationOptions
        : isFireExtinguisherLocationFlow
          ? areaOptions
          : mainLocationOptions
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

  const editingRow = editKey ? editLocationOptions.find((row) => sameKey(row.value, editKey)) : null
  const editingId = getOptionId(editingRow)
  const selectedParentRow =
    locationDraftKind === LOCATION_DRAFT_SUB
      ? selectedMainLocationRow
      : isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_MAIN
        ? selectedZoneRow
        : null
  const parentId = getOptionId(selectedParentRow)

  if (catalogSource === 'site-api') {
    try {
      if (locationDraftKind !== LOCATION_DRAFT_ZONE && !parentId) {
        setAddLocationError(
          locationDraftKind === LOCATION_DRAFT_SUB
            ? 'Choose a saved main area before adding a location.'
            : 'Choose a saved zone before adding a main area.',
        )
        return
      }

      let result
      if (editKey && editingId) {
        result = await siteLocationCatalog.updateNode(editingId, {
          name: title,
          description,
          iconKey: locationDraftKind !== LOCATION_DRAFT_SUB ? newLocationIconKey : '',
        })
      } else if (locationDraftKind === LOCATION_DRAFT_ZONE) {
        result = await siteLocationCatalog.createZone({
          name: title,
          description,
          iconKey: newLocationIconKey,
        })
      } else if (locationDraftKind === LOCATION_DRAFT_MAIN) {
        result = await siteLocationCatalog.createArea(parentId, {
          name: title,
          description,
          iconKey: newLocationIconKey,
        })
      } else {
        result = await siteLocationCatalog.createLocation(parentId, {
          name: title,
          description,
        })
      }

      const savedNode = result?.data
      if (!savedNode) {
        setAddLocationError('Unable to save this location.')
        return
      }

      const preservedEditedNode =
        Boolean(editKey && editingId) && String(savedNode.id || '') === String(editingId)
      if (locationDraftKind === LOCATION_DRAFT_SUB) {
        selectSubLocation(savedNode.name || title, savedNode.id)
      } else if (locationDraftKind === LOCATION_DRAFT_ZONE) {
        setZone(savedNode.name || title, savedNode.id, preservedEditedNode)
      } else {
        selectMainLocation(
          savedNode.name || title,
          preservedEditedNode && sameKey(fallbackMainLocation, editKey) ? subLocation : '',
          {
            mainLocationId: savedNode.id,
            ...(preservedEditedNode && sameKey(fallbackMainLocation, editKey)
              ? {
                  subLocationId: getOptionId(
                    subLocationOptions.find((row) => sameKey(row.value, subLocation)),
                  ),
                }
              : {}),
          },
        )
      }

      const noun =
        locationDraftKind === LOCATION_DRAFT_ZONE
          ? 'Zone'
          : locationDraftKind === LOCATION_DRAFT_SUB
            ? 'Location'
            : 'Area'
      const reusedExisting = result?.created === false || result?.updated === false
      pushToast?.(
        `${noun} "${savedNode.name || title}" ${reusedExisting ? 'selected' : editKey ? 'updated' : 'added'}.`,
        {
          title: reusedExisting
            ? 'Existing location selected'
            : editKey
              ? 'Location updated'
              : 'Location added',
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

  if (catalogSource === 'api') {
    try {
      if (locationDraftKind !== LOCATION_DRAFT_ZONE && !parentId) {
        setAddLocationError(
          isFireExtinguisherLocationFlow
            ? locationDraftKind === LOCATION_DRAFT_SUB
              ? 'Choose a saved main area before adding a location.'
              : 'Choose a saved zone before adding a main area.'
            : 'Choose a saved main location before adding a sub-location.',
        )
        return
      }

      const savedRow =
        editKey && editingId
          ? await updateInspectionLocationOption(editingId, {
              inspectionType,
              name: title,
              description,
              iconKey: locationDraftKind !== LOCATION_DRAFT_SUB ? newLocationIconKey : '',
            })
          : await createInspectionLocationOption({
              inspectionType,
              parentId: locationDraftKind === LOCATION_DRAFT_ZONE ? null : parentId,
              name: title,
              description,
              iconKey: locationDraftKind !== LOCATION_DRAFT_SUB ? newLocationIconKey : '',
            })

      if (!savedRow) {
        setAddLocationError('Unable to save this location.')
        return
      }

      const nextRows =
        locationDraftKind === LOCATION_DRAFT_SUB
          ? replaceSubLocationRow(backendMainLocations, fallbackMainLocation, savedRow)
          : isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_MAIN
            ? replaceSubLocationRow(backendMainLocations, selectedZoneValue, savedRow)
            : replaceMainLocationRow(backendMainLocations, {
                ...savedRow,
                subLocations: savedRow.subLocations || [],
              })
      setBackendMainLocations(nextRows)
      saveCachedInspectionLocationCatalog(inspectionType, nextRows)

      if (locationDraftKind === LOCATION_DRAFT_SUB) {
        selectSubLocation(savedRow.value || title, getOptionId(savedRow))
      } else if (isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_ZONE) {
        setZone(savedRow.value || title)
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
    iconKey: locationDraftKind !== LOCATION_DRAFT_SUB ? newLocationIconKey : '',
    ...(locationDraftKind !== LOCATION_DRAFT_SUB && existingLocationRow?.subLocations?.length
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
      ? rowsToSaveUnmigrated.map((row) => {
          if (String(row.kind || LOCATION_DRAFT_MAIN) !== LOCATION_DRAFT_SUB) return row
          const oldParentValue = isFireExtinguisherLocationFlow
            ? [selectedZoneValue, editKey].filter(Boolean).join(FIRE_PARENT_SEPARATOR)
            : editKey
          if (!sameKey(row.parentValue, oldParentValue)) return row
          const nextParentValue = isFireExtinguisherLocationFlow
            ? [selectedZoneValue, title].filter(Boolean).join(FIRE_PARENT_SEPARATOR)
            : title
          return { ...row, parentValue: nextParentValue }
        })
      : rowsToSaveUnmigrated

  setCustomLocationTypes(rowsToSave)
  saveCustomLocationTypes(userId, rowsToSave)

  if (locationDraftKind === LOCATION_DRAFT_SUB) {
    selectSubLocation(title)
  } else if (isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_ZONE) {
    setZone(title)
  } else {
    selectMainLocation(title, editKey && sameKey(fallbackMainLocation, editKey) ? subLocation : '')
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

export const removeLocationTypeAction = ({
  value,
  locationDraftKind,
  isFireExtinguisherLocationFlow,
  fireLocationParentValue,
  fallbackMainLocation,
  selectedZoneValue,
  editLocationOptions,
  catalogSource,
  siteLocationCatalog,
  inspectionType,
  backendMainLocations,
  setBackendMainLocations,
  saveCachedInspectionLocationCatalog,
  subLocation,
  updateSetupField,
  pushToast,
  customLocationTypes,
  setCustomLocationTypes,
  saveCustomLocationTypes,
  userId,
  setAddLocationError,
}) => {
  const deleteKey = String(value || '').trim()
  if (!deleteKey) return
  const parentValue =
    locationDraftKind === LOCATION_DRAFT_ZONE
      ? ''
      : locationDraftKind === LOCATION_DRAFT_SUB
        ? isFireExtinguisherLocationFlow
          ? fireLocationParentValue
          : fallbackMainLocation
        : isFireExtinguisherLocationFlow
          ? selectedZoneValue
          : ''
  const targetRow = editLocationOptions.find((row) => sameKey(row.value, deleteKey))

  if (catalogSource === 'site-api') {
    const targetId = getOptionId(targetRow)
    if (!targetId) {
      setAddLocationError('Unable to archive this location because it is missing a database ID.')
      return
    }

    return siteLocationCatalog
      .archiveNode(targetId)
      .then(() => {
        if (locationDraftKind === LOCATION_DRAFT_SUB && sameKey(subLocation, deleteKey)) {
          updateSetupField?.('locationSelection', {
            zone: selectedZoneValue,
            mainLocation: fallbackMainLocation,
            subLocation: '',
            subLocationId: '',
          })
        } else if (
          locationDraftKind === LOCATION_DRAFT_ZONE &&
          sameFireZoneKey(selectedZoneValue, deleteKey)
        ) {
          updateSetupField?.('locationSelection', {
            zone: '',
            zoneId: '',
            mainLocation: '',
            mainLocationId: '',
            subLocation: '',
            subLocationId: '',
          })
        } else if (
          locationDraftKind === LOCATION_DRAFT_MAIN &&
          sameKey(fallbackMainLocation, deleteKey)
        ) {
          updateSetupField?.('locationSelection', {
            zone: selectedZoneValue,
            mainLocation: '',
            mainLocationId: '',
            subLocation: '',
            subLocationId: '',
          })
        }
        pushToast?.('Location removed.', { title: 'Location removed', color: 'warning' })
      })
      .catch((error) => {
        pushToast?.(error?.message || 'Unable to archive this location.', {
          title: 'Location not removed',
          color: 'danger',
        })
      })
  }

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
        } else if (isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_ZONE) {
          if (sameFireZoneKey(selectedZoneValue, deleteKey)) {
            updateSetupField?.('locationSelection', {
              zone: '',
              mainLocation: '',
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
  } else if (isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_ZONE) {
    if (sameFireZoneKey(selectedZoneValue, deleteKey)) {
      updateSetupField?.('locationSelection', {
        zone: '',
        mainLocation: '',
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
