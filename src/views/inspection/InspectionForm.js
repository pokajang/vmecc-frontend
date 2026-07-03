import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import FormActionGroup from 'src/components/FormActionGroup'
import IconOptionGrid from 'src/components/IconOptionGrid'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import useIncidentTypeManager, {
  INCIDENT_TYPE_TOGGLE_VALUE,
} from 'src/views/inspection/useIncidentTypeManager'
import useLocationTypeManager, {
  LOCATION_TOGGLE_VALUE,
} from 'src/views/inspection/useLocationTypeManager'
import {
  ACTIVE_CARD_STYLE,
  resolveTypeIcon,
  TOGGLE_CARD_PROPS,
} from 'src/views/inspection/typeOptionUtils'
import { uid } from 'src/views/inspection/inspectionSharedUtils'
import {
  ChipButton,
  ChipRow,
  FormFieldError,
  InspectionGeneralEvidenceCard,
  InspectionSelectedTypeCard,
} from 'src/views/inspection/components/InspectionFormDisplaySections'
import InspectionLocationOptionPicker from 'src/views/inspection/components/InspectionLocationOptionPicker'
import { getInspectionTypeDefinition } from './app/inspectionTypeRegistry'
import {
  INSPECTION_DESCRIPTION_CHIPS,
  applySessionInspector,
  appendInspectionText,
  getErAuxCheckSummary,
  getFrtCheckSummary,
  getHighAngleCheckSummary,
  getFirstMissingInspectionField,
  getHydraulicCheckSummary,
  getInspectionFormValidationState,
  getScbaCheckSummary,
  getInspectionChecklistChips,
  getInspectionFormMissingFields,
  getDefaultInspectionDateTime,
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  HYDRAULIC_CHECK_FIELDS,
  HIGH_ANGLE_CONDITION_FIELD,
  HIGH_ANGLE_STATUS_OPTIONS,
  SCBA_SECTION_DEFINITIONS,
  SCBA_STATUS_OPTIONS,
  getScbaFieldEvidenceKeys,
  normalizeScbaCustomSections,
  isGeneralInspectionType,
  isInspectionChecklistItemSelected,
  isInspectionFormValid,
  normalizeErAuxEquipmentRows,
  normalizeHydraulicEquipmentRows,
  normalizeInspectionForm,
  toggleHseSelection,
  toggleInspectionChecklistItem,
} from './inspectionFormHelpers'
import {
  createInspectionEquipmentOption,
  deleteInspectionEquipmentOption,
  fetchInspectionEquipmentOptions,
  loadCachedInspectionEquipmentCatalog,
  saveCachedInspectionEquipmentCatalog,
  updateInspectionEquipmentOption,
} from './inspectionEquipmentApi'
import {
  createFireExtinguisherOption,
  deleteFireExtinguisherOption,
  fetchFireExtinguisherOptions,
  loadCachedFireExtinguisherCatalog,
  saveCachedFireExtinguisherCatalog,
  updateFireExtinguisherOption,
} from './inspectionFireExtinguisherApi'
import {
  createFireTruckOption,
  deleteFireTruckOption,
  fetchFireTruckOptions,
  loadCachedFireTruckCatalog,
  normalizeFireTruckCatalogRows,
  saveCachedFireTruckCatalog,
  updateFireTruckOption,
} from './inspectionFireTruckApi'
import {
  archiveScbaCatalogItem,
  archiveScbaCatalogSection,
  createScbaCatalogItem,
  createScbaCatalogSection,
  fetchScbaCatalog,
  loadCachedScbaCatalog,
  saveCachedScbaCatalog,
  updateScbaCatalogItem,
  updateScbaCatalogSection,
} from './inspectionScbaCatalogApi'
import {
  defaultFrtTruckOption,
  normalizeFrtTruckOption,
  resolveSelectedFrtTruckPlate,
} from './types/frt-daily/helpers'

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const TARGET_PHOTO_BYTES = 1.0 * 1024 * 1024
const MAX_PHOTO_COUNT = 10
const MAX_TOTAL_PHOTO_BYTES = 12 * 1024 * 1024
const COMPRESS_DIMENSION_CANDIDATES = [2048, 1920, 1600, 1365, 1280, 1024, 900, 768, 640, 512]
const COMPRESS_QUALITY_CANDIDATES = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.32]

const estimateDataUrlBytes = (value = '') => {
  const match = /^data:[^;]+;base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ''))
  if (!match) return 0
  const base64 = String(match[1] || '').replace(/\s+/g, '')
  if (!base64) return 0
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

const replaceFileExtension = (name, extension) => {
  const base =
    String(name || '')
      .replace(/\.[^.]+$/, '')
      .trim() || 'photo'
  return `${base}.${extension}`
}

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read selected image.'))
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to compress selected image.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

const compressInspectionPhoto = async (file, targetBytes) => {
  if (
    !file ||
    !String(file.type || '')
      .toLowerCase()
      .startsWith('image/')
  ) {
    return file
  }
  if (Number(file.size || 0) <= targetBytes) return file

  const image = await loadImageElement(file)
  const targetMime = 'image/jpeg'
  let bestBlob = null

  for (const maxDimension of COMPRESS_DIMENSION_CANDIDATES) {
    const ratio = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1))
    const nextWidth = Math.max(1, Math.round((image.width || 1) * ratio))
    const nextHeight = Math.max(1, Math.round((image.height || 1) * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = nextWidth
    canvas.height = nextHeight

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to process selected image.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, nextWidth, nextHeight)
    context.drawImage(image, 0, 0, nextWidth, nextHeight)

    for (const quality of COMPRESS_QUALITY_CANDIDATES) {
      const candidate = await canvasToBlob(canvas, targetMime, quality)
      if (!bestBlob || candidate.size < bestBlob.size) bestBlob = candidate
      if (candidate.size <= targetBytes) break
    }

    if (bestBlob?.size <= targetBytes) break
  }

  if (!bestBlob) return file

  const compressedFile = new File([bestBlob], replaceFileExtension(file.name, 'jpg'), {
    type: bestBlob.type || 'image/jpeg',
    lastModified: Date.now(),
  })

  return compressedFile.size < file.size ? compressedFile : file
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })

const collectInspectionPhotos = (form = {}) => [
  ...(Array.isArray(form.photos) ? form.photos : []),
  ...(Array.isArray(form.fireExtinguisherChecks)
    ? form.fireExtinguisherChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...FIRE_EXTINGUISHER_CHECK_FIELDS.flatMap((field) =>
          Array.isArray(check[field.photosKey]) ? check[field.photosKey] : [],
        ),
      ])
    : []),
  ...(Array.isArray(form.hydraulicChecks)
    ? form.hydraulicChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...HYDRAULIC_CHECK_FIELDS.flatMap((field) =>
          Array.isArray(check[field.photosKey]) ? check[field.photosKey] : [],
        ),
      ])
    : []),
  ...(Array.isArray(form.erAuxChecks)
    ? form.erAuxChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...(Array.isArray(check.defectPhotos) ? check.defectPhotos : []),
      ])
    : []),
  ...(Array.isArray(form.frtDailyChecks)
    ? form.frtDailyChecks.flatMap((check) => (Array.isArray(check.photos) ? check.photos : []))
    : []),
  ...(Array.isArray(form.frtOneOffChecks)
    ? form.frtOneOffChecks.flatMap((check) => (Array.isArray(check.photos) ? check.photos : []))
    : []),
  ...(Array.isArray(form.highAngleChecks)
    ? form.highAngleChecks.flatMap((check) =>
        Array.isArray(check[HIGH_ANGLE_CONDITION_FIELD.photosKey])
          ? check[HIGH_ANGLE_CONDITION_FIELD.photosKey]
          : [],
      )
    : []),
  ...SCBA_SECTION_DEFINITIONS.flatMap((section) => {
    const checks =
      section.key === 'backPlate'
        ? form.scbaBackPlateChecks
        : section.key === 'cylinder'
          ? form.scbaCylinderChecks
          : form.scbaFaceMaskChecks
    return (Array.isArray(checks) ? checks : []).flatMap((check) => [
      ...(Array.isArray(check.photos) ? check.photos : []),
      ...(section.fields || []).flatMap((field) => {
        if (field.kind !== 'status') return []
        const { photosKey } = getScbaFieldEvidenceKeys(field)
        return Array.isArray(check[photosKey]) ? check[photosKey] : []
      }),
    ])
  }),
  ...normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections).flatMap(
    (section) =>
      (Array.isArray(section.rows) ? section.rows : []).flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...(section.fields || []).flatMap((field) => {
          const { photosKey } = getScbaFieldEvidenceKeys(field)
          return Array.isArray(check[photosKey]) ? check[photosKey] : []
        }),
      ]),
  ),
]

const INSPECTION_TIMESTAMP_FIELDS = [
  'inspectedAt',
  'inspected_at',
  'inspectionDateTime',
  'inspection_date_time',
  'erAuxInspectionDate',
  'er_aux_inspection_date',
  'fireExtinguisherInspectionDate',
  'fire_extinguisher_inspection_date',
  'frtInspectionDate',
  'frt_inspection_date',
  'highAngleInspectionDate',
  'high_angle_inspection_date',
  'scbaInspectionDate',
  'scba_inspection_date',
  'hseInspectionDate',
  'hse_inspection_date',
]

const hasInspectionTimestampField = (value = {}) =>
  INSPECTION_TIMESTAMP_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(value, field))

const slugSegment = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const customFieldKeyFromLabel = (label = '') => {
  const slug = slugSegment(label) || 'check'
  return slug.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())
}

