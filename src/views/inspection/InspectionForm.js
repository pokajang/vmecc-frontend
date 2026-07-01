import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CButton, CFormTextarea } from '@coreui/react'
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
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  HYDRAULIC_CHECK_FIELDS,
  HIGH_ANGLE_STATUS_OPTIONS,
  SCBA_SECTION_DEFINITIONS,
  SCBA_STATUS_OPTIONS,
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
]

const InspectionForm = ({
  user,
  value,
  pushToast,
  onChange,
  onSaveDraft,
  onRequestReview,
  draftStatus = '',
}) => {
  const form = useMemo(() => normalizeInspectionForm(value), [value])
  const latestFormRef = useRef(form)
  const inspectionTypeRef = useRef(null)
  const selectedLocationRef = useRef(null)
  const descriptionRef = useRef(null)
  const erAuxChecksRef = useRef(null)
  const hydraulicChecksRef = useRef(null)
  const fireExtinguisherChecksRef = useRef(null)
  const frtChecksRef = useRef(null)
  const highAngleChecksRef = useRef(null)
  const scbaChecksRef = useRef(null)
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
  const [equipmentDeleteTarget, setEquipmentDeleteTarget] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationState, setValidationState] = useState(null)
  const [isEditingType, setIsEditingType] = useState(() => !selectedType)
  const [equipmentRows, setEquipmentRows] = useState([])
  const [fireExtinguisherRows, setFireExtinguisherRows] = useState([])
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [equipmentEditMode, setEquipmentEditMode] = useState(false)
  const [editingEquipmentId, setEditingEquipmentId] = useState('')
  const [newEquipmentName, setNewEquipmentName] = useState('')
  const [newEquipmentDescription, setNewEquipmentDescription] = useState('')
  const [equipmentError, setEquipmentError] = useState('')
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

  const updateForm = (nextForm) => {
    const normalized = normalizeInspectionForm(nextForm)
    latestFormRef.current = normalized
    setFieldErrors((currentErrors) => {
      if (!Object.values(currentErrors || {}).some(Boolean)) return currentErrors
      const missing = getInspectionFormMissingFields(normalized)
      return Object.keys(currentErrors).reduce((nextErrors, field) => {
        if (currentErrors[field] && missing[field]) nextErrors[field] = true
        return nextErrors
      }, {})
    })
    setValidationState((currentValidation) =>
      currentValidation?.errorCount
        ? getInspectionFormValidationState(normalized)
        : currentValidation,
    )
    onChange?.(normalized)
  }

  const getLatestForm = () => normalizeInspectionForm(latestFormRef.current || effectiveForm)

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

    const nextPhotos = []
    for (const file of processedFiles) {
      try {
        const url = await readFileAsDataUrl(file)
        nextPhotos.push({
          id: uid(),
          fileName: file.name,
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

    const uploadTarget = photoUploadTargetRef.current || { kind: 'root' }
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

    updateForm({
      ...form,
      photos: [...form.photos, ...nextPhotos],
    })
  }

  const requestRootPhotoUpload = (inputRef) => openPhotoInput({ kind: 'root' }, inputRef)

  const requestHydraulicPhotoUpload = (row) => {
    openPhotoInput({ kind: 'hydraulicEquipment', row }, cameraInputRef)
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

  const applyPhotoCaption = (photoId, caption) => {
    updateForm({
      ...form,
      photos: form.photos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
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
    if (!['erAuxInspectedBy', 'erAuxInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFrtSessionMeta = (field, nextValue) => {
    if (
      ![
        'frtInspectedBy',
        'frtInspectionDate',
        'frtShift',
        'frtDailyRemarks',
        'frtOneOffRemarks',
      ].includes(field)
    ) {
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

  const hydraulicOkPatch = useMemo(
    () =>
      HYDRAULIC_CHECK_FIELDS.reduce((next, field) => {
        next[field.key] = 'OK'
        return next
      }, {}),
    [],
  )
  const highAngleGoodPatch = useMemo(
    () => ({ condition: HIGH_ANGLE_STATUS_OPTIONS[0]?.value || 'Good' }),
    [],
  )
  const frtDailyCheckedPatch = useMemo(() => ({ status: 'Checked' }), [])
  const frtOneOffGoodPatch = useMemo(() => ({ condition: 'Good' }), [])
  const erAuxOkPatch = useMemo(() => ({ condition: 'OK' }), [])
  const scbaSectionFieldMap = useMemo(
    () =>
      SCBA_SECTION_DEFINITIONS.reduce((next, section) => {
        next[section.key] = Array.isArray(section.fields) ? section.fields : []
        return next
      }, {}),
    [],
  )
  const scbaGoodPatchBySection = useMemo(
    () =>
      Object.entries(scbaSectionFieldMap).reduce((next, [sectionKey, fields]) => {
        next[sectionKey] = fields.reduce((patch, field) => {
          if (field.kind === 'status') patch[field.key] = SCBA_STATUS_OPTIONS[0].value
          return patch
        }, {})
        return next
      }, {}),
    [scbaSectionFieldMap],
  )

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
    quantity: String(existing?.quantity || row?.defaultQuantity || ''),
    condition: String(existing?.condition || ''),
    remarks: String(existing?.remarks || ''),
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
      sectionKey,
      location: String(row?.location || existing?.location || '').trim(),
      mainLocation: String(
        row?.mainLocation || row?.location || existing?.mainLocation || existing?.location || '',
      ).trim(),
      brand: String(row?.brand || existing?.brand || '').trim(),
      serialNo: String(row?.serialNo || existing?.serialNo || '').trim(),
      size: String(row?.size || existing?.size || '').trim(),
      cylinderType: String(row?.cylinderType || existing?.cylinderType || '').trim(),
      remarks: String(existing?.remarks || ''),
      ...fields.reduce((next, field) => {
        next[field.key] = String(existing?.[field.key] || row?.[field.key] || '')
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
    updateHydraulicCheck(row, hydraulicOkPatch)
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
    updateHighAngleCheck(row, highAngleGoodPatch)
  }

  const updateScbaSessionMeta = (field, nextValue) => {
    if (!['scbaInspectedBy', 'scbaInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHighAngleSessionMeta = (field, nextValue) => {
    if (!['highAngleInspectedBy', 'highAngleInspectionDate'].includes(field)) return
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateFireExtinguisherSessionMeta = (field, nextValue) => {
    if (!['fireExtinguisherInspectedBy', 'fireExtinguisherInspectionDate'].includes(field)) {
      return
    }
    updateForm({
      ...form,
      [field]: String(nextValue || '').trim(),
    })
  }

  const updateHseSessionMeta = (field, nextValue) => {
    if (!['hseInspectedBy', 'hseInspectionDate'].includes(field)) return
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
        : 'scbaFaceMaskChecks'

  const updateScbaGroupedCheck = (sectionKey, row, patch) => {
    const checksFieldKey = getScbaChecksField(sectionKey)
    const rowId = String(row?.id || '').trim()
    if (!rowId) return
    const currentForm = getLatestForm()
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
    updateScbaGroupedCheck(sectionKey, row, scbaGoodPatchBySection[sectionKey] || {})
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
      buildHydraulicCheckRow(row, byId.get(String(row.id || '')), hydraulicOkPatch),
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
      buildHighAngleCheckRow(row, byId.get(String(row.id || '')), highAngleGoodPatch),
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
      const currentChecks = Array.isArray(nextForm[checksFieldKey]) ? nextForm[checksFieldKey] : []
      const byId = new Map(currentChecks.map((check) => [String(check.id || ''), check]))
      const visibleIds = new Set(section.visibleRows.map((row) => String(row.id || '')))
      const nextVisibleChecks = section.visibleRows.map((row) =>
        buildScbaCheckRow(
          section.key,
          row,
          byId.get(String(row.id || '')),
          scbaGoodPatchBySection[section.key] || {},
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
      pushToast('Fire extinguisher updated.', { title: 'Catalog saved', color: 'success' })
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
      pushToast('Fire extinguisher deleted.', { title: 'Catalog updated', color: 'success' })
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
    setNewEquipmentName('')
    setNewEquipmentDescription('')
    setEquipmentError('')
    setShowEquipmentModal(true)
  }

  const startEditEquipment = (row) => {
    setEquipmentEditMode(false)
    setEditingEquipmentId(String(row?.equipmentId || row?.id || ''))
    setNewEquipmentName(String(row?.equipment || row?.title || '').trim())
    setNewEquipmentDescription(String(row?.description || '').trim())
    setEquipmentError('')
  }

  const closeEquipmentModal = () => {
    setShowEquipmentModal(false)
    setEquipmentEditMode(false)
    setEditingEquipmentId('')
    setNewEquipmentName('')
    setNewEquipmentDescription('')
    setEquipmentError('')
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
    const equipmentId = String(row?.equipmentId || row?.id || '').trim()
    if (!equipmentId) return
    try {
      await deleteInspectionEquipmentOption(equipmentId)
      const rowId = String(row?.id || '').trim()
      persistEquipmentRows(
        equipmentRows.filter(
          (currentRow) => String(currentRow.equipmentId || currentRow.id || '') !== equipmentId,
        ),
      )
      updateForm({
        ...getLatestForm(),
        ...(checksField
          ? {
              [checksField]: (getLatestForm()[checksField] || []).filter(
                (check) => String(check.id || '') !== rowId,
              ),
            }
          : {}),
      })
      setEquipmentDeleteTarget(null)
      pushToast('Equipment deleted.', {
        title: 'Equipment updated',
        color: 'success',
      })
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to delete equipment.', {
        title: 'Delete failed',
        color: 'danger',
      })
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
      onApplyPhotoCaption={applyPhotoCaption}
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
        ? () => requestRootPhotoUpload(cameraInputRef)
        : undefined,
    onUploadGeneralPhoto:
      selectedTypeDefinition?.fieldRefKey === 'hseObservation'
        ? () => requestRootPhotoUpload(uploadInputRef)
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
      checksField === 'hydraulicChecks'
        ? requestHydraulicPhotoUpload
        : checksField === 'fireExtinguisherChecks'
          ? requestFireExtinguisherPhotoUpload
          : undefined,
    onRequestDefectPhotoUpload:
      checksField === 'hydraulicChecks'
        ? requestHydraulicDefectPhotoUpload
        : checksField === 'fireExtinguisherChecks'
          ? requestFireExtinguisherDefectPhotoUpload
          : undefined,
    onRemovePhoto:
      checksField === 'hydraulicChecks'
        ? removeHydraulicPhoto
        : checksField === 'fireExtinguisherChecks'
          ? removeFireExtinguisherPhoto
          : undefined,
    onChangePhotoDescription:
      checksField === 'hydraulicChecks'
        ? updateHydraulicPhotoDescription
        : checksField === 'fireExtinguisherChecks'
          ? updateFireExtinguisherPhotoDescription
          : undefined,
    onApplyPhotoCaption:
      checksField === 'hydraulicChecks'
        ? applyHydraulicPhotoCaption
        : checksField === 'fireExtinguisherChecks'
          ? applyFireExtinguisherPhotoCaption
          : undefined,
    onAddExtinguisher: addFireExtinguisher,
    onUpdateExtinguisher: updateFireExtinguisher,
    onDeleteExtinguisher: deleteFireExtinguisher,
    onAddEquipment: openAddEquipmentModal,
    onEditEquipment: (row) => {
      setShowEquipmentModal(true)
      startEditEquipment(row)
    },
    onDeleteEquipment: (row) =>
      setEquipmentDeleteTarget({
        value: row?.equipmentId || row?.id,
        label: row?.equipment,
        row,
      }),
  }

  return (
    <>
      <ActionConfirmModal
        visible={Boolean(locationDeleteTarget)}
        title="Delete Location"
        message={
          locationDeleteTarget?.label
            ? `Delete "${locationDeleteTarget.label}"? This cannot be undone.`
            : 'Delete this location?'
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
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setEquipmentDeleteTarget(null)}
        onConfirm={() => deleteEquipment(equipmentDeleteTarget?.row)}
      />

      <TypeManagerModal
        visible={location.showAddLocationModal}
        onClose={location.closeAddModal}
        editMode={location.locationEditMode}
        onSetEditMode={location.setLocationEditMode}
        editTitle={location.isEditingSubLocation ? 'Edit Sub-locations' : 'Edit Main Locations'}
        addTitle={location.isEditingSubLocation ? 'Add Sub-location' : 'Add Main Location'}
        options={location.editLocationOptions}
        onStartEdit={location.startEditType}
        onRequestDelete={({ value, label }) => setLocationDeleteTarget({ value, label })}
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
        updateLabel={location.isEditingSubLocation ? 'Update Sub-location' : 'Update Location'}
        showRowIcon={false}
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
        editingKey={editingEquipmentId}
        editingLabel="Editing equipment"
        editButtonLabel="Edit Equipment"
        onSave={saveEquipment}
        saveLabel="Save Equipment"
        updateLabel="Update Equipment"
        showRowIcon={false}
        iconOptions={[]}
      />

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
              <InspectionSelectedTypeCard inspectionType={selectedType} icon={SelectedTypeIcon} />
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
                  updateForm({
                    ...form,
                    inspectionType: String(nextValue || '').trim(),
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

        <div className="inspection-form-section d-grid gap-3" ref={selectedLocationRef}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold text-muted">Choose Main Location</div>
            {supportsCustomLocations ? (
              <CreateActionButton
                label="Add main location"
                className="inspection-compact-action-btn"
                onClick={location.openAddMainLocationModal}
              />
            ) : null}
          </div>
          <InspectionLocationOptionPicker
            options={location.mainLocationOptions}
            visibleOptions={location.visibleMainLocationOptions}
            value={mainLocation}
            onChange={(nextValue) => {
              if (nextValue === LOCATION_TOGGLE_VALUE) {
                location.setShowAllMainLocationTypes((prev) => !prev)
                return
              }
              location.setMainLocation(nextValue)
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            searchPlaceholder="Search main location..."
            searchAriaLabel="Search main location"
            clearSearchAriaLabel="Clear main location search"
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
          <FormFieldError>
            {fieldErrors.selectedLocation ? 'Choose a main inspection location.' : ''}
          </FormFieldError>
        </div>

        {mainLocation && supportsSubLocations ? (
          <div className="inspection-form-section d-grid gap-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-baseline gap-2">
                <div className="fw-semibold text-muted">Choose Sub-location</div>
                <div className="small text-body-secondary">
                  (optional under {location.selectedMainLocationTitle || mainLocation})
                </div>
              </div>
              {supportsCustomLocations ? (
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
              <div className="fw-semibold text-muted">Describe</div>
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
                mainLocationLabel={location.selectedMainLocationTitle}
                form={form}
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
