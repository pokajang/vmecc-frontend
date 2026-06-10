import React, { useEffect, useRef, useState } from 'react'
import { CButton, CFormInput, CFormTextarea } from '@coreui/react'
import { Camera, Trash2, Upload } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TypeManagerModal from 'src/views/inspection/TypeManagerModal'
import useIncidentTypeManager, {
  INCIDENT_TYPE_TOGGLE_VALUE,
} from 'src/views/inspection/useIncidentTypeManager'
import useLocationTypeManager, {
  LOCATION_TOGGLE_VALUE,
} from 'src/views/inspection/useLocationTypeManager'
import { ACTIVE_CARD_STYLE, TOGGLE_CARD_PROPS } from 'src/views/inspection/typeOptionUtils'
import { uid } from 'src/views/inspection/inspectionSharedUtils'
import { isInspectionFormValid, normalizeInspectionForm } from './inspectionFormHelpers'

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

const PhotoGallery = ({ photos, onRemove, onChangeDescription }) => {
  if (!photos.length) {
    return <div className="text-body-secondary">No photos uploaded yet.</div>
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {photos.map((photo, index) => (
        <div
          key={photo.id || `${photo.fileName || 'photo'}-${index}`}
          className="rounded-3 border border-light-subtle p-2 d-grid gap-2"
        >
          <img
            src={photo.url}
            alt={photo.fileName || 'Inspection photo'}
            style={{
              width: '100%',
              height: '140px',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
          />
          <div className="small text-truncate">{photo.fileName || 'Photo'}</div>
          <CFormInput
            size="sm"
            value={String(photo?.description || '')}
            placeholder="Add image description"
            onChange={(event) => onChangeDescription(photo.id, event.target.value)}
          />
          <CButton
            type="button"
            color="danger"
            variant="outline"
            size="sm"
            className="d-inline-flex align-items-center justify-content-center gap-1"
            onClick={() => onRemove(photo.id)}
          >
            <Trash2 size={14} />
            Remove
          </CButton>
        </div>
      ))}
    </div>
  )
}

const InspectionForm = ({ user, value, pushToast, onChange, onSaveDraft, onRequestReview }) => {
  const form = normalizeInspectionForm(value)
  const latestFormRef = useRef(form)
  const selectedLocation = String(form.selectedLocation || '').trim()
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [locationDeleteTarget, setLocationDeleteTarget] = useState(null)
  const [incidentDeleteTarget, setIncidentDeleteTarget] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    latestFormRef.current = form
  }, [form])

  const updateForm = (nextForm) => {
    const normalized = normalizeInspectionForm(nextForm)
    latestFormRef.current = normalized
    onChange?.(normalized)
  }

  const getLatestForm = () => normalizeInspectionForm(latestFormRef.current || form)

  const updateLocationField = (field, nextValue) => {
    if (field !== 'location') return
    const locationValue = Array.isArray(nextValue)
      ? nextValue[0] || ''
      : String(nextValue || '').trim()
    updateForm({
      ...form,
      selectedLocation: locationValue,
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
    selectedLocations: selectedLocation ? [selectedLocation] : [],
    updateSetupField: updateLocationField,
    pushToast,
  })

  const incident = useIncidentTypeManager({
    userId: user?.id,
    selectedType: String(form.inspectionType || '').trim(),
    updateSetupField: updateIncidentField,
    pushToast,
  })

  const handlePhotoSelect = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    const nextCount = form.photos.length + files.length
    if (nextCount > MAX_PHOTO_COUNT) {
      pushToast(`You can upload up to ${MAX_PHOTO_COUNT} photos per inspection report.`, {
        title: 'Too many photos',
        color: 'warning',
      })
      return
    }

    const existingTotalBytes = form.photos.reduce(
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

    updateForm({
      ...form,
      photos: [...form.photos, ...nextPhotos],
    })
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

  const requestReview = () => {
    const currentForm = getLatestForm()
    if (!isInspectionFormValid(currentForm)) {
      setFieldErrors({
        form: 'Select a location, choose an inspection type, add a description, and upload at least one photo before review.',
      })
      pushToast('Complete the inspection form before review.', {
        title: 'Incomplete form',
        color: 'warning',
      })
      return
    }
    setFieldErrors({})
    onRequestReview?.(currentForm)
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

      <TypeManagerModal
        visible={location.showAddLocationModal}
        onClose={location.closeAddModal}
        editMode={location.locationEditMode}
        onSetEditMode={location.setLocationEditMode}
        editTitle="Edit Inspection Locations"
        addTitle="Add Inspection Location"
        options={location.typeOptions}
        onStartEdit={location.startEditType}
        onRequestDelete={({ value, label }) => setLocationDeleteTarget({ value, label })}
        nameLabel="Location Name"
        nameValue={location.newLocationName}
        onChangeName={(nextValue) => {
          location.setNewLocationName(nextValue)
          if (location.addLocationError) location.setAddLocationError('')
        }}
        namePlaceholder="e.g. Zone E"
        descriptionLabel="Location Details (Optional)"
        descriptionValue={location.newLocationDescription}
        onChangeDescription={location.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below location name."
        error={location.addLocationError}
        editingKey={location.editingLocationKey}
        editingLabel="Editing location"
        editButtonLabel="Edit Locations"
        onSave={location.saveType}
        saveLabel="Save Location"
        updateLabel="Update Location"
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
        nameLabel="Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(nextValue) => {
          incident.setNewTypeName(nextValue)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Pump House Inspection"
        descriptionLabel="Type Details (Optional)"
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
      <div className="d-grid gap-4">
        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Location</div>
            <CreateActionButton label="Add location" onClick={location.openAddModal} />
          </div>
          <IconOptionGrid
            options={location.visibleTypeOptions}
            value={selectedLocation}
            onChange={(nextValue) => {
              if (nextValue === LOCATION_TOGGLE_VALUE) {
                location.setShowAllLocationTypes((prev) => !prev)
                return
              }
              const key = String(nextValue || '').trim()
              if (!key) return
              updateForm({
                ...form,
                selectedLocation: form.selectedLocation === key ? '' : key,
              })
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            cardProps={(option) => {
              if (option?.value === LOCATION_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
              return {
                icon: null,
                fallbackIcon: null,
                bodyClassName: 'gap-0',
                paddingClassName: 'p-3',
              }
            }}
          />
        </div>

        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Choose Inspection Type</div>
            <CreateActionButton label="Add type" onClick={incident.openAddModal} />
          </div>
          <IconOptionGrid
            options={incident.visibleTypeOptions}
            value={String(form.inspectionType || '').trim()}
            onChange={(nextValue) => {
              if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
                incident.setShowAllIncidentTypes((prev) => !prev)
                return
              }
              updateForm({
                ...form,
                inspectionType: String(nextValue || '').trim(),
              })
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            cardProps={(option, isSelected) => {
              if (option?.value === INCIDENT_TYPE_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
              return isSelected ? { style: ACTIVE_CARD_STYLE } : {}
            }}
          />
        </div>

        <div className="d-grid gap-2">
          <div className="fw-semibold">Inspection Description</div>
          <CFormTextarea
            rows={5}
            placeholder="Describe the inspection summary."
            value={form.description}
            onChange={(event) =>
              updateForm({
                ...form,
                description: event.target.value,
              })
            }
          />
        </div>

        <div className="d-grid gap-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">Photographs</div>
            <div className="d-flex align-items-center gap-2">
              <CreateActionButton
                label={<span className="d-none d-sm-inline">Upload photo</span>}
                ariaLabel="Upload photo"
                icon={<Upload size={13} className="me-0 me-sm-1 align-text-bottom" />}
                className="px-2 px-sm-2"
                onClick={() => uploadInputRef.current?.click()}
              />
              <CreateActionButton
                label={<span className="d-none d-sm-inline">Take photo</span>}
                ariaLabel="Take photo"
                icon={<Camera size={13} className="me-0 me-sm-1 align-text-bottom" />}
                className="px-2 px-sm-2"
                onClick={() => cameraInputRef.current?.click()}
              />
            </div>
          </div>
          <PhotoGallery
            photos={form.photos}
            onRemove={removePhoto}
            onChangeDescription={updatePhotoDescription}
          />
        </div>

        {fieldErrors.form ? <div className="text-danger small">{fieldErrors.form}</div> : null}

        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => onSaveDraft?.(getLatestForm())}
          >
            Save Draft
          </CButton>
          <CButton color="primary" onClick={requestReview}>
            Save &amp; Review
          </CButton>
        </div>
      </div>
    </>
  )
}

export default InspectionForm