const InspectionForm = ({
  user,
  value,
  pushToast,
  onChange,
  onSaveDraft,
  onRequestReview,
  draftStatus = '',
}) => {
  const form = useMemo(() => {
    const source = value && typeof value === 'object' ? value : {}
    return normalizeInspectionForm(
      hasInspectionTimestampField(source)
        ? source
        : {
            ...source,
            inspectedAt: getDefaultInspectionDateTime(),
          },
    )
  }, [value])
  const latestFormRef = useRef(form)
  const inspectionTypeRef = useRef(null)
  const inspectedAtRef = useRef(null)
  const selectedLocationRef = useRef(null)
  const descriptionRef = useRef(null)
  const erAuxChecksRef = useRef(null)
  const hydraulicChecksRef = useRef(null)
  const fireExtinguisherChecksRef = useRef(null)
  const frtChecksRef = useRef(null)
  const highAngleChecksRef = useRef(null)
  const scbaChecksRef = useRef(null)
  const scbaCatalogInjectedRef = useRef('')
  const hseObservationRef = useRef(null)
  const photosRef = useRef(null)
  const selectedLocation = String(form.selectedLocation || '').trim()
  const mainLocation = String(form.mainLocation || '').trim()
  const subLocation = String(form.subLocation || '').trim()
  const selectedType = String(form.inspectionType || '').trim()
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const photoUploadTargetRef = useRef({ kind: 'root' })
  const [locationDeleteTarget, setLocationDeleteTarget] = useState(null)
  const [incidentDeleteTarget, setIncidentDeleteTarget] = useState(null)
  const [fireExtinguisherDeleteTarget, setFireExtinguisherDeleteTarget] = useState(null)
  const [equipmentDeleteTarget, setEquipmentDeleteTarget] = useState(null)
  const [fireTruckDeleteTarget, setFireTruckDeleteTarget] = useState(null)
  const [isDeletingEquipment, setIsDeletingEquipment] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationState, setValidationState] = useState(null)
  const [isEditingType, setIsEditingType] = useState(() => !selectedType)
  const [equipmentRows, setEquipmentRows] = useState([])
  const [fireExtinguisherRows, setFireExtinguisherRows] = useState([])
  const [fireTruckRows, setFireTruckRows] = useState([])
  const [scbaCatalogSections, setScbaCatalogSections] = useState([])
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [showFireTruckModal, setShowFireTruckModal] = useState(false)
  const [scbaItemModal, setScbaItemModal] = useState({
    visible: false,
    mode: 'add',
    sectionKey: '',
    rowId: '',
    catalogItemId: '',
    brand: '',
    serialNo: '',
    size: '',
    cylinderType: '',
    equipmentDescription: '',
    error: '',
  })
  const [scbaSectionModal, setScbaSectionModal] = useState({
    visible: false,
    mode: 'add',
    sectionKey: '',
    catalogSectionId: '',
    title: '',
    shortLabel: '',
    checksText: '',
    error: '',
  })
  const [scbaRemoveTarget, setScbaRemoveTarget] = useState(null)
  const [scbaArchiveTarget, setScbaArchiveTarget] = useState(null)
  const [isSavingScbaCatalog, setIsSavingScbaCatalog] = useState(false)
  const [equipmentEditMode, setEquipmentEditMode] = useState(false)
  const [editingEquipmentId, setEditingEquipmentId] = useState('')
  const [editingLocalEquipmentId, setEditingLocalEquipmentId] = useState('')
  const [editingFireTruckId, setEditingFireTruckId] = useState('')
  const [editingFireTruckPlateNo, setEditingFireTruckPlateNo] = useState('')
  const [newEquipmentName, setNewEquipmentName] = useState('')
  const [newEquipmentDescription, setNewEquipmentDescription] = useState('')
  const [equipmentError, setEquipmentError] = useState('')
  const [newTruckPlateNo, setNewTruckPlateNo] = useState('')
  const [newTruckName, setNewTruckName] = useState('')
  const [newTruckRoadTaxExpiry, setNewTruckRoadTaxExpiry] = useState('')
  const [newTruckInsuranceExpiry, setNewTruckInsuranceExpiry] = useState('')
  const [newTruckPuspakomExpiry, setNewTruckPuspakomExpiry] = useState('')
  const [fireTruckError, setFireTruckError] = useState('')
  const checklistChips = useMemo(() => getInspectionChecklistChips(selectedType), [selectedType])
  const selectedTypeDefinition = useMemo(
    () => getInspectionTypeDefinition(selectedType),
    [selectedType],
  )
  const isFullInspectionForm = isGeneralInspectionType(selectedType)
  const isStructuredInspectionForm = selectedTypeDefinition?.formMode === 'structured'
  const isEquipmentCatalogInspectionForm = selectedTypeDefinition?.supportsEquipmentCatalog === true
  const isFireExtinguisherCatalogInspectionForm =
    selectedTypeDefinition?.supportsFireExtinguisherCatalog === true
  const isFireTruckCatalogInspectionForm = selectedTypeDefinition?.supportsFireTruckCatalog === true
  const isScbaInspectionForm = selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
  const isSubmittableInspectionForm = selectedTypeDefinition?.implemented === true
  const supportsCustomLocations = selectedTypeDefinition?.supportsCustomLocations !== false
  const supportsSubLocations = selectedTypeDefinition?.supportsSubLocations !== false
  const showComingSoonNotice = Boolean(selectedType && !isSubmittableInspectionForm)
  const equipmentRowsField = String(selectedTypeDefinition?.equipmentRowsField || '').trim()
  const catalogRowsField = String(selectedTypeDefinition?.catalogRowsField || '').trim()
  const checksField = String(selectedTypeDefinition?.checksField || '').trim()
  const effectiveForm = useMemo(
    () =>
      catalogRowsField
        ? {
            ...form,
            [catalogRowsField]: fireExtinguisherRows,
          }
        : equipmentRowsField
          ? {
              ...form,
              [equipmentRowsField]: equipmentRows,
            }
          : form,
    [catalogRowsField, equipmentRows, equipmentRowsField, fireExtinguisherRows, form],
  )
  const currentStructuredSummary = useMemo(
    () => selectedTypeDefinition?.getSummary?.(effectiveForm) || null,
    [effectiveForm, selectedTypeDefinition],
  )
  const structuredDisplayForm = useMemo(() => applySessionInspector(form, user), [form, user])
  const equipmentModalOptions = useMemo(
    () =>
      (currentStructuredSummary?.visibleChecks || []).map((row) => ({
        ...row,
        value: String(row.equipmentId || row.id || ''),
        title: row.equipment,
        description: row.equipmentDescription || row.description || '',
        canEdit: row.canEdit === true && Boolean(row.equipmentId),
        canDelete: row.canDelete === true && Boolean(row.equipmentId),
        readOnlyReason:
          row.equipmentSource === 'seed' && !row.canEdit && !row.canDelete
            ? 'Seeded equipment managed by report managers.'
            : '',
      })),
    [currentStructuredSummary],
  )

  useEffect(() => {
    latestFormRef.current = effectiveForm
  }, [effectiveForm])

  useEffect(() => {
    if (!isEquipmentCatalogInspectionForm || !mainLocation) {
      setEquipmentRows([])
      return undefined
    }

    let active = true
    const cached = loadCachedInspectionEquipmentCatalog(selectedType, mainLocation)
    setEquipmentRows(cached)

    fetchInspectionEquipmentOptions({ inspectionType: selectedType, mainLocation })
      .then(({ data }) => {
        if (!active) return
        setEquipmentRows(data)
        saveCachedInspectionEquipmentCatalog(selectedType, mainLocation, data)
      })
      .catch(() => {
        if (!active) return
        setEquipmentRows(cached)
      })

    return () => {
      active = false
    }
  }, [isEquipmentCatalogInspectionForm, mainLocation, selectedType])

  useEffect(() => {
    if (!isFireExtinguisherCatalogInspectionForm || !mainLocation) {
      setFireExtinguisherRows([])
      return undefined
    }

    let active = true
    const cached = loadCachedFireExtinguisherCatalog(mainLocation, subLocation)
    setFireExtinguisherRows(cached)

    fetchFireExtinguisherOptions({ mainLocation, subLocation })
      .then(({ data }) => {
        if (!active) return
        setFireExtinguisherRows(data)
        saveCachedFireExtinguisherCatalog(mainLocation, subLocation, data)
      })
      .catch(() => {
        if (!active) return
        setFireExtinguisherRows(cached)
      })

    return () => {
      active = false
    }
  }, [isFireExtinguisherCatalogInspectionForm, mainLocation, subLocation])

  useEffect(() => {
    if (!isFireTruckCatalogInspectionForm) {
      setFireTruckRows([])
      return undefined
    }

    let active = true
    const fallback = [defaultFrtTruckOption()].filter(Boolean)
    const cached = loadCachedFireTruckCatalog()
    setFireTruckRows(cached.length > 0 ? cached : fallback)

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
      })

    return () => {
      active = false
    }
  }, [isFireTruckCatalogInspectionForm])

  const valueLooksLikeSavedInspection = useMemo(() => {
    const source = value && typeof value === 'object' ? value : {}
    return Boolean(
      source.id ||
        source.reportUid ||
        source.report_uid ||
        source.draftId ||
        source.draft_id ||
        source.status ||
        source.submittedAt ||
        source.submitted_at ||
        source.createdAt ||
        source.created_at ||
        source.version,
    )
  }, [value])

  useEffect(() => {
    if (!isScbaInspectionForm || !mainLocation) {
      setScbaCatalogSections([])
      scbaCatalogInjectedRef.current = ''
      return undefined
    }

    let active = true
    const cached = loadCachedScbaCatalog()
    setScbaCatalogSections(cached)

    const injectCatalogIfFresh = (sections = []) => {
      if (!active || sections.length === 0) return
      const currentForm = getLatestForm()
      const currentSections = normalizeScbaCustomSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      )
      const hasSnapshot = currentSections.length > 0
      const injectionKey = `${selectedType}:${mainLocation}`
      if (
        hasSnapshot ||
        valueLooksLikeSavedInspection ||
        scbaCatalogInjectedRef.current === injectionKey
      ) {
        return
      }
      scbaCatalogInjectedRef.current = injectionKey
      updateForm({
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
      })

    return () => {
      active = false
    }
  }, [isScbaInspectionForm, mainLocation, selectedType, valueLooksLikeSavedInspection])

  const updateForm = (nextForm) => {
    const normalized = normalizeInspectionForm(nextForm)
    const validationForm = applySessionInspector(normalized, user)
    latestFormRef.current = normalized
    setFieldErrors((currentErrors) => {
      if (!Object.values(currentErrors || {}).some(Boolean)) return currentErrors
      const missing = getInspectionFormMissingFields(validationForm)
      return Object.keys(currentErrors).reduce((nextErrors, field) => {
        if (currentErrors[field] && missing[field]) nextErrors[field] = true
        return nextErrors
      }, {})
    })
    setValidationState((currentValidation) =>
      currentValidation?.errorCount
        ? getInspectionFormValidationState(validationForm)
        : currentValidation,
    )
    onChange?.(normalized)
  }

  const getLatestForm = () => applySessionInspector(latestFormRef.current || effectiveForm, user)

  const updateLocationField = (field, nextValue) => {
    if (!['location', 'mainLocation', 'subLocation', 'locationSelection'].includes(field)) return
    if (field === 'locationSelection') {
      updateForm({
        ...form,
        mainLocation: String(nextValue?.mainLocation || '').trim(),
        subLocation: String(nextValue?.subLocation || '').trim(),
        mainLocationId: String(nextValue?.mainLocationId || '').trim(),
        subLocationId: String(nextValue?.subLocationId || '').trim(),
      })
      return
    }
    if (field === 'location') {
      const locationValue = Array.isArray(nextValue)
        ? nextValue[0] || ''
        : String(nextValue || '').trim()
      updateForm({
        ...form,
        selectedLocation: locationValue,
      })
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateIncidentField = (field, nextValue) => {
    if (field !== 'incidentType') return
    updateForm({
      ...form,
      inspectionType: String(nextValue || '').trim(),
      inspectedAt: form.inspectedAt || getDefaultInspectionDateTime(),
    })
  }

  const updateInspectedAt = (nextValue) => {
    updateForm({
      ...form,
      inspectedAt: String(nextValue || '').trim(),
    })
  }

  const selectFireTruck = (truck) => {
    const normalizedTruck = normalizeFrtTruckOption(truck)
    if (!normalizedTruck) return
    const latest = getLatestForm()
    updateForm({
      ...latest,
      mainLocation: normalizedTruck.plateNo,
      selectedLocation: normalizedTruck.plateNo,
      subLocation: '',
      mainLocationId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
      subLocationId: '',
      frtTruckId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
      frtTruckPlateNo: normalizedTruck.plateNo,
      frtTruckReference: {
        truckId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
        name: normalizedTruck.name || '',
        plateNo: normalizedTruck.plateNo,
        roadTaxExpiry: normalizedTruck.roadTaxExpiry || '',
        insuranceExpiry: normalizedTruck.insuranceExpiry || '',
        puspakomExpiry: normalizedTruck.puspakomExpiry || '',
      },
    })
  }

  const location = useLocationTypeManager({
    userId: user?.id,
    inspectionType: selectedType,
    mainLocation,
    subLocation,
    updateSetupField: updateLocationField,
    pushToast,
  })

  const incident = useIncidentTypeManager({
    userId: user?.id,
    selectedType,
    updateSetupField: updateIncidentField,
    pushToast,
  })
  const selectedTypeOption = useMemo(
    () =>
      incident.typeOptions.find(
        (option) =>
          String(option?.value || '')
            .trim()
            .toLowerCase() === selectedType.toLowerCase(),
      ),
    [incident.typeOptions, selectedType],
  )
  const SelectedTypeIcon = selectedTypeOption?.icon || resolveTypeIcon(selectedTypeOption?.iconKey)

  const selectedFireTruckPlate = String(resolveSelectedFrtTruckPlate(form) || '').trim()
  const fireTruckOptions = useMemo(
    () =>
      normalizeFireTruckCatalogRows(
        fireTruckRows.length > 0 ? fireTruckRows : [defaultFrtTruckOption()].filter(Boolean),
      ),
    [fireTruckRows],
  )
  const selectedFireTruckOption = useMemo(
    () =>
      fireTruckOptions.find((option) => {
        const optionId = String(option.truckId || option.id || '').trim()
        const selectedId = String(form.frtTruckId || form.mainLocationId || '').trim()
        if (selectedId && optionId === selectedId) return true
        return (
          String(option.plateNo || option.value || '')
            .trim()
            .toUpperCase() === selectedFireTruckPlate.toUpperCase()
        )
      }) || null,
    [fireTruckOptions, form.frtTruckId, form.mainLocationId, selectedFireTruckPlate],
  )

  const openPhotoInput = (target, inputRef) => {
    photoUploadTargetRef.current = target || { kind: 'root' }
    inputRef.current?.click()
  }

  const handlePhotoSelect = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    const allCurrentPhotos = collectInspectionPhotos(form)
    const nextCount = allCurrentPhotos.length + files.length
    if (nextCount > MAX_PHOTO_COUNT) {
      pushToast(`You can upload up to ${MAX_PHOTO_COUNT} photos per inspection report.`, {
        title: 'Too many photos',
        color: 'warning',
      })
      return
    }

    const existingTotalBytes = allCurrentPhotos.reduce(
      (sum, photo) => sum + estimateDataUrlBytes(photo?.url),
      0,
    )
    const processedFiles = []
    for (const file of files) {
      let nextFile = file
      try {
        nextFile = await compressInspectionPhoto(file, TARGET_PHOTO_BYTES)
      } catch {
        pushToast(`Unable to process "${file.name}".`, {
          title: 'Upload failed',
          color: 'danger',
        })
        return
      }
      if (Number(nextFile.size || 0) > MAX_PHOTO_BYTES) {
        pushToast(`"${file.name}" is over 1.5 MB even after compression.`, {
          title: 'Photo too large',
          color: 'warning',
        })
        return
      }
      processedFiles.push(nextFile)
    }

    const incomingTotalBytes = processedFiles.reduce((sum, file) => sum + Number(file.size || 0), 0)
    if (existingTotalBytes + incomingTotalBytes > MAX_TOTAL_PHOTO_BYTES) {
      pushToast('Total photo size must be 12 MB or smaller.', {
        title: 'Photos too large',
        color: 'warning',
      })
      return
    }

    const uploadTarget = photoUploadTargetRef.current || { kind: 'root' }
    const defaultPhotoDescription = String(
      uploadTarget?.defaultDescription || uploadTarget?.caption || '',
    ).trim()
    const nextPhotos = []
    for (const file of processedFiles) {
      try {
        const url = await readFileAsDataUrl(file)
        nextPhotos.push({
          id: uid(),
          fileName: file.name,
          ...(defaultPhotoDescription ? { description: defaultPhotoDescription } : {}),
          url,
        })
      } catch {
        pushToast(`Unable to read "${file.name}".`, {
          title: 'Upload failed',
          color: 'danger',
        })
        return
      }
    }

    if (
      uploadTarget?.kind === 'fireExtinguisher' ||
      uploadTarget?.kind === 'fireExtinguisherDefect'
    ) {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.fireExtinguisherChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey =
        uploadTarget?.kind === 'fireExtinguisherDefect' ? uploadTarget.photosKey : 'photos'
      updateFireExtinguisherCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'hydraulicEquipment' || uploadTarget?.kind === 'hydraulicDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.hydraulicChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget?.kind === 'hydraulicDefect' ? uploadTarget.photosKey : 'photos'
      updateHydraulicCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'frtIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const isOneOff = String(row?.checklistKind || '').trim() === 'oneOff'
      const checksKey = isOneOff ? 'frtOneOffChecks' : 'frtDailyChecks'
      const checks = Array.isArray(form[checksKey]) ? form[checksKey] : []
      const existingCheck = checks.find((check) => String(check.id || '') === rowId) || row
      updateFrtCheck(row, {
        photos: [
          ...(Array.isArray(existingCheck.photos) ? existingCheck.photos : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'highAngleIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.highAngleChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget.photosKey || HIGH_ANGLE_CONDITION_FIELD.photosKey
      updateHighAngleCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'scbaEquipment' || uploadTarget?.kind === 'scbaIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const sectionKey = uploadTarget.sectionKey || row.sectionKey
      const currentForm = getLatestForm()
      const existingCheck = getScbaExistingCheck(currentForm, sectionKey, rowId) || row
      const photosKey = uploadTarget.photosKey || 'photos'
      if (!photosKey) return
      updateScbaGroupedCheck(sectionKey, row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'erAuxEquipment' || uploadTarget?.kind === 'erAuxDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.erAuxChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget?.kind === 'erAuxDefect' ? 'defectPhotos' : 'photos'
      updateErAuxCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    updateForm({
      ...form,
      photos: [...form.photos, ...nextPhotos],
    })
  }

  const requestRootPhotoUpload = (inputRef, defaultDescription = '') =>
    openPhotoInput(
      { kind: 'root', defaultDescription: String(defaultDescription || '').trim() },
      inputRef,
    )

  const requestHydraulicPhotoUpload = (row) => {
    openPhotoInput({ kind: 'hydraulicEquipment', row }, cameraInputRef)
  }

  const requestErAuxPhotoUpload = (row) => {
    openPhotoInput({ kind: 'erAuxEquipment', row }, cameraInputRef)
  }

  const requestErAuxDefectPhotoUpload = (row) => {
    openPhotoInput({ kind: 'erAuxDefect', row }, cameraInputRef)
  }

  const requestHydraulicDefectPhotoUpload = (row, field) => {
    openPhotoInput({ kind: 'hydraulicDefect', row, photosKey: field.photosKey }, cameraInputRef)
  }

  const requestFireExtinguisherPhotoUpload = (row) => {
    openPhotoInput({ kind: 'fireExtinguisher', row }, cameraInputRef)
  }

  const requestFireExtinguisherDefectPhotoUpload = (row, field) => {
    openPhotoInput(
      { kind: 'fireExtinguisherDefect', row, photosKey: field.photosKey },
      cameraInputRef,
    )
  }

  const requestFrtIssuePhotoUpload = (row) => {
    openPhotoInput({ kind: 'frtIssue', row }, cameraInputRef)
  }

  const requestHighAngleIssuePhotoUpload = (row) => {
    openPhotoInput(
      { kind: 'highAngleIssue', row, photosKey: HIGH_ANGLE_CONDITION_FIELD.photosKey },
      cameraInputRef,
    )
  }

  const requestScbaIssuePhotoUpload = (sectionKey, row, field) => {
    const { photosKey } = getScbaFieldEvidenceKeys(field)
    openPhotoInput({ kind: 'scbaIssue', sectionKey, row, photosKey }, cameraInputRef)
  }

  const requestScbaPhotoUpload = (sectionKey, row) => {
    openPhotoInput({ kind: 'scbaEquipment', sectionKey, row, photosKey: 'photos' }, cameraInputRef)
  }

  const removePhoto = (photoId) => {
    updateForm({
      ...form,
      photos: form.photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updatePhotoDescription = (photoId, description) => {
    updateForm({
      ...form,
      photos: form.photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const getHydraulicPhotoList = (row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = form.hydraulicChecks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const removeHydraulicPhoto = (row, photoId, photosKey = 'photos') => {
    const photos = getHydraulicPhotoList(row, photosKey)
    updateHydraulicCheck(row, {
      [photosKey]: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateHydraulicPhotoDescription = (row, photoId, description, photosKey = 'photos') => {
    const photos = getHydraulicPhotoList(row, photosKey)
    updateHydraulicCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyHydraulicPhotoCaption = (row, photoId, caption, photosKey = 'photos') => {
    const photos = getHydraulicPhotoList(row, photosKey)
    updateHydraulicCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const getErAuxPhotoList = (row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = form.erAuxChecks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const removeErAuxPhoto = (row, photoId, photosKey = 'photos') => {
    const photos = getErAuxPhotoList(row, photosKey)
    updateErAuxCheck(row, {
      [photosKey]: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateErAuxPhotoDescription = (row, photoId, description, photosKey = 'photos') => {
    const photos = getErAuxPhotoList(row, photosKey)
    updateErAuxCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyErAuxPhotoCaption = (row, photoId, caption, photosKey = 'photos') => {
    const photos = getErAuxPhotoList(row, photosKey)
    updateErAuxCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const getFrtPhotoList = (row) => {
    const rowId = String(row?.id || '').trim()
    const checksKey =
      String(row?.checklistKind || '').trim() === 'oneOff' ? 'frtOneOffChecks' : 'frtDailyChecks'
    const checks = Array.isArray(form[checksKey]) ? form[checksKey] : []
    const existing = checks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.photos) ? existing.photos : []
  }

  const removeFrtPhoto = (row, photoId) => {
    const photos = getFrtPhotoList(row)
    updateFrtCheck(row, {
      photos: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateFrtPhotoDescription = (row, photoId, description) => {
    const photos = getFrtPhotoList(row)
    updateFrtCheck(row, {
      photos: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyFrtPhotoCaption = (row, photoId, caption) => {
    const photos = getFrtPhotoList(row)
    updateFrtCheck(row, {
      photos: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const getHighAnglePhotoList = (row, photosKey = HIGH_ANGLE_CONDITION_FIELD.photosKey) => {
    const rowId = String(row?.id || '').trim()
    const existing = form.highAngleChecks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const removeHighAnglePhoto = (row, photoId, photosKey = HIGH_ANGLE_CONDITION_FIELD.photosKey) => {
    const photos = getHighAnglePhotoList(row, photosKey)
    updateHighAngleCheck(row, {
      [photosKey]: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateHighAnglePhotoDescription = (
    row,
    photoId,
    description,
    photosKey = HIGH_ANGLE_CONDITION_FIELD.photosKey,
  ) => {
    const photos = getHighAnglePhotoList(row, photosKey)
    updateHighAngleCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyHighAnglePhotoCaption = (
    row,
    photoId,
    caption,
    photosKey = HIGH_ANGLE_CONDITION_FIELD.photosKey,
  ) => {
    const photos = getHighAnglePhotoList(row, photosKey)
    updateHighAngleCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const getScbaPhotoList = (sectionKey, row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = getScbaExistingCheck(form, sectionKey, rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const removeScbaPhoto = (sectionKey, row, photoId, photosKey = 'photos') => {
    const photos = getScbaPhotoList(sectionKey, row, photosKey)
    updateScbaGroupedCheck(sectionKey, row, {
      [photosKey]: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateScbaPhotoDescription = (
    sectionKey,
    row,
    photoId,
    description,
    photosKey = 'photos',
  ) => {
    const photos = getScbaPhotoList(sectionKey, row, photosKey)
    updateScbaGroupedCheck(sectionKey, row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyScbaPhotoCaption = (sectionKey, row, photoId, caption, photosKey = 'photos') => {
    const photos = getScbaPhotoList(sectionKey, row, photosKey)
    updateScbaGroupedCheck(sectionKey, row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const getFireExtinguisherPhotoList = (row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = form.fireExtinguisherChecks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const removeFireExtinguisherPhoto = (row, photoId, photosKey = 'photos') => {
    const photos = getFireExtinguisherPhotoList(row, photosKey)
    updateFireExtinguisherCheck(row, {
      [photosKey]: photos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    })
  }

  const updateFireExtinguisherPhotoDescription = (
    row,
    photoId,
    description,
    photosKey = 'photos',
  ) => {
    const photos = getFireExtinguisherPhotoList(row, photosKey)
    updateFireExtinguisherCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }

  const applyFireExtinguisherPhotoCaption = (row, photoId, caption, photosKey = 'photos') => {
    const photos = getFireExtinguisherPhotoList(row, photosKey)
    updateFireExtinguisherCheck(row, {
      [photosKey]: photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    })
  }

  const updateErAuxSessionMeta = (field, nextValue) => {
    if (!['erAuxInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFrtSessionMeta = (field, nextValue) => {
    if (!['frtInspectionDate', 'frtShift', 'frtDailyRemarks', 'frtOneOffRemarks'].includes(field)) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const appendDescription = (text) => {
    updateForm({
      ...form,
      description: appendInspectionText(form.description, text),
    })
  }

  const toggleChecklistChip = (label) => {
    updateForm(toggleInspectionChecklistItem(form, label))
  }

  const buildHydraulicFillBlankOkPatch = (check = {}) =>
    HYDRAULIC_CHECK_FIELDS.reduce((next, field) => {
      if (!String(check?.[field.key] || '').trim()) next[field.key] = 'OK'
      return next
    }, {})
  const highAngleGoodPatch = useMemo(
    () => ({ condition: HIGH_ANGLE_STATUS_OPTIONS[0]?.value || 'Good' }),
    [],
  )
  const buildHighAngleFillBlankGoodPatch = (check = {}) =>
    String(check?.condition || '').trim() ? {} : highAngleGoodPatch
  const frtDailyCheckedPatch = useMemo(() => ({ status: 'Checked' }), [])
  const frtOneOffGoodPatch = useMemo(() => ({ condition: 'Good' }), [])
  const erAuxOkPatch = useMemo(() => ({ condition: 'OK' }), [])
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
  const buildScbaFillBlankGoodPatch = (sectionKey, check = {}) =>
    (scbaSectionFieldMap[sectionKey] || []).reduce((patch, field) => {
      if (field.kind === 'status' && !String(check?.[field.key] || '').trim()) {
        patch[field.key] = SCBA_STATUS_OPTIONS[0].value
      }
      return patch
    }, {})

  const buildErAuxCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    location: String(row?.location || existing?.location || '').trim(),
    mainLocation: String(
      row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
    ).trim(),
    equipment: String(row?.equipment || existing?.equipment || '').trim(),
    equipmentId: row?.equipmentId ?? existing?.equipmentId ?? '',
    equipmentKey: String(row?.equipmentKey || existing?.equipmentKey || '').trim(),
    equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
    equipmentDescription: String(
      row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
    ).trim(),
    defaultQuantity: String(row?.defaultQuantity || existing?.defaultQuantity || '').trim(),
    isCustomEquipment: row?.isCustomEquipment === true || existing?.isCustomEquipment === true,
    quantity: String(existing?.quantity ?? row?.quantity ?? row?.defaultQuantity ?? ''),
    condition: String(existing?.condition || ''),
    remarks: String(existing?.remarks || existing?.remark || ''),
    defectRemarks: String(existing?.defectRemarks || existing?.defect_remarks || ''),
    additionalNotes: String(existing?.additionalNotes || existing?.additional_notes || ''),
    defectPhotos: Array.isArray(existing?.defectPhotos)
      ? existing.defectPhotos
      : Array.isArray(existing?.defect_photos)
        ? existing.defect_photos
        : [],
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...patch,
  })

  const buildHydraulicCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    location: String(row?.location || existing?.location || '').trim(),
    mainLocation: String(
      row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
    ).trim(),
    equipment: String(row?.equipment || existing?.equipment || '').trim(),
    equipmentId: row?.equipmentId ?? existing?.equipmentId ?? '',
    equipmentKey: String(row?.equipmentKey || existing?.equipmentKey || '').trim(),
    equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
    equipmentDescription: String(
      row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
    ).trim(),
    isCustomEquipment: row?.isCustomEquipment === true || existing?.isCustomEquipment === true,
    physicalCondition: String(existing?.physicalCondition || ''),
    mechanicalCondition: String(existing?.mechanicalCondition || ''),
    noLeakage: String(existing?.noLeakage || ''),
    functionTest: String(existing?.functionTest || ''),
    remarks: String(existing?.remarks || ''),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...HYDRAULIC_CHECK_FIELDS.reduce((next, field) => {
      next[field.remarksKey] = String(existing?.[field.remarksKey] || '')
      next[field.photosKey] = Array.isArray(existing?.[field.photosKey])
        ? existing[field.photosKey]
        : []
      return next
    }, {}),
    ...patch,
  })

  const buildFireExtinguisherCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    catalogId: row?.catalogId ?? existing?.catalogId ?? '',
    sourceRowNumber: String(row?.sourceRowNumber || existing?.sourceRowNumber || '').trim(),
    equipmentSource: String(row?.equipmentSource || existing?.equipmentSource || 'seed').trim(),
    zone: String(row?.zone || existing?.zone || '').trim(),
    mainLocation: String(row?.mainLocation || existing?.mainLocation || mainLocation || '').trim(),
    subLocation: String(row?.subLocation || existing?.subLocation || '').trim(),
    location: String(row?.mainLocation || existing?.mainLocation || mainLocation || '').trim(),
    locationPath: [
      String(row?.mainLocation || existing?.mainLocation || mainLocation || '').trim(),
      String(row?.subLocation || existing?.subLocation || '').trim(),
    ].filter(Boolean),
    idLocNo: String(row?.idLocNo || existing?.idLocNo || '').trim(),
    barcodeNo: String(row?.barcodeNo || existing?.barcodeNo || '').trim(),
    feType: String(row?.feType || existing?.feType || '')
      .trim()
      .replace(/CO[\u00b2\ufffd]/gi, 'CO2'),
    certificationValidity: String(
      row?.certificationValidity || existing?.certificationValidity || '',
    ).trim(),
    certificationValidityRaw: String(
      row?.certificationValidityRaw || existing?.certificationValidityRaw || '',
    ).trim(),
    daysLeftToExpire: String(row?.daysLeftToExpire || existing?.daysLeftToExpire || '').trim(),
    remarks: String(existing?.remarks || '').trim(),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
      next[field.key] = String(existing?.[field.key] || '')
      next[field.remarksKey] = String(existing?.[field.remarksKey] || '')
      next[field.photosKey] = Array.isArray(existing?.[field.photosKey])
        ? existing[field.photosKey]
        : []
      return next
    }, {}),
    ...patch,
  })

  const buildScbaCheckRow = (sectionKey, row, existing = {}, patch = {}) => {
    const fields = scbaSectionFieldMap[sectionKey] || []
    return {
      id: String(row?.id || existing?.id || '').trim(),
      catalogItemId: row?.catalogItemId ?? existing?.catalogItemId ?? '',
      catalogSectionId: row?.catalogSectionId ?? existing?.catalogSectionId ?? '',
      sectionKey,
      location: String(row?.location || existing?.location || '').trim(),
      mainLocation: String(
        row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
      ).trim(),
      brand: String(row?.brand || existing?.brand || '').trim(),
      serialNo: String(row?.serialNo || existing?.serialNo || '').trim(),
      size: String(row?.size || existing?.size || '').trim(),
      cylinderType: String(row?.cylinderType || existing?.cylinderType || '').trim(),
      equipmentDescription: String(
        row?.equipmentDescription || row?.description || existing?.equipmentDescription || '',
      ).trim(),
      equipmentSource: String(
        row?.equipmentSource ||
          existing?.equipmentSource ||
          (scbaCustomSectionMap[sectionKey] ? 'custom' : 'seed'),
      ).trim(),
      isCustomEquipment:
        row?.isCustomEquipment === true ||
        existing?.isCustomEquipment === true ||
        Boolean(scbaCustomSectionMap[sectionKey]),
      removed: existing?.removed === true || row?.removed === true,
      removedAt: String(existing?.removedAt || row?.removedAt || '').trim(),
      removedBy: String(existing?.removedBy || row?.removedBy || '').trim(),
      removedReason: String(existing?.removedReason || row?.removedReason || '').trim(),
      remarks: String(existing?.remarks || ''),
      photos: Array.isArray(existing?.photos) ? existing.photos : [],
      ...fields.reduce((next, field) => {
        next[field.key] = String(existing?.[field.key] || row?.[field.key] || '')
        if (field.kind === 'status') {
          const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
          next[remarksKey] = String(existing?.[remarksKey] || '')
          next[photosKey] = Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
        }
        return next
      }, {}),
      ...patch,
    }
  }

  const buildHighAngleCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
    mainLocation: String(row?.mainLocation || existing?.mainLocation || mainLocation || '').trim(),
    location: String(row?.location || existing?.location || '').trim(),
    subLocation: String(row?.subLocation || existing?.subLocation || '').trim(),
    equipment: String(row?.equipment || existing?.equipment || '').trim(),
    quantity: String(row?.quantity || existing?.quantity || '').trim(),
    condition: String(existing?.condition || ''),
    remarks: String(existing?.remarks || ''),
    conditionRemarks: String(
      existing?.conditionRemarks || existing?.condition_remarks || existing?.remarks || '',
    ),
    conditionPhotos: Array.isArray(existing?.conditionPhotos)
      ? existing.conditionPhotos
      : Array.isArray(existing?.condition_photos)
        ? existing.condition_photos
        : [],
    ...patch,
  })

  const buildFrtDailyCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    checklistKind: 'daily',
    rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: String(row?.location || existing?.location || '').trim(),
    equipment: String(row?.equipment || existing?.equipment || '').trim(),
    quantity: String(row?.quantity || existing?.quantity || '').trim(),
    rowKind: String(row?.rowKind || existing?.rowKind || 'status').trim() || 'status',
    status: String(existing?.status || ''),
    readingValue: String(existing?.readingValue || ''),
    remarks: String(existing?.remarks || ''),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...patch,
  })

  const buildFrtOneOffCheckRow = (row, existing = {}, patch = {}) => ({
    id: String(row?.id || existing?.id || '').trim(),
    checklistKind: 'oneOff',
    rowNumber: String(row?.rowNumber || existing?.rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: String(row?.location || existing?.location || '').trim(),
    equipment: String(row?.equipment || existing?.equipment || '').trim(),
    condition: String(existing?.condition || ''),
    remarks: String(existing?.remarks || ''),
    photos: Array.isArray(existing?.photos) ? existing.photos : [],
    ...patch,
  })

  const updateErAuxCheck = (row, patch) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.erAuxChecks) ? currentForm.erAuxChecks : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildErAuxCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      erAuxChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const updateHydraulicCheck = (row, patch) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildHydraulicCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      hydraulicChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const updateFireExtinguisherCheck = (row, patch) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.fireExtinguisherChecks)
      ? currentForm.fireExtinguisherChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildFireExtinguisherCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      fireExtinguisherChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const updateFrtCheck = (row, patch) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()

    if (String(row?.checklistKind || '').trim() === 'oneOff') {
      const currentChecks = Array.isArray(currentForm.frtOneOffChecks)
        ? currentForm.frtOneOffChecks
        : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = buildFrtOneOffCheckRow(row, existing, patch)

      updateForm({
        ...currentForm,
        frtOneOffChecks: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      })
      return
    }

    const currentChecks = Array.isArray(currentForm.frtDailyChecks)
      ? currentForm.frtDailyChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildFrtDailyCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      frtDailyChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const markHydraulicEquipmentOk = (row) => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === String(row?.id || ''))
    updateHydraulicCheck(row, buildHydraulicFillBlankOkPatch({ ...row, ...(existing || {}) }))
  }

  const markFrtRowOk = (row) => {
    if (String(row?.checklistKind || '').trim() === 'oneOff') {
      updateFrtCheck(row, frtOneOffGoodPatch)
      return
    }
    if (String(row?.rowKind || '').trim() === 'reading') return
    updateFrtCheck(row, frtDailyCheckedPatch)
  }

  const markErAuxEquipmentOk = (row) => {
    updateErAuxCheck(row, erAuxOkPatch)
  }

  const updateHighAngleCheck = (row, patch) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildHighAngleCheckRow(row, existing, patch)

    updateForm({
      ...currentForm,
      highAngleChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
  }

  const markHighAngleRowOk = (row) => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === String(row?.id || ''))
    updateHighAngleCheck(row, buildHighAngleFillBlankGoodPatch({ ...row, ...(existing || {}) }))
  }

  const updateScbaSessionMeta = (field, nextValue) => {
    if (!['scbaInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHighAngleSessionMeta = (field, nextValue) => {
    if (!['highAngleInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFireExtinguisherSessionMeta = (field, nextValue) => {
    if (!['fireExtinguisherInspectionDate'].includes(field)) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHseSessionMeta = (field, nextValue) => {
    if (!['hseInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHseField = (field, nextValue) => {
    if (
      ![
        'hseAreaConditionRemarks',
        'hseUnsafeActDetails',
        'hseUnsafeConditionDetails',
        'hseEnvironmentalDetails',
        'hseSeverity',
        'hseImmediateAction',
        'hseCorrectiveAction',
        'hseResponsiblePerson',
        'hseTargetDate',
        'hseRemarks',
      ].includes(field)
    ) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const toggleHseObservationSelection = (selection) => {
    updateForm({
      ...form,
      hseSelections: toggleHseSelection(form.hseSelections, selection),
      ...(selection === 'areaSatisfactory'
        ? {
            hseUnsafeActDetails: '',
            hseUnsafeConditionDetails: '',
            hseEnvironmentalDetails: '',
            hseSeverity: '',
            hseImmediateAction: '',
            hseCorrectiveAction: '',
            hseResponsiblePerson: '',
            hseTargetDate: '',
          }
        : { hseAreaConditionRemarks: '' }),
    })
  }

  const getScbaChecksField = (sectionKey) =>
    sectionKey === 'backPlate'
      ? 'scbaBackPlateChecks'
      : sectionKey === 'cylinder'
        ? 'scbaCylinderChecks'
        : sectionKey === 'faceMask'
          ? 'scbaFaceMaskChecks'
          : ''

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

  const updateScbaCustomSectionRows = (currentForm, sectionKey, updater) => {
    const customSections = normalizeScbaCustomSections(
      currentForm.scbaCustomSections || currentForm.scba_custom_sections,
    )
    return customSections.map((section) =>
      section.key === sectionKey
        ? { ...section, rows: updater(section.rows || [], section) }
        : section,
    )
  }

  const upsertScbaCatalogSectionCache = (section) => {
    if (!section?.key) return
    setScbaCatalogSections((current) => {
      const normalized = normalizeScbaCustomSections([section])[0]
      if (!normalized) return current
      const next = [
        ...current.filter((candidate) => String(candidate.key || '') !== normalized.key),
        normalized,
      ]
      saveCachedScbaCatalog(next)
      return next
    })
  }

  const ensureScbaCatalogSection = async (currentForm, sectionKey) => {
    const currentSections = normalizeScbaCustomSections(
      currentForm.scbaCustomSections || currentForm.scba_custom_sections,
    )
    const section = currentSections.find((candidate) => candidate.key === sectionKey)
    if (!section) return null
    if (section.catalogSectionId) return section

    const saved = await createScbaCatalogSection({
      title: section.title,
      shortLabel: section.shortLabel,
      fields: section.fields,
    })
    if (!saved) return section
    upsertScbaCatalogSectionCache(saved)
    updateForm({
      ...currentForm,
      scbaCustomSections: currentSections.map((candidate) =>
        candidate.key === sectionKey
          ? {
              ...candidate,
              id: saved.id || candidate.id,
              catalogSectionId: saved.catalogSectionId,
              key: saved.key || candidate.key,
              rows: candidate.rows.map((row) => ({
                ...row,
                catalogSectionId: saved.catalogSectionId,
                sectionKey: saved.key || candidate.key,
              })),
            }
          : candidate,
      ),
    })
    return {
      ...section,
      id: saved.id || section.id,
      catalogSectionId: saved.catalogSectionId,
      key: saved.key || section.key,
    }
  }

  const updateScbaGroupedCheck = (sectionKey, row, patch) => {
    const checksFieldKey = getScbaChecksField(sectionKey)
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
    if (!checksFieldKey) {
      const existing = getScbaExistingCheck(currentForm, sectionKey, rowId)
      const nextCheck = buildScbaCheckRow(sectionKey, row, existing, patch)
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
    const nextCheck = buildScbaCheckRow(sectionKey, row, existing, patch)

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
      buildScbaFillBlankGoodPatch(sectionKey, { ...row, ...(existing || {}) }),
    )
  }

  const openAddScbaItemModal = (sectionKey) => {
    setScbaItemModal({
      visible: true,
      mode: 'add',
      sectionKey,
      rowId: '',
      catalogItemId: '',
      brand: '',
      serialNo: '',
      size: '',
      cylinderType: '',
      equipmentDescription: '',
      error: '',
    })
  }

  const openEditScbaItemModal = (sectionKey, row = {}) => {
    setScbaItemModal({
      visible: true,
      mode: 'edit',
      sectionKey,
      rowId: String(row.id || '').trim(),
      catalogItemId: String(row.catalogItemId || row.catalog_item_id || '').trim(),
      brand: String(row.brand || '').trim(),
      serialNo: String(row.serialNo || '').trim(),
      size: String(row.size || '').trim(),
      cylinderType: String(row.cylinderType || '').trim(),
      equipmentDescription: String(row.equipmentDescription || row.description || '').trim(),
      error: '',
    })
  }

  const closeScbaItemModal = () =>
    setScbaItemModal((current) => ({
      ...current,
      visible: false,
      error: '',
    }))

  const saveScbaItemModal = async () => {
    const sectionKey = String(scbaItemModal.sectionKey || '').trim()
    const brand = String(scbaItemModal.brand || '').trim()
    const serialNo = String(scbaItemModal.serialNo || '').trim()
    if (!sectionKey || (!brand && !serialNo)) {
      setScbaItemModal((current) => ({
        ...current,
        error: 'Enter at least a brand or serial number.',
      }))
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
    const rowId =
      scbaItemModal.mode === 'edit' && scbaItemModal.rowId
        ? scbaItemModal.rowId
        : `${effectiveSectionKey}:custom:${slugSegment(mainLocation)}:${slugSegment(brand)}:${slugSegment(
            serialNo,
          )}:${uid()}`
    const existing = getScbaExistingCheck(latestForm, effectiveSectionKey, rowId) || {}
    let catalogRowPatch = {}
    try {
      if (!getScbaChecksField(effectiveSectionKey) && catalogSectionId) {
        const itemPayload = {
          location: mainLocation,
          mainLocation,
          brand,
          serialNo,
          displayName: `${brand} ${serialNo}`.trim(),
          equipmentDescription: scbaItemModal.equipmentDescription,
        }
        const savedItem =
          scbaItemModal.mode === 'edit' && scbaItemModal.catalogItemId
            ? await updateScbaCatalogItem(scbaItemModal.catalogItemId, itemPayload)
            : await createScbaCatalogItem(catalogSectionId, itemPayload)
        catalogRowPatch = savedItem
          ? {
              id: savedItem.id || rowId,
              catalogItemId: savedItem.catalogItemId,
              catalogSectionId: savedItem.catalogSectionId || catalogSectionId,
            }
          : {}
      }
    } catch (error) {
      setScbaItemModal((current) => ({
        ...current,
        error: error?.message || 'Unable to save SCBA catalog item.',
      }))
      setIsSavingScbaCatalog(false)
      return
    }
    const nextRowId = String(catalogRowPatch.id || rowId)
    const nextRow = buildScbaCheckRow(
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
        size: scbaItemModal.size,
        cylinderType: scbaItemModal.cylinderType,
        equipmentDescription: scbaItemModal.equipmentDescription,
        equipmentSource: 'custom',
        isCustomEquipment: true,
      },
      existing,
      {
        ...catalogRowPatch,
        brand,
        serialNo,
        size: scbaItemModal.size,
        cylinderType: scbaItemModal.cylinderType,
        equipmentDescription: scbaItemModal.equipmentDescription,
        equipmentSource: 'custom',
        isCustomEquipment: true,
      },
    )
    const checksFieldKey = getScbaChecksField(effectiveSectionKey)
    if (checksFieldKey) {
      const currentChecks = Array.isArray(latestForm[checksFieldKey])
        ? latestForm[checksFieldKey]
        : []
      updateForm({
        ...latestForm,
        [checksFieldKey]: [
          nextRow,
          ...currentChecks.filter(
            (check) => String(check.id || '') !== rowId && String(check.id || '') !== nextRowId,
          ),
        ],
      })
    } else {
      updateForm({
        ...latestForm,
        scbaCustomSections: updateScbaCustomSectionRows(latestForm, effectiveSectionKey, (rows) => [
          nextRow,
          ...rows.filter(
            (check) => String(check.id || '') !== rowId && String(check.id || '') !== nextRowId,
          ),
        ]),
      })
    }
    setIsSavingScbaCatalog(false)
    closeScbaItemModal()
  }

  const getScbaRemovedMeta = () => ({
    removed: true,
    removedAt: new Date().toISOString(),
    removedBy: String(user?.name || user?.email || user?.id || '').trim(),
  })

  const scbaRowHasInspectionData = (row = {}, sectionKey = '') => {
    const fields = scbaSectionFieldMap[sectionKey] || []
    if (String(row.remarks || '').trim() || (Array.isArray(row.photos) && row.photos.length > 0)) {
      return true
    }
    return fields.some((field) => {
      if (String(row[field.key] || '').trim()) return true
      const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
      return (
        String(row[remarksKey] || '').trim() ||
        (Array.isArray(row[photosKey]) && row[photosKey].length > 0)
      )
    })
  }

  const requestRemoveScbaItem = (sectionKey, row = {}) => {
    const rowId = String(row.id || '').trim()
    if (!rowId || row.isCustomEquipment !== true) return
    setScbaRemoveTarget({
      type: 'item',
      sectionKey,
      row,
      message: scbaRowHasInspectionData(row, sectionKey)
        ? 'This item has checks, remarks, or photos. Remove it from this inspection?'
        : 'Remove this item from this inspection?',
    })
  }

  const removeScbaItemFromInspection = (sectionKey, row = {}) => {
    const rowId = String(row.id || '').trim()
    if (!rowId || row.isCustomEquipment !== true) return
    const currentForm = getLatestForm()
    const checksFieldKey = getScbaChecksField(sectionKey)
    const removedMeta = getScbaRemovedMeta()
    if (checksFieldKey) {
      const currentChecks = Array.isArray(currentForm[checksFieldKey])
        ? currentForm[checksFieldKey]
        : []
      updateForm({
        ...currentForm,
        [checksFieldKey]: currentChecks.map((check) =>
          String(check.id || '') === rowId ? { ...check, ...removedMeta } : check,
        ),
      })
      return
    }
    updateForm({
      ...currentForm,
      scbaCustomSections: updateScbaCustomSectionRows(currentForm, sectionKey, (rows) =>
        rows.map((check) =>
          String(check.id || '') === rowId ? { ...check, ...removedMeta } : check,
        ),
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
        rows.map((check) =>
          String(check.id || '') === rowId
            ? {
                ...check,
                removed: false,
                removedAt: '',
                removedBy: '',
                removedReason: '',
              }
            : check,
        ),
      ),
    })
  }

  const openAddScbaSectionModal = () => {
    setScbaSectionModal({
      visible: true,
      mode: 'add',
      sectionKey: '',
      catalogSectionId: '',
      title: '',
      shortLabel: '',
      checksText: '',
      error: '',
    })
  }

  const openEditScbaSectionModal = (section = {}) => {
    setScbaSectionModal({
      visible: true,
      mode: 'edit',
      sectionKey: String(section.key || '').trim(),
      catalogSectionId: String(section.catalogSectionId || section.catalog_section_id || '').trim(),
      title: String(section.title || '').trim(),
      shortLabel: String(section.shortLabel || '').trim(),
      checksText: (section.fields || []).map((field) => field.label).join('\n'),
      error: '',
    })
  }

  const closeScbaSectionModal = () =>
    setScbaSectionModal((current) => ({
      ...current,
      visible: false,
      error: '',
    }))

  const saveScbaSectionModal = async () => {
    const title = String(scbaSectionModal.title || '').trim()
    const labels = String(scbaSectionModal.checksText || '')
      .split(/\n|,/)
      .map((label) => label.trim())
      .filter(Boolean)
    if (!title || labels.length === 0) {
      setScbaSectionModal((current) => ({
        ...current,
        error: 'Enter a section title and at least one check.',
      }))
      return
    }
    const uniqueLabels = Array.from(new Set(labels))
    const currentForm = getLatestForm()
    const currentSections = normalizeScbaCustomSections(
      currentForm.scbaCustomSections || currentForm.scba_custom_sections,
    )
    const editingSection = currentSections.find(
      (section) => section.key === scbaSectionModal.sectionKey,
    )
    const existingKeysByLabel = new Map(
      (editingSection?.fields || []).map((field) => [
        slugSegment(field.label),
        String(field.key || '').trim(),
      ]),
    )
    const fields = uniqueLabels.map((label) => ({
      key: existingKeysByLabel.get(slugSegment(label)) || customFieldKeyFromLabel(label),
      label,
      kind: 'status',
    }))
    setIsSavingScbaCatalog(true)
    let savedSection = null
    try {
      savedSection =
        scbaSectionModal.mode === 'edit' && scbaSectionModal.catalogSectionId
          ? await updateScbaCatalogSection(scbaSectionModal.catalogSectionId, {
              title,
              shortLabel: String(scbaSectionModal.shortLabel || title).trim(),
              fields,
            })
          : await createScbaCatalogSection({
              title,
              shortLabel: String(scbaSectionModal.shortLabel || title).trim(),
              fields,
            })
    } catch (error) {
      setScbaSectionModal((current) => ({
        ...current,
        error: error?.message || 'Unable to save SCBA catalog section.',
      }))
      setIsSavingScbaCatalog(false)
      return
    }

    const sectionKey =
      savedSection?.key ||
      (scbaSectionModal.mode === 'edit' && editingSection?.key
        ? editingSection.key
        : `customScba-${slugSegment(title)}-${uid()}`)
    const nextSection = {
      ...(editingSection || {}),
      ...(savedSection || {}),
      id: savedSection?.id || editingSection?.id || sectionKey,
      catalogSectionId: savedSection?.catalogSectionId || editingSection?.catalogSectionId || '',
      key: sectionKey,
      title: savedSection?.title || title,
      shortLabel: savedSection?.shortLabel || String(scbaSectionModal.shortLabel || title).trim(),
      isCustomSection: true,
      fields: savedSection?.fields || fields,
      rows: (editingSection?.rows || []).map((row) => ({
        ...row,
        sectionKey,
        catalogSectionId: savedSection?.catalogSectionId || row.catalogSectionId || '',
      })),
    }
    if (savedSection) upsertScbaCatalogSectionCache(nextSection)
    updateForm({
      ...currentForm,
      scbaCustomSections:
        scbaSectionModal.mode === 'edit'
          ? currentSections.map((section) =>
              section.key === scbaSectionModal.sectionKey ? nextSection : section,
            )
          : [...currentSections, nextSection],
    })
    setIsSavingScbaCatalog(false)
    closeScbaSectionModal()
  }

  const requestRemoveScbaSection = (section = {}) => {
    const sectionKey = String(section.key || '').trim()
    if (!sectionKey || section.isCustomSection !== true) return
    const hasData =
      (section.rows || []).length > 0 ||
      (section.rows || []).some((row) => scbaRowHasInspectionData(row, sectionKey))
    setScbaRemoveTarget({
      type: 'section',
      section,
      message: hasData
        ? 'This section contains items or inspection evidence. Remove it from this inspection?'
        : 'Remove this section from this inspection?',
    })
  }

  const removeScbaSectionFromInspection = (section = {}) => {
    const sectionKey = String(section.key || '').trim()
    if (!sectionKey || section.isCustomSection !== true) return
    const currentForm = getLatestForm()
    const removedMeta = getScbaRemovedMeta()
    updateForm({
      ...currentForm,
      scbaCustomSections: normalizeScbaCustomSections(
        currentForm.scbaCustomSections || currentForm.scba_custom_sections,
      ).map((candidate) =>
        candidate.key === sectionKey
          ? {
              ...candidate,
              ...removedMeta,
              rows: (candidate.rows || []).map((row) => ({ ...row, ...removedMeta })),
            }
          : candidate,
      ),
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
      ).map((candidate) =>
        candidate.key === sectionKey
          ? {
              ...candidate,
              removed: false,
              removedAt: '',
              removedBy: '',
              removedReason: '',
              rows: (candidate.rows || []).map((row) => ({
                ...row,
                removed: false,
                removedAt: '',
                removedBy: '',
                removedReason: '',
              })),
            }
          : candidate,
      ),
    })
  }

  const requestArchiveScbaSection = (section = {}) => {
    if (!section.catalogSectionId) return
    setScbaArchiveTarget({
      type: 'section',
      section,
      message: 'Archive this for future inspections? Previous reports are unchanged.',
    })
  }

  const requestArchiveScbaItem = (sectionKey, row = {}) => {
    if (!row.catalogItemId) return
    setScbaArchiveTarget({
      type: 'item',
      sectionKey,
      row,
      message: 'Archive this for future inspections? Previous reports are unchanged.',
    })
  }

  const archiveScbaCatalogTarget = async () => {
    if (!scbaArchiveTarget) return
    try {
      if (scbaArchiveTarget.type === 'section') {
        await archiveScbaCatalogSection(scbaArchiveTarget.section.catalogSectionId)
        setScbaCatalogSections((current) =>
          current.filter(
            (section) => section.catalogSectionId !== scbaArchiveTarget.section.catalogSectionId,
          ),
        )
      } else if (scbaArchiveTarget.type === 'item') {
        await archiveScbaCatalogItem(scbaArchiveTarget.row.catalogItemId)
        setScbaCatalogSections((current) =>
          current.map((section) =>
            section.key === scbaArchiveTarget.sectionKey
              ? {
                  ...section,
                  rows: (section.rows || []).filter(
                    (row) => row.catalogItemId !== scbaArchiveTarget.row.catalogItemId,
                  ),
                }
              : section,
          ),
        )
      }
      setScbaArchiveTarget(null)
    } catch (error) {
      pushToast?.({
        title: 'SCBA catalog',
        body: error?.message || 'Unable to archive SCBA catalog item.',
        color: 'danger',
      })
    }
  }

  const markAllHydraulicOk = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.hydraulicChecks)
      ? currentForm.hydraulicChecks
      : []
    const visibleRows = getHydraulicCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    const byId = new Map(currentChecks.map((check) => [String(check.id || ''), check]))
    const visibleIds = new Set(visibleRows.map((row) => String(row.id || '')))
    const nextVisibleChecks = visibleRows.map((row) =>
      buildHydraulicCheckRow(
        row,
        byId.get(String(row.id || '')),
        buildHydraulicFillBlankOkPatch({ ...row, ...(byId.get(String(row.id || '')) || {}) }),
      ),
    )

    updateForm({
      ...currentForm,
      hydraulicChecks: [
        ...nextVisibleChecks,
        ...currentChecks.filter((check) => !visibleIds.has(String(check.id || ''))),
      ],
    })
  }

  const markAllErAuxOk = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.erAuxChecks) ? currentForm.erAuxChecks : []
    const visibleRows = getErAuxCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    const byId = new Map(currentChecks.map((check) => [String(check.id || ''), check]))
    const visibleIds = new Set(visibleRows.map((row) => String(row.id || '')))
    const nextVisibleChecks = visibleRows.map((row) =>
      buildErAuxCheckRow(row, byId.get(String(row.id || '')), erAuxOkPatch),
    )

    updateForm({
      ...currentForm,
      erAuxChecks: [
        ...nextVisibleChecks,
        ...currentChecks.filter((check) => !visibleIds.has(String(check.id || ''))),
      ],
    })
  }

  const markAllHighAngleGood = () => {
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.highAngleChecks)
      ? currentForm.highAngleChecks
      : []
    const visibleRows = getHighAngleCheckSummary(currentForm).visibleChecks || []
    if (visibleRows.length === 0) return

    const byId = new Map(currentChecks.map((check) => [String(check.id || ''), check]))
    const visibleIds = new Set(visibleRows.map((row) => String(row.id || '')))
    const nextVisibleChecks = visibleRows.map((row) =>
      buildHighAngleCheckRow(
        row,
        byId.get(String(row.id || '')),
        buildHighAngleFillBlankGoodPatch({ ...row, ...(byId.get(String(row.id || '')) || {}) }),
      ),
    )

    updateForm({
      ...currentForm,
      highAngleChecks: [
        ...nextVisibleChecks,
        ...currentChecks.filter((check) => !visibleIds.has(String(check.id || ''))),
      ],
    })
  }

  const markAllFrtOk = () => {
    const currentForm = getLatestForm()
    const summary = getFrtCheckSummary(currentForm)
    const currentDailyChecks = Array.isArray(currentForm.frtDailyChecks)
      ? currentForm.frtDailyChecks
      : []
    const currentOneOffChecks = Array.isArray(currentForm.frtOneOffChecks)
      ? currentForm.frtOneOffChecks
      : []
    const dailyById = new Map(currentDailyChecks.map((check) => [String(check.id || ''), check]))
    const oneOffById = new Map(currentOneOffChecks.map((check) => [String(check.id || ''), check]))

    updateForm({
      ...currentForm,
      frtDailyChecks: summary.dailyRows.map((row) =>
        buildFrtDailyCheckRow(
          row,
          dailyById.get(String(row.id || '')),
          row.rowKind === 'reading' ? {} : frtDailyCheckedPatch,
        ),
      ),
      frtOneOffChecks: summary.oneOffRows.map((row) =>
        buildFrtOneOffCheckRow(row, oneOffById.get(String(row.id || '')), frtOneOffGoodPatch),
      ),
    })
  }

  const markAllScbaOk = () => {
    const currentForm = getLatestForm()
    const visibleSections = getScbaCheckSummary(currentForm).visibleSections || []
    const nextForm = { ...currentForm }

    visibleSections.forEach((section) => {
      const checksFieldKey = getScbaChecksField(section.key)
      if (!checksFieldKey) {
        nextForm.scbaCustomSections = updateScbaCustomSectionRows(nextForm, section.key, (rows) => {
          const byId = new Map(rows.map((check) => [String(check.id || ''), check]))
          const visibleIds = new Set(section.visibleRows.map((row) => String(row.id || '')))
          const nextVisibleChecks = section.visibleRows.map((row) =>
            buildScbaCheckRow(
              section.key,
              row,
              byId.get(String(row.id || '')),
              buildScbaFillBlankGoodPatch(section.key, {
                ...row,
                ...(byId.get(String(row.id || '')) || {}),
              }),
            ),
          )
          return [
            ...nextVisibleChecks,
            ...rows.filter((check) => !visibleIds.has(String(check.id || ''))),
          ]
        })
        return
      }
      const currentChecks = Array.isArray(nextForm[checksFieldKey]) ? nextForm[checksFieldKey] : []
      const byId = new Map(currentChecks.map((check) => [String(check.id || ''), check]))
      const visibleIds = new Set(section.visibleRows.map((row) => String(row.id || '')))
      const nextVisibleChecks = section.visibleRows.map((row) =>
        buildScbaCheckRow(
          section.key,
          row,
          byId.get(String(row.id || '')),
          buildScbaFillBlankGoodPatch(section.key, {
            ...row,
            ...(byId.get(String(row.id || '')) || {}),
          }),
        ),
      )
      nextForm[checksFieldKey] = [
        ...nextVisibleChecks,
        ...currentChecks.filter((check) => !visibleIds.has(String(check.id || ''))),
      ]
    })

    updateForm(nextForm)
  }

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
    saveCachedFireExtinguisherCatalog(mainLocation, subLocation, rows)
  }

  const addFireExtinguisher = async (payload) => {
    try {
      const saved = await createFireExtinguisherOption({
        ...payload,
        mainLocation: payload.mainLocation || mainLocation,
        subLocation: payload.subLocation || subLocation,
      })
      if (!saved) throw new Error('Fire extinguisher was not saved.')
      persistFireExtinguisherRows([...fireExtinguisherRows, saved])
      pushToast('Fire extinguisher added.', { title: 'Catalog saved', color: 'success' })
    } catch (error) {
      pushToast(
        error?.response?.data?.message || error?.message || 'Unable to save extinguisher.',
        {
          title: 'Save failed',
          color: 'danger',
        },
      )
    }
  }

  const updateFireExtinguisher = async (row, payload) => {
    const catalogId = String(row?.catalogId || row?.id || '').trim()
    if (!catalogId) return
    try {
      const saved = await updateFireExtinguisherOption(catalogId, {
        ...payload,
        mainLocation: payload.mainLocation || mainLocation,
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
    } catch (error) {
      pushToast(
        error?.response?.data?.message || error?.message || 'Unable to update extinguisher.',
        {
          title: 'Save failed',
          color: 'danger',
        },
      )
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
      updateForm({
        ...getLatestForm(),
        fireExtinguisherChecks: (getLatestForm().fireExtinguisherChecks || []).filter(
          (check) => String(check.id || '') !== rowId,
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
    setEquipmentEditMode(false)
    setEditingEquipmentId('')
    setEditingLocalEquipmentId('')
    setNewEquipmentName('')
    setNewEquipmentDescription('')
    setEquipmentError('')
    setShowEquipmentModal(true)
  }

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

  const startEditEquipment = (row) => {
    setEquipmentEditMode(false)
    const equipmentId = String(row?.equipmentId || '').trim()
    const localId =
      checksField === 'erAuxChecks' && !equipmentId && row?.isLocalSeedEquipment === true
        ? String(row?.id || '').trim()
        : ''
    setEditingEquipmentId(equipmentId)
    setEditingLocalEquipmentId(localId)
    setNewEquipmentName(String(row?.equipment || row?.title || '').trim())
    setNewEquipmentDescription(String(row?.description || '').trim())
    setEquipmentError('')
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
      updateForm({
        ...getLatestForm(),
        ...(equipmentRowsField ? { [equipmentRowsField]: nextRows } : {}),
        ...(checksField
          ? {
              [checksField]: (getLatestForm()[checksField] || []).map((check) =>
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

      const nextRows = editingEquipmentId
        ? equipmentRows.map((row) =>
            String(row.equipmentId || row.id || '') === String(editingEquipmentId) ? saved : row,
          )
        : [...equipmentRows, saved]
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

  const setLocation = ({
    mainLocation: nextMainLocation = '',
    subLocation: nextSubLocation = '',
  }) => {
    const main = String(nextMainLocation || '').trim()
    if (!main) return
    updateForm({
      ...form,
      mainLocation: main,
      subLocation: String(nextSubLocation || '').trim(),
      mainLocationId: '',
      subLocationId: '',
    })
  }

  const focusFirstMissingField = (currentForm, validation = null) => {
    const firstTarget = validation?.firstTarget || null
    const firstMissing = firstTarget?.field || getFirstMissingInspectionField(currentForm)
    if (!firstMissing) return
    if (firstTarget?.rowId && String(firstMissing || '').startsWith('erAux')) {
      const row = Array.from(document.querySelectorAll('[data-inspection-er-aux-row-id]')).find(
        (element) => element.getAttribute('data-inspection-er-aux-row-id') === firstTarget.rowId,
      )
      const detailTarget =
        row && firstTarget.detailKey
          ? Array.from(row.querySelectorAll('[data-inspection-er-aux-detail-key]')).find(
              (element) =>
                element.getAttribute('data-inspection-er-aux-detail-key') === firstTarget.detailKey,
            )
          : null
      const target = detailTarget || row
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        const focusTarget = target.querySelector?.('textarea, input, button, [tabindex]') || target
        window.setTimeout(() => focusTarget.focus?.(), 150)
        return
      }
    }
    if (firstTarget?.rowId && String(firstMissing || '').startsWith('frt')) {
      window.dispatchEvent(
        new CustomEvent('inspection:focus-frt-row', {
          detail: { rowId: firstTarget.rowId },
        }),
      )
      window.setTimeout(() => {
        const row = Array.from(document.querySelectorAll('[data-inspection-frt-row-id]')).find(
          (element) => element.getAttribute('data-inspection-frt-row-id') === firstTarget.rowId,
        )
        const detailTarget =
          row && firstTarget.detailKey
            ? Array.from(row.querySelectorAll('[data-inspection-frt-detail-key]')).find(
                (element) =>
                  element.getAttribute('data-inspection-frt-detail-key') === firstTarget.detailKey,
              )
            : null
        const target = detailTarget || row
        if (target) {
          target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
          const focusTarget =
            target.querySelector?.('textarea, input, button, [tabindex]') || target
          focusTarget.focus?.()
        }
      }, 150)
      return
    }
    if (firstTarget?.rowId) {
      const row = Array.from(document.querySelectorAll('[data-fire-extinguisher-row-id]')).find(
        (element) => element.getAttribute('data-fire-extinguisher-row-id') === firstTarget.rowId,
      )
      const checkTarget =
        row && firstTarget.checkKey
          ? Array.from(row.querySelectorAll('[data-fire-extinguisher-check-key]')).find(
              (element) =>
                element.getAttribute('data-fire-extinguisher-check-key') === firstTarget.checkKey,
            )
          : null
      const detailTarget =
        row && firstTarget.detailKey
          ? Array.from(row.querySelectorAll('[data-fire-extinguisher-detail-key]')).find(
              (element) =>
                element.getAttribute('data-fire-extinguisher-detail-key') === firstTarget.detailKey,
            )
          : null
      const target = checkTarget || detailTarget || row
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        const focusTarget = target.querySelector?.('textarea, input, button, [tabindex]') || target
        window.setTimeout(() => focusTarget.focus?.(), 150)
        return
      }
    }
    if (firstTarget?.detailKey) {
      const target = Array.from(document.querySelectorAll('[data-hse-field]')).find(
        (element) => element.getAttribute('data-hse-field') === firstTarget.detailKey,
      )
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        const focusTarget = target.querySelector?.('textarea, input, button, [tabindex]') || target
        window.setTimeout(() => focusTarget.focus?.(), 150)
        return
      }
    }
    const fieldRefs = {
      inspectionType: inspectionTypeRef,
      inspectedAt: inspectedAtRef,
      selectedLocation: selectedLocationRef,
      erAuxSession: erAuxChecksRef,
      erAuxChecks: erAuxChecksRef,
      erAuxRemarks: erAuxChecksRef,
      fireExtinguisherSession: fireExtinguisherChecksRef,
      fireExtinguisherChecks: fireExtinguisherChecksRef,
      fireExtinguisherRemarks: fireExtinguisherChecksRef,
      hydraulicChecks: hydraulicChecksRef,
      hydraulicRemarks: hydraulicChecksRef,
      frtSession: frtChecksRef,
      frtDailyChecks: frtChecksRef,
      frtDailyRemarks: frtChecksRef,
      frtOneOffChecks: frtChecksRef,
      frtOneOffRemarks: frtChecksRef,
      highAngleSession: highAngleChecksRef,
      highAngleChecks: highAngleChecksRef,
      highAngleRemarks: highAngleChecksRef,
      scbaSession: scbaChecksRef,
      scbaChecks: scbaChecksRef,
      scbaRemarks: scbaChecksRef,
      hseSession: hseObservationRef,
      hseSelection: hseObservationRef,
      hseDetails: hseObservationRef,
      description: descriptionRef,
      photos: photosRef,
    }
    const target = fieldRefs[firstMissing]?.current
    if (!target) return
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    const focusTarget = target.querySelector?.('textarea, input, button, [tabindex]') || target
    window.setTimeout(() => focusTarget.focus?.(), 150)
  }

  const requestReview = () => {
    const currentForm = getLatestForm()
    const nextValidationState = getInspectionFormValidationState(currentForm)
    if (!isInspectionFormValid(currentForm)) {
      setValidationState(nextValidationState)
      setFieldErrors(nextValidationState.missing)
      focusFirstMissingField(currentForm, nextValidationState)
      pushToast('Complete the inspection form before review.', {
        title: 'Incomplete form',
        color: 'warning',
      })
      return
    }
    setValidationState(null)
    setFieldErrors({})
    onRequestReview?.(currentForm)
  }

  const validationStatusMessage =
    validationState?.errorCount > 0
      ? `${validationState.errorCount} item${
          validationState.errorCount === 1 ? '' : 's'
        } need attention before review.`
      : ''

  const renderDraftStatus = (className = '') =>
    draftStatus ? (
      <div className={`inspection-draft-status small text-body-secondary ${className}`.trim()}>
        {draftStatus}
      </div>
    ) : null

  const renderActions = (className = '', isMobileSticky = false) => {
    if (isMobileSticky) {
      const mobileDraftStatus =
        validationStatusMessage || draftStatus || 'Unsaved changes are not submitted yet.'

      return (
        <>
          <FormActionGroup
            className={className}
            mobileVariant="compact-sticky"
            statusMessage={mobileDraftStatus}
          >
            <CButton
              color="secondary"
              variant="outline"
              className="inspection-form-sticky-draft-btn"
              onClick={() => onSaveDraft?.(getLatestForm())}
            >
              Save Draft
            </CButton>
            <CButton
              color="primary"
              className="inspection-form-sticky-review-btn"
              onClick={requestReview}
            >
              Save &amp; Review
            </CButton>
          </FormActionGroup>
          <div className="inspection-form-sticky-spacer" aria-hidden="true" />
        </>
      )
    }

    return (
      <div
        className={`inspection-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 ${className}`.trim()}
      >
        {validationStatusMessage ? (
          <div className="inspection-draft-status small text-warning-emphasis me-sm-auto align-self-sm-center">
            {validationStatusMessage}
          </div>
        ) : (
          renderDraftStatus('me-sm-auto align-self-sm-center')
        )}
        <CButton color="secondary" variant="outline" onClick={() => onSaveDraft?.(getLatestForm())}>
          Save Draft
        </CButton>
        <CButton color="primary" onClick={requestReview}>
          Save &amp; Review
        </CButton>
      </div>
    )
  }

  const renderDraftOnlyActions = (className = '', isMobileSticky = false) => {
    if (isMobileSticky) {
      return (
        <>
          <FormActionGroup
            className={className}
            mobileVariant="compact-sticky"
            statusMessage={draftStatus || 'This inspection type can be saved as draft only.'}
          >
            <CButton
              color="secondary"
              variant="outline"
              className="inspection-form-sticky-draft-btn"
              onClick={() => onSaveDraft?.(getLatestForm())}
            >
              Save Draft
            </CButton>
          </FormActionGroup>
          <div className="inspection-form-sticky-spacer" aria-hidden="true" />
        </>
      )
    }

    return (
      <div
        className={`inspection-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 ${className}`.trim()}
      >
        <div className="inspection-draft-status small text-body-secondary me-sm-auto align-self-sm-center">
          {draftStatus || 'This inspection type can be saved as draft only.'}
        </div>
        <CButton color="secondary" variant="outline" onClick={() => onSaveDraft?.(getLatestForm())}>
          Save Draft
        </CButton>
      </div>
    )
  }

  const renderPhotoEvidence = () => (
    <InspectionGeneralEvidenceCard
      cardRef={photosRef}
      title={
        isStructuredInspectionForm
          ? selectedTypeDefinition?.photoEvidenceTitle || 'General Evidence Photos'
          : 'Upload Photos and Describe'
      }
      photos={form.photos}
      fieldError={fieldErrors.photos}
      emptyMessage={
        isStructuredInspectionForm
          ? 'No general evidence photos added.'
          : 'No photos yet. Upload photos to continue.'
      }
      onTakePhoto={() => requestRootPhotoUpload(cameraInputRef)}
      onUploadPhoto={() => requestRootPhotoUpload(uploadInputRef)}
      onRemovePhoto={removePhoto}
      onChangePhotoDescription={updatePhotoDescription}
    />
  )

  const structuredSectionRef =
    selectedTypeDefinition?.fieldRefKey === 'hydraulicChecks'
      ? hydraulicChecksRef
      : selectedTypeDefinition?.fieldRefKey === 'fireExtinguisherChecks'
        ? fireExtinguisherChecksRef
        : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
          ? frtChecksRef
          : selectedTypeDefinition?.fieldRefKey === 'highAngleChecks'
            ? highAngleChecksRef
            : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
              ? scbaChecksRef
              : selectedTypeDefinition?.fieldRefKey === 'hseObservation'
                ? hseObservationRef
                : erAuxChecksRef
  const StructuredEditSection = selectedTypeDefinition?.EditSection || null
  const structuredSectionHandlers = {
    onUpdateCheck:
      checksField === 'erAuxChecks'
        ? updateErAuxCheck
        : checksField === 'hydraulicChecks'
          ? updateHydraulicCheck
          : checksField === 'fireExtinguisherChecks'
            ? updateFireExtinguisherCheck
            : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
              ? updateFrtCheck
              : checksField === 'highAngleChecks'
                ? updateHighAngleCheck
                : undefined,
    onUpdateGroupedCheck:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? updateScbaGroupedCheck : undefined,
    onUpdateSessionMeta:
      checksField === 'erAuxChecks'
        ? updateErAuxSessionMeta
        : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
          ? updateFrtSessionMeta
          : checksField === 'highAngleChecks'
            ? updateHighAngleSessionMeta
            : checksField === 'fireExtinguisherChecks'
              ? updateFireExtinguisherSessionMeta
              : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
                ? updateScbaSessionMeta
                : selectedTypeDefinition?.fieldRefKey === 'hseObservation'
                  ? updateHseSessionMeta
                  : undefined,
    onUpdateHseField:
      selectedTypeDefinition?.fieldRefKey === 'hseObservation' ? updateHseField : undefined,
    onToggleHseSelection:
      selectedTypeDefinition?.fieldRefKey === 'hseObservation'
        ? toggleHseObservationSelection
        : undefined,
    onTakeGeneralPhoto:
      selectedTypeDefinition?.fieldRefKey === 'hseObservation'
        ? (caption) => requestRootPhotoUpload(cameraInputRef, caption)
        : undefined,
    onUploadGeneralPhoto:
      selectedTypeDefinition?.fieldRefKey === 'hseObservation'
        ? (caption) => requestRootPhotoUpload(uploadInputRef, caption)
        : undefined,
    onMarkEquipmentOk:
      checksField === 'erAuxChecks'
        ? markErAuxEquipmentOk
        : checksField === 'hydraulicChecks'
          ? markHydraulicEquipmentOk
          : undefined,
    onMarkRowOk:
      selectedTypeDefinition?.fieldRefKey === 'frtChecks'
        ? markFrtRowOk
        : checksField === 'highAngleChecks'
          ? markHighAngleRowOk
          : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
            ? markScbaRowOk
            : undefined,
    onMarkAllOk:
      checksField === 'erAuxChecks'
        ? markAllErAuxOk
        : checksField === 'hydraulicChecks'
          ? markAllHydraulicOk
          : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
            ? markAllFrtOk
            : checksField === 'highAngleChecks'
              ? markAllHighAngleGood
              : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
                ? markAllScbaOk
                : undefined,
    onRequestPhotoUpload:
      checksField === 'erAuxChecks'
        ? requestErAuxPhotoUpload
        : checksField === 'hydraulicChecks'
          ? requestHydraulicPhotoUpload
          : checksField === 'fireExtinguisherChecks'
            ? requestFireExtinguisherPhotoUpload
            : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
              ? requestScbaPhotoUpload
              : undefined,
    onRequestDefectPhotoUpload:
      checksField === 'erAuxChecks'
        ? requestErAuxDefectPhotoUpload
        : checksField === 'hydraulicChecks'
          ? requestHydraulicDefectPhotoUpload
          : checksField === 'fireExtinguisherChecks'
            ? requestFireExtinguisherDefectPhotoUpload
            : undefined,
    onRequestFrtIssuePhotoUpload:
      selectedTypeDefinition?.fieldRefKey === 'frtChecks' ? requestFrtIssuePhotoUpload : undefined,
    onRequestHighAngleIssuePhotoUpload:
      checksField === 'highAngleChecks' ? requestHighAngleIssuePhotoUpload : undefined,
    onRequestScbaIssuePhotoUpload:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
        ? requestScbaIssuePhotoUpload
        : undefined,
    onRemovePhoto:
      checksField === 'erAuxChecks'
        ? removeErAuxPhoto
        : checksField === 'hydraulicChecks'
          ? removeHydraulicPhoto
          : checksField === 'fireExtinguisherChecks'
            ? removeFireExtinguisherPhoto
            : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
              ? removeFrtPhoto
              : checksField === 'highAngleChecks'
                ? removeHighAnglePhoto
                : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
                  ? removeScbaPhoto
                  : undefined,
    onChangePhotoDescription:
      checksField === 'erAuxChecks'
        ? updateErAuxPhotoDescription
        : checksField === 'hydraulicChecks'
          ? updateHydraulicPhotoDescription
          : checksField === 'fireExtinguisherChecks'
            ? updateFireExtinguisherPhotoDescription
            : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
              ? updateFrtPhotoDescription
              : checksField === 'highAngleChecks'
                ? updateHighAnglePhotoDescription
                : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
                  ? updateScbaPhotoDescription
                  : undefined,
    onApplyPhotoCaption:
      checksField === 'erAuxChecks'
        ? applyErAuxPhotoCaption
        : checksField === 'hydraulicChecks'
          ? applyHydraulicPhotoCaption
          : checksField === 'fireExtinguisherChecks'
            ? applyFireExtinguisherPhotoCaption
            : selectedTypeDefinition?.fieldRefKey === 'frtChecks'
              ? applyFrtPhotoCaption
              : checksField === 'highAngleChecks'
                ? applyHighAnglePhotoCaption
                : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
                  ? applyScbaPhotoCaption
                  : undefined,
    onAddExtinguisher: addFireExtinguisher,
    onUpdateExtinguisher: updateFireExtinguisher,
    onDeleteExtinguisher: (row) =>
      setFireExtinguisherDeleteTarget({
        label: row?.idLocNo || row?.barcodeNo || row?.feType || 'shared extinguisher',
        row,
      }),
    onAddEquipment: openAddEquipmentModal,
    onAddScbaSection:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? openAddScbaSectionModal : undefined,
    onEditScbaSection:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? openEditScbaSectionModal : undefined,
    onDeleteScbaSection:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? requestRemoveScbaSection : undefined,
    onArchiveScbaSection:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? requestArchiveScbaSection : undefined,
    onRestoreScbaSection:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? restoreScbaSection : undefined,
    onAddScbaItem:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? openAddScbaItemModal : undefined,
    onEditScbaItem:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? openEditScbaItemModal : undefined,
    onDeleteScbaItem:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? requestRemoveScbaItem : undefined,
    onArchiveScbaItem:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? requestArchiveScbaItem : undefined,
    onRestoreScbaItem:
      selectedTypeDefinition?.fieldRefKey === 'scbaChecks' ? restoreScbaItem : undefined,
    onEditEquipment: (row) => {
      setShowEquipmentModal(true)
      startEditEquipment(row)
    },
    onDeleteEquipment: (row) =>
      setEquipmentDeleteTarget({
        value: getEquipmentBackendId(row) || getEquipmentRowId(row),
        label: row?.equipment,
        row,
      }),
    selectedTruckOption:
      selectedTypeDefinition?.fieldRefKey === 'frtChecks' ? selectedFireTruckOption : null,
    onEditTruck:
      selectedTypeDefinition?.fieldRefKey === 'frtChecks' ? startEditFireTruck : undefined,
    onDeleteTruck:
      selectedTypeDefinition?.fieldRefKey === 'frtChecks'
        ? (truck) =>
            setFireTruckDeleteTarget({
              value: truck?.truckId || truck?.id,
              label: truck?.plateNo || truck?.value || truck?.title,
              truck,
            })
        : undefined,
  }

  return (
    <>
      <ActionConfirmModal
        visible={Boolean(locationDeleteTarget)}
        title="Delete Location"
        message={
          locationDeleteTarget?.row?.custom
            ? locationDeleteTarget?.label
              ? `Delete "${locationDeleteTarget.label}"?`
              : 'Delete this location?'
            : locationDeleteTarget?.isSubLocation
              ? 'Delete this shared sub-location? This will remove it from all future inspections. Past inspection records will not be changed.'
              : 'Delete this shared location? This will remove it and its sub-locations from all future inspections. Past inspection records will not be changed.'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setLocationDeleteTarget(null)}
        onConfirm={() => {
          if (locationDeleteTarget?.value) location.removeType(locationDeleteTarget.value)
          setLocationDeleteTarget(null)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(fireExtinguisherDeleteTarget)}
        title="Delete Extinguisher"
        message={
          fireExtinguisherDeleteTarget?.row?.equipmentSource === 'seed'
            ? 'Delete this shared extinguisher? This will remove it from all future inspections. Past inspection records will not be changed.'
            : fireExtinguisherDeleteTarget?.label
              ? `Delete "${fireExtinguisherDeleteTarget.label}"?`
              : 'Delete this extinguisher?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setFireExtinguisherDeleteTarget(null)}
        onConfirm={() => {
          const targetRow = fireExtinguisherDeleteTarget?.row
          setFireExtinguisherDeleteTarget(null)
          if (targetRow) deleteFireExtinguisher(targetRow)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(incidentDeleteTarget)}
        title="Delete Type"
        message={
          incidentDeleteTarget?.label
            ? `Delete "${incidentDeleteTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setIncidentDeleteTarget(null)}
        onConfirm={() => {
          if (incidentDeleteTarget?.value) incident.removeType(incidentDeleteTarget.value)
          setIncidentDeleteTarget(null)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(equipmentDeleteTarget)}
        title="Delete Equipment"
        message={
          equipmentDeleteTarget?.label
            ? `Delete "${equipmentDeleteTarget.label}"? Existing entries for this equipment in the current form will be removed.`
            : 'Delete this equipment?'
        }
        confirmLabel={isDeletingEquipment ? 'Deleting...' : 'Delete'}
        confirmColor="danger"
        confirmDisabled={isDeletingEquipment}
        cancelDisabled={isDeletingEquipment}
        onClose={() => {
          if (!isDeletingEquipment) setEquipmentDeleteTarget(null)
        }}
        onConfirm={() => deleteEquipment(equipmentDeleteTarget?.row)}
      />
      <ActionConfirmModal
        visible={Boolean(fireTruckDeleteTarget)}
        title="Delete Truck"
        message={
          fireTruckDeleteTarget?.label
            ? `Delete truck "${fireTruckDeleteTarget.label}"? If it is selected, the current FRT readiness form will need another truck before review.`
            : 'Delete this truck?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setFireTruckDeleteTarget(null)}
        onConfirm={() => deleteFireTruck(fireTruckDeleteTarget?.truck)}
      />
      <ActionConfirmModal
        visible={Boolean(scbaRemoveTarget)}
        title="Remove SCBA Item"
        message={scbaRemoveTarget?.message || 'Remove this from this inspection?'}
        confirmLabel="Remove"
        confirmColor="danger"
        onClose={() => setScbaRemoveTarget(null)}
        onConfirm={() => {
          if (scbaRemoveTarget?.type === 'section') {
            removeScbaSectionFromInspection(scbaRemoveTarget.section)
          } else if (scbaRemoveTarget?.type === 'item') {
            removeScbaItemFromInspection(scbaRemoveTarget.sectionKey, scbaRemoveTarget.row)
          }
          setScbaRemoveTarget(null)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(scbaArchiveTarget)}
        title="Archive SCBA Catalog"
        message={
          scbaArchiveTarget?.message ||
          'Archive this for future inspections? Previous reports are unchanged.'
        }
        confirmLabel="Archive"
        confirmColor="danger"
        onClose={() => setScbaArchiveTarget(null)}
        onConfirm={archiveScbaCatalogTarget}
      />

      <CModal visible={scbaSectionModal.visible} onClose={closeScbaSectionModal}>
        <CModalHeader>
          <CModalTitle>
            {scbaSectionModal.mode === 'edit' ? 'Edit SCBA Section' : 'Add SCBA Section'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          <div>
            <CFormLabel>Section title</CFormLabel>
            <CFormInput
              value={scbaSectionModal.title}
              placeholder="e.g. Regulator"
              onChange={(event) =>
                setScbaSectionModal((current) => ({
                  ...current,
                  title: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          <div>
            <CFormLabel>Short label</CFormLabel>
            <CFormInput
              value={scbaSectionModal.shortLabel}
              placeholder="Optional"
              onChange={(event) =>
                setScbaSectionModal((current) => ({
                  ...current,
                  shortLabel: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          <div>
            <CFormLabel>Inspection checks for each item</CFormLabel>
            <CFormTextarea
              rows={4}
              value={scbaSectionModal.checksText}
              placeholder={'One check per line\ne.g. Physical Condition\nLeak Test'}
              onChange={(event) =>
                setScbaSectionModal((current) => ({
                  ...current,
                  checksText: event.target.value,
                  error: '',
                }))
              }
            />
            <div className="small text-body-secondary mt-1">
              These checks appear inside every item added to this section.
            </div>
          </div>
          <FormFieldError>{scbaSectionModal.error}</FormFieldError>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeScbaSectionModal}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveScbaSectionModal} disabled={isSavingScbaCatalog}>
            {isSavingScbaCatalog
              ? 'Saving...'
              : scbaSectionModal.mode === 'edit'
                ? 'Update section'
                : 'Add section'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={scbaItemModal.visible} onClose={closeScbaItemModal}>
        <CModalHeader>
          <CModalTitle>
            {scbaItemModal.mode === 'edit' ? 'Edit SCBA Item' : 'Add SCBA Item'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          <div>
            <CFormLabel>Brand</CFormLabel>
            <CFormInput
              value={scbaItemModal.brand}
              placeholder="e.g. MSA"
              onChange={(event) =>
                setScbaItemModal((current) => ({
                  ...current,
                  brand: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          <div>
            <CFormLabel>Serial No.</CFormLabel>
            <CFormInput
              value={scbaItemModal.serialNo}
              placeholder="e.g. MSA 04"
              onChange={(event) =>
                setScbaItemModal((current) => ({
                  ...current,
                  serialNo: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          {scbaItemModal.sectionKey === 'cylinder' ? (
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <CFormLabel>Size</CFormLabel>
                <CFormInput
                  value={scbaItemModal.size}
                  placeholder="e.g. 6.8"
                  onChange={(event) =>
                    setScbaItemModal((current) => ({
                      ...current,
                      size: event.target.value,
                      error: '',
                    }))
                  }
                />
              </div>
              <div className="col-12 col-sm-6">
                <CFormLabel>Cylinder Type</CFormLabel>
                <CFormInput
                  value={scbaItemModal.cylinderType}
                  placeholder="e.g. Composite"
                  onChange={(event) =>
                    setScbaItemModal((current) => ({
                      ...current,
                      cylinderType: event.target.value,
                      error: '',
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
          <div>
            <CFormLabel>Details</CFormLabel>
            <CFormTextarea
              rows={2}
              value={scbaItemModal.equipmentDescription}
              placeholder="Optional"
              onChange={(event) =>
                setScbaItemModal((current) => ({
                  ...current,
                  equipmentDescription: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          <FormFieldError>{scbaItemModal.error}</FormFieldError>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeScbaItemModal}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveScbaItemModal} disabled={isSavingScbaCatalog}>
            {isSavingScbaCatalog
              ? 'Saving...'
              : scbaItemModal.mode === 'edit'
                ? 'Update item'
                : 'Add item'}
          </CButton>
        </CModalFooter>
      </CModal>

      <TypeManagerModal
        visible={location.showAddLocationModal}
        onClose={location.closeAddModal}
        editMode={location.locationEditMode}
        onSetEditMode={location.setLocationEditMode}
        editTitle={location.isEditingSubLocation ? 'Edit Sub-locations' : 'Edit Main Locations'}
        addTitle={location.isEditingSubLocation ? 'Add Sub-location' : 'Add Main Location'}
        options={location.editLocationOptions}
        onStartEdit={location.startEditType}
        onRequestDelete={({ value, label }) => {
          const row = location.editLocationOptions.find(
            (option) => String(option.value || '').trim() === String(value || '').trim(),
          )
          setLocationDeleteTarget({
            value,
            label,
            row,
            isSubLocation: location.isEditingSubLocation,
          })
        }}
        nameLabel={location.isEditingSubLocation ? 'Sub-location Name' : 'Main Location Name'}
        nameValue={location.newLocationName}
        onChangeName={(nextValue) => {
          location.setNewLocationName(nextValue)
          if (location.addLocationError) location.setAddLocationError('')
        }}
        namePlaceholder={location.isEditingSubLocation ? 'e.g. Reception' : 'e.g. Manjung Hub'}
        descriptionLabel={
          location.isEditingSubLocation
            ? 'Sub-location Details (Optional)'
            : 'Location Details (Optional)'
        }
        descriptionValue={location.newLocationDescription}
        onChangeDescription={location.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below location name."
        error={location.addLocationError}
        editingKey={location.editingLocationKey}
        editingLabel={location.isEditingSubLocation ? 'Editing sub-location' : 'Editing location'}
        editButtonLabel={
          location.isEditingSubLocation ? 'Edit Sub-locations' : 'Edit Main Locations'
        }
        onSave={location.saveType}
        saveLabel={location.isEditingSubLocation ? 'Save Sub-location' : 'Save Location'}
        updateLabel={
          location.editingLocationRow && !location.editingLocationRow.custom
            ? 'Save global change'
            : location.isEditingSubLocation
              ? 'Update Sub-location'
              : 'Update Location'
        }
        showRowIcon={false}
        getRowBadgeLabel={(row) => (row?.custom ? '' : 'Shared')}
        warningNotice={
          location.editingLocationRow && !location.editingLocationRow.custom
            ? 'This item is shared across inspections. Changes will affect future inspections.'
            : ''
        }
        iconOptions={[]}
        iconValue={location.newLocationIconKey}
        onChangeIcon={location.setNewLocationIconKey}
      />

      <TypeManagerModal
        visible={incident.showAddTypeModal}
        onClose={incident.closeAddModal}
        editMode={incident.incidentEditMode}
        onSetEditMode={incident.setIncidentEditMode}
        editTitle="Edit Inspection Types"
        addTitle="Add Inspection Type"
        options={incident.typeOptions}
        onStartEdit={incident.startEditType}
        onRequestDelete={({ value, label }) => setIncidentDeleteTarget({ value, label })}
        nameLabel="Inspection Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(nextValue) => {
          incident.setNewTypeName(nextValue)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Pump House"
        descriptionLabel="Inspection Type Details (Optional)"
        descriptionValue={incident.newTypeDescription}
        onChangeDescription={incident.setNewTypeDescription}
        descriptionPlaceholder="Subtext shown below type name."
        error={incident.addTypeError}
        editingKey={incident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={incident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={incident.iconOptions}
        iconValue={incident.newTypeIconKey}
        onChangeIcon={incident.setNewTypeIconKey}
        showIconPicker
      />

      <TypeManagerModal
        visible={showEquipmentModal}
        onClose={closeEquipmentModal}
        editMode={equipmentEditMode}
        onSetEditMode={setEquipmentEditMode}
        editTitle="Edit Equipment"
        addTitle="Add Equipment"
        options={equipmentModalOptions}
        onStartEdit={startEditEquipment}
        onRequestDelete={({ value, label }) => {
          const row = equipmentModalOptions.find(
            (option) => String(option.value || '') === String(value || ''),
          )
          setEquipmentDeleteTarget({ value, label, row })
        }}
        nameLabel="Equipment Name"
        nameValue={newEquipmentName}
        onChangeName={(nextValue) => {
          setNewEquipmentName(nextValue)
          if (equipmentError) setEquipmentError('')
        }}
        namePlaceholder="e.g. Hydraulic Ram Extension"
        descriptionLabel="Equipment Details (Optional)"
        descriptionValue={newEquipmentDescription}
        onChangeDescription={setNewEquipmentDescription}
        descriptionPlaceholder="Subtext shown below equipment name."
        error={equipmentError}
        editingKey={editingEquipmentId || editingLocalEquipmentId}
        editingLabel="Editing equipment"
        editButtonLabel="Edit Equipment"
        onSave={saveEquipment}
        saveLabel="Save Equipment"
        updateLabel="Update Equipment"
        showRowIcon={false}
        iconOptions={[]}
      />

      <CModal visible={showFireTruckModal} onClose={closeFireTruckModal} alignment="center">
        <CModalHeader>
          <CModalTitle>{editingFireTruckId ? 'Edit Truck' : 'Add Truck'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="d-grid gap-3">
            <div>
              <CFormLabel className="small fw-semibold text-muted">Plate Number</CFormLabel>
              <CFormInput
                value={newTruckPlateNo}
                placeholder="e.g. AJG9555"
                onChange={(event) => {
                  setNewTruckPlateNo(event.target.value.toUpperCase())
                  if (fireTruckError) setFireTruckError('')
                }}
              />
            </div>
            <div>
              <CFormLabel className="small fw-semibold text-muted">Truck Name</CFormLabel>
              <CFormInput
                value={newTruckName}
                placeholder="e.g. Fire Truck"
                onChange={(event) => setNewTruckName(event.target.value)}
              />
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <CFormLabel className="small fw-semibold text-muted">Road Tax Expiry</CFormLabel>
                <CFormInput
                  type="date"
                  value={newTruckRoadTaxExpiry}
                  onChange={(event) => setNewTruckRoadTaxExpiry(event.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <CFormLabel className="small fw-semibold text-muted">Insurance Expiry</CFormLabel>
                <CFormInput
                  type="date"
                  value={newTruckInsuranceExpiry}
                  onChange={(event) => setNewTruckInsuranceExpiry(event.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <CFormLabel className="small fw-semibold text-muted">Puspakom Expiry</CFormLabel>
                <CFormInput
                  type="date"
                  value={newTruckPuspakomExpiry}
                  onChange={(event) => setNewTruckPuspakomExpiry(event.target.value)}
                />
              </div>
            </div>
            <FormFieldError>{fireTruckError}</FormFieldError>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeFireTruckModal}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveFireTruck}>
            {editingFireTruckId ? 'Update Truck' : 'Save Truck'}
          </CButton>
        </CModalFooter>
      </CModal>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="d-none"
        onChange={handlePhotoSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="d-none"
        onChange={handlePhotoSelect}
      />
      <div className="inspection-form-sections d-grid gap-4">
        <div className="inspection-form-section d-grid gap-3" ref={inspectionTypeRef}>
          {selectedType && !isEditingType ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Type</div>
                <CreateActionButton
                  label="Edit"
                  className="inspection-compact-action-btn"
                  showIcon={false}
                  onClick={() => setIsEditingType(true)}
                />
              </div>
              <InspectionSelectedTypeCard
                inspectionType={
                  selectedTypeDefinition?.title || selectedTypeOption?.title || selectedType
                }
                icon={SelectedTypeIcon}
              />
            </>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Type</div>
                <div className="d-flex align-items-center gap-2">
                  <CreateActionButton
                    label="Add type"
                    className="inspection-compact-action-btn"
                    onClick={incident.openAddModal}
                  />
                  {selectedType ? (
                    <CreateActionButton
                      label="Done"
                      className="inspection-compact-action-btn"
                      showIcon={false}
                      onClick={() => setIsEditingType(false)}
                    />
                  ) : null}
                </div>
              </div>
              <IconOptionGrid
                options={incident.visibleTypeOptions}
                value={selectedType}
                onChange={(nextValue) => {
                  if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
                    incident.setShowAllIncidentTypes((prev) => !prev)
                    return
                  }
                  const nextDefinition = getInspectionTypeDefinition(nextValue)
                  const nextIsFireTruckCatalog = nextDefinition?.supportsFireTruckCatalog === true
                  updateForm({
                    ...form,
                    inspectionType: String(nextValue || '').trim(),
                    inspectedAt: form.inspectedAt || getDefaultInspectionDateTime(),
                    ...(nextIsFireTruckCatalog
                      ? {
                          selectedLocation: '',
                          mainLocation: '',
                          subLocation: '',
                          mainLocationId: '',
                          subLocationId: '',
                          frtTruckId: '',
                          frtTruckPlateNo: '',
                        }
                      : {}),
                  })
                  setIsEditingType(false)
                }}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                cardProps={(option, isSelected) => {
                  if (option?.value === INCIDENT_TYPE_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
                  return isSelected ? { style: ACTIVE_CARD_STYLE } : {}
                }}
              />
            </>
          )}
          <FormFieldError>
            {fieldErrors.inspectionType ? 'Choose an inspection type.' : ''}
          </FormFieldError>
        </div>

        <div className="inspection-form-section d-grid gap-3" ref={inspectedAtRef}>
          <div className="fw-semibold text-muted">Date and time of inspection</div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <CFormInput
                type="datetime-local"
                aria-label="Date and time of inspection"
                value={String(form.inspectedAt || '')}
                onChange={(event) => updateInspectedAt(event.target.value)}
              />
            </div>
          </div>
          <FormFieldError>
            {fieldErrors.inspectedAt ? 'Enter the inspection date and time.' : ''}
          </FormFieldError>
        </div>

        <div className="inspection-form-section d-grid gap-3" ref={selectedLocationRef}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold text-muted">
              {selectedTypeDefinition?.mainLocationLabel || 'Choose Main Location'}
            </div>
            {isFireTruckCatalogInspectionForm ? (
              <CreateActionButton
                label="Add Truck"
                className="inspection-compact-action-btn"
                onClick={openAddFireTruckModal}
              />
            ) : supportsCustomLocations ? (
              <CreateActionButton
                label="Add main location"
                className="inspection-compact-action-btn"
                onClick={location.openAddMainLocationModal}
              />
            ) : null}
          </div>
          <InspectionLocationOptionPicker
            options={
              isFireTruckCatalogInspectionForm ? fireTruckOptions : location.mainLocationOptions
            }
            visibleOptions={
              isFireTruckCatalogInspectionForm
                ? fireTruckOptions
                : location.visibleMainLocationOptions
            }
            value={isFireTruckCatalogInspectionForm ? selectedFireTruckPlate : mainLocation}
            onChange={(nextValue) => {
              if (isFireTruckCatalogInspectionForm) {
                const truck = fireTruckOptions.find(
                  (option) => String(option.value || '') === String(nextValue || ''),
                )
                selectFireTruck(truck)
                return
              }
              if (nextValue === LOCATION_TOGGLE_VALUE) {
                location.setShowAllMainLocationTypes((prev) => !prev)
                return
              }
              location.setMainLocation(nextValue)
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            searchPlaceholder={
              selectedTypeDefinition?.mainLocationSearchPlaceholder || 'Search main location...'
            }
            searchAriaLabel={
              isFireTruckCatalogInspectionForm ? 'Search truck plate' : 'Search main location'
            }
            clearSearchAriaLabel={
              isFireTruckCatalogInspectionForm ? 'Clear truck search' : 'Clear main location search'
            }
            toggleValue={isFireTruckCatalogInspectionForm ? '' : LOCATION_TOGGLE_VALUE}
            cardProps={(option, isSelected) => {
              if (option?.value === LOCATION_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
              return {
                icon: null,
                fallbackIcon: null,
                bodyClassName: 'gap-0',
                paddingClassName: 'p-3',
                style: isSelected ? ACTIVE_CARD_STYLE : undefined,
              }
            }}
          />
          <FormFieldError>
            {fieldErrors.selectedLocation
              ? selectedTypeDefinition?.mainLocationErrorLabel ||
                'Choose a main inspection location.'
              : ''}
          </FormFieldError>
        </div>

        {!isFireTruckCatalogInspectionForm &&
        mainLocation &&
        supportsSubLocations &&
        (location.subLocationOptions.length > 0 || subLocation) ? (
          <div className="inspection-form-section d-grid gap-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-baseline gap-2">
                <div className="fw-semibold text-muted">Choose Sub-location</div>
                <div className="small text-body-secondary">
                  (optional under {location.selectedMainLocationTitle || mainLocation})
                </div>
              </div>
              {supportsCustomLocations && location.subLocationOptions.length > 0 ? (
                <CreateActionButton
                  label={`Add sub-location (${location.subLocationOptions.length})`}
                  className="inspection-compact-action-btn"
                  onClick={location.openAddSubLocationModal}
                />
              ) : null}
            </div>
            {location.subLocationOptions.length > 0 ? (
              <InspectionLocationOptionPicker
                options={location.subLocationOptions}
                visibleOptions={location.visibleSubLocationOptions}
                value={subLocation}
                onChange={(nextValue) => {
                  if (nextValue === LOCATION_TOGGLE_VALUE) {
                    location.setShowAllSubLocationTypes((prev) => !prev)
                    return
                  }
                  location.setSubLocation(nextValue)
                }}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                searchPlaceholder="Search sub-location..."
                searchAriaLabel="Search sub-location"
                clearSearchAriaLabel="Clear sub-location search"
                toggleValue={LOCATION_TOGGLE_VALUE}
                cardProps={(option, isSelected) => {
                  if (option?.value === LOCATION_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
                  return {
                    icon: null,
                    fallbackIcon: null,
                    bodyClassName: 'gap-0',
                    paddingClassName: 'p-3',
                    style: isSelected ? ACTIVE_CARD_STYLE : undefined,
                  }
                }}
              />
            ) : null}
          </div>
        ) : null}

        {isFullInspectionForm ? (
          <>
            <div className="inspection-form-section d-grid gap-3">
              <div className="fw-semibold text-muted">Quick Checks</div>
              <ChipRow>
                {checklistChips.map((chip) => (
                  <ChipButton
                    key={chip}
                    className={
                      isInspectionChecklistItemSelected(form.checklist, selectedType, chip)
                        ? 'active'
                        : ''
                    }
                    onClick={() => toggleChecklistChip(chip)}
                  >
                    {chip}
                  </ChipButton>
                ))}
              </ChipRow>
            </div>

            <div className="inspection-form-section d-grid gap-3" ref={descriptionRef}>
              <CFormLabel className="fw-semibold text-muted mb-0">Describe</CFormLabel>
              <ChipRow>
                {INSPECTION_DESCRIPTION_CHIPS.map((chip) => (
                  <ChipButton key={chip} onClick={() => appendDescription(chip)}>
                    {chip}
                  </ChipButton>
                ))}
              </ChipRow>
              <CFormTextarea
                rows={5}
                placeholder="Describe what you inspected, what you found, and any action needed."
                value={form.description}
                onChange={(event) =>
                  updateForm({
                    ...form,
                    description: event.target.value,
                  })
                }
              />
              <FormFieldError>
                {fieldErrors.description ? 'Describe the inspection before review.' : ''}
              </FormFieldError>
            </div>

            {renderPhotoEvidence()}

            {renderActions('d-none d-md-flex')}
            {renderActions('inspection-form-sticky-actions d-md-none', true)}
          </>
        ) : null}

        {isStructuredInspectionForm && mainLocation && StructuredEditSection ? (
          <>
            <div className="inspection-form-section d-grid gap-3" ref={structuredSectionRef}>
              <StructuredEditSection
                mainLocation={mainLocation}
                mainLocationLabel={
                  isFireTruckCatalogInspectionForm
                    ? selectedFireTruckPlate
                    : location.selectedMainLocationTitle
                }
                form={structuredDisplayForm}
                summary={currentStructuredSummary}
                fieldErrors={fieldErrors}
                validationState={validationState}
                handlers={structuredSectionHandlers}
                selectedTypeDefinition={selectedTypeDefinition}
              />
            </div>

            {renderPhotoEvidence()}

            {renderActions('d-none d-md-flex')}
            {renderActions('inspection-form-sticky-actions d-md-none', true)}
          </>
        ) : null}

        {showComingSoonNotice ? (
          <>
            <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
              Actual field coming soon
            </div>
            {renderDraftOnlyActions('d-none d-md-flex')}
            {renderDraftOnlyActions('inspection-form-sticky-actions d-md-none', true)}
          </>
        ) : null}
      </div>
    </>
  )
}

export default InspectionForm
