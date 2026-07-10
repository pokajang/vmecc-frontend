import { useState } from 'react'
import {
  createInspectionEquipmentOption,
  deleteInspectionEquipmentOption,
  saveCachedInspectionEquipmentCatalog,
  updateInspectionEquipmentOption,
} from 'src/views/inspection/inspectionEquipmentApi'
import {
  createFireExtinguisherOption,
  deleteFireExtinguisherOption,
  saveCachedFireExtinguisherCatalog,
  lookupFireExtinguisherByLocator,
  normalizeFireExtinguisherCatalogRows,
  updateFireExtinguisherOption,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import {
  normalizeErAuxEquipmentRows,
  normalizeHydraulicEquipmentRows,
} from './inspectionFormHelpers'
import { extractFireExtinguisherLocator } from '../types/fire-extinguisher/locator'
import { sameFireExtinguisherAsset } from '../types/fire-extinguisher/identity'
import useInspectionFireTruckManager from './useInspectionFireTruckManager'

const useInspectionCatalogManagers = ({
  checksField,
  currentStructuredSummary,
  equipmentRows,
  equipmentRowsField,
  fireExtinguisherRows,
  fireTruckRows,
  form,
  getLatestForm,
  mainLocation,
  pushToast,
  selectFireTruck,
  selectedType,
  selectedTypeDefinition,
  setEquipmentRows,
  setFireExtinguisherRows,
  setFireTruckRows,
  subLocation,
  updateForm,
  zone,
}) => {
  const [fireExtinguisherDeleteTarget, setFireExtinguisherDeleteTarget] = useState(null)
  const [equipmentDeleteTarget, setEquipmentDeleteTarget] = useState(null)
  const [isDeletingEquipment, setIsDeletingEquipment] = useState(false)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [equipmentEditMode, setEquipmentEditMode] = useState(false)
  const [editingEquipmentId, setEditingEquipmentId] = useState('')
  const [editingLocalEquipmentId, setEditingLocalEquipmentId] = useState('')
  const [newEquipmentName, setNewEquipmentName] = useState('')
  const [newEquipmentDescription, setNewEquipmentDescription] = useState('')
  const [equipmentError, setEquipmentError] = useState('')
  const fireTruck = useInspectionFireTruckManager({
    fireTruckRows,
    getLatestForm,
    pushToast,
    selectFireTruck,
    setFireTruckRows,
    updateForm,
  })

  const persistEquipmentRows = (rows) => {
    const normalizedRows =
      selectedTypeDefinition?.normalizeEquipmentRows?.(rows) ||
      (checksField === 'erAuxChecks'
        ? normalizeErAuxEquipmentRows(rows)
        : normalizeHydraulicEquipmentRows(rows))
    setEquipmentRows(normalizedRows)
    saveCachedInspectionEquipmentCatalog(selectedType, mainLocation, normalizedRows)
  }

  const getLocalManageableEquipmentRows = () => {
    const sourceRows =
      equipmentRows.length > 0 ? equipmentRows : currentStructuredSummary?.visibleChecks || []

    return sourceRows.map((row) => {
      const rowId = String(row?.id || row?.equipmentId || row?.equipment || '').trim()
      return {
        ...row,
        id: rowId,
        equipmentId: row?.equipmentId || '',
        equipment: row?.equipment || row?.title || row?.name || '',
        title: row?.title || row?.equipment || row?.name || '',
        description: row?.description || row?.equipmentDescription || '',
        equipmentDescription: row?.equipmentDescription || row?.description || '',
        equipmentSource:
          row?.equipmentSource && row.equipmentSource !== 'seed' ? row.equipmentSource : 'local',
        isLocalSeedEquipment: row?.isLocalSeedEquipment === true || !row?.equipmentId,
        canEdit: true,
        canDelete: true,
      }
    })
  }

  const getEquipmentBackendId = (row = {}) =>
    String(
      row?.equipmentId ??
        row?.equipment_id ??
        row?.equipmentCatalogId ??
        row?.equipment_catalog_id ??
        '',
    ).trim()

  const getEquipmentRowId = (row = {}) => String(row?.id || '').trim()

  const getEquipmentName = (row = {}) =>
    String(row?.equipment || row?.title || row?.name || row?.value || '').trim()

  const isSameEquipmentRow = (target = {}, candidate = {}) => {
    const targetBackendId = getEquipmentBackendId(target)
    const candidateBackendId = getEquipmentBackendId(candidate)
    if (targetBackendId && candidateBackendId) return targetBackendId === candidateBackendId

    const targetRowId = getEquipmentRowId(target)
    const candidateRowId = getEquipmentRowId(candidate)
    if (targetRowId && candidateRowId) return targetRowId === candidateRowId

    const targetName = getEquipmentName(target).toLowerCase()
    const candidateName = getEquipmentName(candidate).toLowerCase()
    return Boolean(targetName && candidateName && targetName === candidateName)
  }

  const removeEquipmentLocally = (row) => {
    const nextRows = getLocalManageableEquipmentRows().filter(
      (currentRow) => !isSameEquipmentRow(row, currentRow),
    )
    const latest = getLatestForm()
    persistEquipmentRows(nextRows)
    updateForm({
      ...latest,
      ...(equipmentRowsField ? { [equipmentRowsField]: nextRows } : {}),
      ...(checksField
        ? {
            [checksField]: (latest[checksField] || []).filter(
              (check) => !isSameEquipmentRow(row, check),
            ),
          }
        : {}),
    })
  }

  const persistFireExtinguisherRows = (rows) => {
    setFireExtinguisherRows(rows)
    saveCachedFireExtinguisherCatalog(zone, mainLocation, subLocation, rows)
  }

  const addFireExtinguisher = async (payload) => {
    try {
      const saved = await createFireExtinguisherOption({
        ...payload,
        zone: payload.zone || zone,
        mainLocation: payload.mainLocation || mainLocation,
        subLocation: payload.subLocation || subLocation,
      })
      if (!saved) throw new Error('Fire extinguisher was not saved.')
      persistFireExtinguisherRows([...fireExtinguisherRows, saved])
      pushToast('Fire extinguisher added.', { title: 'Catalog saved', color: 'success' })
      return saved
    } catch (error) {
      pushToast(
        error?.response?.data?.message || error?.message || 'Unable to save extinguisher.',
        {
          title: 'Save failed',
          color: 'danger',
        },
      )
      return false
    }
  }

  const updateFireExtinguisher = async (row, payload) => {
    const catalogId = String(row?.catalogId || row?.id || '').trim()
    if (!catalogId) return false
    try {
      const saved = await updateFireExtinguisherOption(catalogId, {
        ...payload,
        zone: payload.zone || zone,
        mainLocation: payload.mainLocation || mainLocation,
        subLocation: payload.subLocation || subLocation,
      })
      if (!saved) throw new Error('Fire extinguisher was not saved.')
      persistFireExtinguisherRows(
        fireExtinguisherRows.map((currentRow) =>
          String(currentRow.catalogId || currentRow.id || '') === catalogId ? saved : currentRow,
        ),
      )
      pushToast(
        row?.equipmentSource === 'seed'
          ? 'Shared extinguisher updated.'
          : 'Fire extinguisher updated.',
        { title: 'Catalog saved', color: 'success' },
      )
      return saved
    } catch (error) {
      pushToast(
        error?.response?.data?.message || error?.message || 'Unable to update extinguisher.',
        {
          title: 'Save failed',
          color: 'danger',
        },
      )
      return false
    }
  }

  const filterFireExtinguisherLocatorConflicts = async ({ locator = '', catalogId = '' } = {}) => {
    const normalizedLocator = extractFireExtinguisherLocator(locator)
    if (!normalizedLocator) return []
    const targetCatalogId = String(catalogId || '').trim()

    try {
      const lookup = await lookupFireExtinguisherByLocator(normalizedLocator)
      const row = lookup?.data || null
      if (!row) return []
      return String(row.catalogId || row.id || '').trim() === targetCatalogId ? [] : [row]
    } catch (error) {
      if (Number(error?.status || 0) === 404) return []
      if (Number(error?.status || 0) === 409) {
        const rows = Array.isArray(error?.payload?.data) ? error.payload.data : []
        const normalized = normalizeFireExtinguisherCatalogRows(rows)
        return normalized.filter(
          (candidate) =>
            String(candidate?.catalogId || candidate?.id || '').trim() !== targetCatalogId,
        )
      }
      throw error
    }
  }

  const deleteFireExtinguisher = async (row) => {
    const catalogId = String(row?.catalogId || row?.id || '').trim()
    if (!catalogId) return
    try {
      await deleteFireExtinguisherOption(catalogId)
      persistFireExtinguisherRows(
        fireExtinguisherRows.filter(
          (currentRow) => String(currentRow.catalogId || currentRow.id || '') !== catalogId,
        ),
      )
      const rowId = String(row?.id || '').trim()
      const latest = getLatestForm()
      updateForm({
        ...latest,
        fireExtinguisherChecks: (latest.fireExtinguisherChecks || []).filter(
          (check) => !sameFireExtinguisherAsset(check, row) && String(check.id || '') !== rowId,
        ),
      })
      pushToast(
        row?.equipmentSource === 'seed'
          ? 'Shared extinguisher removed from catalog.'
          : 'Fire extinguisher deleted.',
        { title: 'Catalog updated', color: 'success' },
      )
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to delete extinguisher.', {
        title: 'Delete failed',
        color: 'danger',
      })
    }
  }

  const openAddEquipmentModal = () => {
    fireTruck.closeFireTruckModal()
    setEquipmentEditMode(false)
    setEditingEquipmentId('')
    setEditingLocalEquipmentId('')
    setNewEquipmentName('')
    setNewEquipmentDescription('')
    setEquipmentError('')
    setShowEquipmentModal(true)
  }

  const startEditEquipment = (row) => {
    setEquipmentEditMode(false)
    const equipmentId = getEquipmentBackendId(row)
    const localId = !equipmentId
      ? String(row?.id || row?.value || row?.equipment || row?.title || '').trim()
      : ''
    setEditingEquipmentId(equipmentId)
    setEditingLocalEquipmentId(localId)
    setNewEquipmentName(String(row?.equipment || row?.title || '').trim())
    setNewEquipmentDescription(String(row?.description || row?.equipmentDescription || '').trim())
    setEquipmentError('')
  }

  const openEditEquipmentModal = (row) => {
    fireTruck.closeFireTruckModal()
    setShowEquipmentModal(true)
    startEditEquipment(row)
  }

  const closeEquipmentModal = () => {
    setShowEquipmentModal(false)
    setEquipmentEditMode(false)
    setEditingEquipmentId('')
    setEditingLocalEquipmentId('')
    setNewEquipmentName('')
    setNewEquipmentDescription('')
    setEquipmentError('')
  }

  const openAddFireTruckModal = () => {
    closeEquipmentModal()
    fireTruck.openAddFireTruckModal()
  }

  const startEditFireTruck = (truck) => {
    closeEquipmentModal()
    fireTruck.startEditFireTruck(truck)
  }

  const saveEquipment = async () => {
    const name = String(newEquipmentName || '').trim()
    if (!name) {
      setEquipmentError('Enter an equipment name.')
      return
    }
    if (!mainLocation) {
      setEquipmentError('Choose a main location first.')
      return
    }

    if (editingLocalEquipmentId) {
      const nextRows = getLocalManageableEquipmentRows().map((row) =>
        String(row.id || '') === String(editingLocalEquipmentId)
          ? {
              ...row,
              equipment: name,
              title: name,
              value: name,
              description: newEquipmentDescription,
              equipmentDescription: newEquipmentDescription,
              canEdit: true,
              canDelete: true,
            }
          : row,
      )
      persistEquipmentRows(nextRows)
      const latest = getLatestForm()
      updateForm({
        ...latest,
        ...(equipmentRowsField ? { [equipmentRowsField]: nextRows } : {}),
        ...(checksField
          ? {
              [checksField]: (latest[checksField] || []).map((check) =>
                String(check.id || '') === String(editingLocalEquipmentId)
                  ? {
                      ...check,
                      equipment: name,
                      title: name,
                      equipmentDescription: newEquipmentDescription,
                      description: newEquipmentDescription,
                    }
                  : check,
              ),
            }
          : {}),
      })
      closeEquipmentModal()
      pushToast('Equipment updated.', {
        title: 'Equipment saved',
        color: 'success',
      })
      return
    }

    try {
      const saved = editingEquipmentId
        ? await updateInspectionEquipmentOption(editingEquipmentId, {
            name,
            description: newEquipmentDescription,
          })
        : await createInspectionEquipmentOption({
            inspectionType: selectedType,
            mainLocation,
            mainLocationId: form.mainLocationId,
            name,
            description: newEquipmentDescription,
          })
      if (!saved) throw new Error('Equipment was not saved.')

      const baseRows = getLocalManageableEquipmentRows()
      const nextRows = editingEquipmentId
        ? baseRows.map((row) =>
            String(getEquipmentBackendId(row) || row.id || '') === String(editingEquipmentId)
              ? saved
              : row,
          )
        : [...baseRows, saved]
      persistEquipmentRows(nextRows)
      closeEquipmentModal()
      pushToast(editingEquipmentId ? 'Equipment updated.' : 'Equipment added.', {
        title: 'Equipment saved',
        color: 'success',
      })
    } catch (error) {
      setEquipmentError(
        error?.response?.data?.message || error?.message || 'Unable to save equipment.',
      )
    }
  }

  const deleteEquipment = async (row) => {
    if (isDeletingEquipment) return
    const equipmentId = getEquipmentBackendId(row)

    if (!equipmentId) {
      removeEquipmentLocally(row)
      setEquipmentDeleteTarget(null)
      pushToast('Equipment deleted.', {
        title: 'Equipment updated',
        color: 'success',
      })
      return
    }

    setIsDeletingEquipment(true)
    try {
      await deleteInspectionEquipmentOption(equipmentId)
      removeEquipmentLocally(row)
      setEquipmentDeleteTarget(null)
      pushToast('Equipment deleted.', {
        title: 'Equipment updated',
        color: 'success',
      })
    } catch (error) {
      if (Number(error?.status || 0) === 404) {
        removeEquipmentLocally(row)
        setEquipmentDeleteTarget(null)
        pushToast('Removed stale equipment from this form.', {
          title: 'Equipment updated',
          color: 'warning',
        })
      } else {
        setEquipmentDeleteTarget(null)
        pushToast(
          error?.response?.data?.message ||
            error?.payload?.message ||
            error?.message ||
            'Unable to delete equipment.',
          {
            title: 'Delete failed',
            color: 'danger',
          },
        )
      }
    } finally {
      setIsDeletingEquipment(false)
    }
  }

  return {
    addFireExtinguisher,
    closeEquipmentModal,
    closeFireTruckModal: fireTruck.closeFireTruckModal,
    deleteEquipment,
    deleteFireExtinguisher,
    deleteFireTruck: fireTruck.deleteFireTruck,
    editingEquipmentId,
    editingFireTruckId: fireTruck.editingFireTruckId,
    editingLocalEquipmentId,
    equipmentDeleteTarget,
    equipmentEditMode,
    equipmentError,
    fireExtinguisherDeleteTarget,
    fireTruckDeleteTarget: fireTruck.fireTruckDeleteTarget,
    fireTruckError: fireTruck.fireTruckError,
    getEquipmentBackendId,
    getEquipmentRowId,
    isDeletingEquipment,
    newEquipmentDescription,
    newEquipmentName,
    newTruckInsuranceExpiry: fireTruck.newTruckInsuranceExpiry,
    newTruckName: fireTruck.newTruckName,
    newTruckPlateNo: fireTruck.newTruckPlateNo,
    newTruckPuspakomExpiry: fireTruck.newTruckPuspakomExpiry,
    newTruckRoadTaxExpiry: fireTruck.newTruckRoadTaxExpiry,
    openAddEquipmentModal,
    openAddFireTruckModal,
    openEditEquipmentModal,
    saveEquipment,
    saveFireTruck: fireTruck.saveFireTruck,
    setEditingEquipmentMode: setEquipmentEditMode,
    setEquipmentDeleteTarget,
    setEquipmentError,
    filterFireExtinguisherLocatorConflicts,
    setFireExtinguisherDeleteTarget,
    setFireTruckDeleteTarget: fireTruck.setFireTruckDeleteTarget,
    setFireTruckError: fireTruck.setFireTruckError,
    setNewEquipmentDescription,
    setNewEquipmentName,
    setNewTruckInsuranceExpiry: fireTruck.setNewTruckInsuranceExpiry,
    setNewTruckName: fireTruck.setNewTruckName,
    setNewTruckPlateNo: fireTruck.setNewTruckPlateNo,
    setNewTruckPuspakomExpiry: fireTruck.setNewTruckPuspakomExpiry,
    setNewTruckRoadTaxExpiry: fireTruck.setNewTruckRoadTaxExpiry,
    setShowEquipmentModal,
    showEquipmentModal,
    showFireTruckModal: fireTruck.showFireTruckModal,
    startEditEquipment,
    startEditFireTruck,
    updateFireExtinguisher,
  }
}

export default useInspectionCatalogManagers
