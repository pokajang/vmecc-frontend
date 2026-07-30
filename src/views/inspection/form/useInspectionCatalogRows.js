import { useEffect, useRef, useState } from 'react'
import {
  fetchInspectionEquipmentOptions,
  loadCachedInspectionEquipmentCatalog,
  saveCachedInspectionEquipmentCatalog,
} from 'src/views/inspection/inspectionEquipmentApi'
import {
  fetchFireExtinguisherOptions,
  loadCachedFireExtinguisherCatalog,
  saveCachedFireExtinguisherCatalog,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import {
  fetchFireTruckOptions,
  loadCachedFireTruckCatalog,
  saveCachedFireTruckCatalog,
} from 'src/views/inspection/inspectionFireTruckApi'
import {
  fetchScbaCatalog,
  loadCachedScbaCatalog,
  saveCachedScbaCatalog,
} from 'src/views/inspection/inspectionScbaCatalogApi'
import { defaultFrtTruckOption } from '../types/frt-daily/helpers'

const deferEffectState = (callback) => {
  let active = true
  Promise.resolve().then(() => {
    if (active) callback()
  })
  return () => {
    active = false
  }
}

const clearRows = (setRows) => {
  setRows((current) => (Array.isArray(current) && current.length > 0 ? [] : current))
}

const useInspectionCatalogRows = ({
  getLatestForm,
  isEquipmentCatalogInspectionForm,
  isFireExtinguisherCatalogInspectionForm,
  isFireTruckCatalogInspectionForm,
  isScbaInspectionForm,
  mainLocation,
  normalizeScbaCustomSections,
  scbaCatalogInjectedRef,
  selectedType,
  subLocation,
  updateForm,
  valueLooksLikeSavedInspection,
  zone,
}) => {
  const [equipmentRows, setEquipmentRows] = useState([])
  const [isLoadingEquipmentRows, setIsLoadingEquipmentRows] = useState(false)
  const [fireExtinguisherRows, setFireExtinguisherRows] = useState([])
  const [fireExtinguisherAreaRows, setFireExtinguisherAreaRows] = useState([])
  const [isLoadingFireExtinguisherAreaRows, setIsLoadingFireExtinguisherAreaRows] = useState(false)
  const [isLoadingFireExtinguisherLocationRows, setIsLoadingFireExtinguisherLocationRows] =
    useState(false)
  const [fireTruckRows, setFireTruckRows] = useState([])
  const [isLoadingFireTruckRows, setIsLoadingFireTruckRows] = useState(false)
  const [scbaCatalogSections, setScbaCatalogSections] = useState([])
  const [isLoadingScbaCatalogSections, setIsLoadingScbaCatalogSections] = useState(false)
  const [catalogErrors, setCatalogErrors] = useState({})
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0)
  const scbaInjectionRefs = useRef({
    getLatestForm,
    normalizeScbaCustomSections,
    updateForm,
    valueLooksLikeSavedInspection,
  })

  useEffect(() => {
    scbaInjectionRefs.current = {
      getLatestForm,
      normalizeScbaCustomSections,
      updateForm,
      valueLooksLikeSavedInspection,
    }
  })

  useEffect(() => {
    if (!isEquipmentCatalogInspectionForm || !mainLocation) {
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, equipment: '' }))
        clearRows(setEquipmentRows)
        setIsLoadingEquipmentRows(false)
      })
    }

    let active = true
    const cached = loadCachedInspectionEquipmentCatalog(selectedType, mainLocation)
    const cancelCachedState = deferEffectState(() => {
      if (!active) return
      setCatalogErrors((current) => ({ ...current, equipment: '' }))
      setEquipmentRows(cached)
      setIsLoadingEquipmentRows(true)
    })

    fetchInspectionEquipmentOptions({ inspectionType: selectedType, mainLocation })
      .then(({ data }) => {
        if (!active) return
        setEquipmentRows(data)
        saveCachedInspectionEquipmentCatalog(selectedType, mainLocation, data)
      })
      .catch(() => {
        if (!active) return
        setEquipmentRows(cached)
        setCatalogErrors((current) => ({
          ...current,
          equipment: cached.length
            ? 'The live equipment catalog could not be refreshed. Showing saved equipment.'
            : 'The equipment catalog could not be loaded.',
        }))
      })
      .finally(() => {
        if (!active) return
        setIsLoadingEquipmentRows(false)
      })

    return () => {
      active = false
      cancelCachedState()
    }
  }, [catalogRefreshKey, isEquipmentCatalogInspectionForm, mainLocation, selectedType])

  useEffect(() => {
    if (!isFireExtinguisherCatalogInspectionForm || !zone || !mainLocation) {
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, fireExtinguisherArea: '' }))
        clearRows(setFireExtinguisherAreaRows)
        setIsLoadingFireExtinguisherAreaRows(false)
      })
    }

    let active = true
    const cached = loadCachedFireExtinguisherCatalog(zone, mainLocation, '')
    const cancelCachedState = deferEffectState(() => {
      if (!active) return
      setCatalogErrors((current) => ({ ...current, fireExtinguisherArea: '' }))
      setFireExtinguisherAreaRows(cached)
      setIsLoadingFireExtinguisherAreaRows(true)
    })

    fetchFireExtinguisherOptions({ zone, mainLocation, subLocation: '' })
      .then(({ data }) => {
        if (!active) return
        setFireExtinguisherAreaRows(data)
        saveCachedFireExtinguisherCatalog(zone, mainLocation, '', data)
      })
      .catch(() => {
        if (!active) return
        setFireExtinguisherAreaRows(cached)
        setCatalogErrors((current) => ({
          ...current,
          fireExtinguisherArea: cached.length
            ? 'The live fire extinguisher catalog could not be refreshed. Showing saved equipment.'
            : 'The fire extinguisher catalog could not be loaded.',
        }))
      })
      .finally(() => {
        if (!active) return
        setIsLoadingFireExtinguisherAreaRows(false)
      })

    return () => {
      active = false
      cancelCachedState()
    }
  }, [catalogRefreshKey, isFireExtinguisherCatalogInspectionForm, mainLocation, zone])

  useEffect(() => {
    if (!isFireExtinguisherCatalogInspectionForm || !zone || !mainLocation) {
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, fireExtinguisherLocation: '' }))
        clearRows(setFireExtinguisherRows)
        setIsLoadingFireExtinguisherLocationRows(false)
      })
    }

    if (!subLocation) {
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, fireExtinguisherLocation: '' }))
        clearRows(setFireExtinguisherRows)
        setIsLoadingFireExtinguisherLocationRows(false)
      })
    }

    let active = true
    const cached = loadCachedFireExtinguisherCatalog(zone, mainLocation, subLocation)
    const cancelCachedState = deferEffectState(() => {
      if (!active) return
      setCatalogErrors((current) => ({ ...current, fireExtinguisherLocation: '' }))
      setFireExtinguisherRows(cached)
      setIsLoadingFireExtinguisherLocationRows(true)
    })

    fetchFireExtinguisherOptions({ zone, mainLocation, subLocation })
      .then(({ data }) => {
        if (!active) return
        setFireExtinguisherRows(data)
        saveCachedFireExtinguisherCatalog(zone, mainLocation, subLocation, data)
      })
      .catch(() => {
        if (!active) return
        setFireExtinguisherRows(cached)
        setCatalogErrors((current) => ({
          ...current,
          fireExtinguisherLocation: cached.length
            ? 'The live location catalog could not be refreshed. Showing saved equipment.'
            : 'Equipment for this location could not be loaded.',
        }))
      })
      .finally(() => {
        if (!active) return
        setIsLoadingFireExtinguisherLocationRows(false)
      })

    return () => {
      active = false
      cancelCachedState()
    }
  }, [catalogRefreshKey, isFireExtinguisherCatalogInspectionForm, mainLocation, subLocation, zone])

  useEffect(() => {
    if (!isFireTruckCatalogInspectionForm) {
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, fireTruck: '' }))
        clearRows(setFireTruckRows)
        setIsLoadingFireTruckRows(false)
      })
    }

    let active = true
    const fallback = [defaultFrtTruckOption()].filter(Boolean)
    const cached = loadCachedFireTruckCatalog()
    const cancelCachedState = deferEffectState(() => {
      if (!active) return
      setCatalogErrors((current) => ({ ...current, fireTruck: '' }))
      setFireTruckRows(cached.length > 0 ? cached : fallback)
      setIsLoadingFireTruckRows(true)
    })

    fetchFireTruckOptions()
      .then(({ data }) => {
        if (!active) return
        const rows = data.length > 0 ? data : fallback
        setFireTruckRows(rows)
        saveCachedFireTruckCatalog(rows)
      })
      .catch(() => {
        if (!active) return
        setFireTruckRows(cached.length > 0 ? cached : fallback)
        setCatalogErrors((current) => ({
          ...current,
          fireTruck: cached.length
            ? 'The live fire truck catalog could not be refreshed. Showing saved trucks.'
            : 'The fire truck catalog could not be loaded. Showing the default truck.',
        }))
      })
      .finally(() => {
        if (!active) return
        setIsLoadingFireTruckRows(false)
      })

    return () => {
      active = false
      cancelCachedState()
    }
  }, [catalogRefreshKey, isFireTruckCatalogInspectionForm])

  useEffect(() => {
    if (!isScbaInspectionForm || !mainLocation) {
      scbaCatalogInjectedRef.current = ''
      return deferEffectState(() => {
        setCatalogErrors((current) => ({ ...current, scba: '' }))
        clearRows(setScbaCatalogSections)
        setIsLoadingScbaCatalogSections(false)
      })
    }

    let active = true
    const cached = loadCachedScbaCatalog()
    const cancelCachedState = deferEffectState(() => {
      if (!active) return
      setCatalogErrors((current) => ({ ...current, scba: '' }))
      setScbaCatalogSections(cached)
      setIsLoadingScbaCatalogSections(true)
    })

    const injectCatalogIfFresh = (sections = []) => {
      if (!active || sections.length === 0) return
      const {
        getLatestForm: readLatestForm,
        normalizeScbaCustomSections: normalizeSections,
        updateForm: applyFormUpdate,
        valueLooksLikeSavedInspection: hasSavedInspectionValue,
      } = scbaInjectionRefs.current
      const currentForm = readLatestForm()
      const currentSections = normalizeSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      )
      const hasSnapshot = currentSections.length > 0
      const injectionKey = `${selectedType}:${mainLocation}`
      if (
        hasSnapshot ||
        hasSavedInspectionValue ||
        scbaCatalogInjectedRef.current === injectionKey
      ) {
        return
      }
      scbaCatalogInjectedRef.current = injectionKey
      applyFormUpdate({
        ...currentForm,
        scbaCustomSections: sections,
      })
    }

    injectCatalogIfFresh(cached)

    fetchScbaCatalog({ mainLocation })
      .then(({ data }) => {
        if (!active) return
        setScbaCatalogSections(data)
        saveCachedScbaCatalog(data)
        injectCatalogIfFresh(data)
      })
      .catch(() => {
        if (!active) return
        setScbaCatalogSections(cached)
        setCatalogErrors((current) => ({
          ...current,
          scba: cached.length
            ? 'The live SCBA catalog could not be refreshed. Showing saved equipment.'
            : 'The SCBA catalog could not be loaded.',
        }))
      })
      .finally(() => {
        if (!active) return
        setIsLoadingScbaCatalogSections(false)
      })

    return () => {
      active = false
      cancelCachedState()
    }
  }, [catalogRefreshKey, isScbaInspectionForm, mainLocation, scbaCatalogInjectedRef, selectedType])

  return {
    equipmentRows,
    catalogErrors,
    fireExtinguisherAreaRows,
    fireExtinguisherRows,
    fireTruckRows,
    isLoadingEquipmentRows,
    isLoadingFireExtinguisherAreaRows,
    isLoadingFireExtinguisherRows: subLocation
      ? isLoadingFireExtinguisherLocationRows
      : isLoadingFireExtinguisherAreaRows,
    isLoadingFireTruckRows,
    isLoadingScbaCatalogSections,
    scbaCatalogSections,
    setEquipmentRows,
    setFireExtinguisherRows,
    setFireTruckRows,
    setScbaCatalogSections,
    retryCatalogs: () => setCatalogRefreshKey((current) => current + 1),
  }
}

export default useInspectionCatalogRows
