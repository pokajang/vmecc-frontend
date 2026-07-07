import { useState } from 'react'
import {
  createFireTruckOption,
  deleteFireTruckOption,
  normalizeFireTruckCatalogRows,
  saveCachedFireTruckCatalog,
  updateFireTruckOption,
} from 'src/views/inspection/inspectionFireTruckApi'
import { normalizeFrtTruckOption, resolveSelectedFrtTruckPlate } from '../types/frt-daily/helpers'

const useInspectionFireTruckManager = ({
  fireTruckRows,
  getLatestForm,
  pushToast,
  selectFireTruck,
  setFireTruckRows,
  updateForm,
}) => {
  const [fireTruckDeleteTarget, setFireTruckDeleteTarget] = useState(null)
  const [showFireTruckModal, setShowFireTruckModal] = useState(false)
  const [editingFireTruckId, setEditingFireTruckId] = useState('')
  const [editingFireTruckPlateNo, setEditingFireTruckPlateNo] = useState('')
  const [newTruckPlateNo, setNewTruckPlateNo] = useState('')
  const [newTruckName, setNewTruckName] = useState('')
  const [newTruckRoadTaxExpiry, setNewTruckRoadTaxExpiry] = useState('')
  const [newTruckInsuranceExpiry, setNewTruckInsuranceExpiry] = useState('')
  const [newTruckPuspakomExpiry, setNewTruckPuspakomExpiry] = useState('')
  const [fireTruckError, setFireTruckError] = useState('')

  const persistFireTruckRows = (rows) => {
    const nextRows = normalizeFireTruckCatalogRows(rows)
    setFireTruckRows(nextRows)
    saveCachedFireTruckCatalog(nextRows)
    return nextRows
  }

  const openAddFireTruckModal = () => {
    setEditingFireTruckId('')
    setEditingFireTruckPlateNo('')
    setNewTruckPlateNo('')
    setNewTruckName('')
    setNewTruckRoadTaxExpiry('')
    setNewTruckInsuranceExpiry('')
    setNewTruckPuspakomExpiry('')
    setFireTruckError('')
    setShowFireTruckModal(true)
  }

  const startEditFireTruck = (truck) => {
    const normalizedTruck = normalizeFrtTruckOption(truck)
    if (!normalizedTruck) return
    setEditingFireTruckId(String(normalizedTruck.truckId || normalizedTruck.id || '').trim())
    setEditingFireTruckPlateNo(normalizedTruck.plateNo)
    setNewTruckPlateNo(normalizedTruck.plateNo)
    setNewTruckName(normalizedTruck.name || '')
    setNewTruckRoadTaxExpiry(normalizedTruck.roadTaxExpiry || '')
    setNewTruckInsuranceExpiry(normalizedTruck.insuranceExpiry || '')
    setNewTruckPuspakomExpiry(normalizedTruck.puspakomExpiry || '')
    setFireTruckError('')
    setShowFireTruckModal(true)
  }

  const closeFireTruckModal = () => {
    setShowFireTruckModal(false)
    setEditingFireTruckId('')
    setEditingFireTruckPlateNo('')
    setNewTruckPlateNo('')
    setNewTruckName('')
    setNewTruckRoadTaxExpiry('')
    setNewTruckInsuranceExpiry('')
    setNewTruckPuspakomExpiry('')
    setFireTruckError('')
  }

  const saveFireTruck = async () => {
    const plateNo = String(newTruckPlateNo || '')
      .trim()
      .toUpperCase()
    const truckId = String(editingFireTruckId || '').trim()
    if (!plateNo) {
      setFireTruckError('Enter a truck plate number.')
      return
    }

    try {
      const payload = {
        plateNo,
        name: newTruckName,
        roadTaxExpiry: newTruckRoadTaxExpiry,
        insuranceExpiry: newTruckInsuranceExpiry,
        puspakomExpiry: newTruckPuspakomExpiry,
      }
      const saved = truckId
        ? await updateFireTruckOption(truckId, payload)
        : await createFireTruckOption(payload)
      if (!saved) throw new Error('Truck was not saved.')

      let didReplaceTruck = false
      const nextRows = truckId
        ? fireTruckRows.map((row) => {
            if (String(row.truckId || row.id || '').trim() !== truckId) return row
            didReplaceTruck = true
            return saved
          })
        : [...fireTruckRows, saved]
      if (truckId && !didReplaceTruck) nextRows.push(saved)
      persistFireTruckRows(nextRows)
      const latest = getLatestForm()
      const selectedId = String(latest.frtTruckId || latest.mainLocationId || '').trim()
      const selectedPlate = String(resolveSelectedFrtTruckPlate(latest) || '')
        .trim()
        .toUpperCase()
      const wasSelected =
        !truckId ||
        (selectedId && selectedId === truckId) ||
        (editingFireTruckPlateNo &&
          selectedPlate ===
            String(editingFireTruckPlateNo || '')
              .trim()
              .toUpperCase())
      if (wasSelected) selectFireTruck(saved)
      closeFireTruckModal()
      pushToast(truckId ? 'Truck updated.' : 'Truck added.', {
        title: 'Truck saved',
        color: 'success',
      })
    } catch (error) {
      setFireTruckError(error?.response?.data?.message || error?.message || 'Unable to save truck.')
    }
  }

  const deleteFireTruck = async (truck) => {
    const normalizedTruck = normalizeFrtTruckOption(truck)
    const truckId = String(
      normalizedTruck?.truckId || normalizedTruck?.id || truck?.truckId || truck?.id || '',
    ).trim()
    const plateNo = String(normalizedTruck?.plateNo || truck?.plateNo || truck?.value || '')
      .trim()
      .toUpperCase()
    if (!truckId) return

    try {
      await deleteFireTruckOption(truckId)
      persistFireTruckRows(
        fireTruckRows.filter((row) => String(row.truckId || row.id || '').trim() !== truckId),
      )
      const latest = getLatestForm()
      const selectedId = String(latest.frtTruckId || latest.mainLocationId || '').trim()
      const selectedPlate = String(resolveSelectedFrtTruckPlate(latest) || '')
        .trim()
        .toUpperCase()
      if ((selectedId && selectedId === truckId) || (plateNo && selectedPlate === plateNo)) {
        updateForm({
          ...latest,
          mainLocation: '',
          selectedLocation: '',
          zone: '',
          zoneId: '',
          subLocation: '',
          mainLocationId: '',
          subLocationId: '',
          frtTruckId: '',
          frtTruckPlateNo: '',
          frtTruckReference: {
            truckId: '',
            name: '',
            plateNo: '',
            roadTaxExpiry: '',
            insuranceExpiry: '',
            puspakomExpiry: '',
          },
        })
      }
      setFireTruckDeleteTarget(null)
      pushToast('Truck deleted.', {
        title: 'Truck updated',
        color: 'success',
      })
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to delete truck.', {
        title: 'Delete failed',
        color: 'danger',
      })
    }
  }

  return {
    closeFireTruckModal,
    deleteFireTruck,
    editingFireTruckId,
    fireTruckDeleteTarget,
    fireTruckError,
    newTruckInsuranceExpiry,
    newTruckName,
    newTruckPlateNo,
    newTruckPuspakomExpiry,
    newTruckRoadTaxExpiry,
    openAddFireTruckModal,
    saveFireTruck,
    setFireTruckDeleteTarget,
    setFireTruckError,
    setNewTruckInsuranceExpiry,
    setNewTruckName,
    setNewTruckPlateNo,
    setNewTruckPuspakomExpiry,
    setNewTruckRoadTaxExpiry,
    showFireTruckModal,
    startEditFireTruck,
  }
}

export default useInspectionFireTruckManager
